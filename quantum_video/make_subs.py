"""Build subtitles (SRT) and a Markdown transcript from the per-scene narration timings.

usage: python make_subs.py VIDEO_DIR OUT_DIR
VIDEO_DIR holds the rendered chapter files (Ch00Intro.mp4, ...); their real durations
give each chapter's offset in the concatenated video.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHAPTERS = [
    ("Ch00Intro", "Introduction: the competition in one picture"),
    ("Ch01Qubits", "1. Bits, qubits and amplitudes"),
    ("Ch02Gates", "2. Gates, circuits and reversible logic"),
    ("Ch03Cost", "3. Why Toffolis are expensive"),
    ("Ch04Kickmix", "4. kickmix circuits and measurement-based uncomputation"),
    ("Ch05Verify", "5. How circuits are verified"),
    ("Ch06Toolkit", "6. The toolkit: AND, adders, multipliers, lookups"),
    ("Ch07Invsqrt", "7. Benchmark I: phasing by 1/sqrt(x)"),
    ("Ch08Dqi", "8. Benchmark II: Reed-Solomon decoding for DQI"),
    ("Ch09Femoco", "9. Benchmark III: FeMoCo lookups and rotations"),
    ("Ch10Plan", "10. Scoring, submitting, and a plan"),
]


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def stamp(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def chunks(text, limit=84):
    """Split a narration line into subtitle-sized pieces at sentence/clause boundaries."""
    parts = re.split(r"(?<=[.?!:;])\s+", text)
    out = []
    for p in parts:
        while len(p) > limit:
            cut = p.rfind(", ", 0, limit)
            cut = cut + 1 if cut > limit // 3 else p.rfind(" ", 0, limit)
            out.append(p[:cut].strip())
            p = p[cut:].strip()
        if p:
            out.append(p)
    return out


def main():
    video_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    srt, md, chapters_txt = [], ["# Transcript: Verifiable Quantum Circuit Compilation, explained\n"], []
    offset, n = 0.0, 1
    for scene, title in CHAPTERS:
        timing = json.loads((ROOT / "build" / "timings" / f"{scene}.json").read_text())
        mm, ss = divmod(int(offset), 60)
        chapters_txt.append(f"{mm:02}:{ss:02} {title}")
        md.append(f"\n## {title}  ({mm:02}:{ss:02})\n")
        for line in timing["lines"]:
            md.append(line["text"] + "\n")
            pieces = chunks(line["text"])
            total = sum(len(p) for p in pieces)
            t = offset + line["start"]
            for p in pieces:
                d = line["duration"] * len(p) / total
                srt.append(f"{n}\n{stamp(t)} --> {stamp(t + d - 0.02)}\n{p}\n")
                n += 1
                t += d
        offset += duration(video_dir / f"{scene}.mp4")
    (out_dir / "subtitles.srt").write_text("\n".join(srt))
    (out_dir / "transcript.md").write_text("\n".join(md))
    (out_dir / "chapters.txt").write_text("\n".join(chapters_txt) + "\n")
    print(f"{n - 1} subtitles, total {offset / 60:.1f} min")


if __name__ == "__main__":
    main()
