import re
R = {}; BEATS = {}
exec(open('docs/v4/edit_a.py').read()); exec(open('docs/v4/edit_b.py').read()); exec(open('docs/v4/edit_c.py').read())
L = open('docs/storyboard.v3core.src').read().split('\n')
out = []; n = 0; k = 0
for l in L:
    if l.startswith('## '):
        name = re.match(r'## \d+ (.*?) \|', l).group(1)
        if name in ('Your local evaluation', 'Skills, sub-agents and notes', 'The paper track'): continue
        name = {'The data': 'The data and your local evaluation', 'What your prompt has to teach': 'Prompt, skills and sub-agents'}.get(name, name)
        out.append(f'## X {name} | 0'); continue
    if not re.match(r'^[\d.]+ \|', l):
        out.append(l); continue
    n += 1
    rows = R.get(n, [l])
    for j, row in enumerate(rows):
        if n in BEATS and j == len(rows) - 1:
            b, scr, purp, leave, carry = [p.strip() for p in row.split(' | ', 4)]
            out.append(f'{b} | {scr} | {purp} | the reading beat takes over without a cut | {carry}')
            term = BEATS[n]
            desc = (f'reading beat: the camera pushes in on "{term}"; it brightens while the rest of the frame dims a step' if k % 2 == 0
                    else f'reading beat: an underline sweeps under "{term}" and it warms to its colour')
            k += 1
            out.append(f'2.5 | {desc} | let "{term}" land | {leave} | {carry}')
        else:
            out.append(row)
# renumber chapters
s = '\n'.join(out); parts = re.split(r'(?=^## )', s, flags=re.M); res = [parts[0]]
for i, ch in enumerate(parts[1:]): res.append(re.sub(r'^## X ', f'## {i} ', ch, count=1))
s = ''.join(res)
names = [re.match(r'## \d+ (.*?) \|', t).group(1) for t in re.findall(r'^## .*$', s, re.M)]
lines = s.split('\n'); cur = -1
for j, l in enumerate(lines):
    if l.startswith('## '): cur += 1; continue
    m = re.search(r'RAIL rewrites to "(\d\d) ([^"]+)"', l)
    if m and cur + 1 < len(names): lines[j] = l.replace(m.group(0), f'RAIL rewrites to "{cur + 1:02d} {names[cur + 1]}"')
open('docs/storyboard.v4raw.src', 'w').write('\n'.join(lines))
rows = [l for l in lines if re.match(r'^[\d.]+ \|', l)]
print('chapters', len(names), names)
print('comps', len(rows), 'raw beats', sum(float(r.split('|')[0]) for r in rows), 'reading beats', k)
