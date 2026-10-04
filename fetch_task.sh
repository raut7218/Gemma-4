#!/usr/bin/env bash
# usage: ./fetch_task.sh requests_6592 [more ids...]   (snapshots: requests ~36MB, httpx ~2MB, rich/fastapi 100-230MB each)
cd "$(dirname "$0")/data" && mkdir -p snapshots && for t in "$@"; do kaggle competitions download gemma-4-developer-agent -f snapshots/$t.tgz -p snapshots -q; done
