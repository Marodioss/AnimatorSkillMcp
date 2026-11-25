#!/usr/bin/env python3
"""
Procedural DSP Audio Synthesizer for 1930s Rubber Hose Style Shorts.
Generates stride ragtime piano chords, muted trumpet 'wah' filters, and slide whistles.
"""

import math
import numpy as np
from scipy import signal

SR = 48000

def generate_slide_whistle(duration_sec=0.6, f_start=350.0, f_end=1100.0, amp=0.6):
    """Generates a cartoon slide whistle pitch sweep."""
    n = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n)
    freq = np.linspace(f_start, f_end, n)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    env = np.sin(np.pi * (t / duration_sec)) ** 0.5
    sine = np.sin(phase) + 0.25 * np.sin(2 * phase)
    return amp * env * sine

def generate_cowbell_hit(duration_sec=0.35, freq=580.0, amp=0.7):
    """Generates a vintage metallic cowbell staccato hit."""
    n = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n)
    decay = np.exp(-32 * t)
    # Dual dissonant square/sine wave for metallic overtone
    tone = (np.sin(2 * np.pi * freq * t) + 0.6 * np.sin(2 * np.pi * (freq * 1.48) * t)) * decay
    return amp * tone

def generate_ragtime_honkytonk_chord(duration_sec=0.5, root_hz=261.63, amp=0.65):
    """Generates an upright detuned 'honky-tonk' piano triad with tremolo."""
    n = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n)
    env = np.exp(-7.5 * t)
    # Major triad: root, major third (x1.2599), fifth (x1.4983)
    notes = [root_hz, root_hz * 1.25992, root_hz * 1.49831]
    chord = np.zeros(n)
    for f in notes:
        # Slight detuning for vintage saloon piano sound
        chord += np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * (f * 1.004) * t)
    return amp * (chord / len(notes)) * env

if __name__ == "__main__":
    print("[RAGTIME AUDIO] Synthesizing 1930s vintage audio assets at 48kHz...")
    whistle = generate_slide_whistle()
    bell = generate_cowbell_hit()
    chord = generate_ragtime_honkytonk_chord()
    print(f"  Slide whistle: {len(whistle)} samples")
    print(f"  Cowbell: {len(bell)} samples")
    print(f"  Honky-tonk chord: {len(chord)} samples")
    print("  Status: Audio synthesis functions ready.")
