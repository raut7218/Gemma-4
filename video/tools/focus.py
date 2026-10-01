"""Adds reading beats to dense storyboard rows, then fits durations to 24:00 exactly.

A reading beat is its own composition: it re-frames onto the row's key term with one named
action (push-in, underline, lift, or an echo of an earlier object), so text has time to land
and the frame keeps moving. Durations use half beats inside chapters; every chapter's total
is a whole number of beats, so chapter changes (cuts) fall on the beat.
"""
import re, random
P = 'docs/storyboard.src'
L = open('docs/storyboard.v3core.src').read().split('\n')
random.seed(7)
TARGET_COMPS, TARGET_BEATS = 584, 1920

def quoted(scr):
    return re.findall(r'"([^"]+)"', scr) + re.findall(r'`([^`]+)`', scr)

def key_term(scr):
    q = quoted(scr)
    num = [x for x in q if re.search(r'\d', x)]
    pick = (num or sorted(q, key=len, reverse=True) or [''])[0]
    return pick if len(pick) <= 60 else pick[:57].rsplit(' ', 1)[0] + '…'

def load(scr):
    return sum(len(x.split()) for x in quoted(scr))

rows = [i for i, l in enumerate(L) if re.match(r'^[\d.]+ \|', l)]
cands = []
for i in rows:
    beats, scr, purp, leave, carry = [p.strip() for p in L[i].split(' | ', 4)]
    if scr.startswith('FULL') or 'RAIL rewrites' in leave: continue
    if not quoted(scr): continue
    cands.append((load(scr), i))
cands.sort(reverse=True)
need = TARGET_COMPS - len(rows)
chosen = sorted(i for _, i in cands[:need])
KINDS = ['push', 'underline', 'lift', 'echo']
out, k = [], 0
for i, l in enumerate(L):
    out.append(l)
    if i in chosen:
        beats, scr, purp, leave, carry = [p.strip() for p in l.split(' | ', 4)]
        term = key_term(scr)
        kind = KINDS[k % 4]; k += 1
        if kind == 'echo' and carry in ('—', ''): kind = 'push'
        desc = {
            'push': f'reading beat: the camera pushes in on "{term}"; it brightens while the rest of the frame dims a step',
            'underline': f'reading beat: an underline sweeps under "{term}" and the term warms to its colour',
            'lift': f'reading beat: "{term}" lifts toward the camera, holds, and settles back',
            'echo': f'reading beat: a faint echo of the {carry} slides in beside "{term}", then recedes',
        }[kind]
        out[-1] = f'{beats} | {scr} | {purp} | the reading beat takes over without a cut | {carry}'
        out.append(f'2.5 | {desc} | let "{term}" land | {leave} | {carry}')
L = out

# ---- durations: by reading load, half beats, chapters on whole beats, total exact
rows = [i for i, l in enumerate(L) if re.match(r'^[\d.]+ \|', l)]
def rload(i):
    scr = L[i].split(' | ')[1]
    return load(scr) + (2 if scr.startswith(('WIDE', 'OVER', '3D', 'CLOSE')) else 0) + (3 if scr.startswith('FULL') else 0)
loads = {i: rload(i) for i in rows}
best = None
for kk in [x / 200 for x in range(1, 200)]:
    a = {i: min(4.5, max(2.0, round((2.0 + kk * loads[i]) * 2) / 2)) for i in rows}
    if L[rows[0]].split(' | ')[1].startswith('reading'): pass
    tot = sum(a.values())
    if best is None or abs(tot - TARGET_BEATS) < abs(best[0] - TARGET_BEATS): best = (tot, kk, a)
tot, kk, a = best
for i in rows:  # reading beats stay short and even
    if L[i].split(' | ')[1].startswith('reading beat'): a[i] = 2.5 if a[i] > 2.5 else 2.0
# nudge to the exact total, highest-load rows first when lengthening
def nudge(diff):
    order = sorted(rows, key=lambda i: -loads[i]) if diff > 0 else sorted(rows, key=lambda i: loads[i])
    for i in order:
        if diff == 0: break
        if L[i].split(' | ')[1].startswith('reading beat'): continue
        if diff > 0 and a[i] < 4.5: a[i] += 0.5; diff -= 0.5
        elif diff < 0 and a[i] > 2.0: a[i] -= 0.5; diff += 0.5
    return diff
# per-chapter integer targets that sum to TARGET_BEATS, then nudge rows inside each chapter
chap, cur = [], []
for i, l in enumerate(L):
    if l.startswith('## '):
        if cur: chap.append(cur)
        cur = []
    elif i in a: cur.append(i)
chap.append(cur)
raw = [sum(a[i] for i in ch) for ch in chap]
scale = TARGET_BEATS / sum(raw)
tg = [int(round(r * scale)) for r in raw]
tg[-1] += TARGET_BEATS - sum(tg)
for ch, t in zip(chap, tg):
    diff = t - sum(a[i] for i in ch)
    order = sorted(ch, key=lambda i: -loads[i]) if diff > 0 else sorted(ch, key=lambda i: loads[i])
    guard = 0
    while abs(diff) > 1e-9 and guard < 50:
        moved = False
        for i in order:
            if abs(diff) < 1e-9: break
            rb = L[i].split(' | ')[1].startswith('reading beat')
            lo, hi = (2.0, 3.0) if rb else (2.0, 4.5)
            step = 0.5 if diff > 0 else -0.5
            if lo <= a[i] + step <= hi: a[i] += step; diff -= step; moved = True
        guard += 1
        if not moved: break
    assert abs(diff) < 1e-9, ('chapter cannot fit', t)
for i in rows:
    v = a[i]
    L[i] = (str(int(v)) if v == int(v) else str(v)) + ' |' + L[i].split('|', 1)[1]
open(P, 'w').write('\n'.join(L))
from collections import Counter
print('comps', len(rows), 'beats', sum(a.values()), 'durations', sorted(Counter(a.values()).items()))
