#!/usr/bin/env python3
"""
Procedural DSP Audio Synthesizer for Comic Noir & Spider-Verse Style Shorts.
Generates vinyl crackle, 808 sub-bass drops, and explosive comic hit stingers.
"""

import math
import numpy as np
from scipy import signal

SR = 48000

def generate_vinyl_crackle(duration_sec=3.0, noise_level=0.04, pop_prob=0.0008):
    """Generates authentic analog vinyl needle hiss and dust pops."""
    n_samples = int(SR * duration_sec)
    # Background hiss
    hiss = np.random.normal(0, noise_level, n_samples)
    b, a = signal.butter(2, [300 / (SR / 2), 6500 / (SR / 2)], btype="band")
    hiss = signal.lfilter(b, a, hiss)

    # Dust pops / clicks
    pops = np.zeros(n_samples)
    pop_indices = np.where(np.random.rand(n_samples) < pop_prob)[0]
    for idx in pop_indices:
        amp = np.random.uniform(0.15, 0.45)
        length = min(n_samples - idx, int(SR * 0.003))
        t = np.linspace(0, 1, length)
        pops[idx:idx + length] += amp * np.sin(2 * np.pi * 1200 * t) * np.exp(-12 * t)

    return hiss + pops

def generate_808_sub_drop(duration_sec=1.5, f_start=95.0, f_end=32.0, amp=0.85):
    """Generates a heavy decaying 808 sub-bass kick impact."""
    n_samples = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n_samples)
    # Exponential pitch sweep
    freq = f_start * ((f_end / f_start) ** (t / duration_sec))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    # Amplitude envelope: fast attack, exponential decay
    env = np.exp(-3.5 * t)
    # Mild saturation distortion
    sine = np.sin(phase)
    distorted = np.tanh(sine * 1.8) / 1.8
    return amp * env * distorted

if __name__ == "__main__":
    print("[COMIC AUDIO] Synthesizing Comic Noir audio assets at 48kHz...")
    crackle = generate_vinyl_crackle(2.0)
    sub = generate_808_sub_drop(1.5)
    print(f"  Vinyl crackle: {len(crackle)} samples ({len(crackle)/SR:.2f} s)")
    print(f"  808 sub drop: {len(sub)} samples ({len(sub)/SR:.2f} s)")
    print("  Status: Audio synthesis functions ready.")
