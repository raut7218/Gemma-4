# Critic r2_b: film 450–981.75 (ch5–10). VERDICT: one more pass

Evidence in this folder: contact sheets s_*.png (every 0.5 s), v_940/v_950 (every 0.1 s), hand-off tiles h_*.png, dense tiles d*.png, full frames f/ and montages m_*.png.

## Ranked items (film timestamps)
1. **ch8 744–786, camera crops the panels.** At 745.25 the CALL LOG is cut at the left ("L LOG", "AGE", "ntries") and the METERS time bar at the right. At 761.25 the container panel is cut at the right edge. At 782.25 the call log is off the left and container A's bottom meets the frame edge. Fix: fit the active panel(s) fully inside the safe area (≥60 px margin), and push by scale, not by panning off-panel.
2. **ch5 471.0–474.3, the title is clipped.** "first message ≈ 3.5k" is cut by the top frame edge ("irst message") and runs into the "05 The 32k context window" label. The tape runs off the right edge. At 470.9–471.4 "150-entry file listing" still slides out from behind "tool notes" (r1 #6). Then at 474.5–475.3 the stack collapses and the camera snaps back out. Fix: keep the title ≥120 px below the top; grow the stack downward; ease the pull-back over ≥1 s.
3. **ch7 680.1–680.3, camera whip.** qa logs 3 cuts here: the framing jumps from the extract-patch view to the verify view in about 0.2 s. Fix: ease the move over ≥1 s.
4. **ch7 646–745, 3D framing.** The plinth runs off the left and bottom edges the whole time and reads as a tabletop. Container A is cropped at the left edge (685–703). From 646.0–646.6 the dive still crossfades a large 2D card outline plus a ghost header over the 3D case (r1 #3). Fix: shrink the plinth to ~1.3× the footprint of A+B, frame both containers inside the safe area, and turn the 2D outline into the rim instead of crossfading it.
5. **ch7 632.25–643, the carried object is lost.** Container A shrinks and fades. The agent.yaml card and the vLLM cards follow, and A comes back as a new 2D card at ~642.5 (r1 #12, unchanged). Fix: morph A into the "prepare A" stage card, or keep it on screen.
6. **ch9 817.7–818.3, collision at the hand-off.** The new loop's arcs draw through "the careful run, as a recipe" and the recipe pills (818.05). At 818.6 the red ring overprints the "read the result" and "call a tool" pills. Fix: fade the recipe row out before the arcs draw, and put the ring behind the pills. (The black crack is gone; it is now a thin red stroke.)
7. **ch7 656–663, a label on the rim.** The "CONTAINER A · OFFLINE SANDBOX" label dims and prints across the blue rim (656.5, 662.5), and "pytest.ini" sits on a glass edge. Fix: lift the header above the rim with an opaque plate.
8. **ch5 452–543, composition.** The tape now spans the full width and its ticks are readable, but it takes ≤25% of the frame height and the lower half is empty (497, 535, 520). Fix: make the bar taller, or stack the legend and annotations below it.
9. **ch10 composition, partly fixed.** 877.5–892: the grid and repo blocks sit in the top 45%. At 980 the v1/v2/.zip stack is about 20% of the width, alone. Fix: scale to 60–70% of the frame height.
10. **ch10 verdict, small mismatches only (no false verdict anywhere in 940–960).** At 944.80–944.95 the "null patch (empty)" chip shows with green bars and no verdict text. At 953.1–953.6 the grid sweeps red under the dimmed caption "the gold patch should pass everywhere". Fix: swap the chip when the bars turn red; swap the caption when the sweep starts.
11. **543.75 5→6, first-frame pop.** The ch6 first frame jumps (frame diff 1.72 against ~0.01 before it) as the tool tiles brighten in one frame; there is no ease-in (r1 #8). At 877.53 the lock grid has a one-frame brightness step (diff 1.71). Fix: ramp both over ≥0.3 s.
12. **979.6, early chapter label.** The label changes to "11 What you submit" 2.1 s before the 981.75 boundary; other boundaries lead by ≤0.4 s. Fix: switch it at the boundary.
13. **Known, not re-analysed:** stills at 724.6 (0.82 s), 726.12 (1.27 s) and 981.0 (0.73 s) are still in qa_film.json. There are no other stills in range. Frozen time in range is ≤0.82 s per 30 s outside these.

Hand-offs: 632.25, 724.5, 818.25 and 877.5 are pixel-continuous (frame diff ≤0.32). 543.75 matches its layout but pops (item 11).

3D colours (ΔE76, pixels within ΔE 15 of the target):
- BLUE rim: #57C9E9 / #58CEF6 / #56CCEF / #57C6E6 → ΔE 5.3 / 9.0 / 6.9 / 4.5 (653.75 / 665.25 / 685 / 706).
- GREEN rim: #81C976 / #70AD64 / #80BC65 → ΔE 6.2 / 9.9 / 2.4 (685 / 697.75 / 706).
- GOLD chip: #F4B46F / #F5B575 / #F5B570 → ΔE 5.6 / 8.0 / 5.8 (680.4 / 681.5 / 683).

All are under 10. The worst are the blue rim at 665.25 and the green rim at 697.75 (ΔE 9.0 and 9.9).

Audio (450–981.75): −16.0 LUFS integrated, true peak −1.7 dBFS, OK. Honesty: the illustrative/example/concept tags are present on ch8–10 content. Nothing invented was seen.

## Re-check of previous items
| ledger | item | status |
|---|---|---|
| f04_06 | 1 get_status over tree (591.6) | fixed |
| f04_06 | 4 stills 450.1 / 545.8 / 627.2 | fixed |
| f04_06 | 5 tape opening small | partly (full width now; still a thin band) |
| f04_06 | 6 stack slides through labels (470.9) | NOT fixed (+ title clipped, item 2) |
| f04_06 | 7 ch6→7 fill pop / header over rail | fixed |
| f04_06 | 8 5→6 no ease-in; ring of dots | partly (labelled tiles OK; first-frame pop) |
| f04_06 | 11 HTTPAdapter tag flies across | fixed |
| f04_06 | 12 ring outside title-safe | fixed (still left-heavy) |
| f04_06 | 13 patch.diff fades in place | fixed (slides off) |
| f04_06 | 2,3,9,10,14,15 | ch4, out of range |
| f07_09 | 1 black crack polygons | fixed |
| f07_09 | 2 container B geometry/floor | fixed |
| f07_09 | 3 dive 646 crossfade | partly (checklist gone; 2D outline/header over 3D) |
| f07_09 | 4 rail collisions | fixed |
| f07_09 | 5 frozen 634.47 / 722.98 / 726.5 | partly (634 fixed; 724.6/726.12 known) |
| f07_09 | 6 stepped push / snap 655–662 | fixed |
| f07_09 | 7 loop pills on rim (665) | fixed |
| f07_09 | 8 3D pop / duplicate chip | fixed (new camera whip, item 3) |
| f07_09 | 9 underlines fixed x | fixed |
| f07_09 | 10 stale ≈3.5k label | fixed |
| f07_09 | 11 ch8 framing / cropped panels | NOT fixed (item 1) |
| f07_09 | 12 ch7 opening object identity | NOT fixed (item 5) |
| f07_09 | 13 rim light / leader / label contrast | partly (leader and bright label fixed; no container rim light) |
| f07_09 | 14 verdict ghost text | fixed |
| f07_09 | 15 empty chart full bars | fixed |
| f10_12 | 1 false green "pass" | fixed (checked every 0.1 s, 940–960) |
| f10_12 | 7 still 981.5 | known (981.0, 0.73 s) |
| f10_12 | 8 ch10 composition | partly (pipeline and bundle fixed; 883–892 and the zip still small) |
| f10_12 | 9 card → pipeline double text | fixed |
| ch10_r1 | 1 push beat (959.1) | fixed |
| ch10_r1 | 2 "31 lines" beat (908.3) | fixed |
| ch10_r1 | 3 pan off-frame (889.5) | fixed |
| ch10_r1 | 4 stale pass (945.3) | fixed |
| ch10_r1 | 5 weak close / stack | partly (readable fan; ~20% width) |
| ch10_r1 | 6 small bars / no carried object | fixed |
| ch10_r1 | 7 rich split ragged | fixed |
| ch10_r1 | 8 static opening | fixed |
| ch10_r1 | 9 pipeline dots / height | fixed |
| ch10_r1 | 10 minor tags / translucent card | fixed |

VERDICT: one more pass
