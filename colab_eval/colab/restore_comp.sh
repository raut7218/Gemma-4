#!/usr/bin/env bash
# Copies the competition data from Drive to /content/comp. A single Drive stream reads at ~30 MB/s, so the 129
# snapshots (21.5 GB) are copied 16 at a time; small tasks first so a smoke run can start early.
set -euo pipefail
G=/content/drive/MyDrive/gemma4-eval
C=/content/comp
mkdir -p $C/snapshots
cp -r $G/comp/tasks.jsonl $G/comp/wheels $G/comp/sandbox $G/comp/docker $C/
[ -d $G/comp/era_wheels ] && cp -r $G/comp/era_wheels $C/
ls -S -r $G/comp/snapshots | xargs -P ${STREAMS:-16} -I{} sh -c '[ -s "$1/{}" ] && [ "$(stat -c %s "$1/{}")" = "$(stat -c %s "$2/{}")" ] || cp "$2/{}" "$1/{}"' _ $C/snapshots $G/comp/snapshots
echo "comp restored: $(ls $C/snapshots | wc -l) snapshots, $(du -sh $C | cut -f1)"
