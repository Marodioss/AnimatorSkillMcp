import asyncio
import json
import os
import re
import subprocess
import numpy as np
from scipy.io import wavfile
import edge_tts

SR = 48000
FPS = 30
TOTAL_DURATION = 70.0
TOTAL_SAMPLES = int(SR * TOTAL_DURATION)  # 3,360,000 samples

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
EPISODE_DIR = os.path.dirname(OUT_DIR)
STUDIO_DIR = os.path.dirname(os.path.dirname(EPISODE_DIR))
ENGINE_IMAD_DIR = os.path.join(STUDIO_DIR, "cartoon_engine", "src", "videos", "imad")

WAV_FILE = os.path.join(OUT_DIR, "voice.wav")
WORDS_FILE = os.path.join(OUT_DIR, "words.json")
SEGMENTS_FILE = os.path.join(OUT_DIR, "segments.json")
ENGINE_WORDS_FILE = os.path.join(ENGINE_IMAD_DIR, "words.json")
ENGINE_SEGMENTS_FILE = os.path.join(ENGINE_IMAD_DIR, "segments.json")

VOICES = {
    "imad": "en-US-ChristopherNeural",
    "sarah": "en-US-AvaNeural",
    "henderson": "en-US-BrianNeural",
    "narrator": "en-US-GuyNeural",
}

# Exact 70s Episode 1 script aligned with episode_1_viral_script_70s.md
# lip_sync=False for inner monologue (imad_vo) and narrator CTA; True ONLY for spoken dialogue.
SEGMENTS = [
    {
        "id": 1,
        "scene": 1,
        "speaker": "imad_vo",
        "actor": "imad",
        "lip_sync": False,
        "voice": VOICES["imad"],
        "rate": "+21%",
        "pause_after": 0.28,
        "text": "A magical system just handed me one million dollars. But there's a wild catch: if I don't lose every single penny in 48 hours, I stay completely broke.",
    },
    {
        "id": 2,
        "scene": 2,
        "speaker": "imad_vo",
        "actor": "imad",
        "lip_sync": False,
        "voice": VOICES["imad"],
        "rate": "+23%",
        "pause_after": 0.30,
        "text": "The rule is simple: spend the million down to under a thousand on real community businesses, and the entire fortune converts into my personal bank account! But if I leave even one dollar behind? I get zero.",
    },
    {
        "id": 3,
        "scene": 3,
        "speaker": "sarah",
        "actor": "sarah",
        "lip_sync": True,
        "voice": VOICES["sarah"],
        "rate": "+20%",
        "pause_after": 0.24,
        "text": "Imad, look at me. Henderson's vintage textile factory is bankrupt! Paying four hundred thousand is financial madness!",
    },
    {
        "id": 4,
        "scene": 3,
        "speaker": "imad_vo",
        "actor": "imad",
        "lip_sync": False,
        "voice": VOICES["imad"],
        "rate": "+20%",
        "pause_after": 0.24,
        "text": "Madness? To me, it was the world's best fire sale.",
    },
    {
        "id": 5,
        "scene": 4,
        "speaker": "imad",
        "actor": "imad",
        "lip_sync": True,
        "voice": VOICES["imad"],
        "rate": "+22%",
        "pause_after": 0.22,
        "text": "Four hundred thousand is a deal! Plus, don't they owe the seamstresses two months of back pay?",
    },
    {
        "id": 6,
        "scene": 4,
        "speaker": "sarah",
        "actor": "sarah",
        "lip_sync": True,
        "voice": VOICES["sarah"],
        "rate": "+20%",
        "pause_after": 0.22,
        "text": "Yes, fifty thousand more in unpaid wages!",
    },
    {
        "id": 7,
        "scene": 4,
        "speaker": "imad",
        "actor": "imad",
        "lip_sync": True,
        "voice": VOICES["imad"],
        "rate": "+22%",
        "pause_after": 0.34,
        "text": "Perfect! Add it to my tab. We pay everyone today!",
    },
    {
        "id": 8,
        "scene": 5,
        "speaker": "imad_vo",
        "actor": "imad",
        "lip_sync": False,
        "voice": VOICES["imad"],
        "rate": "+23%",
        "pause_after": 0.28,
        "text": "Right on time, poor Mr. Henderson stumbled in, terrified we were going to lowball him into the ground. He had no idea I was eager to hand him a bag of cash.",
    },
    {
        "id": 9,
        "scene": 6,
        "speaker": "henderson",
        "actor": "henderson",
        "lip_sync": True,
        "voice": VOICES["henderson"],
        "rate": "+18%",
        "pause_after": 0.26,
        "text": "Mr. Imad... you saved our entire workshop! We're debt-free!",
    },
    {
        "id": 10,
        "scene": 6,
        "speaker": "imad_vo",
        "actor": "imad",
        "lip_sync": False,
        "voice": VOICES["imad"],
        "rate": "+23%",
        "pause_after": 0.28,
        "text": "Four hundred and fifty grand down the drain legally! Five hundred and fifty thousand left to blow before midnight.",
    },
    {
        "id": 11,
        "scene": 7,
        "speaker": "henderson",
        "actor": "henderson",
        "lip_sync": True,
        "voice": VOICES["henderson"],
        "rate": "+20%",
        "pause_after": 0.30,
        "text": "As a thank you, I'm giving you the vintage silk crates locked in storage unit nine!",
    },
    {
        "id": 12,
        "scene": 7,
        "speaker": "imad",
        "actor": "imad",
        "lip_sync": True,
        "voice": VOICES["imad"],
        "rate": "+22%",
        "pause_after": 0.30,
        "text": "Wait... why is the system calling that worth two million dollars?! Nooo!",
    },
    {
        "id": 13,
        "scene": 7,
        "speaker": "narrator",
        "actor": "narrator",
        "lip_sync": False,
        "voice": VOICES["narrator"],
        "rate": "+20%",
        "pause_after": 0.0,
        "text": "Hit follow for Episode two!",
    },
]


def word_viseme(word: str) -> str:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return "ai"
    if w[0] in ("m", "b", "p"):
        return "mbp"
    if w[0] in ("f", "v"):
        return "fv"
    if w[0] in ("w", "q"):
        return "wq"
    if any(v in w for v in ("oo", "ou", "u")):
        return "u"
    if any(v in w for v in ("o", "aw", "au")):
        return "o"
    if any(v in w for v in ("ee", "ea", "e", "i")):
        return "e"
    return "ai"


def expand_word_boundaries(raw_wb, orig_text: str):
    """Align Edge-TTS WordBoundary entries with original whitespace-delimited tokens
    so multi-word boundaries (like '48 hours') split cleanly and punctuation is preserved."""
    expanded = []
    for item in raw_wb:
        parts = item["text"].split()
        if len(parts) <= 1:
            expanded.append(dict(item))
        else:
            s0, e0 = item["s"], item["e"]
            dur = max(0.02, e0 - s0)
            weights = [max(1, len(p)) for p in parts]
            tot_w = sum(weights)
            cur = s0
            for idx, p in enumerate(parts):
                d = dur * (weights[idx] / tot_w)
                expanded.append({"text": p, "s": cur, "e": cur + d})
                cur += d

    orig_tokens = orig_text.split()
    if len(expanded) == len(orig_tokens):
        for i, tok in enumerate(orig_tokens):
            expanded[i]["display"] = tok
    else:
        for item in expanded:
            item["display"] = item["text"]
    return expanded


async def synth_segment(seg, tmp_dir):
    seg_id = seg["id"]
    mp3_tmp = os.path.join(tmp_dir, f"seg_{seg_id}.mp3")
    wav_tmp = os.path.join(tmp_dir, f"seg_{seg_id}.wav")

    comm = edge_tts.Communicate(
        seg["text"], seg["voice"], rate=seg["rate"], boundary="WordBoundary"
    )
    raw_wb = []
    with open(mp3_tmp, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                raw_wb.append(
                    {
                        "text": chunk["text"],
                        "s": chunk["offset"] / 10_000_000.0,
                        "e": (chunk["offset"] + chunk["duration"]) / 10_000_000.0,
                    }
                )

    subprocess.run(
        ["ffmpeg", "-y", "-i", mp3_tmp, "-ar", str(SR), "-ac", "1", wav_tmp],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )

    sr, data = wavfile.read(wav_tmp)
    assert sr == SR
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    else:
        data = data.astype(np.float32)

    # Sample-exact silence detection on raw TTS audio
    wb_aligned = expand_word_boundaries(raw_wb, seg["text"])
    first_wb_s = wb_aligned[0]["s"] if wb_aligned else 0.05

    abs_data = np.abs(data)
    active_lead = np.flatnonzero(abs_data > 0.004)
    active_trail = np.flatnonzero(abs_data > 0.008)
    if len(active_lead) > 0 and len(active_trail) > 0:
        lead_samp = max(0, int(active_lead[0]) - int(0.008 * SR))
        # Never trim past 12ms before the first word boundary
        lead_samp = min(lead_samp, max(0, int((first_wb_s - 0.012) * SR)))
        trail_samp = min(len(data), int(active_trail[-1]) + int(0.035 * SR))
    else:
        lead_samp = 0
        trail_samp = len(data)

    trimmed = data[lead_samp:trail_samp].copy()

    # Smooth micro-fades (8ms in, 20ms out) to guarantee zero clicks
    fin = min(len(trimmed) // 4, int(0.008 * SR))
    fout = min(len(trimmed) // 4, int(0.020 * SR))
    if fin > 0:
        trimmed[:fin] *= np.linspace(0.0, 1.0, fin, dtype=np.float32)
    if fout > 0:
        trimmed[-fout:] *= np.linspace(1.0, 0.0, fout, dtype=np.float32)

    # Normalize each voice actor consistently to -18 dBFS RMS so actors balance cleanly
    rms = float(np.sqrt(np.mean(trimmed**2))) if len(trimmed) else 0.0
    if rms > 1e-5:
        target_rms = 0.125  # ~ -18 dBFS
        trimmed = trimmed * (target_rms / rms)
        pk = float(np.max(np.abs(trimmed)))
        if pk > 0.88:
            trimmed *= 0.88 / pk

    for p in (mp3_tmp, wav_tmp):
        if os.path.exists(p):
            os.remove(p)

    return {
        "seg": seg,
        "audio": trimmed,
        "dur": len(trimmed) / SR,
        "lead_trim_s": lead_samp / SR,
        "wb": wb_aligned,
    }


async def generate():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(ENGINE_IMAD_DIR, exist_ok=True)
    tmp_dir = os.path.join(OUT_DIR, "_tmp")
    os.makedirs(tmp_dir, exist_ok=True)

    print("=" * 72, flush=True)
    print("  EPISODE 1 VOICE SYNTHESIS (SEQUENTIAL / ZERO-OVERLAP / WORD-EXACT)", flush=True)
    print("=" * 72, flush=True)

    rendered = []
    for seg in SEGMENTS:
        res = await synth_segment(seg, tmp_dir)
        rendered.append(res)

    if os.path.isdir(tmp_dir) and not os.listdir(tmp_dir):
        os.rmdir(tmp_dir)

    total_speech = sum(r["dur"] for r in rendered)
    total_pauses = sum(r["seg"]["pause_after"] for r in rendered)
    intro_pad = 0.22
    tail_pad = 0.65
    available_for_pauses = TOTAL_DURATION - intro_pad - tail_pad - total_speech

    print(
        f"\nRaw speech sum: {total_speech:.3f}s | Requested pauses: {total_pauses:.3f}s | Available pauses inside {TOTAL_DURATION:.1f}s: {available_for_pauses:.3f}s",
        flush=True,
    )

    if available_for_pauses < 1.8:
        raise RuntimeError(
            f"Not enough pause headroom ({available_for_pauses:.3f}s) inside {TOTAL_DURATION}s! Adjust rates."
        )

    pause_scale = min(1.15, available_for_pauses / max(total_pauses, 1e-6))

    master_audio = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    all_words = []
    segments_meta = []

    cursor = intro_pad
    for idx, r in enumerate(rendered):
        seg = r["seg"]
        audio = r["audio"]
        dur = r["dur"]
        lead_trim_s = r["lead_trim_s"]

        start_s = round(cursor, 4)
        end_s = round(start_s + dur, 4)

        if idx > 0:
            prev_end = segments_meta[-1]["end"]
            assert start_s >= prev_end + 0.14, f"Overlap/tight gap at Seg {seg['id']}: {start_s} vs {prev_end}"
        assert end_s <= TOTAL_DURATION - 0.55, f"Tail overflow at Seg {seg['id']}: {end_s}"

        start_idx = int(round(start_s * SR))
        end_idx = min(TOTAL_SAMPLES, start_idx + len(audio))
        master_audio[start_idx:end_idx] += audio[: end_idx - start_idx]

        # Shift WordBoundary offsets into master timeline
        shift_s = start_s - lead_trim_s
        seg_words = []
        for wi, w in enumerate(r["wb"]):
            ws = max(start_s, round(w["s"] + shift_s, 3))
            we = min(end_s, round(w["e"] + shift_s, 3))
            if we <= ws:
                we = round(ws + 0.04, 3)
            # Enforce monotonic non-overlapping words
            if all_words and ws < all_words[-1]["e"]:
                ws = all_words[-1]["e"]
                if we <= ws:
                    we = round(ws + 0.03, 3)

            f_start = int(round(ws * FPS))
            f_end = max(f_start + 1, int(round(we * FPS)))
            entry = {
                "w": w["display"],
                "raw": w["text"],
                "seg": seg["id"],
                "scene": seg["scene"],
                "speaker": seg["speaker"],
                "actor": seg["actor"],
                "lip_sync": seg["lip_sync"],
                "s": ws,
                "e": we,
                "f_start": f_start,
                "f_end": f_end,
                "viseme": word_viseme(w["text"]),
            }
            all_words.append(entry)
            seg_words.append(entry)

        segments_meta.append(
            {
                "id": seg["id"],
                "scene": seg["scene"],
                "speaker": seg["speaker"],
                "actor": seg["actor"],
                "lip_sync": seg["lip_sync"],
                "start": start_s,
                "end": end_s,
                "dur": round(dur, 4),
                "f_start": int(round(start_s * FPS)),
                "f_end": int(round(end_s * FPS)),
                "word_count": len(seg_words),
                "text": seg["text"],
            }
        )

        gap_after = seg["pause_after"] * pause_scale
        print(
            f"  Seg {seg['id']:02d} [{seg['speaker']:9s} lip={str(seg['lip_sync']):5s}]: {start_s:6.3f}s -> {end_s:6.3f}s (dur {dur:5.3f}s, gap {gap_after:4.2f}s, words {len(seg_words):2d})",
            flush=True,
        )
        cursor = end_s + gap_after

    # Final safety peak check (keep natural headroom before mix)
    peak = float(np.max(np.abs(master_audio)))
    if peak > 0.88:
        master_audio *= 0.88 / peak

    # Strict audit assertions
    for i in range(1, len(segments_meta)):
        gap = segments_meta[i]["start"] - segments_meta[i - 1]["end"]
        assert gap >= 0.14, f"Segment gap too small / overlap between {i} and {i+1}: {gap:.4f}s"
    for i in range(1, len(all_words)):
        assert all_words[i]["s"] >= all_words[i - 1]["e"] - 0.001, f"Word overlap at idx {i}"
    assert segments_meta[-1]["end"] <= 69.5, f"End time {segments_meta[-1]['end']} too close to 70s"

    out_int16 = np.clip(np.round(master_audio * 32767.0), -32768, 32767).astype(np.int16)
    wavfile.write(WAV_FILE, SR, out_int16)

    for path, payload in [
        (WORDS_FILE, all_words),
        (ENGINE_WORDS_FILE, all_words),
        (SEGMENTS_FILE, segments_meta),
        (ENGINE_SEGMENTS_FILE, segments_meta),
    ]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    print(f"\n[OK] Master voice: {WAV_FILE} ({len(out_int16)/SR:.3f}s, {SR}Hz mono)", flush=True)
    print(f"[OK] Captured {len(all_words)} word boundaries -> {WORDS_FILE} & {ENGINE_WORDS_FILE}", flush=True)
    print(f"[OK] Saved 13 segment boundaries -> {SEGMENTS_FILE} & {ENGINE_SEGMENTS_FILE}", flush=True)
    print(f"[AUDIT] Overlaps: 0 | Last word end: {all_words[-1]['e']:.3f}s (tail margin: {TOTAL_DURATION - all_words[-1]['e']:.3f}s)", flush=True)


if __name__ == "__main__":
    asyncio.run(generate())
