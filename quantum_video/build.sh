#!/usr/bin/env bash
# Render every chapter at full HD, then join them into one video with subtitles.
#   ./build.sh                 # 1920x1080, 30 fps
#   RES=1280,720 ./build.sh    # faster
#   JOBS=4 ./build.sh          # parallel chapter renders
set -euo pipefail
cd "$(dirname "$0")"

RES=${RES:-1920,1080}
FPS=${FPS:-30}
JOBS=${JOBS:-3}
MEDIA=${MEDIA:-build/media}
OUT=${OUT:-build/out}

# narration voice (Kokoro, Apache-2.0) -- fetched once
TTS=${KOKORO_DIR:-.tts}
mkdir -p "$TTS"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "$TTS/$f" ] || curl -sSL -o "$TTS/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done

SCENES=(
  "ch00_intro Ch00Intro" "ch01_qubits Ch01Qubits" "ch02_gates Ch02Gates" "ch03_cost Ch03Cost"
  "ch04_kickmix Ch04Kickmix" "ch05_verify Ch05Verify" "ch06_toolkit Ch06Toolkit" "ch07_invsqrt Ch07Invsqrt"
  "ch08_dqi Ch08Dqi" "ch09_femoco Ch09Femoco" "ch10_plan Ch10Plan"
)

mkdir -p build/logs "$OUT/chapters"
render() {
  set -- $1
  manim --resolution "$RES" --frame_rate "$FPS" --disable_caching --media_dir "$MEDIA" \
    -o "$2" "scenes/$1.py" "$2" > "build/logs/$2.log" 2>&1 && echo "rendered $2" || { echo "FAILED $2 (build/logs/$2.log)"; return 1; }
}
export -f render
export RES FPS MEDIA
printf '%s\n' "${SCENES[@]}" | xargs -P "$JOBS" -I{} bash -c 'render "{}"'

H=${RES#*,}
: > build/concat.txt
for s in "${SCENES[@]}"; do
  set -- $s
  src=$(find "$MEDIA/videos/$1" -path "*${H}p${FPS}*" -name "$2.mp4" | head -1)
  cp "$src" "$OUT/chapters/$2.mp4"
  echo "file '$PWD/$OUT/chapters/$2.mp4'" >> build/concat.txt
done

python make_subs.py "$OUT/chapters" "$OUT"

# chapter markers for players that support them
python - "$OUT" <<'EOF'
import sys
from pathlib import Path
out = Path(sys.argv[1]); meta = [";FFMETADATA1"]; t = 0.0
import make_subs as ms
for scene, title in ms.CHAPTERS:
    d = ms.duration(out / "chapters" / f"{scene}.mp4")
    meta += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(t*1000)}", f"END={int((t+d)*1000)}", f"title={title}"]
    t += d
(out / "chapters.ffmeta").write_text("\n".join(meta) + "\n")
EOF

ffmpeg -v error -y -f concat -safe 0 -i build/concat.txt -i "$OUT/subtitles.srt" -i "$OUT/chapters.ffmeta" \
  -map 0:v -map 0:a -map 1 -map_metadata 2 -map_chapters 2 \
  -c:v copy -c:a aac -b:a 160k -c:s mov_text -metadata:s:s:0 language=eng \
  -movflags +faststart "$OUT/verifiable_quantum_circuit_compilation_explained.mp4"
ls -la "$OUT"
