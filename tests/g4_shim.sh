#!/usr/bin/env bash
# colab_eval/colab/gpu_run.sh check end to end without a GPU: a /content tree like the G4 runtime's (a clone of the
# branch, the harness env as cpu_prepare.sh builds it, the toy task as the competition data, the scorer's
# sandbox/setup.py) with tests/fake_llm.py as the vLLM server on :8000. It tests the committed code, as Colab clones it.
#   bash tests/g4_shim.sh WHEELS [BRANCH]
# WHEELS: a directory with the swegemma-0.2.11, adk_submission-0.2.13 and adk_eval_core-0.1.0 wheels (kaggle datasets
# download metric/gemma-4-developer-agent-wheelhouse -f <wheel>). Linux as root (WSL works) with uv and
# data/sandbox/setup.py; it refuses to touch an existing /content (rm -rf /content to rerun). The first run downloads
# the harness lock (~20 min); a pass ends with "1 tasks, 1 resolved", health.md without harness errors, and exit 0.
set -euo pipefail
REPO=$(cd "$(dirname "$0")/.." && pwd)
WH=$(cd "$1" && pwd)
BRANCH=${2:-$(git -C "$REPO" rev-parse --abbrev-ref HEAD)}
export PATH=$HOME/.local/bin:$PATH
[ -e /content ] && { echo "/content exists; remove it first (rm -rf /content)"; exit 1; }
mkdir -p /content/work /content/results /content/drive/MyDrive/gemma4-eval/results /content/drive/MyDrive/gemma4-eval/cache
git clone -q -b "$BRANCH" "$REPO" /content/Gemma-4
uv python install -q 3.13.15
uv venv -q --python 3.13.15 /content/hvenv
uv pip install -q --python /content/hvenv/bin/python -r /content/Gemma-4/colab_eval/requirements-harness.txt
uv pip install -q --python /content/hvenv/bin/python --no-deps "$WH"/swegemma-*.whl "$WH"/adk_submission-*.whl "$WH"/adk_eval_core-*.whl
uv venv -q --seed --python 3.13.15 /content/sbx && uv pip install -q --python /content/sbx/bin/python pytest
/content/hvenv/bin/python /content/Gemma-4/tests/make_toy_task.py /content/comp
mkdir -p /content/comp/sandbox /content/comp/wheels && cp "$REPO/data/sandbox/setup.py" /content/comp/sandbox/
/content/hvenv/bin/python /content/Gemma-4/tests/fake_llm.py 8000 > /content/work/fake_llm.log 2>&1 &
FAKE=$!
trap 'kill $FAKE 2>/dev/null' EXIT
sleep 2
rc=0; (cd /content && IDS=toy_6592 bash /content/Gemma-4/colab_eval/colab/gpu_run.sh check) || rc=$?
echo "gpu_run.sh check exit: $rc"
exit $rc
