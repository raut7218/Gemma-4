"""Generate one wav per narration segment with an offline neural voice (sherpa-onnx + piper lessac).

usage: python tts.py MODEL_DIR [length_scale]   -> audio/<key>.wav and audio/durations.json
"""
import json
import sys
from pathlib import Path

import sherpa_onnx
import soundfile as sf

from narration import N

model_dir = Path(sys.argv[1])
scale = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
out = Path(__file__).parent / "audio"
out.mkdir(exist_ok=True)

cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=str(model_dir / "en_US-lessac-medium.onnx"),
            tokens=str(model_dir / "tokens.txt"),
            data_dir=str(model_dir / "espeak-ng-data"),
            length_scale=scale,
            noise_scale=0.6,
        ),
        num_threads=4,
    )
)
tts = sherpa_onnx.OfflineTts(cfg)
durs = {}
for k, text in N.items():
    a = tts.generate(text, sid=0, speed=1.0)
    sf.write(out / f"{k}.wav", a.samples, a.sample_rate)
    durs[k] = len(a.samples) / a.sample_rate
    print(f"{k}: {durs[k]:.1f}s  ({len(text.split())} words)", flush=True)
(out / "durations.json").write_text(json.dumps(durs, indent=1))
total = sum(durs.values())
print(f"TOTAL narration {total/60:.2f} min")
