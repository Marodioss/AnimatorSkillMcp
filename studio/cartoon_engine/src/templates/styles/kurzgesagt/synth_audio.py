#!/usr/bin/env python3
"""
Procedural DSP Audio Synthesizer for Minimalist Infographic / Kurzgesagt Style Shorts.
Generates warm ambient analog synthesizer chords, digital UI clicks, and resonant sub-drops.
"""

import math
import numpy as np
from scipy import signal

SR = 48000

def generate_ambient_synth_pad(duration_sec=3.0, chord_freqs=[220.0, 277.18, 329.63, 440.0], amp=0.5):
    """Generates a warm, filtered ambient synthesizer pad chord."""
    n = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n)
    chord = np.zeros(n)
    for f in chord_freqs:
        # Dual detuned saw waves for rich analog warmth
        saw1 = signal.sawtooth(2 * np.pi * f * t)
        saw2 = signal.sawtooth(2 * np.pi * (f * 1.006) * t)
        chord += (saw1 + saw2) * 0.5
    # Smooth lowpass filter (cutoff 1200 Hz)
    b, a = signal.butter(4, 1200 / (SR / 2), btype="low")
    filtered = signal.lfilter(b, a, chord / len(chord_freqs))
    # Soft attack and release envelope
    env = np.sin(np.pi * (t / duration_sec)) ** 0.8
    return amp * filtered * env

def generate_ui_click(duration_sec=0.08, freq=1800.0, amp=0.6):
    """Generates a clean, crisp digital interface click / pop."""
    n = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n)
    decay = np.exp(-95 * t)
    pulse = np.sin(2 * np.pi * freq * t) * decay
    return amp * pulse

if __name__ == "__main__":
    print("[KURZGESAGT AUDIO] Synthesizing ambient infographic audio assets at 48kHz...")
    pad = generate_ambient_synth_pad()
    click = generate_ui_click()
    print(f"  Synth pad: {len(pad)} samples ({len(pad)/SR:.2f} s)")
    print(f"  UI click: {len(click)} samples")
    print("  Status: Audio synthesis functions ready.")
