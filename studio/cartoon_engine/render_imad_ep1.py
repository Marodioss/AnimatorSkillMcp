import subprocess
import os
import shutil
import sys
import time
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
STUDIO_DIR = ENGINE_DIR.parent
OUT_DIR = ENGINE_DIR / "out"
FINAL_OUT_DIR = STUDIO_DIR / "episodes" / "imad_episode1" / "out"
AUDIO_FILE = ENGINE_DIR / "public" / "mix_imad_ep1.wav"
RAW_VIDEO = OUT_DIR / "imad_ep1_raw.mp4"
FINAL_VIDEO = FINAL_OUT_DIR / "Burn_It_To_Earn_It_Ep1.mp4"


def find_browser_executable() -> str | None:
    env_bin = os.environ.get("CHROME_BIN") or os.environ.get("REMOTION_BROWSER_EXECUTABLE")
    if env_bin and Path(env_bin).exists():
        return env_bin
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return None


OUT_DIR.mkdir(parents=True, exist_ok=True)
FINAL_OUT_DIR.mkdir(parents=True, exist_ok=True)

def render():
    print("=================================================================")
    print("   RENDER PIPELINE: EPISODE 1 (70.0s / 2100 FRAMES @ 30 FPS)")
    print("   Series: Burn It to Earn It")
    print("   Starring: Imad, Sarah, Mr. Henderson")
    print("=================================================================\n")

    if not AUDIO_FILE.exists():
        alt_audio = STUDIO_DIR / "episodes" / "imad_episode1" / "audio" / "master_mix.wav"
        if alt_audio.exists():
            AUDIO_FILE.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(alt_audio, AUDIO_FILE)
        else:
            raise FileNotFoundError(
                f"Audio mix missing: {AUDIO_FILE}. Run episodes/imad_episode1/voice/generate_voice.py "
                "and audio/generate_audio_mix.py first."
            )

    t_start = time.time()
    npx_bin = "npx.cmd" if os.name == "nt" else "npx"
    browser_bin = find_browser_executable()

    # 1. Render Video via Remotion & WebGL
    print("Step 1: Rendering 3D visual frames (1080x1920 9:16)...")
    cmd = [
        npx_bin, "remotion", "render",
        "src/index.ts", "ImadEpisode1Short",
        str(RAW_VIDEO),
        "--gl=angle",
        "--concurrency=4",
        "--overwrite",
    ]
    if browser_bin:
        cmd.append(f"--browser-executable={browser_bin}")
    t0 = time.time()
    subprocess.run(cmd, cwd=str(ENGINE_DIR), check=True)
    t_render = time.time() - t0
    raw_size_mb = RAW_VIDEO.stat().st_size / (1024 * 1024)
    print(f"Visual pass rendered in {t_render:.1f}s ({raw_size_mb:.2f} MB)")

    # 2. Mux 48kHz Stereo Master Audio Track
    print(f"\nStep 2: Muxing 48kHz stereo audio track ({AUDIO_FILE})...")
    mux_cmd = [
        "ffmpeg", "-y",
        "-i", str(RAW_VIDEO),
        "-i", str(AUDIO_FILE),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac",
        "-ar", "48000",
        "-ac", "2",
        "-b:a", "256k",
        "-movflags", "+faststart",
        "-shortest",
        str(FINAL_VIDEO),
    ]
    subprocess.run(mux_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    total_time = time.time() - t_start
    final_size_mb = FINAL_VIDEO.stat().st_size / (1024 * 1024)
    print(f"\n=================================================================")
    print(f" MASTER EPISODE 1 RENDER COMPLETE IN {total_time:.1f} SECONDS!")
    print(f" File: {FINAL_VIDEO} ({final_size_mb:.2f} MB)")
    print(f" Runtime: 70.00 seconds (2100 frames @ 30 fps, 1080x1920 vertical)")
    print(f"=================================================================")

if __name__ == "__main__":
    render()
