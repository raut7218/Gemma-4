"""Mix music + sfx, normalise for the web, export a music-only version, mux into the film.

usage: python3 tools/mix.py out/film_silent.mp4 out/film.mp4
reads out/music_raw.wav and out/sfx_raw.wav (from tools/audio.py), writes
out/mix.wav, out/music_only.wav, out/music_only.m4a, out/audio_report.json and the muxed mp4.

Rules (from the brief): steady web loudness (-16 LUFS integrated, true peak <= -1.5 dBTP),
no clipping, effects never louder than the music. The effects are measured on their own:
the loudest effect (max short-term loudness of the sfx track) is held at least 1 LU below
the music's short-term loudness at the same moment, and never above the music's integrated level.
"""
import json, subprocess, sys
import numpy as np, soundfile as sf

FF = 'ffmpeg'
TARGET, TP = -16.0, -1.5


def st_loudness(x, sr, win=3.0, hop=0.1):
    """short-term loudness (K-weighted, 3 s window) per hop, in LUFS; implemented per BS.1770."""
    from scipy.signal import lfilter
    # K-weighting (48 kHz coefficients from BS.1770)
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    y = lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)
    p = (y ** 2).sum(axis=1)
    c = np.concatenate([[0], np.cumsum(p)])
    n, h = int(win * sr), int(hop * sr)
    idx = np.arange(0, len(p) - n, h)
    ms = (c[idx + n] - c[idx]) / n
    return -0.691 + 10 * np.log10(ms + 1e-12)


def integrated(path):
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = r[r.rfind('Summary:'):]
    g = lambda key: float(tail.split(key)[1].split()[0])
    return {'I': g('I:'), 'LRA': g('LRA:'), 'TP': g('Peak:')}


def norm(x, cur, target):
    return x * 10 ** ((target - cur) / 20)


def limit(x, ceil_db):
    """soft limiter: gain reduction only on peaks above the ceiling (sample peak, oversampled check after)."""
    c = 10 ** (ceil_db / 20)
    a = np.abs(x).max(axis=1)
    g = np.minimum(1.0, c / np.maximum(a, 1e-9))
    # smooth the gain (fast attack, 80 ms release) so it never clicks
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    g = uniform_filter1d(minimum_filter1d(g, 480), 480)
    return x * g[:, None]


def main(silent, out):
    music, sr = sf.read('out/music_raw.wav', always_2d=True)
    sfx, _ = sf.read('out/sfx_raw.wav', always_2d=True)
    n = max(len(music), len(sfx))
    music = np.pad(music, ((0, n - len(music)), (0, 0)))
    sfx = np.pad(sfx, ((0, n - len(sfx)), (0, 0)))

    sf.write('out/_m.wav', music, sr, subtype='FLOAT')
    mI = integrated('out/_m.wav')['I']
    music = norm(music, mI, TARGET - 1.0)  # leave room for the effects
    m_st = st_loudness(music, sr, win=0.4)
    s_st = st_loudness(sfx, sr, win=0.4)
    active = s_st > -60
    # gain for sfx: every effect window at least 1 LU under the music at that moment, and under the music's integrated level
    margin = np.minimum(m_st - 1.0, TARGET - 1.0) - s_st
    # one base level for all effects, lowered further only where the music is quiet (a per-moment cap)
    g_db = float(np.percentile(margin[active], 30)) if active.any() else 0.0
    curve = np.where(active, np.minimum(g_db, margin), g_db)
    # windows overlap: the cap at a sample is the min over the windows that contain it
    from scipy.ndimage import minimum_filter1d
    curve = minimum_filter1d(curve, 5)
    t_h = np.arange(len(curve)) * 0.1 + 0.2
    gs = np.interp(np.arange(len(sfx)) / sr, t_h, curve)
    sfx = sfx * (10 ** (gs / 20))[:, None]

    mix = music + sfx
    sf.write('out/_mix.wav', mix, sr, subtype='FLOAT')
    I = integrated('out/_mix.wav')['I']
    mix = limit(norm(mix, I, TARGET), TP - 0.3)
    sf.write('out/mix.wav', mix, sr, subtype='PCM_24')

    mo = limit(music * 10 ** (1.0 / 20), TP - 0.3)  # music was set to TARGET - 1
    sf.write('out/music_only.wav', mo, sr, subtype='PCM_24')

    for p in ['out/music_only.wav']:
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', p, '-c:a', 'aac', '-b:a', '256k', p.replace('.wav', '.m4a')], check=True)
    if silent != '-':
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', silent, '-i', 'out/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], check=True)

    # report (measured)
    s_after = st_loudness(sfx, sr, win=0.4); m_after = st_loudness(music, sr, win=0.4)
    act = s_after > -60
    rep = {
        'mix': integrated('out/mix.wav'),
        'music_only': integrated('out/music_only.wav'),
        'sfx_gain_db': round(g_db, 2),
        'sfx_max_momentary_LUFS': round(float(s_after[act].max()), 2) if act.any() else None,
        'music_momentary_at_that_moment_LUFS': round(float(m_after[act][np.argmax(s_after[act])]), 2) if act.any() else None,
        'min_music_minus_sfx_LU_when_sfx_active': round(float((m_after - s_after)[act].min()), 2) if act.any() else None,
        'sample_peak_dBFS': round(float(20 * np.log10(np.abs(mix).max() + 1e-12)), 2),
        'clipped_samples': int((np.abs(mix) >= 1.0).sum()),
    }
    if silent != '-':
        rep['muxed_file_loudness'] = integrated(out)
    json.dump(rep, open('out/audio_report.json', 'w'), indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '-', sys.argv[2] if len(sys.argv) > 2 else 'out/film.mp4')
