#!/usr/bin/env bash
# Low-quality draft render of one chapter + a contact sheet of frames, for review.
# usage: ./draft.sh scenes/ch01_qubits.py Ch01Qubits
set -euo pipefail
cd "$(dirname "$0")"
MEDIA=${MEDIA:-/opt/vid/media}
manim -ql --disable_caching --media_dir "$MEDIA" "$1" "$2" > "build/$2.draft.log" 2>&1 || { tail -30 "build/$2.draft.log"; exit 1; }
f=$(find "$MEDIA/videos/$(basename "$1" .py)/480p15" -name "$2.mp4")
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
mkdir -p build/frames
ffmpeg -v error -y -i "$f" -vf "fps=12/$d,scale=427:-1,tile=4x3" -frames:v 1 "build/frames/$2.png"
echo "$2 duration $d"
