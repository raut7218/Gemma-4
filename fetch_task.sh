#!/usr/bin/env bash
# usage: ./fetch_task.sh requests_6592 [more ids...]   (snapshots: requests ~36MB, httpx ~2MB, rich/fastapi 100-230MB each)
# Creates data/ and fetches tasks.jsonl when it is missing or empty (a failed download leaves an empty file).
set -euo pipefail
cd "$(dirname "$0")" && mkdir -p data/snapshots && cd data
[ -s tasks.jsonl ] || kaggle competitions download gemma-4-developer-agent -f tasks.jsonl -p . -q
for t in "$@"; do kaggle competitions download gemma-4-developer-agent -f "snapshots/$t.tgz" -p snapshots -q; done
