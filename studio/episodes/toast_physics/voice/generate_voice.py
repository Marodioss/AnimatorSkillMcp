import asyncio
import json
import os
import subprocess
from scipy.io import wavfile
import numpy as np
import edge_tts

VOICE = "en-US-ChristopherNeural"
RATE = "+22%"
SR = 48000
TOTAL_DURATION = 10.0
TOTAL_SAMPLES = int(SR * TOTAL_DURATION) # 480,000 samples

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
WAV_FILE = os.path.join(OUT_DIR, "voice.wav")
WORDS_FILE = os.path.join(OUT_DIR, "words.json")

SEGMENTS = [
    {
        "id": 1,
        "text": "Your toast isn't cursed: it's table physics!",
        "target_start": 0.15
    },
    {
        "id": 2,
        "text": "Dropped from counter height, torque allows only half a rotation.",
        "target_start": 2.55
    },
    {
        "id": 3,
        "text": "Result: butter slaps the floor!",
        "target_start": 5.45
    },
    {
        "id": 4,
        "text": "To fix it? Build a ten-foot table.",
        "target_start": 7.40
    }
]

# Viseme syllable heuristic map
# Matches phonemes/syllables to: rest, mbp, fv, ai, e, o, u, wq
VISEME_MAP = {
    "your": "wq",
    "toast": "o",
    "isn't": "e",
    "cursed": "ai",
    "it's": "e",
    "table": "mbp",
    "physics": "fv",
    "dropped": "mbp",
    "from": "fv",
    "counter": "ai",
    "height": "ai",
    "torque": "o",
    "allows": "ai",
    "only": "o",
    "half": "ai",
    "a": "ai",
    "rotation": "o",
    "result": "e",
    "butter": "mbp",
    "slaps": "ai",
    "the": "e",
    "floor": "fv",
    "to": "u",
    "fix": "fv",
    "it": "e",
    "build": "mbp",
    "ten-foot": "u"
}

async def generate():
    os.makedirs(OUT_DIR, exist_ok=True)
    all_words = []
    master_audio = np.zeros(TOTAL_SAMPLES, dtype=np.float32)

    for seg in SEGMENTS:
        seg_id = seg["id"]
        text = seg["text"]
        target_s = seg["target_start"]

        mp3_tmp = os.path.join(OUT_DIR, f"seg_{seg_id}.mp3")
        wav_tmp = os.path.join(OUT_DIR, f"seg_{seg_id}.wav")

        c = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
        words = []
        with open(mp3_tmp, "wb") as f:
            async for chunk in c.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    words.append({
                        "w": chunk["text"],
                        "s": chunk["offset"] / 10_000_000,
                        "e": (chunk["offset"] + chunk["duration"]) / 10_000_000
                    })

        # Trim leading and trailing silence precisely
        trim_filter = "areverse,silenceremove=start_periods=1:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_threshold=-40dB"
        cmd = f'ffmpeg -y -i "{mp3_tmp}" -ar {SR} -ac 1 -af "{trim_filter}" "{wav_tmp}"'
        subprocess.run(cmd, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        sr, data = wavfile.read(wav_tmp)
        # Normalize float
        if data.dtype == np.int16:
            data = data.astype(np.float32) / 32768.0

        dur = len(data) / SR
        print(f"Segment {seg_id}: {dur:.2f}s, words={len(words)}")

        # Calculate time shift: original first word offset vs target_start
        first_word_orig = words[0]["s"] if words else 0.0
        time_shift = target_s - first_word_orig

        for w in words:
            shifted_s = round(w["s"] + time_shift, 4)
            shifted_e = round(w["e"] + time_shift, 4)
            cleaned = w["w"].lower().strip(".,:?!\"'")
            viseme = VISEME_MAP.get(cleaned, "ai")
            all_words.append({
                "w": w["w"],
                "s": max(0.0, shifted_s),
                "e": max(0.0, shifted_e),
                "f_start": int(max(0.0, shifted_s) * 30),
                "f_end": int(max(0.0, shifted_e) * 30),
                "viseme": viseme
            })

        # Place audio into master
        start_idx = int(target_s * SR)
        end_idx = min(TOTAL_SAMPLES, start_idx + len(data))
        length = end_idx - start_idx
        master_audio[start_idx:end_idx] += data[:length]

        # Clean temp segment files
        for p in [mp3_tmp, wav_tmp]:
            if os.path.exists(p):
                os.remove(p)

    # Normalize master audio to peak -1 dB (0.89)
    peak = np.max(np.abs(master_audio))
    if peak > 0:
        master_audio = master_audio * (0.89 / peak)

    # Save master 16-bit PCM WAV
    out_int16 = (master_audio * 32767).astype(np.int16)
    wavfile.write(WAV_FILE, SR, out_int16)
    print(f"Master voice written: {WAV_FILE} ({len(out_int16)/SR:.2f}s, {len(out_int16)} samples)")

    with open(WORDS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_words, f, indent=2)
    print(f"Captured {len(all_words)} words with viseme mappings in {WORDS_FILE}")

if __name__ == "__main__":
    asyncio.run(generate())
