#!/usr/bin/env bash
# A/B on the fixed holdout: v4.3 (control) vs senior-dev-port vs senior-dev-presubmit.
#
# The three arms share tools, sampling and budget (4.5 min, 30 calls, 60 turns), so
# the prompt (and the skill, for the presubmit arm) is the only difference.
#
# Needs: a clone of happyc0der/gemma-swe-agent with its harness installed (swelite),
# the competition data under its data/competition, Docker for sandboxes, and an
# OpenAI-compatible endpoint serving Gemma 4 31B (vLLM with the gemma4 tool parser).
#
# Usage:
#   HARNESS=~/gemma-swe-agent API_BASE=http://127.0.0.1:8000/v1 \
#   SERVED_MODEL=gemma-4-31b-it-qat-w4a16-ct REPEATS=2 CONCURRENCY=2 \
#   ab/run_holdout_ab.sh
# Then: python3 ab/report.py ab/results/<run>
set -euo pipefail

HERE=$(cd "$(dirname "$0")/.." && pwd)
HARNESS=${HARNESS:?set HARNESS to a gemma-swe-agent clone}
API_BASE=${API_BASE:-http://127.0.0.1:8000/v1}
SERVED_MODEL=${SERVED_MODEL:-gemma-4-31b-it-qat-w4a16-ct}
REPEATS=${REPEATS:-1}          # temperature is 0.2, so repeats measure run-to-run noise
CONCURRENCY=${CONCURRENCY:-2}
SPLIT=${SPLIT:-holdout}
DATA=${DATA:-$HARNESS/data/competition}
SWELITE=${SWELITE:-$HARNESS/harness/.venv/bin/swelite}
RUN=${RUN:-$(date -u +%Y%m%d-%H%M)-$SPLIT}
OUT=$HERE/ab/results/$RUN

declare -A ARMS=(
  [v43]=$HARNESS/experiments/variants/v43
  [port]=$HERE/bundles/senior-dev-port
  [presubmit]=$HERE/bundles/senior-dev-presubmit
)
# Interleave arms within each repeat so drift in the server hits every arm alike.
ORDER=(v43 port presubmit)

for arm in "${ORDER[@]}"; do
  [ -f "${ARMS[$arm]}/agent.yaml" ] || { echo "missing bundle for $arm: ${ARMS[$arm]}" >&2; exit 1; }
done
[ -x "$SWELITE" ] || { echo "swelite not found at $SWELITE" >&2; exit 1; }
[ -d "$DATA" ] || { echo "competition data not found at $DATA" >&2; exit 1; }
curl -sf -m 10 "$API_BASE/models" > /dev/null || { echo "no model server at $API_BASE" >&2; exit 1; }

IDS=$(SPLIT=$SPLIT python3 - "$HARNESS/experiments/splits.json" <<'EOF'
import json, os, sys
s = json.load(open(sys.argv[1]))
print(" ".join(f"--task-id {i}" for i in s[os.environ["SPLIT"]] if i not in s["env_unstable"]))
EOF
)
N=$(wc -w <<< "$IDS"); N=$((N / 2))

mkdir -p "$OUT"
{
  echo "run=$RUN split=$SPLIT tasks=$N repeats=$REPEATS concurrency=$CONCURRENCY"
  echo "api_base=$API_BASE served_model=$SERVED_MODEL"
  echo "bundles@$(git -C "$HERE" rev-parse --short HEAD) harness@$(git -C "$HARNESS" rev-parse --short HEAD)"
} | tee "$OUT/run.txt"

for r in $(seq 1 "$REPEATS"); do
  for arm in "${ORDER[@]}"; do
    dir=$OUT/$arm-r$r
    echo "[$(date -u +%H:%M)] $arm repeat $r -> $dir"
    # Budgets come from each bundle's eval_config.yaml; none are overridden here.
    (cd "$HARNESS/harness" && "$SWELITE" eval --data-dir "$DATA" --submission-dir "${ARMS[$arm]}" \
      --results-dir "$dir" --api-base "$API_BASE" --served-model "$SERVED_MODEL" \
      --concurrency "$CONCURRENCY" $IDS) > "$dir.console" 2>&1 || echo "  swelite exited non-zero; see $dir.console"
  done
done

echo "done. report: python3 $HERE/ab/report.py $OUT"
