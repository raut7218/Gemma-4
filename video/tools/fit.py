"""Fit storyboard durations: python3 tools/fit.py in.src out.src [total_beats]
Durations follow reading load in half beats (2..4.5 beats = 1.5..3.375 s; reading beats 2..2.5),
runs of identical durations are broken up, every chapter totals a whole number of beats, and
the film totals exactly `total_beats`."""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
TOTAL = float(sys.argv[3]) if len(sys.argv) > 3 else 1920.0
L = open(src).read().split('\n')
rows = [i for i, l in enumerate(L) if re.match(r'^[\d.]+ \|', l)]
def scr(i): return L[i].split(' | ')[1]
def isbeat(i): return scr(i).startswith('reading beat')
def load(i):
    s = scr(i)
    q = re.findall(r'"([^"]+)"', s) + re.findall(r'`([^`]+)`', s)
    w = sum(len(x.split()) for x in q)
    return w + (3 if s.startswith(('WIDE', 'OVER', '3D', 'CLOSE')) else 0) + (2 if s.startswith('FULL') else 0)
ld = {i: load(i) for i in rows}
def bounds(i): return (2.0, 2.5) if isbeat(i) else (2.0, 4.5)
best = None
for k in [x / 400 for x in range(1, 400)]:
    a = {}
    for i in rows:
        lo, hi = bounds(i)
        a[i] = min(hi, max(lo, round((2.0 + k * ld[i]) * 2) / 2))
    t = sum(a.values())
    if best is None or abs(t - TOTAL) < abs(best[0] - TOTAL): best = (t, a)
a = best[1]
# chapters
chap, cur = [], []
for i, l in enumerate(L):
    if l.startswith('## '):
        if cur: chap.append(cur)
        cur = []
    elif i in a: cur.append(i)
chap.append(cur)
raw = [sum(a[i] for i in c) for c in chap]
tg = [round(r * TOTAL / sum(raw)) for r in raw]
tg[-1] += TOTAL - sum(tg)
def adjust(c, diff):
    order = sorted(c, key=lambda i: -ld[i]) if diff > 0 else sorted(c, key=lambda i: ld[i])
    for _ in range(80):
        if abs(diff) < 1e-9: break
        moved = False
        for i in order:
            if abs(diff) < 1e-9: break
            lo, hi = bounds(i); st = 0.5 if diff > 0 else -0.5
            if lo <= a[i] + st <= hi: a[i] += st; diff -= st; moved = True
        if not moved: break
    return diff
for c, t in zip(chap, tg):
    d = adjust(c, t - sum(a[i] for i in c))
    assert abs(d) < 1e-9, ('chapter cannot fit', t, d)
# break runs of identical durations (>= 4) by trading half beats inside the run
for c in chap:
    for _ in range(5):
        changed = False
        for j in range(len(c) - 3):
            seg = c[j:j + 4]
            if len({a[i] for i in seg}) == 1 and not any(isbeat(i) for i in seg):
                x, y = seg[1], seg[2]
                if a[x] + 0.5 <= 4.5 and a[y] - 0.5 >= 2.0: a[x] += 0.5; a[y] -= 0.5; changed = True
                elif a[x] - 0.5 >= 2.0 and a[y] + 0.5 <= 4.5: a[x] -= 0.5; a[y] += 0.5; changed = True
        if not changed: break
for i in rows:
    v = a[i]; L[i] = (str(int(v)) if v == int(v) else str(v)) + ' |' + L[i].split('|', 1)[1]
open(dst, 'w').write('\n'.join(L))
from collections import Counter
t = 0; off = []
for l in L:
    if l.startswith('## ') and t != int(t): off.append(l[:30])
    if re.match(r'^[\d.]+ \|', l): t += float(l.split('|')[0])
print('comps', len(rows), 'beats', t, 'durations', sorted(Counter(a.values()).items()), 'off-beat chapters', off)
