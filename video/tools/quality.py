"""Collect the measured quality-bar results into out/quality_bar.md.
usage: python3 tools/quality.py out/film.mp4
Reads out/qa_film.json (tools/qa.py), out/audio_report.json (tools/mix.py), out/timeline.json,
docs/contrast.md, and measures frame one and the final mp4's stream properties."""
import json, re, subprocess, sys
import numpy as np

mp4 = sys.argv[1] if len(sys.argv) > 1 else 'out/film.mp4'
qa = json.load(open('out/qa_film.json'))
au = json.load(open('out/audio_report.json'))
tl = json.load(open('out/timeline.json'))


def probe(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', path], capture_output=True, text=True).stderr
    v = re.search(r'Video: (\w+).*?, (\d+)x(\d+).*?, ([\d.]+) fps', r)
    a = re.search(r'Audio: (\w+), (\d+) Hz', r)
    d = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r)
    return {'video': v.groups() if v else None, 'audio': a.groups() if a else None,
            'duration_s': int(d[1]) * 3600 + int(d[2]) * 60 + float(d[3]) if d else None}


def frame(path, t, w=480, h=270):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(t), '-i', path, '-frames:v', '1', '-vf', f'scale={w}:{h}',
                          '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w).astype(np.float32)


p = probe(mp4)
f0 = frame(mp4, 0)
edges0 = float(np.abs(np.diff(f0, axis=1)).mean())
cuts = [c['t'] for c in tl['cues'] if c['kind'] == 'whoosh']
off = [t for t in cuts if abs(t / 0.75 - round(t / 0.75)) > 0.01]
win = qa['frozen_per_30s']
over = [(i * 30, v) for i, v in enumerate(win) if v > 1.0]
# WCAG contrast of every text colour in the palette on every surface text sits on
def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
TEXT = {'INK': '#ECE9E2', 'DIM': '#9AA3AD', 'BLUE': '#58C4DD', 'TEAL': '#5CD0B3', 'GREEN': '#83C167', 'YELLOW': '#F4D35E',
        'GOLD': '#F0AC5F', 'RED': '#FC6255', 'PURPLE': '#B48EDB', 'THINK': '#8FA7D9'}
SURF = {'BG': '#0E1116', 'PANEL': '#151A21', 'background grid line': '#1C232B'}  # the brightest line of the baked background grid
pairs = {(a, b): (max(lum(x), lum(y)) + 0.05) / (min(lum(x), lum(y)) + 0.05) for a, x in TEXT.items() for b, y in SURF.items()}
worst = min(pairs, key=pairs.get)
mins = [pairs[worst]]

ok = lambda b: 'PASS' if b else 'FAIL'
rows = [
    ('Output format', f"{p['video']} · audio {p['audio']} · {p['duration_s']:.2f} s", ok(p['video'] and p['video'][1:3] == ('1920', '1080') and abs(float(p['video'][3]) - 60) < 0.01)),
    ('Frozen screen ≤ ~1 s per 30 s', f"worst window {max(win):.2f} s; windows over 1.0 s: {over if over else 'none'}", ok(max(win) <= 1.05)),
    ('No still longer than ~0.5 s', f"longest {qa['longest_still_s']} s; stills > 0.5 s: {qa['stills_over_0.5s']}", ok(qa['longest_still_s'] <= 0.6)),
    ('Frame one is a finished picture', f"mean edge energy at t=0: {edges0:.2f} (film median {qa['edge_mean']:.2f})", ok(edges0 > 0.5)),
    ('Every cut on a beat (80 BPM)', f"{len(cuts)} cuts, off-beat: {off if off else 'none'}", ok(not off)),
    ('Text contrast ≥ 4.5:1', f"{len(pairs)} palette text/surface pairs; worst {worst[0]} on {worst[1]} = {mins[0]:.2f}:1", ok(mins[0] >= 4.5)),
    ('Web loudness, steady', f"mix {au['mix']['I']} LUFS integrated, LRA {au['mix']['LRA']} LU, true peak {au['mix']['TP']} dBTP", ok(abs(au['mix']['I'] + 16) <= 1 and au['mix']['TP'] <= -1.0)),
    ('No clipping', f"sample peak {au['sample_peak_dBFS']} dBFS, clipped samples {au['clipped_samples']}", ok(au['clipped_samples'] == 0)),
    ('Effects never louder than the music', f"min (music − effects) momentary loudness while an effect sounds: {au['min_music_minus_sfx_LU_when_sfx_active']} LU", ok(au['min_music_minus_sfx_LU_when_sfx_active'] >= 0)),
    ('Music-only version', f"out/music_only.m4a · {au['music_only']['I']} LUFS, TP {au['music_only']['TP']} dBTP", ok(abs(au['music_only']['I'] + 16) <= 1)),
]
out = ['# Quality bar — measured results', '', f'File: `{mp4}`', '', '| check | measured | result |', '|---|---|---|']
out += [f'| {a} | {b} | {c} |' for a, b, c in rows]
out += ['', 'Not measurable by script (judged by the critic rounds — see docs/ledger.md, and listed in HUMAN_CHECK.md): no colliding text, sound-off comprehension, standing next to the references, 3D brand colours (sampled by critics: see ledger).']
open('out/quality_bar.md', 'w').write('\n'.join(out) + '\n')
print('\n'.join(out))
