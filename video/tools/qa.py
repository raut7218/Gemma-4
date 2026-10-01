"""Motion QA over every frame: python3 tools/qa.py in.mp4 [--json out.json]
Reports frozen stretches (mean abs frame difference below a threshold), frozen time per 30 s
window, the longest still stretch, cuts (very large differences), and brightness/edge stats."""
import argparse, json, subprocess, numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('--json'); ap.add_argument('--thresh', type=float, default=0.06)
a = ap.parse_args()
W, H = 384, 216
p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', a.inp, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
fps = 60.0
prev = None; diffs = []; bright = []; edges = []
while True:
    buf = p.stdout.read(W * H)
    if len(buf) < W * H: break
    f = np.frombuffer(buf, np.uint8).astype(np.float32)
    img = f.reshape(H, W)
    bright.append(float(img.mean()))
    edges.append(float(np.abs(np.diff(img, axis=1)).mean()))
    if prev is not None: diffs.append(float(np.abs(f - prev).mean()))
    prev = f
diffs = np.array(diffs); n = len(diffs) + 1
still = diffs < a.thresh
# still stretches
stretches = []; i = 0
while i < len(still):
    if still[i]:
        j = i
        while j < len(still) and still[j]: j += 1
        stretches.append((i / fps, (j - i) / fps)); i = j
    else: i += 1
long = [(round(s, 2), round(d, 2)) for s, d in stretches if d > 0.5]
win = []
for w0 in range(0, int(np.ceil(n / fps / 30))):
    lo, hi = int(w0 * 30 * fps), int(min(len(still), (w0 + 1) * 30 * fps))
    win.append(round(float(still[lo:hi].sum() / fps), 2))
cuts = [round(i / fps, 2) for i in np.where(diffs > 18)[0]]
rep = {
    'frames': n, 'seconds': round(n / fps, 2), 'threshold': a.thresh,
    'frozen_total_s': round(float(still.sum() / fps), 2),
    'frozen_per_30s_max': max(win) if win else 0, 'frozen_per_30s': win,
    'longest_still_s': round(max([d for _, d in stretches], default=0), 2),
    'stills_over_0.5s': long[:200], 'n_stills_over_0.5s': len(long),
    'cuts': cuts[:200], 'n_cuts': len(cuts),
    'brightness_mean': round(float(np.mean(bright)), 1), 'edge_mean': round(float(np.mean(edges)), 2),
    'motion_median': round(float(np.median(diffs)), 3),
}
s = json.dumps(rep, indent=1)
if a.json: open(a.json, 'w').write(s)
print(json.dumps({k: v for k, v in rep.items() if k not in ('frozen_per_30s', 'stills_over_0.5s', 'cuts')}, indent=1))
if long: print('stills > 0.5 s (start, length):', long[:30])
