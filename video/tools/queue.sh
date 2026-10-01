#!/bin/bash
# render chapters one after another: tools/queue.sh "06:ch06_tools.js" "07:three_containers.mjs,ch07_sandbox.js" ...
cd "$(dirname "$0")/.."
for item in "$@"; do
  n="${item%%:*}"; scenes="${item#*:}"
  for try in 1 2; do node tools/render.mjs --scenes "$scenes" --out "out/ch$n.mp4" --workers "${WORKERS:-2}" > "out/render_ch$n.log" 2>&1 && break; echo "retry ch$n"; done
  python3 tools/qa.py "out/ch$n.mp4" --json "out/qa_ch$n.json" | tail -1
  echo "done ch$n"
done
