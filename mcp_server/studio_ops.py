"""Core domain operations for AnimatorSkillMcp tools, scaffolding, audio DSP, rendering, and QA."""

from __future__ import annotations

import asyncio
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
STUDIO_DIR = REPO_ROOT / "studio"
ENGINE_DIR = STUDIO_DIR / "cartoon_engine"
EPISODES_DIR = STUDIO_DIR / "episodes"
ASSETS_SFX_DIR = REPO_ROOT / "assets" / "sfx"
TEMPLATES_DIR = REPO_ROOT / "templates"

SAFE_SLUG_RE = re.compile(r"^[a-z][a-z0-9_]{1,47}$")

STYLE_CATALOG: list[dict[str, Any]] = [
    {
        "id": "kounkan_plus",
        "display_name": "Kounkan+ Hybrid 2D-in-3D",
        "description": (
            "Multi-angle 2D illustrated character rigs inside textured cel-shaded 3D environments "
            "with InkPass outlines, thin-lens DoF blur, custom 2D close-up mechanical/UI inserts, "
            "2.0-3.5s rhythmic cuts, <AbsoluteFill> safe-zone captions, and -14.4 LUFS stereo mastering."
        ),
        "fps": 30,
        "recommended_shot_sec": "2.0-3.5",
        "safe_zone": {"width": 1080, "height": 1920, "top_clear_px": 288, "bottom_clear_px": 384},
    },
    {
        "id": "storybook",
        "display_name": "Painted Storybook",
        "description": "2D bean-head characters in a painted 3D world with plum ink (#241726) and thin-lens DoF",
        "fps": 30,
        "audio_genre": "orchestral_march",
    },
    {
        "id": "comic_noir",
        "display_name": "Living Comic / Spider-Verse",
        "description": "High-contrast graphic novel halftones, CMYK offsets, starburst onomatopoeia, animated on twos",
        "fps": 30,
        "audio_genre": "urban_boom_bap",
    },
    {
        "id": "papercraft",
        "display_name": "Stop-Motion Papercraft Diorama",
        "description": "Layered cardstock cutouts, deckled edges, cast drop shadows, animated on twos/threes",
        "fps": 30,
        "audio_genre": "acoustic_foley_whimsical",
    },
    {
        "id": "rubber_hose",
        "display_name": "1930s Vintage Cartoon (Cuphead)",
        "description": "Curving noodle limbs, pie-cut eyes, 2-beat bounce, film gate weave & scratches",
        "fps": 30,
        "audio_genre": "ragtime_big_band",
    },
    {
        "id": "kurzgesagt",
        "display_name": "Flat Geometric Infographic",
        "description": "Minimalist saturated vector gradients, zero ink lines, snappy spring overshoot",
        "fps": 30,
        "audio_genre": "ambient_electronic",
    },
    {
        "id": "anime_sakuga",
        "display_name": "2.5D Cel-Shaded Anime / Sakuga",
        "description": "Sharp 3-tone cel shading, dynamic radial speedlines, impact flash frames",
        "fps": 30,
        "audio_genre": "cinematic_taiko_action",
    },
    {
        "id": "retro_90s",
        "display_name": "Retro 90s Low-Poly (PS1 / Lo-Fi)",
        "description": "Low-poly facets, affine UV warping, vertex grid jitter, Bayer dithering",
        "fps": 30,
        "audio_genre": "chiptune_16bit_synth",
    },
    {
        "id": "sumi_ink",
        "display_name": "Traditional Sumi-e Ink Wash",
        "description": "Calligraphic brush strokes, procedural ink bleed, Xuan rice paper texture",
        "fps": 30,
        "audio_genre": "traditional_zen_meditation",
    },
]

PRODUCTION_STOPS: list[dict[str, str]] = [
    {"stop": "1", "name": "Script & Physics Blueprint", "gate": "Hook in line 1, ~3.1-3.8 w/s, 2.0-3.5s beat cuts, concrete stakes"},
    {"stop": "2", "name": "Acoustic & Viseme Alignment", "gate": "0 speech overlaps, VO/inner-monologue separated (lip_sync=False), WordBoundary sync"},
    {"stop": "3", "name": "Camera Frustum & Safe Zones", "gate": "Smootherstep glides <=25px/f, zero edge cropping, HUD >=15% top & captions >=20% bottom"},
    {"stop": "4", "name": "Collision & Newtonian Physics", "gate": "Exact surface planes, edge-pivoting kinematics, zero Z-buffer clipping"},
    {"stop": "5", "name": "Articulated Rig & Vitality", "gate": "2-bone IK, zero foot skating (<0.0001 m/s), stationary mode='stand' feet"},
    {"stop": "6", "name": "Zero-GC High-Perf 3D Engine", "gate": "MathPool registers, InstancedBatch draw budget <=45 calls, no per-frame allocations"},
    {"stop": "7", "name": "Post-Processing & Edge Inking", "gate": "InkPass (NOINK actors/HUD) -> LensBlur DoF -> Bloom -> Neutral ToneMap -> Grade"},
    {"stop": "8", "name": "Stereo Audio DSP & Mastering", "gate": "48 kHz stereo, speech-ducked BGM + real WAV SFX, -14.0 to -15.0 LUFS, <=-1.0 dBTP"},
    {"stop": "9", "name": "Automated QA Gate", "gate": "0 overlaps, audit_physics + audit_cadence pass, short_qa + ffprobe/ebur128 pass"},
]


def find_browser_executable() -> str | None:
    """Locate Chrome, Chromium, or Edge binary across Windows, macOS, and Linux."""
    env_bin = os.environ.get("CHROME_BIN") or os.environ.get("REMOTION_BROWSER_EXECUTABLE")
    if env_bin and Path(env_bin).exists():
        return env_bin
    for candidate in (
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ):
        if Path(candidate).exists():
            return candidate
    return None


def _cmd_version(cmd: list[str]) -> str | None:
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        if res.returncode == 0:
            line = (res.stdout or res.stderr).strip().splitlines()[0]
            return line[:120]
    except Exception:
        pass
    return None


def preflight_studio() -> dict[str, Any]:
    """Check Python packages, CLI binaries, browser, Remotion deps, SFX library, and optional keys."""
    py_pkgs = {
        pkg: (importlib.util.find_spec(pkg) is not None)
        for pkg in ("mcp", "edge_tts", "numpy", "scipy", "PIL", "pydantic", "fal_client")
    }
    bins = {
        "python": sys.version.split()[0],
        "ffmpeg": _cmd_version(["ffmpeg", "-version"]),
        "ffprobe": _cmd_version(["ffprobe", "-version"]),
        "node": _cmd_version(["node", "-v"]),
        "npx": shutil.which("npx.cmd" if os.name == "nt" else "npx"),
        "browser": find_browser_executable(),
    }
    env_status: dict[str, bool] = {}
    env_file = REPO_ROOT / ".env"
    parsed: dict[str, str] = {}
    if env_file.exists():
        for raw in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            if raw.strip() and not raw.strip().startswith("#") and "=" in raw:
                k, v = raw.split("=", 1)
                parsed[k.strip()] = v.strip()
    for key in ("FAL_KEY", "HF_KEY", "HIGGSFIELD_API_KEY", "ELEVENLABS_API_KEY"):
        val = os.environ.get(key) or parsed.get(key, "")
        env_status[key] = bool(val) and not val.startswith("your_")

    sfx_count = len(list(ASSETS_SFX_DIR.glob("*.wav"))) if ASSETS_SFX_DIR.exists() else 0
    node_ready = (ENGINE_DIR / "node_modules").exists()

    return {
        "repo_root": str(REPO_ROOT),
        "python_packages": py_pkgs,
        "binaries": bins,
        "engine_node_modules_installed": node_ready,
        "sfx_library_wav_count": sfx_count,
        "optional_ai_keys_configured": env_status,
        "ready_for_local_kounkan_plus": all(
            [
                py_pkgs["mcp"],
                py_pkgs["edge_tts"],
                py_pkgs["numpy"],
                py_pkgs["scipy"],
                py_pkgs["PIL"],
                bool(bins["ffmpeg"]),
                bool(bins["ffprobe"]),
                bool(bins["node"]),
            ]
        ),
    }


def list_styles_and_stops() -> dict[str, Any]:
    """Return full style catalog, Kounkan+ defaults, and the 9 Production Stops."""
    return {
        "styles": STYLE_CATALOG,
        "production_stops": PRODUCTION_STOPS,
        "existing_compositions": ["ImadEpisode1Short", "ToastComicShort", "ToastRubberHoseShort", "ToastKurzgesagtShort", "ViennaShort", "StoneAgeShort"],
    }


def _validate_slug(slug: str) -> str:
    clean = slug.strip().lower()
    if not SAFE_SLUG_RE.match(clean):
        raise ValueError("slug must match ^[a-z][a-z0-9_]{1,47}$ (lowercase letters, digits, underscores)")
    return clean


def create_episode_project(
    slug: str,
    title: str,
    premise: str,
    style: str = "kounkan_plus",
    duration_sec: float = 60.0,
    characters: list[dict[str, Any]] | None = None,
    target_base_dir: str | None = None,
) -> dict[str, Any]:
    """Scaffold an episode directory with SCRIPT.md, character_bible.json, shots.json, and voice config."""
    clean_slug = _validate_slug(slug)
    valid_styles = {s["id"] for s in STYLE_CATALOG}
    if style not in valid_styles:
        raise ValueError(f"Unknown style '{style}'. Choose from: {sorted(valid_styles)}")
    if not (5.0 <= duration_sec <= 180.0):
        raise ValueError("duration_sec must be between 5.0 and 180.0 seconds")

    base = Path(target_base_dir).resolve() if target_base_dir else EPISODES_DIR
    ep_dir = base / clean_slug
    (ep_dir / "voice").mkdir(parents=True, exist_ok=True)
    (ep_dir / "audio").mkdir(parents=True, exist_ok=True)
    (ep_dir / "out").mkdir(parents=True, exist_ok=True)

    chars = characters or [
        {"name": "Protagonist", "role": "lead", "outfit_primary": "#E5A93B", "outfit_secondary": "#FDFBF7", "voice": "en-US-ChristopherNeural"},
        {"name": "Advisor", "role": "support", "outfit_primary": "#52796F", "outfit_secondary": "#F8F9FA", "voice": "en-US-AvaNeural"},
    ]

    # Build rhythmic 2.5s shots covering full duration_sec @ 30fps
    fps = 30
    total_frames = int(round(duration_sec * fps))
    shot_len = 75  # 2.5s target matching Kounkan+ pacing
    shots = []
    cur = 0
    sid = 1
    while cur < total_frames:
        nxt = min(total_frames, cur + shot_len)
        shots.append(
            {
                "id": sid,
                "a": cur,
                "b": nxt,
                "name": "hook_establish" if sid == 1 else ("cta_endcard" if nxt == total_frames else f"beat_{sid:02d}"),
                "insert": "cta_endcard" if nxt == total_frames else (f"insert_{sid:02d}" if sid % 4 == 0 else None),
            }
        )
        cur = nxt
        sid += 1

    script_md = (
        f"# {title}\n"
        f"- **Slug:** `{clean_slug}`\n"
        f"- **Style:** `{style}`\n"
        f"- **Duration:** `{duration_sec:.1f}s` (`{total_frames}` frames @ {fps} fps, `1080x1920` 9:16)\n"
        f"- **Target Cadence:** ~3.2–3.7 words/sec (`{int(duration_sec * 3.4)}` target words)\n\n"
        f"## Premise\n{premise.strip()}\n\n"
        f"## 9-Stop Production Checklist\n"
        + "\n".join(f"- [ ] **Stop {s['stop']} ({s['name']}):** {s['gate']}" for s in PRODUCTION_STOPS)
        + "\n"
    )
    (ep_dir / "SCRIPT.md").write_text(script_md, encoding="utf-8")
    (ep_dir / "character_bible.json").write_text(json.dumps({"title": title, "style": style, "characters": chars}, indent=2), encoding="utf-8")
    (ep_dir / "shots.json").write_text(json.dumps({"fps": fps, "total_frames": total_frames, "shots": shots}, indent=2), encoding="utf-8")

    sample_segments = {
        "duration_sec": duration_sec,
        "segments": [
            {
                "id": 1,
                "scene": 1,
                "speaker": "lead_vo",
                "actor": chars[0]["name"].lower(),
                "lip_sync": False,
                "voice": chars[0].get("voice", "en-US-ChristopherNeural"),
                "rate": "+18%",
                "pause_after": 0.28,
                "text": f"{premise.strip()[:160]}",
            }
        ],
    }
    (ep_dir / "voice" / "segments_config.json").write_text(json.dumps(sample_segments, indent=2), encoding="utf-8")

    return {
        "episode_dir": str(ep_dir),
        "shot_count": len(shots),
        "avg_shot_sec": round(duration_sec / max(1, len(shots)), 2),
        "files_created": [
            str(ep_dir / "SCRIPT.md"),
            str(ep_dir / "character_bible.json"),
            str(ep_dir / "shots.json"),
            str(ep_dir / "voice" / "segments_config.json"),
        ],
    }


def _word_viseme(word: str) -> str:
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


def _expand_word_boundaries(raw_wb: list[dict[str, Any]], orig_text: str) -> list[dict[str, Any]]:
    expanded: list[dict[str, Any]] = []
    for item in raw_wb:
        parts = str(item["text"]).split()
        if len(parts) <= 1:
            expanded.append(dict(item))
        else:
            s0, e0 = float(item["s"]), float(item["e"])
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


async def _synth_edge_segment(seg: dict[str, Any], tmp_dir: Path, sr: int = 48000) -> dict[str, Any]:
    import edge_tts
    import numpy as np
    from scipy.io import wavfile

    seg_id = seg["id"]
    mp3_tmp = tmp_dir / f"seg_{seg_id}.mp3"
    wav_tmp = tmp_dir / f"seg_{seg_id}.wav"

    comm = edge_tts.Communicate(
        seg["text"],
        seg.get("voice", "en-US-ChristopherNeural"),
        rate=seg.get("rate", "+18%"),
        boundary="WordBoundary",
    )
    raw_wb: list[dict[str, Any]] = []
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
        ["ffmpeg", "-y", "-i", str(mp3_tmp), "-ar", str(sr), "-ac", "1", str(wav_tmp)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )
    read_sr, data = wavfile.read(str(wav_tmp))
    if read_sr != sr:
        raise RuntimeError(f"Expected {sr} Hz wav, got {read_sr}")
    arr = data.astype(np.float32) / 32768.0 if data.dtype == np.int16 else data.astype(np.float32)

    wb_aligned = _expand_word_boundaries(raw_wb, seg["text"])
    first_wb_s = wb_aligned[0]["s"] if wb_aligned else 0.05
    abs_arr = np.abs(arr)
    lead_idx = np.flatnonzero(abs_arr > 0.004)
    trail_idx = np.flatnonzero(abs_arr > 0.008)
    if len(lead_idx) > 0 and len(trail_idx) > 0:
        lead_samp = min(max(0, int(lead_idx[0]) - int(0.008 * sr)), max(0, int((first_wb_s - 0.012) * sr)))
        trail_samp = min(len(arr), int(trail_idx[-1]) + int(0.035 * sr))
    else:
        lead_samp, trail_samp = 0, len(arr)

    trimmed = arr[lead_samp:trail_samp].copy()
    fin = min(len(trimmed) // 4, int(0.008 * sr))
    fout = min(len(trimmed) // 4, int(0.020 * sr))
    if fin > 0:
        trimmed[:fin] *= np.linspace(0.0, 1.0, fin, dtype=np.float32)
    if fout > 0:
        trimmed[-fout:] *= np.linspace(1.0, 0.0, fout, dtype=np.float32)

    rms = float(np.sqrt(np.mean(trimmed**2))) if len(trimmed) else 0.0
    if rms > 1e-5:
        trimmed *= 0.125 / rms
        pk = float(np.max(np.abs(trimmed)))
        if pk > 0.88:
            trimmed *= 0.88 / pk

    for p in (mp3_tmp, wav_tmp):
        p.unlink(missing_ok=True)

    return {
        "seg": seg,
        "audio": trimmed,
        "dur": len(trimmed) / sr,
        "lead_trim_s": lead_samp / sr,
        "wb": wb_aligned,
    }


def generate_voice_with_alignment(
    segments: list[dict[str, Any]],
    out_dir: str,
    total_duration: float = 70.0,
    start_offset_s: float = 0.25,
) -> dict[str, Any]:
    """Generate sequential overlap-free multi-voice TTS, words.json, and segments.json."""
    import numpy as np
    from scipy.io import wavfile

    sr, fps = 48000, 30
    out_path = Path(out_dir).resolve()
    out_path.mkdir(parents=True, exist_ok=True)
    tmp_dir = out_path / "_tmp"
    tmp_dir.mkdir(exist_ok=True)

    async def _run_all():
        results = []
        for s in segments:
            results.append(await _synth_edge_segment(s, tmp_dir, sr=sr))
        return results

    synthed = asyncio.run(_run_all())
    shutil.rmtree(tmp_dir, ignore_errors=True)

    total_samples = int(round(sr * total_duration))
    master = np.zeros(total_samples, dtype=np.float32)
    all_words: list[dict[str, Any]] = []
    seg_meta: list[dict[str, Any]] = []

    cursor = start_offset_s
    for item in synthed:
        seg = item["seg"]
        dur = float(item["dur"])
        start_s = cursor
        end_s = start_s + dur
        if end_s > total_duration - 0.15:
            raise ValueError(f"Segment {seg['id']} ends at {end_s:.2f}s, exceeding {total_duration:.2f}s limit")

        s_idx = int(round(start_s * sr))
        e_idx = min(total_samples, s_idx + len(item["audio"]))
        master[s_idx:e_idx] += item["audio"][: e_idx - s_idx]

        shift = start_s - item["lead_trim_s"]
        wc = 0
        for wb in item["wb"]:
            ws = max(start_s, round(wb["s"] + shift, 3))
            we = min(end_s, max(ws + 0.04, round(wb["e"] + shift, 3)))
            all_words.append(
                {
                    "w": wb["display"],
                    "raw": wb["text"],
                    "seg": seg["id"],
                    "scene": seg.get("scene", 1),
                    "speaker": seg["speaker"],
                    "actor": seg.get("actor", seg["speaker"]),
                    "lip_sync": bool(seg.get("lip_sync", True)),
                    "s": ws,
                    "e": we,
                    "f_start": int(round(ws * fps)),
                    "f_end": max(int(round(ws * fps)) + 1, int(round(we * fps))),
                    "viseme": _word_viseme(wb["text"]),
                }
            )
            wc += 1

        seg_meta.append(
            {
                "id": seg["id"],
                "scene": seg.get("scene", 1),
                "speaker": seg["speaker"],
                "actor": seg.get("actor", seg["speaker"]),
                "lip_sync": bool(seg.get("lip_sync", True)),
                "start": round(start_s, 3),
                "end": round(end_s, 3),
                "dur": round(dur, 3),
                "f_start": int(round(start_s * fps)),
                "f_end": int(round(end_s * fps)),
                "word_count": wc,
                "text": seg["text"],
            }
        )
        cursor = end_s + float(seg.get("pause_after", 0.25))

    wav_out = out_path / "voice.wav"
    words_out = out_path / "words.json"
    segs_out = out_path / "segments.json"

    out_i16 = (np.clip(master, -0.98, 0.98) * 32767.0).astype(np.int16)
    wavfile.write(str(wav_out), sr, out_i16)
    words_out.write_text(json.dumps(all_words, indent=2), encoding="utf-8")
    segs_out.write_text(json.dumps(seg_meta, indent=2), encoding="utf-8")

    return {
        "voice_wav": str(wav_out),
        "words_json": str(words_out),
        "segments_json": str(segs_out),
        "segment_count": len(seg_meta),
        "word_count": len(all_words),
        "last_word_end_s": all_words[-1]["e"] if all_words else 0.0,
        "overlaps": 0,
    }


def _run_ebur128(media_path: Path) -> dict[str, Any]:
    res = subprocess.run(
        ["ffmpeg", "-i", str(media_path), "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    txt = res.stderr
    tail = txt[txt.rfind("Summary:") :] if "Summary:" in txt else txt
    out: dict[str, Any] = {}
    for line in tail.splitlines():
        s = line.strip()
        if s.startswith("I:") and "LUFS" in s:
            out["integrated_lufs"] = float(s.split()[1])
        elif s.startswith("LRA:") and "LU" in s:
            out["lra_lu"] = float(s.split()[1])
        elif s.startswith("Peak:") and "dBFS" in s:
            out["true_peak_dbfs"] = float(s.split()[1])
    return out


def master_audio_mix(
    voice_wav: str,
    words_json: str,
    out_wav: str,
    target_lufs: float = -14.4,
    duration_sec: float | None = None,
) -> dict[str, Any]:
    """Build 48kHz stereo music bed + SFX ducked under voice and normalize to broadcast LUFS."""
    import numpy as np
    from scipy import ndimage, signal

    audio_tpl_dir = str(ENGINE_DIR / "src" / "templates" / "audio")
    if audio_tpl_dir not in sys.path:
        sys.path.insert(0, audio_tpl_dir)
    import dsp  # type: ignore

    vx, vsr = dsp.read_wav(str(Path(voice_wav).resolve()))
    assert vsr == dsp.SR
    dur = duration_sec if duration_sec else max(1.0, len(vx[0]) / dsp.SR)
    n = dsp.ns(dur)
    v_mono = vx[0] if vx.shape[0] == 1 else vx.mean(0)
    v_pad = np.zeros(n, dtype=np.float64)
    v_pad[: min(n, len(v_mono))] = v_mono[:n]
    voice_st = dsp.st(v_pad)

    words = json.loads(Path(words_json).read_text(encoding="utf-8"))
    spans = []
    for w in words:
        s, e = float(w["s"]), float(w["e"])
        if spans and s - spans[-1][1] < 0.25:
            spans[-1][1] = max(spans[-1][1], e)
        else:
            spans.append([s, e])

    # Warm stereo Rhodes-style background progression
    t = np.arange(n, dtype=np.float64) / dsp.SR
    chords = [
        [293.66, 369.99, 440.00, 523.25],
        [246.94, 293.66, 369.99, 440.00],
        [329.63, 392.00, 493.88, 587.33],
        [220.00, 277.18, 329.63, 392.00],
    ]
    bed_l = np.zeros(n, dtype=np.float64)
    bed_r = np.zeros(n, dtype=np.float64)
    step_s = 2.5
    cur = 0.0
    cidx = 0
    while cur < dur:
        a = dsp.ns(cur)
        b = min(n, dsp.ns(cur + step_s))
        if b > a:
            lt = np.linspace(0, step_s, b - a)
            env = np.exp(-0.95 * lt) * np.minimum(1.0, lt / 0.05)
            for j, f0 in enumerate(chords[cidx % len(chords)]):
                sig_c = 0.055 * (np.sin(dsp.TAU * f0 * t[a:b]) + 0.3 * np.sin(dsp.TAU * 2 * f0 * t[a:b])) * env
                pan_l = 0.65 if j % 2 == 0 else 0.35
                bed_l[a:b] += sig_c * pan_l
                bed_r[a:b] += sig_c * (1.0 - pan_l)
        cur += step_s
        cidx += 1

    bed_st = np.vstack([bed_l, bed_r])

    # Speech ducking curve (-5.0 dB under speech)
    ctrl = 1000
    va = np.zeros(int(dur * ctrl) + 2)
    for s, e in spans:
        va[max(0, int((s - 0.06) * ctrl)) : min(len(va), int((e + 0.12) * ctrl))] = 1.0
    env_d = ndimage.uniform_filter1d(va, 80, mode="nearest")
    duck_lin = np.power(10.0, (-5.0 * np.interp(t, np.arange(len(env_d)) / ctrl, env_d)) / 20.0)
    bed_st *= duck_lin[None, :]

    mix = voice_st + bed_st * 0.55
    cur_lufs = float(dsp.integrated(mix))
    gain_lin = dsp.dbg(target_lufs - cur_lufs) if np.isfinite(cur_lufs) else 1.0
    mix *= gain_lin

    # 4x oversampled limiter at -1.2 dBTP
    ceil = dsp.dbg(-1.2)
    up = np.abs(signal.resample_poly(mix, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = ndimage.minimum_filter1d(np.minimum(1.0, ceil / np.maximum(pk, 1e-12)), max(3, dsp.ns(0.003) * 2 + 1))
    mix *= gr[None, :]

    out_path = Path(out_wav).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dsp.write_wav(str(out_path), mix)
    return {"out_wav": str(out_path), "duration_sec": round(dur, 3), "ebur128": _run_ebur128(out_path)}


def render_short_video(
    composition_id: str,
    out_path: str,
    audio_wav: str | None = None,
    still_frame: int | None = None,
    scale: float = 1.0,
) -> dict[str, Any]:
    """Render either a Remotion QA still frame or a full H.264/AAC MP4 video."""
    target = Path(out_path).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    npx_bin = "npx.cmd" if os.name == "nt" else "npx"
    browser = find_browser_executable()

    if still_frame is not None:
        cmd = [
            npx_bin,
            "remotion",
            "still",
            "src/index.ts",
            composition_id,
            str(target),
            f"--frame={still_frame}",
            f"--scale={scale}",
            "--gl=angle",
            "--overwrite",
        ]
        if browser:
            cmd.append(f"--browser-executable={browser}")
        subprocess.run(cmd, cwd=str(ENGINE_DIR), check=True)
        return {"mode": "still", "frame": still_frame, "output": str(target), "bytes": target.stat().st_size}

    raw_mp4 = ENGINE_DIR / "out" / f"_{composition_id}_raw.mp4"
    raw_mp4.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        npx_bin,
        "remotion",
        "render",
        "src/index.ts",
        composition_id,
        str(raw_mp4),
        f"--scale={scale}",
        "--gl=angle",
        "--concurrency=4",
        "--overwrite",
    ]
    if browser:
        cmd.append(f"--browser-executable={browser}")
    subprocess.run(cmd, cwd=str(ENGINE_DIR), check=True)

    if audio_wav:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(raw_mp4), "-i", str(Path(audio_wav).resolve()),
                "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac",
                "-ar", "48000", "-ac", "2", "-b:a", "256k", "-movflags", "+faststart", "-shortest",
                str(target),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        shutil.copy2(raw_mp4, target)

    return {"mode": "video", "output": str(target), "bytes": target.stat().st_size}


def audit_short_quality(
    video_mp4: str | None = None,
    words_json: str | None = None,
    segments_json: str | None = None,
    run_engine_self_tests: bool = True,
) -> dict[str, Any]:
    """Run Stop 9 physics/cadence self-tests, speech overlap checks, ffprobe, EBU R128 loudness, and cut counts."""
    report: dict[str, Any] = {"passed": True}

    if run_engine_self_tests:
        scripts_dir = TEMPLATES_DIR / "scripts"
        for script_name in ("audit_physics.py", "audit_cadence.py"):
            res = subprocess.run([sys.executable, str(scripts_dir / script_name)], capture_output=True, text=True)
            report[script_name] = {"exit_code": res.returncode}
            if res.returncode != 0:
                report["passed"] = False
                report[script_name]["stderr"] = res.stderr[-500:]

    if words_json and Path(words_json).exists():
        words = json.loads(Path(words_json).read_text(encoding="utf-8"))
        w_overlaps = [
            (words[i - 1]["w"], words[i - 1]["e"], words[i]["w"], words[i]["s"])
            for i in range(1, len(words))
            if float(words[i - 1]["e"]) > float(words[i]["s"]) + 0.005
        ]
        report["words_audit"] = {"count": len(words), "overlaps": len(w_overlaps), "last_end": words[-1]["e"] if words else 0.0}
        if w_overlaps:
            report["passed"] = False

    if segments_json and Path(segments_json).exists():
        segs = json.loads(Path(segments_json).read_text(encoding="utf-8"))
        s_overlaps = [
            (segs[i - 1]["id"], segs[i - 1]["end"], segs[i]["id"], segs[i]["start"])
            for i in range(1, len(segs))
            if float(segs[i - 1]["end"]) > float(segs[i]["start"]) + 0.002
        ]
        report["segments_audit"] = {"count": len(segs), "overlaps": len(s_overlaps)}
        if s_overlaps:
            report["passed"] = False

    if video_mp4 and Path(video_mp4).exists():
        vpath = Path(video_mp4)
        pr = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,channels,sample_rate,nb_frames", "-of", "json", str(vpath)],
            capture_output=True, text=True, check=True,
        )
        info = json.loads(pr.stdout)
        loud = _run_ebur128(vpath)
        cuts_res = subprocess.run(
            ["ffmpeg", "-i", str(vpath), "-filter:v", "select='gt(scene,0.18)',showinfo", "-f", "null", "-"],
            capture_output=True, text=True,
        )
        cut_count = sum(1 for ln in cuts_res.stderr.splitlines() if "pts_time:" in ln)
        report["video_audit"] = {"streams": info.get("streams"), "format": info.get("format"), "ebur128": loud, "scene_cuts_gt_0_18": cut_count}
        if loud.get("true_peak_dbfs", -99.0) > -0.9:
            report["passed"] = False

    return report
