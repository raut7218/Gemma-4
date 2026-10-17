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
# 3. gold + baseline validation on the real runtime, resumable
python3 -m harness.gen --validate --data /content/data-external --venv-root /content/venvs --workers 2 | tail -5
echo done
