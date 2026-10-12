import numpy as np, wave
sr = 44100; bpm = 96; beat = 60 / bpm; bars = 11; dur = bars * 4 * beat
n = int(sr * dur); t = np.arange(n) / sr
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
prog = [[45, 48, 52, 57], [41, 45, 48, 53], [48, 52, 55, 60], [43, 47, 50, 55]]  # Am F C G
out = np.zeros(n)
def env(length, a, r):
    e = np.ones(length); na = max(1, int(a * sr)); nr = max(1, int(r * sr))
    e[:na] = np.linspace(0, 1, na); e[-nr:] = np.minimum(e[-nr:], np.linspace(1, 0, nr)); return e
for b in range(bars):
    notes = prog[b % 4]; i0 = int(b * 4 * beat * sr); L = int(4 * beat * sr) + int(0.25 * sr); L = min(L, n - i0)
    tt = np.arange(L) / sr; pad = np.zeros(L)
    for m in notes:
        f = hz(m)
        for det in (-0.004, 0.0, 0.004):
            pad += (np.sin(2*np.pi*f*(1+det)*tt) + 0.35*np.sin(2*np.pi*2*f*(1+det)*tt) + 0.12*np.sin(2*np.pi*3*f*tt))
    pad *= 0.045 * env(L, 0.35, 0.5)
    out[i0:i0+L] += pad
    # baixo
    for k in (0, 2):
        j0 = i0 + int(k * beat * sr); lb = int(1.4 * beat * sr); lb = min(lb, n - j0)
        if lb <= 0: continue
        tb = np.arange(lb) / sr
        out[j0:j0+lb] += 0.22 * np.sin(2*np.pi*hz(notes[0]-12)*tb) * np.exp(-tb*2.2)
    # arpejo (pluck) em colcheias
    for k in range(8):
        j0 = i0 + int(k * beat / 2 * sr); lp = int(0.45 * sr); lp = min(lp, n - j0)
        if lp <= 0: continue
        m = notes[[1, 2, 3, 2, 1, 3, 2, 3][k]] + 12
        tp = np.arange(lp) / sr
        out[j0:j0+lp] += 0.07 * (np.sin(2*np.pi*hz(m)*tp) + 0.4*np.sin(2*np.pi*2*hz(m)*tp)) * np.exp(-tp*9)
# pulso: bumbo suave em cada tempo + chimbal nos contratempos
rng = np.random.default_rng(7)
for k in range(int(dur / beat)):
    j0 = int(k * beat * sr); lk = min(int(0.22 * sr), n - j0)
    if lk > 0:
        tk = np.arange(lk) / sr; f = 50 + 90 * np.exp(-tk * 28)
        out[j0:j0+lk] += 0.42 * np.sin(2*np.pi*np.cumsum(f)/sr) * np.exp(-tk * 14)
    j1 = j0 + int(beat / 2 * sr); lh = min(int(0.05 * sr), n - j1)
    if lh > 0:
        nz = rng.standard_normal(lh); nz = np.diff(nz, prepend=0)
        out[j1:j1+lh] += 0.05 * nz * np.exp(-np.arange(lh) / sr * 60)
# fade in/out e normalizacao
out *= np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 1.2)
out = out / np.max(np.abs(out)) * 0.7
st = np.stack([out, out], axis=1)
pcm = (st * 32767).astype("<i2")
with wave.open("trilha.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
print("trilha:", round(dur, 1), "s")
