#!/bin/bash
# Resumable full-film render: one segment per chapter of the FULL film (so carried objects are
# exact), skipping segments that already exist, then a lossless concat.
#   tools/film.sh            render missing segments, then join
#   tools/film.sh 06 10      delete and re-render those chapters' segments, then join
# Segments: out/seg/NN.mp4 (written to .part.mp4 first, renamed when complete).
cd "$(dirname "$0")/.."
mkdir -p out/seg
for n in "$@"; do rm -f "out/seg/$n.mp4"; done
node tools/render.mjs --info out/timeline.json > /dev/null 2>&1 || { echo "info failed"; exit 1; }
python3 - <<'EOF' > out/seg/plan.txt
import json
d = json.load(open('out/timeline.json'))
st = [c['t'] for c in d['ch']] + [d['dur']]
for i in range(len(st) - 1):
    print(f"{i:02d} {st[i]} {st[i+1]}")
EOF
while read -r n a b; do
  [ -f "out/seg/$n.mp4" ] && continue
  echo "segment $n: $a-$b"
  for try in 1 2; do
    node tools/render.mjs --from "$a" --to "$b" --out "out/seg/$n.part.mp4" --workers "${WORKERS:-4}" > "out/seg/$n.log" 2>&1 && mv "out/seg/$n.part.mp4" "out/seg/$n.mp4" && break
    echo "retry $n"
  done
done < out/seg/plan.txt
missing=$(awk '{print $1}' out/seg/plan.txt | while read n; do [ -f "out/seg/$n.mp4" ] || echo $n; done)
[ -n "$missing" ] && { echo "missing segments: $missing"; exit 1; }
awk '{print "file '"'"'" $1 ".mp4'"'"'"}' out/seg/plan.txt > out/seg/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -c copy out/film_silent.mp4 && echo "joined out/film_silent.mp4"
