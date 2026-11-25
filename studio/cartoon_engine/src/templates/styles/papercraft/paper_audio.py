#!/usr/bin/env python3
"""
Procedural DSP Audio Synthesizer for Stop-Motion Papercraft Style Shorts.
Generates paper sliding, cardboard flapping, scissor snips, and wooden block foley.
"""

import math
import numpy as np
from scipy import signal

SR = 48000

def generate_paper_slide(duration_sec=0.4, amp=0.4):
    """Generates the soft scraping friction of cardstock sliding across paper."""
    n = int(SR * duration_sec)
    noise = np.random.normal(0, 1, n)
    # Bandpass filter around 1800-4500 Hz for crisp paper friction
    b, a = signal.butter(3, [1800 / (SR / 2), 4500 / (SR / 2)], btype="band")
    filtered = signal.lfilter(b, a, noise)
    # Hanning window envelope
    env = np.hanning(n)
    return amp * filtered * env

def generate_scissor_snip(duration_sec=0.15, amp=0.6):
    """Generates a crisp mechanical scissor cutting transient."""
    n = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n)
    # High metallic frequency ring + short burst of friction
    metal = np.sin(2 * np.pi * 3200 * t) * np.exp(-45 * t)
    scrape = np.random.normal(0, 0.4, n) * np.exp(-30 * t)
    return amp * (metal + scrape)

def generate_woodblock_tap(duration_sec=0.2, freq=850.0, amp=0.7):
    """Generates a warm wooden puppet joint click / block tap."""
    n = int(SR * duration_sec)
    t = np.linspace(0, duration_sec, n)
    # Resonant decaying pulse
    decay = np.exp(-55 * t)
    pulse = (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2.2 * t)) * decay
    return amp * pulse

if __name__ == "__main__":
    print("[PAPERCRAFT AUDIO] Synthesizing Papercraft foley assets at 48kHz...")
    slide = generate_paper_slide()
    snip = generate_scissor_snip()
    tap = generate_woodblock_tap()
    print(f"  Paper slide: {len(slide)} samples")
    print(f"  Scissor snip: {len(snip)} samples")
    print(f"  Woodblock tap: {len(tap)} samples")
    print("  Status: Audio synthesis functions ready.")
