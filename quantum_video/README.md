# Verifiable Quantum Circuit Compilation, explained

A 3Blue1Brown-style explainer video (about 40 minutes, Manim + a neural narrator voice). It covers the Kaggle competition
[Google Quantum AI: Verifiable Quantum Circuit Compilation](https://www.kaggle.com/competitions/google-verifiable-quantum-circuit-compilation)
and is written for someone who knows ML and only the very basics of quantum computing.

**Watch:** [`video/verifiable_quantum_circuit_compilation_explained.mp4`](video/verifiable_quantum_circuit_compilation_explained.mp4)
(47.6 min, 1080p, embedded English subtitles and chapter markers). Alongside it: `video/subtitles.srt`,
`video/transcript.md` (the full narration) and `video/chapters.txt` (timestamps).

## Chapters

| # | Chapter | What you learn |
|---|---|---|
| 0 | Introduction | the competition in one picture, the three benchmarks, the geometric-mean score |
| 1 | Bits, qubits and amplitudes | states, measurement, interference, phases, 2ⁿ amplitudes, why basis states are cheap |
| 2 | Gates, circuits, reversible logic | X, CNOT, Toffoli, reversibility, ancillas, Bennett uncomputation, Z/CZ/CCZ/Z_POW, compute-phase-uncompute |
| 3 | Why Toffolis are expensive | error correction, Clifford vs non-Clifford, magic states, the cost model, rotation synthesis cost |
| 4 | kickmix circuits | the four instruction classes, linear-time simulation, HMR ("hammer"), temporary AND, mean Toffoli counting |
| 5 | How circuits are verified | the three checks, exhaustive vs fuzz testing, Fiat–Shamir seeding + salt, Clopper–Pearson bound, 2√ε |
| 6 | The toolkit | adders, multipliers and truncation, fixed point, shifts, QROM, unary iteration, lookup costs |
| 7 | Benchmark I: 1/√x | fusion context, the exact task and tolerance, phasing from a register, normalize → cubic → Newton, costs, ideas |
| 8 | Benchmark II: DQI decoder | OPI, GF(2¹²), Reed–Solomon and syndromes, DQI pipeline, the sign task, EEA/Chien/Forney, R(ε)·Q²·T |
| 9 | Benchmark III: FeMoCo | block encodings, LCU, DF-THC factorization, Givens-rotation trees, angle loaders, λ_eff·T·Q |
| 10 | Scoring, submitting, a plan | summary table, submission layout, the build-verify loop, a two-week plan, reading list |

## Sources

All technical content follows the organizers' companion paper, *Leveraging verifiable structure in quantum circuits
to find more efficient compilations with agentic AI* (Khattar, Rubin, Gidney, Broughton, Low, Babbush;
arXiv:2610.23832), and the organizers' verifier documentation (the `dfthcsos` scoring README) as mirrored in public
competition repositories. Leaderboard and public-notebook numbers are a snapshot from late October 2026 and will
move. Kaggle itself could not be reached from the build machine, so check the competition's Overview and
Evaluation pages for the authoritative rules (submission format, daily limits, deadlines).

## Building

Requirements: Python 3.12, [Manim Community](https://www.manim.community/) 0.19+, a LaTeX install with `dvisvgm`,
ffmpeg, and `kokoro-onnx` + `soundfile` for the narration.

```bash
uv venv -p 3.12 .venv && uv pip install -r requirements.txt
sudo apt-get install texlive-latex-extra texlive-fonts-recommended texlive-science dvisvgm cm-super ffmpeg
./build.sh                         # full HD; RES=1280,720 for a faster build
./draft.sh scenes/ch07_invsqrt.py Ch07Invsqrt   # quick low-res render of one chapter + contact sheet
```

`build.sh` downloads the Kokoro voice model (Apache-2.0) into `.tts/` the first time. Narration lines are
synthesized once and cached by text hash. Each scene logs its narration timings to `build/timings/`, and
`make_subs.py` turns those into `subtitles.srt`, `transcript.md` and `chapters.txt`.

## Layout

- `common.py`: palette, the `VScene` base class (`with self.say(text) as b:` plays a narration line and paces the
  animations inside it to the line's length), and drawing helpers (circuit diagrams, bit registers, cards).
- `tts.py`: Kokoro synthesis, the cache, and pronunciation fixes for jargon (Chien → "Chen", HMR → "hammer", ...).
- `scenes/chNN_*.py`: one Manim scene per chapter. The narration script is the text inside each `say(...)`.
- `video/`: the rendered result (committed), including `transcript.md` and `subtitles.srt`.
