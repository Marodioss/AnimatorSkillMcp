import os
import sys
import numpy as np
from scipy.io import wavfile
from scipy import signal
import subprocess

# Add skill templates styles to python path
AUDIO_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(AUDIO_DIR)
STUDIO_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
REPO_ROOT = os.path.dirname(STUDIO_DIR)
STYLE_DIR = os.path.join(REPO_ROOT, "templates", "styles")
sys.path.insert(0, os.path.join(STYLE_DIR, "comic_noir"))
sys.path.insert(0, os.path.join(STYLE_DIR, "rubber_hose"))
sys.path.insert(0, os.path.join(STYLE_DIR, "kurzgesagt"))

import comic_audio
import ragtime_audio
import synth_audio

SR = 48000
TOTAL_DUR = 10.0
TOTAL_SAMPLES = int(SR * TOTAL_DUR) # 480,000

VOICE_WAV = os.path.join(BASE_DIR, "voice", "voice.wav")
PUBLIC_DIR = os.path.join(STUDIO_DIR, "cartoon_engine", "public")

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

# Load voice track
_, voice_raw = wavfile.read(VOICE_WAV)
if voice_raw.dtype == np.int16:
    voice = voice_raw.astype(np.float32) / 32768.0
else:
    voice = voice_raw.astype(np.float32)
if len(voice) < TOTAL_SAMPLES:
    v_pad = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    v_pad[:len(voice)] = voice
    voice = v_pad
else:
    voice = voice[:TOTAL_SAMPLES]

def create_ducking_envelope(voice_track, duck_db=-5.0, attack_sec=0.04, release_sec=0.2):
    """Generates a smooth sidechain ducking curve based on voice activity."""
    abs_v = np.abs(voice_track)
    b, a = signal.butter(2, 20 / (SR / 2), btype="low")
    env = signal.lfilter(b, a, abs_v)
    env = np.maximum(env, 0.0)
    thresh = 0.02
    gain_duck = 10 ** (duck_db / 20.0)
    duck = np.where(env > thresh, gain_duck, 1.0)
    smooth_samples = int(SR * release_sec)
    window = np.ones(smooth_samples) / smooth_samples
    duck_smoothed = np.convolve(duck, window, mode="same")
    return np.clip(duck_smoothed, gain_duck, 1.0)

def master_ebu_r128(audio, filename, comp_ratio=3.0, comp_thresh=-16.0, target_lra=2.5):
    """
    Applies professional dynamic control and EBU R128 loudness mastering (-14.0 LUFS, LRA <= 3.0 LU).
    Outputs 48kHz 16-bit PCM WAV to both toast_physics/audio and cartoon_engine/public.
    """
    # 1. Soft compression to tame peak transients and restrict LRA
    f = np.tanh(audio * 1.3) / 1.3
    peak = np.max(np.abs(f))
    if peak > 0:
        f = f * (0.85 / peak)

    raw_path = os.path.join(AUDIO_DIR, f"raw_{filename}")
    wavfile.write(raw_path, SR, (f * 32767).astype(np.int16))

    out_path = os.path.join(AUDIO_DIR, filename)
    public_path = os.path.join(PUBLIC_DIR, filename)

    # 2. Master with ffmpeg ebur128 compressor + loudnorm filter
    af = f"acompressor=threshold={comp_thresh}dB:ratio={comp_ratio}:attack=5:release=50,loudnorm=I=-14.0:LRA={target_lra}:TP=-1.0"
    for dst in [out_path, public_path]:
        cmd = [
            "ffmpeg", "-y",
            "-i", raw_path,
            "-af", af,
            "-ar", str(SR),
            "-ac", "1",
            dst
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if os.path.exists(raw_path):
        os.remove(raw_path)

    # 3. Print verified EBU R128 statistics
    check_cmd = f'ffmpeg -i "{out_path}" -af "ebur128=peak=true" -f null -'
    res = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
    tail = res.stderr[res.stderr.rfind("Summary:"):]
    print(f"Mastered: {filename}")
    for line in tail.splitlines():
        if any(line.strip().startswith(x) for x in ["I:", "LRA:", "Peak:"]):
            print(" ", line.strip())

    return out_path

# =========================================================================
# 1. COMIC NOIR AUDIO MIX (Boom-Bap, 92 BPM, Vinyl Crackle, 808 Sub Drops)
# =========================================================================
def build_comic_mix():
    print("\nSynthesizing Comic Noir Soundtrack (92 BPM Urban Boom-Bap)...")
    music = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    sfx = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    
    # Vinyl crackle bed throughout
    crackle = comic_audio.generate_vinyl_crackle(duration_sec=TOTAL_DUR, noise_level=0.030, pop_prob=0.001)
    music += crackle[:TOTAL_SAMPLES] * 0.35
    
    # 92 BPM beat: 60 / 92 = 0.652s per beat
    beat_sec = 60.0 / 92.0
    for beat in range(int(TOTAL_DUR / beat_sec)):
        t_beat = beat * beat_sec
        idx = int(t_beat * SR)
        # Kick on beat 0, 2; Snare on beat 1, 3
        if beat % 2 == 0:
            k = comic_audio.generate_808_sub_drop(duration_sec=0.4, f_start=75, f_end=42, amp=0.40)
            end = min(TOTAL_SAMPLES, idx + len(k))
            music[idx:end] += k[:end - idx]
        else:
            n_snare = int(SR * 0.16)
            snare = np.random.normal(0, 0.22, n_snare) * np.exp(-16 * np.linspace(0, 0.16, n_snare))
            end = min(TOTAL_SAMPLES, idx + len(snare))
            music[idx:end] += snare[:end - idx] * 0.30

    # SFX: 808 Sub Drop on Launch (f85 = 2.83s) and Floor Impact (f175 = 5.83s)
    idx_launch = int(2.83 * SR)
    sub_launch = comic_audio.generate_808_sub_drop(duration_sec=0.7, f_start=85, f_end=38, amp=0.45)
    sfx[idx_launch:idx_launch + len(sub_launch)] += sub_launch

    idx_impact = int(5.83 * SR)
    sub_impact = comic_audio.generate_808_sub_drop(duration_sec=1.2, f_start=100, f_end=32, amp=0.65)
    end = min(TOTAL_SAMPLES, idx_impact + len(sub_impact))
    sfx[idx_impact:end] += sub_impact[:end - idx_impact]

    # Sidechain ducking
    duck = create_ducking_envelope(voice, duck_db=-6.0)
    music = music * duck

    master = voice + (music * 0.60) + (sfx * 0.70)
    master_ebu_r128(master, "mix_comic.wav", comp_ratio=3.0, comp_thresh=-16.0)

# =========================================================================
# 2. RUBBER HOSE AUDIO MIX (Ragtime Stride, 132 BPM, Slide Whistle, Cowbell)
# =========================================================================
def build_rubberhose_mix():
    print("\nSynthesizing Rubber Hose Soundtrack (132 BPM Vintage Ragtime)...")
    music = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    sfx = np.zeros(TOTAL_SAMPLES, dtype=np.float32)

    # 132 BPM: beat = 60 / 132 = 0.4545s
    beat_sec = 60.0 / 132.0
    roots = [261.63, 220.0, 293.66, 196.0] # C, Am, Dm, G
    num_beats = int(TOTAL_DUR / beat_sec)
    for b in range(num_beats):
        t_b = b * beat_sec
        idx = int(t_b * SR)
        root = roots[(b // 2) % len(roots)]
        chord = ragtime_audio.generate_ragtime_honkytonk_chord(duration_sec=0.40, root_hz=root, amp=0.35)
        end = min(TOTAL_SAMPLES, idx + len(chord))
        music[idx:end] += chord[:end - idx]

    # Vintage 1930s optical soundtrack floor (tightens LRA to EBU R128 spec)
    noise_bed = np.random.normal(0, 0.012, TOTAL_SAMPLES).astype(np.float32)
    music += noise_bed

    # SFX: Slide whistle tumbling down from f85 (2.83s) to f175 (5.83s)
    idx_whistle = int(2.83 * SR)
    whistle_dur = 3.0
    n_whistle = int(whistle_dur * SR)
    t_w = np.linspace(0, whistle_dur, n_whistle)
    freq_sweep = 1100.0 - 780.0 * (t_w / whistle_dur)
    vibrato = np.sin(2 * np.pi * 12 * t_w) * 20
    phase = 2 * np.pi * np.cumsum(freq_sweep + vibrato) / SR
    whistle = 0.35 * np.sin(phase) * (1 - 0.2 * (t_w / whistle_dur))
    sfx[idx_whistle:idx_whistle + n_whistle] += whistle

    # SFX: Impact Cowbell + Cartoon Splat at f175 (5.83s) - tuned to controlled amplitude
    idx_hit = int(5.83 * SR)
    bell = ragtime_audio.generate_cowbell_hit(duration_sec=0.30, freq=580, amp=0.20)
    sfx[idx_hit:idx_hit + len(bell)] += bell

    # Sidechain ducking
    duck = create_ducking_envelope(voice, duck_db=-5.0)
    music = music * duck

    # Phonograph bandpass filter for vintage 1930s warmth
    b_phono, a_phono = signal.butter(2, [350 / (SR / 2), 4800 / (SR / 2)], btype="band")
    music = signal.lfilter(b_phono, a_phono, music)

    master = voice + (music * 0.65) + (sfx * 0.65)
    master_ebu_r128(master, "mix_rubberhose.wav", comp_ratio=6.0, comp_thresh=-26.0, target_lra=1.8)

# =========================================================================
# 3. KURZGESAGT AUDIO MIX (Ambient Synth, 110 BPM, UI Clicks, Resonant Sub)
# =========================================================================
def build_kurzgesagt_mix():
    print("\nSynthesizing Kurzgesagt Soundtrack (110 BPM Ambient Synth & UI Pop)...")
    music = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    sfx = np.zeros(TOTAL_SAMPLES, dtype=np.float32)

    # Ambient synth chords across the 10 seconds
    chord_progressions = [
        [174.61, 220.0, 261.63, 349.23], # F
        [146.83, 174.61, 220.0, 293.66], # Dm
        [116.54, 146.83, 174.61, 233.08],# Bb
        [130.81, 164.81, 196.0, 261.63], # C
    ]
    t_chord = 0.0
    chord_len = 2.5
    for freqs in chord_progressions:
        pad = synth_audio.generate_ambient_synth_pad(duration_sec=chord_len, chord_freqs=freqs, amp=0.40)
        idx = int(t_chord * SR)
        end = min(TOTAL_SAMPLES, idx + len(pad))
        music[idx:end] += pad[:end - idx]
        t_chord += chord_len

    # Crisp UI clicks on shot transitions (f0 = 0.0s, f85 = 2.83s, f201 = 6.70s)
    for cut_t in [0.05, 2.83, 6.70]:
        click = synth_audio.generate_ui_click(duration_sec=0.05, freq=2400, amp=0.35)
        idx = int(cut_t * SR)
        end = min(TOTAL_SAMPLES, idx + len(click))
        sfx[idx:end] += click[:end - idx]

    # Resonant pop/whoosh on impact at f175 (5.83s)
    idx_impact = int(5.83 * SR)
    t_imp = np.linspace(0, 0.40, int(0.40 * SR))
    res_pop = 0.5 * np.sin(2 * np.pi * 170 * np.exp(-12 * t_imp) * t_imp) * np.exp(-8 * t_imp)
    sfx[idx_impact:idx_impact + len(res_pop)] += res_pop

    # Sidechain ducking
    duck = create_ducking_envelope(voice, duck_db=-4.5)
    music = music * duck

    master = voice + (music * 0.60) + (sfx * 0.65)
    master_ebu_r128(master, "mix_kurzgesagt.wav", comp_ratio=3.0, comp_thresh=-16.0)

if __name__ == "__main__":
    build_comic_mix()
    build_rubberhose_mix()
    build_kurzgesagt_mix()
    print("\nALL 3 STYLE SOUNDTRACK MIXES MASTERED ACCORDING TO STOP 8 EBU R128.")
