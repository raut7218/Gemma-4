#!/usr/bin/env bash
# Runs the trajectory generator against the local vLLM (started by gpu_start.sh).
#   bash gpu_run.sh smoke                  # one task, one worker
#   bash gpu_run.sh full 110 20            # launch no new attempt after 110 min, 20 parallel tasks (default 20)
# Results: /content/results/<run>, copied to Drive (MyDrive/gemma4/results/<run>) every 3 minutes. Log: /content/work/gen_<run>.log
set -euo pipefail
G=/content/drive/MyDrive/gemma4
MODE="${1:-smoke}"; MIN="${2:-110}"; W="${3:-20}"; RUN="${RUN:-$MODE}"
cd /content/Gemma-4
case "$MODE" in
  smoke) EXTRA=(--limit 1 --workers 1) ;;
  full)  EXTRA=(--workers "$W" --epochs 2 --deadline-min "$MIN") ;;
  *) echo "usage: gpu_run.sh smoke | full MINUTES [WORKERS]"; exit 2 ;;
esac
nohup python3 -m harness.gen --data /content/data-external --venv-root /content/venvs \
  --base-url http://127.0.0.1:8000/v1 --model gemma-4-31b-it \
  --results-dir /content/results/$RUN --sync-dir $G/results/$RUN "${EXTRA[@]}" > /content/work/gen_$RUN.log 2>&1 &
echo "started $RUN; tail /content/work/gen_$RUN.log"
