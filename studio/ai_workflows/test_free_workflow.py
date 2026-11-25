"""
Zero-Cost / Free Test Workflow
Tests the full pipeline (Story -> Free Character Gen -> Free Voiceover -> Timed Captions -> SFX & Video Assembly)
with $0.00 spent.
"""

import os
import sys
import json
import urllib.request
import urllib.parse
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_free_voice(text, output_mp3, output_vtt, voice="en-US-ChristopherNeural"):
    """Generate free natural voiceover using Edge-TTS with timestamps"""
    print(f"[*] [1/4] Generating Free Voiceover via Edge-TTS ({voice})...")
    cmd = [
        sys.executable, "-m", "edge_tts",
        "--voice", voice,
        "--text", text,
        "--write-media", str(output_mp3),
        "--write-subtitles", str(output_vtt)
    ]
    subprocess.run(cmd, check=True)
    print(f"[+] Voiceover created: {output_mp3.name}")

def generate_free_image(prompt, output_jpg, seed=42):
    """Generate free 2D vector style keyframe via Pollinations or local fallback"""
    try:
        encoded_prompt = urllib.parse.quote(prompt[:80])
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response, open(str(output_jpg), 'wb') as out_file:
            out_file.write(response.read())
        print(f"[+] Downloaded new keyframe: {output_jpg.name}")
    except Exception as e:
        print(f"[!] Online generator busy ({e}), using cached sample character.")
        cached = BASE_DIR / "output" / "test_poll.jpg"
        if cached.exists():
            import shutil
            shutil.copy(cached, output_jpg)
            print(f"[+] Used sample character keyframe: {output_jpg.name}")
        else:
            raise e

def assemble_short_video(image_path, audio_path, sfx_path, output_mp4, duration=10):
    """Assemble final 9:16 MP4 with subtle dynamic push-in zoom and sound effects"""
    print(f"[*] [3/4] Assembling video with FFmpeg camera motion and audio...")
    # FFmpeg filter: slow zoom-in on static 2D vector still + overlay voice & SFX
    filter_complex = (
        f"[0:v]scale=720:1280,zoompan=z='min(zoom+0.0015,1.15)':d={duration*30}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1280:fps=30[v];"
        f"[1:a]volume=1.0[voice];"
        f"[2:a]volume=0.6,adelay=1000|1000[sfx];"
        f"[voice][sfx]amix=inputs=2:duration=first[a]"
    )
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", str(duration), "-i", str(image_path),
        "-i", str(audio_path),
        "-i", str(sfx_path),
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-shortest",
        str(output_mp4)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[+] Rendered video: {output_mp4.name}")

def main():
    print("=" * 60)
    print("  AI STORY SHORTS STUDIO — 100% FREE TEST PIPELINE")
    print("=" * 60)
    
    # 1. Script & Voice
    sample_script = (
        "Meet Jax. The only mechanic in New Tokyo who repairs ancient robots. "
        "Today, he found a power core that hasn't existed for three hundred years. "
        "And when he turned it on... the entire city went dark."
    )
    voice_mp3 = OUTPUT_DIR / "test_voice.mp3"
    voice_vtt = OUTPUT_DIR / "test_sub.vtt"
    generate_free_voice(sample_script, voice_mp3, voice_vtt)

    # 2. Keyframe Generation
    keyframe_prompt = (
        "Clean 2D vector cartoon style, thick black ink outlines, flat solid colors, "
        "young mechanic with messy brown hair and welding goggles, dark futuristic workshop, "
        "holding a glowing blue energy cube, Cas van de Pol animation aesthetic, 9:16 vertical"
    )
    keyframe_jpg = OUTPUT_DIR / "test_shot_01.jpg"
    print("[*] [2/4] Generating Free 2D Vector Character Keyframe...")
    generate_free_image(keyframe_prompt, keyframe_jpg, seed=101)
    print(f"[+] Keyframe created: {keyframe_jpg.name}")

    # 3. Sound Effects (using extracted library)
    sfx_wav = ASSETS_DIR / "sfx" / "sfx_01.wav"
    if not sfx_wav.exists():
        # Fallback to any wav
        sfx_files = list((ASSETS_DIR / "sfx").glob("*.wav"))
        sfx_wav = sfx_files[0] if sfx_files else voice_mp3

    # 4. Final Assembly
    final_video = OUTPUT_DIR / "free_pilot_short.mp4"
    assemble_short_video(keyframe_jpg, voice_mp3, sfx_wav, final_video, duration=11)
    
    print("=" * 60)
    print(f"[✓] TEST COMPLETED SUCCESSFULLY WITH $0.00 SPENT!")
    print(f"    Final Video: {final_video}")
    print("=" * 60)

if __name__ == "__main__":
    main()
