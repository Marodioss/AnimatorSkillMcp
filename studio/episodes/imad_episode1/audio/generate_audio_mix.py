import json
import os
import subprocess
import sys
import wave
import numpy as np
from scipy import ndimage, signal

AUDIO_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(AUDIO_DIR)
STUDIO_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
REPO_ROOT = os.path.dirname(STUDIO_DIR)
ENGINE_AUDIO_DIR = os.path.join(
    STUDIO_DIR, "cartoon_engine", "src", "templates", "audio"
)
if ENGINE_AUDIO_DIR not in sys.path:
    sys.path.insert(0, ENGINE_AUDIO_DIR)

from dsp import (  # noqa: E402
    SR,
    TAU,
    ns,
    tt,
    rng,
    dbg,
    lp,
    hp,
    bp,
    peq,
    shelf,
    pan,
    st,
    place,
    fades,
    widen,
    make_ir,
    convolve_st,
    modal,
    integrated,
    momentary,
    short_term,
    lra,
    true_peak,
    read_wav,
    write_wav,
)

ASSETS_SFX_DIR = os.path.join(REPO_ROOT, "assets", "sfx")
VOICE_FILE = os.path.join(BASE_DIR, "voice", "voice.wav")
WORDS_FILE = os.path.join(BASE_DIR, "voice", "words.json")
SEGMENTS_FILE = os.path.join(BASE_DIR, "voice", "segments.json")
OUT_MIX = os.path.join(AUDIO_DIR, "master_mix.wav")
PUBLIC_MIX = os.path.join(
    STUDIO_DIR, "cartoon_engine", "public", "mix_imad_ep1.wav"
)

TOTAL_DURATION = 70.0
N = ns(TOTAL_DURATION)  # 3,360,000 samples @ 48 kHz
TARGET_LUFS = -14.4
CEIL_DBTP = -1.2


def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.075):
    """4x-oversampled look-ahead limiter."""
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    la = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * la + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * la + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3


def load_real_sfx(filename: str, dur_cap: float = 0.85, thresh: float = 0.015):
    """Loads an extracted real SFX WAV from assets/sfx, upsamples cleanly to 48kHz,
    aligns onset to the transient attack, and gates low-level stem bleed."""
    path = os.path.join(ASSETS_SFX_DIR, filename)
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        nch = w.getnchannels()
        raw = w.readframes(w.getnframes())
    x = np.frombuffer(raw, "<i2").astype(np.float64) / 32768.0
    if nch > 1:
        x = x.reshape(-1, nch).mean(1)
    if sr != SR:
        # 22050 -> 48000 ratio = 320 / 147
        g = np.gcd(SR, sr)
        x = signal.resample_poly(x, SR // g, sr // g)
    x = hp(x, 120, 2)
    pk = np.max(np.abs(x)) + 1e-12
    x = x / pk

    # Find exact onset before main transient
    pk_idx = int(np.argmax(np.abs(x)))
    pre = x[: pk_idx + 1]
    above = np.flatnonzero(np.abs(pre) > thresh)
    onset = max(0, int(above[0]) - ns(0.008)) if len(above) else max(0, pk_idx - ns(0.03))
    x = x[onset : onset + ns(dur_cap)]
    if len(x) < ns(0.05):
        return np.zeros(ns(0.1))

    # Soft noise-gate envelope after decay to eliminate background stem residue
    env = ndimage.maximum_filter1d(np.abs(x), ns(0.025))
    gate = np.clip((env - 0.025) / 0.04, 0.0, 1.0)
    gate = ndimage.uniform_filter1d(gate, ns(0.015))
    x *= gate
    return fades(x, 0.003, 0.04)


def build_voice_stem(segments, words):
    """Builds 48kHz stereo voice stem with subtle spatial panning, presence EQ,
    gentle consistency compression, and 4% warm cafe room glue."""
    mono_raw, sr = read_wav(VOICE_FILE)
    assert sr == SR
    v_mono = mono_raw[0] if mono_raw.shape[0] == 1 else mono_raw.mean(0)
    v_base = np.zeros(N, dtype=np.float64)
    v_base[: min(N, len(v_mono))] = v_mono[:N]

    # Clean vocal chain: 85Hz rumble cut + gentle 3kHz clarity + soft 10kHz air
    v_base = hp(v_base, 85, 2)
    v_base = peq(v_base, 3000, 1.6, q=0.9)
    v_base = shelf(v_base, 9500, 1.0, kind="high")

    # Subtle RMS leveling across segments so speaker dynamics stay cohesive (low LRA)
    out = np.zeros((2, N), dtype=np.float64)
    pan_map = {
        "imad_vo": 0.0,
        "narrator": 0.0,
        "sarah": -0.14,
        "imad": 0.14,
        "henderson": 0.22,
    }

    for seg in segments:
        s_idx = max(0, ns(seg["start"]) - ns(0.02))
        e_idx = min(N, ns(seg["end"]) + ns(0.04))
        seg_audio = v_base[s_idx:e_idx].copy()
        if len(seg_audio) == 0:
            continue
        # Soft per-segment RMS normalization
        rms = float(np.sqrt(np.mean(seg_audio**2)))
        if rms > 1e-5:
            seg_audio *= 0.135 / rms
        # Soft saturation / peak taming for gentle broadcast warmth
        seg_audio = np.tanh(seg_audio * 1.15) / 1.15
        p = pan_map.get(seg["speaker"], 0.0)
        st_seg = pan(seg_audio, p)
        out[:, s_idx:e_idx] += st_seg

    # Subtle cafe room air glue (very short, dry & intimate)
    cafe_ir = make_ir(
        0.38,
        seed=404,
        pre=0.006,
        hf=2.2,
        early=[(0.014, 0.22, -0.35), (0.024, 0.18, 0.40)],
    )
    wet = convolve_st(out.mean(0), cafe_ir)
    out = out + 0.045 * wet
    return out


def make_lofi_bgm(segments):
    """Generates warm stereo lofi Rhodes + upright bass + brushed groove + subtle vinyl warmth,
    choreographed to Episode 1 story beats (dramatic brake before cliffhanger, loop sting at end)."""
    r = rng(777)
    t = np.arange(N) / SR
    sig = np.zeros((2, N), dtype=np.float64)

    # 88 BPM -> quarter note = 0.6818s, bar (4 beats) = 2.727s
    q = 60.0 / 88.0
    bar_dur = 4.0 * q  # ~2.727s

    # Warm Ebmaj7 -> Cm7 -> Fm7 -> Bb9sus4 chord voicings (MIDI)
    prog = [
        ("Ebmaj7", 39, [55, 58, 62, 67]),
        ("Cm7", 36, [55, 58, 63, 67]),
        ("Fm7", 41, [56, 60, 63, 68]),
        ("Bb9sus4", 34, [56, 60, 63, 65]),
    ]

    def m2f(m):
        return 440.0 * (2.0 ** ((m - 69.0) / 12.0))

    # Music active up to Seg 12 start (cliffhanger), silent brake during Seg 12 panic, sting on Seg 13 CTA
    seg12_start = next(s["start"] for s in segments if s["id"] == 12)
    seg13_start = next(s["start"] for s in segments if s["id"] == 13)
    brake_t = seg12_start - 0.12

    bar_idx = 0
    tb = 0.0
    while tb < brake_t:
        name, bass_m, notes = prog[bar_idx % len(prog)]
        # Rhodes chord pad with bell tine transient & stereo width
        dur_c = min(bar_dur + 0.12, brake_t - tb + 0.08)
        if dur_c > 0.1:
            nc = ns(dur_c)
            tc = np.arange(nc) / SR
            env = np.exp(-0.55 * tc) * (1.0 - np.exp(-tc / 0.018))
            fade_tail = min(nc, ns(0.08))
            env[-fade_tail:] *= np.linspace(1, 0, fade_tail)
            chord_st = np.zeros((2, nc))
            for k, m in enumerate(notes):
                f = m2f(m)
                trem = 1.0 + 0.06 * np.sin(TAU * 3.8 * tc + k * 0.7)
                tine = np.exp(-tc / 0.035) * 0.18 * np.sin(TAU * f * 4.0 * tc)
                ep = (
                    0.68 * np.sin(TAU * f * tc + r.uniform(0, TAU))
                    + 0.22 * np.sin(TAU * 2 * f * tc + 0.2)
                    + 0.06 * np.sin(TAU * 3 * f * tc + 0.5)
                    + tine
                ) * trem
                p = -0.35 + 0.7 * (k / max(1, len(notes) - 1))
                chord_st += pan(ep * env * 0.22, p)
            # Gentle low-pass warmth on Rhodes
            chord_st = lp(chord_st, 3400, 2)
            place(sig, chord_st, tb)

        # Warm upright/sub bass on beat 1 and syncopated beat 2.5
        for b_off, b_m, b_dur, b_g in [(0.0, bass_m, 1.4, 0.28), (2.5 * q, bass_m + 7, 0.7, 0.18)]:
            bt = tb + b_off
            if bt >= brake_t - 0.05:
                continue
            bd = min(b_dur, brake_t - bt)
            nb = ns(bd)
            tb_arr = np.arange(nb) / SR
            bf = m2f(b_m)
            b_env = np.exp(-1.8 * tb_arr) * (1.0 - np.exp(-tb_arr / 0.012))
            b_wave = (np.sin(TAU * bf * tb_arr) + 0.25 * np.sin(TAU * 2 * bf * tb_arr)) * b_env * b_g
            place(sig, pan(b_wave, 0.0), bt)

        # Cozy lofi drums (enter softly on bar 0, groove cleanly)
        for step in range(8):
            st_t = tb + step * (q / 2.0)
            if st_t >= brake_t - 0.04:
                continue
            # Swing on off-8ths
            if step % 2 == 1:
                st_t += 0.025
            # Soft kick on 0, 3, 4
            if step in (0, 3, 4):
                kd = ns(0.18)
                kt = np.arange(kd) / SR
                kf = 54.0 * (1.0 + 1.4 * np.exp(-kt / 0.012))
                kw = np.sin(TAU * np.cumsum(kf) / SR) * np.exp(-kt / 0.065) * (1.0 - np.exp(-kt / 0.003))
                place(sig, pan(kw * 0.28, 0.0), st_t)
            # Dusty rim/snare on beats 2 & 4 (steps 2, 6)
            if step in (2, 6):
                sd = ns(0.14)
                st_arr = np.arange(sd) / SR
                rim = modal(0.14, [(380, 1.0, 0.018), (920, 0.5, 0.012)], r) * 0.45
                brush = bp(r.standard_normal(sd), 1100, 4800, 1) * np.exp(-st_arr / 0.032) * 0.5
                place(sig, pan((rim + brush) * 0.20, 0.12), st_t)
            # Soft brushed closed hi-hat
            hd = ns(0.055)
            ht = np.arange(hd) / SR
            hh = hp(r.standard_normal(hd), 5500, 2) * np.exp(-ht / 0.014) * (0.045 if step % 2 == 0 else 0.028)
            place(sig, pan(hh, -0.22), st_t)

        # Subtle bell melody sparkle every 2nd bar on calm moments
        if bar_idx % 2 == 1 and tb < 58.0:
            for k, (off, mm) in enumerate([(0.0, notes[-1] + 12), (1.5 * q, notes[2] + 12)]):
                mt = tb + off
                if mt < brake_t - 0.2:
                    bell = modal(0.8, [(m2f(mm), 1.0, 0.25), (m2f(mm) * 2.75, 0.2, 0.06)], r)
                    place(sig, pan(bell * 0.035, 0.35 if k == 0 else -0.35), mt)

        tb += bar_dur
        bar_idx += 1

    # Hard brake fade right before Seg 12 ("Wait...")
    b_samp = ns(brake_t)
    f_len = ns(0.06)
    sig[:, max(0, b_samp - f_len) : b_samp] *= np.linspace(1, 0, f_len)[None, :]
    sig[:, b_samp:] = 0.0

    # Upbeat loop-back sting on Seg 13 ("Hit follow for Episode two!")
    sting_dur = TOTAL_DURATION - seg13_start
    if sting_dur > 0.4:
        ns_st = ns(sting_dur)
        ts = np.arange(ns_st) / SR
        env_s = np.exp(-1.1 * ts) * (1.0 - np.exp(-ts / 0.01))
        for k, m in enumerate([39, 55, 58, 62, 67, 74]):
            f = m2f(m)
            w = (0.7 * np.sin(TAU * f * ts) + 0.2 * np.sin(TAU * 2 * f * ts)) * env_s
            place(sig, pan(w * 0.16, -0.3 + 0.12 * k), seg13_start)

    # Warm stereo cafe vinyl air (very subtle, filtered softly)
    air_l = bp(r.standard_normal(N), 250, 2600, 1) * 0.0028
    air_r = bp(r.standard_normal(N), 250, 2600, 1) * 0.0028
    sig += np.stack([air_l, air_r])

    # Gentle stereo hall warmth on music bed
    hall = make_ir(0.95, seed=909, pre=0.014, hf=2.0)
    sig = sig + 0.14 * convolve_st(sig, hall)
    sig = hp(sig, 35, 2)
    return sig


def speech_duck_curve(words, depth_db=-4.5, pre=0.06, post=0.14, att=0.05, rel=0.35):
    ctrl = 1000
    nc = int(TOTAL_DURATION * ctrl) + 2
    spans = []
    for w in words:
        s, e = float(w["s"]), float(w["e"])
        if spans and s - spans[-1][1] < 0.28:
            spans[-1][1] = max(spans[-1][1], e)
        else:
            spans.append([s, e])
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)) : min(nc, int((e + post) * ctrl))] = 1.0
    ka = 1 - np.exp(-1 / (att * ctrl))
    kr = 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    cur = 0.0
    for i in range(nc):
        tgt = va[i]
        cur += (tgt - cur) * (ka if tgt > cur else kr)
        env[i] = cur
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth_db * env)


def build_sfx_stem(segments):
    """Builds 48kHz stereo SFX stem combining clean real WAV hits from assets/sfx/
    and warm bespoke foley synced to segments.json & shot cuts (ZERO harsh buzzers!)."""
    r = rng(2026)
    sfx = np.zeros((2, N), dtype=np.float64)

    # Pre-load verified clean real SFX from assets/sfx/
    real_pop = load_real_sfx("sfx_04.wav", dur_cap=0.35)
    real_pop2 = load_real_sfx("sfx_27.wav", dur_cap=0.35)
    real_pop3 = load_real_sfx("sfx_28.wav", dur_cap=0.40)
    real_ding = load_real_sfx("sfx_01.wav", dur_cap=0.75)
    real_click = load_real_sfx("sfx_07.wav", dur_cap=0.30)
    real_whoosh = load_real_sfx("sfx_38.wav", dur_cap=0.55)
    real_whoosh2 = load_real_sfx("sfx_42.wav", dur_cap=0.65)
    real_cut = load_real_sfx("sfx_23.wav", dur_cap=0.35)

    def add_sfx(x, t_sec, gain=0.25, p=0.0):
        arr = pan(x, p) if x.ndim == 1 else x
        place(sfx, arr, t_sec, gain)

    # Segment boundary map for exact visual/story synchronization
    seg_by_id = {s["id"]: s for s in segments}

    # --- Scene 1: Ceramic mug clink & opening cuts ---
    mug = modal(0.32, [(1480, 1.0, 0.025), (2640, 0.65, 0.018), (4120, 0.35, 0.010)], r)
    add_sfx(fades(mug, 0.001, 0.04), 0.12, gain=0.28, p=0.18)
    add_sfx(real_pop, 2.55, gain=0.20, p=0.25)   # Shot 2 punch-in + HUD slide
    add_sfx(real_pop2, 5.30, gain=0.18, p=-0.25) # Shot 3 Sarah reaction cut

    # --- Scene 2: Karma Fund Rules marimba chimes & UI rule pops ---
    s2 = seg_by_id[2]
    # Warm crystal marimba arpeggio (Eb5, G5, Bb5, D6)
    for k, f in enumerate([622.25, 783.99, 932.33, 1174.66]):
        chime = modal(0.65, [(f, 1.0, 0.18), (f * 2.0, 0.25, 0.08), (f * 3.98, 0.1, 0.03)], r)
        add_sfx(fades(chime, 0.002, 0.05), s2["start"] - 0.14 + k * 0.08, gain=0.18, p=-0.2 + 0.13 * k)
    add_sfx(real_ding, s2["start"] - 0.10, gain=0.18, p=0.0)
    # Rule badge pops at 11.4s, 12.6s, 13.8s, 14.4s, 17.3s
    add_sfx(real_pop, s2["start"] + 2.40, gain=0.20, p=-0.2)
    add_sfx(real_click, s2["start"] + 3.55, gain=0.22, p=0.2)
    add_sfx(real_pop2, s2["start"] + 4.70, gain=0.20, p=0.0)
    add_sfx(real_whoosh, s2["start"] + 5.45, gain=0.20, p=0.0)
    add_sfx(real_cut, s2["start"] + 8.35, gain=0.22, p=0.0) # Extreme comedic zoom "$0!"

    # --- Scene 3: Sarah reality check & Audit Insert ---
    s3 = seg_by_id[3]
    s4 = seg_by_id[4]
    # Soft tablet / paper tap
    tap_t = tt(0.18)
    paper_tap = (lp(r.standard_normal(len(tap_t)), 900, 2) * np.exp(-tap_t / 0.015) * 0.9
                 + bp(r.standard_normal(len(tap_t)), 1400, 5000, 1) * np.exp(-tap_t / 0.025) * 0.35)
    add_sfx(fades(paper_tap, 0.001, 0.03), s3["start"] - 0.10, gain=0.28, p=-0.18)
    add_sfx(real_whoosh2, s3["start"] + 2.55, gain=0.20, p=0.1)  # Swipe into Audit Insert #2
    # Stamp thump exact on "bankrupt!" (23.27s = s3["start"] + 3.34s) & offer pop on "Paying" (24.09s = s3["start"] + 4.16s)
    stamp_t = tt(0.22)
    stamp = np.sin(TAU * 95 * np.exp(-6 * stamp_t) * stamp_t) * np.exp(-stamp_t / 0.04)
    add_sfx(fades(stamp, 0.001, 0.03), s3["start"] + 3.34, gain=0.26, p=0.0)
    add_sfx(real_pop, s3["start"] + 4.16, gain=0.20, p=0.15)
    add_sfx(real_pop2, s4["start"] - 0.08, gain=0.18, p=0.2) # Wink/smirk cut

    # --- Scene 4: Generous Overpay + Cash Register "Ching!" ---
    s5 = seg_by_id[5]
    s6 = seg_by_id[6]
    s7 = seg_by_id[7]
    add_sfx(real_pop, s5["start"] - 0.08, gain=0.18, p=0.15)
    add_sfx(real_click, s5["start"] + 2.75, gain=0.18, p=0.0)
    add_sfx(real_pop3, s6["start"] - 0.08, gain=0.18, p=-0.2) # Facepalm +$50k
    add_sfx(real_pop, s7["start"] - 0.06, gain=0.18, p=0.15) # "Perfect!"
    # Celebratory Ka-Ching! right on "We pay everyone today!" & Shot 17 sparkles (41.0s)
    ching = (
        modal(0.55, [(2093.0, 1.0, 0.16), (3135.96, 0.7, 0.12), (4186.0, 0.4, 0.08)], r)
        + np.pad(modal(0.65, [(2637.0, 1.0, 0.22), (3951.1, 0.65, 0.15)], r), (ns(0.08), 0))[: ns(0.55)]
    )
    add_sfx(fades(ching, 0.001, 0.06), s7["end"] - 1.50, gain=0.24, p=0.20)
    add_sfx(real_ding, s7["end"] - 0.45, gain=0.18, p=0.0)

    # --- Scene 5: Cafe door bell + Mr. Henderson enters ---
    s8 = seg_by_id[8]
    bell = (
        modal(0.75, [(1567.98, 1.0, 0.22), (3135.96, 0.35, 0.10)], r)
        + np.pad(modal(0.75, [(2093.0, 1.0, 0.26), (4186.0, 0.3, 0.12)], r), (ns(0.11), 0))[: ns(0.75)]
    )
    add_sfx(fades(bell, 0.002, 0.08), s8["start"] - 0.16, gain=0.22, p=-0.35)
    # Soft footsteps
    for k in range(4):
        ft = tt(0.15)
        step = np.sin(TAU * 110 * np.exp(-10 * ft) * ft) * np.exp(-ft / 0.025)
        add_sfx(fades(step, 0.001, 0.02), s8["start"] + 0.35 + k * 0.42, gain=0.14, p=-0.3 + 0.12 * k)
    add_sfx(real_whoosh, s8["start"] + 2.80, gain=0.16, p=0.0)
    add_sfx(real_pop, s8["start"] + 5.60, gain=0.16, p=0.2)

    # --- Scene 6: Golden Signature & HUD update ---
    s9 = seg_by_id[9]
    s10 = seg_by_id[10]
    add_sfx(real_pop2, s9["start"] - 0.10, gain=0.16, p=0.25)
    # Pen glide + PAID stamp on Insert #3
    pen_t = tt(0.45)
    pen_glide = bp(r.standard_normal(len(pen_t)), 2200, 6200, 1) * np.sin(np.pi * pen_t / 0.45) * 0.25
    add_sfx(pen_glide, s10["start"] + 0.25, gain=0.24, p=0.0)
    add_sfx(fades(stamp, 0.001, 0.03), s10["start"] + 1.35, gain=0.28, p=0.0)
    add_sfx(real_ding, s10["start"] + 3.15, gain=0.20, p=0.0)

    # --- Scene 7: Antique Brass Key + Clean Crimson Alert + Panic + CTA ---
    s11 = seg_by_id[11]
    s12 = seg_by_id[12]
    s13 = seg_by_id[13]

    # Brass key clinks
    for k, fk in enumerate([2349.3, 3322.4, 4186.0]):
        cl = modal(0.28, [(fk, 1.0, 0.05), (fk * 1.62, 0.5, 0.03)], r)
        add_sfx(fades(cl, 0.001, 0.04), s11["start"] + 2.15 + k * 0.07, gain=0.18, p=0.15)
    add_sfx(real_whoosh, s11["start"] + 2.05, gain=0.18, p=0.0)

    # Clean Vinyl Scratch + Crystal/Sub Alert Hit BEFORE Imad speaks ("Wait...") — zero buzzer masking!
    sc_t = tt(0.26)
    scratch = np.sin(TAU * np.cumsum(950 * np.exp(-9 * sc_t) + 120)) * np.sin(np.pi * sc_t / 0.26)
    add_sfx(fades(scratch, 0.002, 0.03), s12["start"] - 0.22, gain=0.24, p=-0.1)

    # Clean musical minor-2nd crystal chime + warm sub drop (replaces harsh square wave!)
    alert_chime = (
        modal(0.75, [(587.33, 0.9, 0.22), (622.25, 0.9, 0.22), (830.61, 0.7, 0.18)], r)
        + np.sin(TAU * np.cumsum(110 * np.exp(-5 * tt(0.75)) + 48)) * np.exp(-tt(0.75) / 0.18) * 0.65
    )
    add_sfx(fades(alert_chime, 0.002, 0.08), s12["start"] - 0.08, gain=0.25, p=0.0)
    # Soft second alert pulse cleanly between "dollars?!" and "Nooo!"
    pulse2 = modal(0.35, [(830.61, 1.0, 0.10), (1244.5, 0.5, 0.07)], r)
    add_sfx(fades(pulse2, 0.002, 0.05), s12["end"] - 0.85, gain=0.18, p=0.0)
    add_sfx(real_pop3, s12["end"] - 0.65, gain=0.24, p=0.0)

    # CTA Pop + Ding
    add_sfx(real_pop2, s13["start"] - 0.08, gain=0.24, p=0.0)
    add_sfx(real_ding, s13["start"] - 0.05, gain=0.22, p=0.0)

    # Room reverb on SFX stem
    sfx_ir = make_ir(0.65, seed=314, pre=0.008, hf=1.8)
    sfx = sfx + 0.14 * convolve_st(sfx, sfx_ir)
    sfx = hp(sfx, 35, 2)
    return sfx


def ffmpeg_ebur128(path):
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
        timeout=120,
    )
    txt = r.stderr
    idx = txt.rfind("Summary:")
    return txt[idx:] if idx >= 0 else txt[-1000:]


def mix():
    print("=" * 72, flush=True)
    print("  EPISODE 1 BROADCAST AUDIO MIXER (48kHz STEREO / -14.4 LUFS)", flush=True)
    print("=" * 72, flush=True)

    with open(WORDS_FILE, "r", encoding="utf-8") as f:
        words = json.load(f)
    with open(SEGMENTS_FILE, "r", encoding="utf-8") as f:
        segments = json.load(f)

    v = build_voice_stem(segments, words)
    v_lufs = integrated(v)
    print(f"Voice stem (stereo): {v_lufs:.2f} LUFS, TP {true_peak(v):.2f} dBTP", flush=True)

    m_raw = make_lofi_bgm(segments)
    m_raw_lufs = integrated(m_raw)
    # Place BGM ~9.0 LU under voice before -4.2 dB speech ducking -> ~12.8 LU under speech, blooming in gaps
    m_base = m_raw * dbg((v_lufs - 9.0) - m_raw_lufs)
    dk = speech_duck_curve(words, depth_db=-4.2)
    m = m_base * dbg(dk)[None, :]
    print(f"Music stem (ducked): {integrated(m):.2f} LUFS (margin {v_lufs - integrated(m):.1f} LU)", flush=True)

    s_raw = build_sfx_stem(segments)
    s_lufs = integrated(s_raw)
    # Place SFX integrated ~13.0 LU below voice (punchy transients without fatiguing speech)
    s = s_raw * dbg((v_lufs - 13.0) - s_lufs) if np.isfinite(s_lufs) else s_raw
    print(f"SFX stem:            {integrated(s):.2f} LUFS", flush=True)

    mix0 = v + m + s
    gain_db = TARGET_LUFS - integrated(mix0)
    for it in range(6):
        y, gr = limiter(mix0 * dbg(gain_db))
        cur_i = integrated(y)
        print(
            f"Master pass {it}: gain {gain_db:+.2f} dB -> {cur_i:.2f} LUFS, TP {true_peak(y):.2f} dBTP, maxGR {-20*np.log10(gr.min()):.2f} dB",
            flush=True,
        )
        if abs(cur_i - TARGET_LUFS) < 0.03:
            break
        gain_db += TARGET_LUFS - cur_i

    # Clean end fade (25ms)
    fade_n = ns(0.025)
    y[:, -fade_n:] *= np.linspace(1, 0, fade_n)[None, :]

    assert y.shape == (2, N), f"Expected (2, {N}), got {y.shape}"
    final_i = integrated(y)
    final_lra = lra(y)
    final_tp = true_peak(y)
    assert -15.0 <= final_i <= -14.0, f"Integrated LUFS {final_i:.2f} out of [-15.0, -14.0]!"
    assert final_lra <= 4.0, f"LRA {final_lra:.2f} exceeds 4.0 LU!"
    assert final_tp <= -1.0, f"True Peak {final_tp:.2f} exceeds -1.0 dBTP!"

    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(PUBLIC_MIX), exist_ok=True)
    write_wav(OUT_MIX, y, bits=24)
    write_wav(PUBLIC_MIX, y, bits=24)

    print(f"\n[OK] Master Mix -> {OUT_MIX} & {PUBLIC_MIX}", flush=True)
    print(
        f"[AUDIT] 48kHz Stereo (2 x {N} = {N/SR:.3f}s) | Integrated: {final_i:.2f} LUFS | LRA: {final_lra:.2f} LU | TP: {final_tp:.2f} dBTP",
        flush=True,
    )
    print("\nffmpeg ebur128 verification:")
    print(ffmpeg_ebur128(PUBLIC_MIX))


if __name__ == "__main__":
    mix()
