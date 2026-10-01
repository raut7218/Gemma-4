"""Turns docs/storyboard.src into docs/storyboard.md with exact times, and checks pacing."""
import re, sys
BEAT = 0.75
src = open('docs/storyboard.src').read().splitlines()
out, t, n, chapters = [], 0.0, 0, []
for line in src:
    if line.startswith('#') and not line.startswith('## '):
        continue
    if line.startswith('## '):
        name, target = line[3:].rsplit('|', 1)
        chapters.append([name.strip(), int(target), 0, t, 0])
        out.append(f"\n### {name.strip()}\n\n| # | time | beats | on screen | purpose | leaves | carries |\n|---|---|---|---|---|---|---|")
        continue
    if not line.strip():
        continue
    parts = [p.strip() for p in line.split('|')]
    b = float(parts[0]); n += 1
    mm, ss = divmod(t, 60)
    out.append(f"| {n} | {int(mm)}:{ss:05.2f} | {b:g} | {parts[1]} | {parts[2]} | {parts[3]} | {parts[4]} |")
    chapters[-1][2] += b; chapters[-1][4] += 1
    t += b * BEAT
hdr = ["# Storyboard (generated from storyboard.src)\n", f"Total: {n} compositions, {t:.2f} s ({int(t//60)}:{t%60:05.2f}); {n / (t/30):.1f} compositions per 30 s.\n",
       "| chapter | beats | comps | starts |", "|---|---|---|---|"]
for c in chapters:
    hdr.append(f"| {c[0]} | {c[2]:g} | {c[4]} | {int(c[3]//60)}:{c[3]%60:05.2f} |")
open('docs/storyboard.md', 'w').write('\n'.join(hdr + out) + '\n')
print('\n'.join(hdr))
