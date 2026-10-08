#!/bin/bash
# usage: render.sh preview|final  -> renders all scenes in parallel (4 at a time) into media-<mode>/
MODE=${1:-preview}
cd "$(dirname "$0")"
if [ "$MODE" = final ]; then RES="-r 1920,1080 --fps 30"; else RES="-r 854,480 --fps 15"; fi
mkdir -p logs
printf "scenes_d.py S00Title\nscenes_d.py S12Recap\nscenes_a.py S01Intro\nscenes_a.py S02Task\nscenes_a.py S03Repo\nscenes_a.py S04Submission\nscenes_b.py S05Loop\nscenes_b.py S06Tools\nscenes_b.py S07Verify\nscenes_c.py S08Walk\nscenes_c.py S09Gaps\nscenes_c.py S10Why\nscenes_c.py S11Roadmap\n" | \
  xargs -P ${JOBS:-4} -L1 bash -c 'manim '"$RES"' --media_dir media-'"$MODE"' $0 $1 > logs/'"$MODE"'-$1.log 2>&1; echo done $1'
