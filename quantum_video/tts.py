"""Narration synthesis with Kokoro (local neural TTS), cached by text hash.

Model files are fetched by build.sh from the kokoro-onnx GitHub release into
$KOKORO_DIR (default: quantum_video/.tts). Each narration line becomes one WAV
in .tts/cache, so re-rendering a scene never re-synthesises unchanged lines.
"""

from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
MODEL_DIR = Path(os.environ.get("KOKORO_DIR", ROOT / ".tts"))
CACHE = MODEL_DIR / "cache"
VOICE = os.environ.get("NARRATOR_VOICE", "af_heart")
SPEED = float(os.environ.get("NARRATOR_SPEED", "0.96"))
SAMPLE_RATE = 24000

# Spellings that steer the phonemizer; the on-screen text keeps the real names.
PRONUNCIATION = [
    (r"\bChien\b", "Chen"),
    (r"\bItoh[–-]Tsujii\b", "Ee-toh Tsoo-jee"),
    (r"\bFeMoCo\b", "Fee-Mo-Co"),
    (r"\bHMR\b", "hammer"),
    (r"\bQROM\b", "Q-rom"),
    (r"\bkickmix\b", "kick-mix"),
    (r"\bSHA-256\b", "shah two fifty six"),
    (r"\bDF-THC\b", "D F T H C"),
    (r"\bMBUC\b", "M B U C"),
    (r"\bLCU\b", "L C U"),
    (r"\bOPI\b", "O P I"),
    (r"\bEEA\b", "E E A"),
    (r"\bQFT\b", "Q F T"),
    (r"\bGF\b", "G F"),
    (r"\bmHa\b", "milli-hartree"),
    (r"\bvs\.", "versus"),
    (r"\be\.g\.", "for example"),
    (r"→", " to "),
]

_kokoro = None


def _engine():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro

        _kokoro = Kokoro(str(MODEL_DIR / "kokoro-v1.0.onnx"), str(MODEL_DIR / "voices-v1.0.bin"))
    return _kokoro


def spoken(text: str) -> str:
    text = " ".join(text.split())
    for pattern, repl in PRONUNCIATION:
        text = re.sub(pattern, repl, text)
    return text


def synth(text: str) -> tuple[Path, float]:
    """Return (wav path, duration in seconds) for one narration line."""
    said = spoken(text)
    key = hashlib.sha1(f"{VOICE}|{SPEED}|{said}".encode()).hexdigest()[:20]
    path = CACHE / f"{key}.wav"
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        samples, sr = _engine().create(said, voice=VOICE, speed=SPEED, lang="en-us")
        samples = np.asarray(samples, dtype=np.float32)
        # trim the model's own leading/trailing silence, keep a short natural tail
        loud = np.flatnonzero(np.abs(samples) > 0.01)
        if loud.size:
            samples = samples[max(0, loud[0] - int(0.03 * sr)): loud[-1] + int(0.12 * sr)]
        tmp = path.with_name(f"{path.stem}.{os.getpid()}.tmp.wav")
        sf.write(tmp, samples, sr)
        os.replace(tmp, path)
    info = sf.info(path)
    return path, info.frames / info.samplerate
