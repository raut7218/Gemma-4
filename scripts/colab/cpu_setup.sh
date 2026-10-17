#!/usr/bin/env bash
# CPU runtime: rebuild the 500-task dataset, the per-repo venvs and the gold validation, cache all of it on Drive.
set -euo pipefail
G=/content/drive/MyDrive/gemma4
mkdir -p /content/work $G/cache
cd /content
[ -d Gemma-4 ] || git clone -q -b gen-trajectories https://github.com/raut7218/Gemma-4.git
cd Gemma-4 && git pull -q
# 1. dataset: the same 500 (+60 reserve) ids, snapshots from GitHub (no Kaggle files needed)
if [ ! -s /content/data-external/tasks.jsonl ]; then
  uv run --with duckdb python scripts/select_external_tasks.py --ids scripts/external_ids.txt --out /content/data-external
  python3 -I scripts/build_snapshots.py --dir /content/data-external --workers 4
fi
# 2. venvs (python 3.9 under /content/venvs/_python, relocation-free because the path is the same on every runtime)
python3 -I scripts/build_venvs.py --root /content/venvs --data /content/data-external --workers 2 || true
# 3. gold + empty-patch validation on this runtime (about an hour on 2 vCPUs); resumable. If a finished validation is shipped as
#    scripts/external_validation.json it is imported instead and only 2 tasks per repo are re-checked.
if [ -f scripts/external_validation.json ]; then
  python3 -m harness.gen --import-validation scripts/external_validation.json --data /content/data-external
  python3 - <<'PY'
import collections, json
valid = json.load(open("scripts/external_validation.json"))["valid"]
seen, ids = collections.Counter(), []
for l in open("/content/data-external/tasks.jsonl"):
    t = json.loads(l)
    if t["instance_id"] in valid and seen[t["repo"]] < 2:
        seen[t["repo"]] += 1; ids.append(t["instance_id"])
open("/content/work/sample_ids.txt", "w").write("\n".join(ids))
PY
  python3 -m harness.gen --validate --validation-file validation_check.jsonl --ids-file /content/work/sample_ids.txt \
    --data /content/data-external --venv-root /content/venvs --workers 2 | tail -70
else
  python3 -m harness.gen --validate --data /content/data-external --venv-root /content/venvs --workers 2 | tail -5
fi
echo done
