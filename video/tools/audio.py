"""Deterministic score and sound effects for the film.

Reads out/timeline.json (duration, chapters, cues written by the renderer) and writes
  out/music.wav  — music only (also the required music-only deliverable)
  out/sfx.wav    — effects only
  out/mix.wav    — music + effects, loudness-normalised for web

Music: 80 BPM in D major. A soft pad, a felt-piano arpeggio and a sub bass, two bars per
chord. Energy follows the chapters. Every random choice is seeded, so it renders the same
every time. Effects: one soft whoosh per scene change, small clicks/ticks/pops on on-screen
actions only, each band-limited so it sits just above the music in its own range.
"""
import json
import sys
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
BPM = 80
BEAT = 60 / BPM
BAR = 4 * BEAT
rng_master = np.random.default_rng(20261202)

tl = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'out/timeline.json'))
DUR = float(tl['dur']) + 0.5
N = int(DUR * SR)
CH = tl['ch']
CUES = tl['cues']

def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# ---------------------------------------------------------------- harmony
D = 62  # D4
CHORDS = {  # semitone offsets from D, voiced close
    'I': [0, 4, 7], 'vi': [-3, 0, 4], 'IV': [-5, -1, 2], 'V': [-3, 1, 4], 'ii': [-10, -7, -3], 'iii': [-8, -5, -1],
    'Iadd9': [0, 4, 7, 14], 'IVmaj7': [-5, -1, 2, 6],
}
PROGS = [
    ['I', 'vi', 'IV', 'V'],
    ['vi', 'IV', 'I', 'V'],
    ['IV', 'I', 'V', 'vi'],
    ['Iadd9', 'IVmaj7', 'vi', 'V'],
    ['ii', 'V', 'I', 'vi'],
]
ROOTS = {'I': 0, 'vi': -3, 'IV': -7, 'V': -5, 'ii': -10, 'iii': -8, 'Iadd9': 0, 'IVmaj7': -7}

# chapter energy 0..1 (density of the arpeggio and pad brightness)
def chapter_at(t):
    k = 0
    for i, c in enumerate(CH):
        if c['t'] <= t:
            k = i
    return k

ENERGY = {}
for i, c in enumerate(CH):
    n = c['name'].lower()
    e = 0.55
    if 'cold open' in n: e = 0.75
    if 'model' in n or 'context' in n: e = 0.6
    if 'failure' in n: e = 0.45
    if 'history' in n or 'got here' in n: e = 0.5
    if 'read' in n: e = 0.4
    if 'where to start' in n: e = 0.8
    ENERGY[i] = e

# ---------------------------------------------------------------- instruments
def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.full(n, s, dtype=np.float32)
    if a: e[:a] = np.linspace(0, 1, a)
    if d: e[a:a + d] = np.linspace(1, s, min(d, max(0, n - a)))[: max(0, min(d, n - a))]
    if r and n > r: e[-r:] *= np.linspace(1, 0, r)
    return e

def pad_note(freq, dur, bright):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n, dtype=np.float32)
    for det in (-0.07, 0.0, 0.065):  # detuned saws, band-limited by the low-pass below
        f = freq * 2 ** (det / 12)
        ph = (t * f) % 1.0
        x += (2 * ph - 1).astype(np.float32)
    b, a = signal.butter(2, min(0.45, (500 + 900 * bright) / (SR / 2)))
    x = signal.lfilter(b, a, x).astype(np.float32)
    return x * env_adsr(n, 1.6, 0.5, 0.85, 1.8) / 3

def pluck(freq, vel):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * freq * t) + 0.28 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 6)
         + 0.08 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 9))
    e = np.exp(-t * 3.2) * np.minimum(1, t / 0.004)
    return (x * e * vel).astype(np.float32)

def bass(freq):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.15 * np.sin(4 * np.pi * freq * t)
    return (x * np.exp(-t * 1.3) * np.minimum(1, t / 0.02)).astype(np.float32)

def place(buf, x, at):
    i = int(at * SR)
    if i >= len(buf): return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]

# ---------------------------------------------------------------- compose
padL = np.zeros(N, np.float32); padR = np.zeros(N, np.float32)
arpL = np.zeros(N, np.float32); arpR = np.zeros(N, np.float32)
bas = np.zeros(N, np.float32)

chord_len = 2 * BAR
nchords = int(np.ceil(DUR / chord_len))
for k in range(nchords):
    t0 = k * chord_len
    ch = chapter_at(t0)
    prog = PROGS[ch % len(PROGS)]
    name = prog[(k) % len(prog)]
    notes = [D + o for o in CHORDS[name]]
    e = ENERGY.get(ch, 0.5)
    # pad: chord one octave down, slightly wider stereo for the upper voices
    for j, m in enumerate(notes):
        x = pad_note(midi_hz(m - 12), chord_len + 1.8, e)
        pan = 0.5 + (j - (len(notes) - 1) / 2) * 0.18
        place(padL, x * (1 - pan) * 2, t0)
        place(padR, x * pan * 2, t0)
    # bass on each bar
    root = D - 24 + ROOTS[name]
    for b in range(2):
        place(bas, bass(midi_hz(root)) * 0.9, t0 + b * BAR)
    # arpeggio: eighth notes, seeded per chord, density from energy
    rng = np.random.default_rng(1000 + k)
    pattern_notes = sorted(notes) + [notes[0] + 12, notes[1] + 12]
    for s in range(16):
        t = t0 + s * BEAT / 2
        if t > DUR - 4: break
        if s % 4 != 0 and rng.random() > e: continue
        m = pattern_notes[(s * 3 + k) % len(pattern_notes)] + 12
        vel = 0.42 + 0.3 * rng.random() + (0.12 if s % 4 == 0 else 0)
        x = pluck(midi_hz(m), vel)
        pan = 0.35 + 0.3 * ((s * 7 + k) % 5) / 4
        place(arpL, x * (1 - pan) * 2, t)
        place(arpR, x * pan * 2, t)

# reverb: synthetic exponentially decaying noise impulse, convolved by FFT
def reverb(x, seed, length=2.8, decay=2.2):
    n = int(length * SR)
    r = np.random.default_rng(seed)
    ir = (r.standard_normal(n) * np.exp(-np.arange(n) / SR * decay)).astype(np.float32)
    b, a = signal.butter(1, 5000 / (SR / 2))
    ir = signal.lfilter(b, a, ir).astype(np.float32)
    ir /= np.sqrt(np.sum(ir ** 2))
    return signal.fftconvolve(x, ir)[: len(x)].astype(np.float32)

wetL = reverb(arpL * 0.6 + padL * 0.3, 7)
wetR = reverb(arpR * 0.6 + padR * 0.3, 8)
musL = padL * 0.55 + arpL * 0.5 + bas * 0.55 + wetL * 0.45
musR = padR * 0.55 + arpR * 0.5 + bas * 0.55 + wetR * 0.45
# gentle high-pass to keep the low end clean, fade in/out
b, a = signal.butter(2, 32 / (SR / 2), 'high')
musL = signal.lfilter(b, a, musL).astype(np.float32); musR = signal.lfilter(b, a, musR).astype(np.float32)
fade = np.ones(N, np.float32)
fi, fo = int(1.5 * SR), int(4.0 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
musL *= fade; musR *= fade

# ---------------------------------------------------------------- effects
def whoosh(seed):
    n = int(0.62 * SR)
    r = np.random.default_rng(seed)
    x = r.standard_normal(n).astype(np.float32)
    t = np.arange(n) / n
    out = np.zeros(n, np.float32)
    # band-pass sweep: chunked filtering with a moving centre frequency
    step = 512
    zi = None
    for i in range(0, n, step):
        fc = 350 + 2600 * np.sin(np.pi * min(1, (i / n) * 1.0)) ** 2
        b, a = signal.butter(2, [max(60, fc * 0.6) / (SR / 2), min(SR / 2 - 100, fc * 1.6) / (SR / 2)], 'band')
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        y, zi = signal.lfilter(b, a, x[i:i + step], zi=zi)
        out[i:i + step] = y
    env = np.sin(np.pi * t) ** 1.6
    return out * env * 0.5

def click():
    n = int(0.035 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 180)).astype(np.float32) * 0.5

def tick():
    n = int(0.02 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3100 * t) * np.exp(-t * 300)).astype(np.float32) * 0.35

def pop():
    n = int(0.09 * SR); t = np.arange(n) / SR
    f = 620 * np.exp(-t * 18) + 180
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 30)).astype(np.float32) * 0.6

sfxL = np.zeros(N, np.float32); sfxR = np.zeros(N, np.float32)
FX = {'click': click, 'tick': tick, 'pop': pop}
for i, c in enumerate(CUES):
    if c['kind'] == 'whoosh':
        x = whoosh(i) * 0.55
        place(sfxL, x * 0.9, max(0, c['t'] - 0.28)); place(sfxR, x, max(0, c['t'] - 0.26))
    elif c['kind'] in FX:
        x = FX[c['kind']]()
        place(sfxL, x, c['t']); place(sfxR, x, c['t'])
# effects live above the music's main band: gentle high-pass, then a soft limiter (cap)
b, a = signal.butter(2, 250 / (SR / 2), 'high')
sfxL = signal.lfilter(b, a, sfxL).astype(np.float32); sfxR = signal.lfilter(b, a, sfxR).astype(np.float32)
cap = 0.25
sfxL = np.tanh(sfxL / cap) * cap; sfxR = np.tanh(sfxR / cap) * cap

music = np.stack([musL, musR], 1)
sfx = np.stack([sfxL, sfxR], 1)
peak = np.max(np.abs(music)) + 1e-9
music *= 0.5 / peak
sf.write('out/music_raw.wav', music, SR, subtype='PCM_24')
sf.write('out/sfx_raw.wav', sfx, SR, subtype='PCM_24')
print(f'wrote out/music_raw.wav and out/sfx_raw.wav ({DUR:.1f} s, {len(CUES)} cues)')
