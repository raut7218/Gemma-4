# What a human should still check

Everything below either could not be measured by script or departs from the brief. Measured results are in `out/quality_bar.md`; every critic round and what was done about it is in `docs/ledger.md` (reports in `docs/critic/`).

## Departures from the brief, and why
- **The motion kit (github.com/echris6/motion) was not used.** This session had no access to that repository (`add_repo` refused it), so its SKILL.md was never read. The film uses a renderer and tooling written here instead: one paused gsap timeline per page, three.js for 3D, Chromium screenshots of every frame piped to ffmpeg (`tools/render.mjs`). The brief's other setup rules were kept: one gsap timeline, three.js for 3D, local pinned files, frame-by-frame rendering, and no API keys anywhere. Check whether the kit holds conventions this film should have followed.
- **Music and sound effects are synthesized, not library tracks.** The brief prefers library sound. Network policy blocked downloading any, so `tools/audio.py` synthesizes a calm 80 BPM D-major bed (pad, felt-piano arpeggio, sub bass, reverb) and the effects (whoosh, click, tick, pop) from a fixed seed. Have someone listen to the full mix at normal volume. The measurements say it is steady and quiet under the picture, but taste is a human call.
- **There is no narration.** The brief asked for the film to work with sound off, so all meaning is carried on screen; the soundtrack is music and effects only. Decide whether you want a voice-over track.
- **17 chapters + a cold open, about 11–12 compositions per 30 s.** The brief asked for 12–15 compositions per 30 s. At 24 minutes, with only facts-file claims allowed, the storyboard settled at 541 compositions (11.3 per 30 s). Every long composition carries a second action inside it, so the frame keeps changing more often than the composition count suggests (see the frozen-time row in `out/quality_bar.md`).
- **No reference footage was provided.** "Like 3Blue1Brown" was judged by critics against their knowledge of that channel's style, not against side-by-side clips. A human should watch a few minutes next to a 3Blue1Brown video.

## Judgement calls on content
- **Facts come only from `docs/facts.md`.** The repository's own agent architecture is not shown, as the brief asked. Every example, concept drawing and derived number carries an on-screen tag: "illustrative", "example", "concept", "derived", "simplified", "hypothesis", "the roadmap's suggestion" or "a target".
- **Research-question placement (chapter 16) is our reading, not a fact.** The six paper-track questions (F70) are docked beside the bundle file you would change to test them. Q2 (depth vs breadth under a time cap) → `eval_config.yaml` is natural. Q6 (memorisation vs skill) → `adapters/` is a judgement call; it could equally sit beside the evaluation split. The questions stay tagged "hypotheses".
- **The organizers' starter limits (chapter 2).** F50's "1 minute, 10 tool calls" is shown on the `max_time_minutes` and `max_tool_calls` fields of `eval_config.yaml` (F49).
- **Tensor-parallel picture (chapter 4) is simplified.** It shows row blocks with stacked outputs and is tagged "simplified". It is not a description of vLLM internals.
- **Dates and prizes.** These are 23 Sep (start), 12 Nov (paper track), 25 Nov and 2 Dec 2026 (final, 23:59 UTC), and $37k / $18k / $10k. Re-check them against the live Kaggle page before publishing, because competition pages change.

## Things to watch for when viewing
- **The 3D shots in chapters 4 and 7** (the hardware rig, and containers A and B). Critics measured the brand colours (the blue slab is about 4–5 ΔE from #58C4DD; the gold chip is under 10 ΔE everywhere) and checked the lighting. They are still the most "rendered" moments in the film, so decide whether they sit well next to the 2D.
- **The background has a slight vignette.** In the corners it is a little darker than #0E1116 (ΔE ≈ 1–2). This is deliberate.
- **The swiftshader software renderer was used for WebGL** (the machine has no GPU). Edges are anti-aliased, but a GPU render would be marginally crisper.
- **Text size.** The minimum on-screen caption is about 24 px at 1080p. On a phone, the smallest captions (sources, corner tags) will be hard to read.
