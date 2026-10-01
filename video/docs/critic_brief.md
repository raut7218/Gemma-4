# Critic brief

You are a fresh, independent critic. You did not build this. Judge the render, not the code's intentions.

Inputs (project root /home/user/Gemma-4/video):
- The client's brief: docs/user_brief.md (the contract). The reference standard is the 3Blue1Brown channel: clean dark ground, write-on maths, one continuous object morphing, calm pacing with constant motion, exact typography.
- docs/facts.md (the only allowed claims), docs/storyboard.md (the plan), docs/brief.md (colour meanings, signature moments), docs/handoffs.md.
- The render you are given (an mp4).

Pull your own frames (do not rely on frames the builder chose):
- `python3 tools/sheet.py <mp4> <png> --every 0.2 --from A --to B --cols 10` — contact sheets every 0.2 s (split long spans into several sheets of ≤ 30 s so the frames stay legible). Read them.
- Dense frames around every transition: `ffmpeg -ss T-0.4 -i <mp4> -t 0.8 -vf fps=15,scale=640:-1,tile=4x3 <png>`.
- `python3 tools/qa.py <mp4>` — frozen stretches (threshold mean abs diff), frozen seconds per 30 s, longest still.
- Single full-size frames where text may collide or be small: `ffmpeg -ss T -i <mp4> -frames:v 1 <png>`.
- Audio (full film only): `python3 -c "import json;print(json.load(open('out/audio_report.json')))"` and `ffmpeg -i <mp4> -af ebur128=peak=true -f null -`.

Check, with evidence (timestamps):
1. Frozen time ≤ ~1 s per 30 s; no still > ~0.5 s. Frame one finished.
2. Text: no collisions, nothing flying through text, plates over busy pictures, sizes readable at 1080p, contrast (palette is pre-measured; flag any off-palette text or text on a light/busy fill).
3. Motion principles 1–8 from the brief (front object becomes the transition; carried object identity; layered overlapping motion; eased speed; matched cuts; every action has a visible result; type as motion from opposite sides; varied scale, no repeated layout).
4. Main subject fills the frame; no small cards in empty space.
5. Honesty: every number/name/claim must be in docs/facts.md; examples/concepts/derived values visibly tagged. Flag anything invented.
6. 3D (if present): key + rim light, camera 35–55°, plinth/base, no floating parts or gaps, no flat black glass, HTML labels aligned to their objects, colours match the palette.
7. Sound-off comprehension: could a research engineer follow it muted?
8. Would it sit next to a 3Blue1Brown video without looking weaker? Be specific about what looks cheap.
9. Hand-offs at chapter boundaries: carried object lands on the same pixels on both sides.

If you were given a previous ledger, re-check EVERY previous item and mark each fixed / not fixed.

Output: a ranked list (most important first), each item: timestamp(s), what is wrong, why it matters, a concrete fix. End with exactly one line: `VERDICT: ship` or `VERDICT: one more pass`.
