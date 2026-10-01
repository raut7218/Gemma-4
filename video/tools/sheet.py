"""Contact sheet: python3 tools/sheet.py in.mp4 out.png [--every 0.5] [--from S --to S] [--cols 8] [--w 320]"""
import argparse, subprocess, numpy as np
from PIL import Image, ImageDraw
ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('out')
ap.add_argument('--every', type=float, default=0.5); ap.add_argument('--from', dest='frm', type=float, default=0)
ap.add_argument('--to', type=float, default=None); ap.add_argument('--cols', type=int, default=8); ap.add_argument('--w', type=int, default=320)
a = ap.parse_args()
h = a.w * 9 // 16
args = ['ffmpeg', '-loglevel', 'error', '-ss', str(a.frm)] + (['-to', str(a.to)] if a.to else []) + ['-i', a.inp, '-vf', f'fps=1/{a.every},scale={a.w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
raw = subprocess.run(args, capture_output=True).stdout
n = len(raw) // (a.w * h * 3)
frames = np.frombuffer(raw[: n * a.w * h * 3], np.uint8).reshape(n, h, a.w, 3)
rows = (n + a.cols - 1) // a.cols
sheet = Image.new('RGB', (a.cols * a.w, rows * (h + 18)), (8, 10, 13))
d = ImageDraw.Draw(sheet)
for i in range(n):
    x, y = (i % a.cols) * a.w, (i // a.cols) * (h + 18)
    sheet.paste(Image.fromarray(frames[i]), (x, y))
    t = a.frm + i * a.every
    d.text((x + 4, y + h + 2), f'{int(t // 60)}:{t % 60:05.2f}', fill=(170, 180, 190))
sheet.save(a.out)
print(f'{n} frames -> {a.out}')
