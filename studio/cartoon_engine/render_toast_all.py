import subprocess
import os
import sys
import time
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
STUDIO_DIR = ENGINE_DIR.parent
OUT_DIR = ENGINE_DIR / "out"
TOAST_OUT_DIR = STUDIO_DIR / "episodes" / "toast_physics" / "out"
PUBLIC_DIR = ENGINE_DIR / "public"

OUT_DIR.mkdir(parents=True, exist_ok=True)
TOAST_OUT_DIR.mkdir(parents=True, exist_ok=True)


def find_browser_executable() -> str | None:
    env_bin = os.environ.get("CHROME_BIN") or os.environ.get("REMOTION_BROWSER_EXECUTABLE")
    if env_bin and Path(env_bin).exists():
        return env_bin
    for c in [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
    ]:
        if Path(c).exists():
            return c
    return None


STYLES = [
    {
        "comp": "ToastComicShort",
        "audio": str(PUBLIC_DIR / "mix_comic.wav"),
        "raw_video": str(OUT_DIR / "toast_comic_raw.mp4"),
        "final_video": str(TOAST_OUT_DIR / "The_Buttered_Toast_Law_ComicNoir.mp4"),
        "title": "Comic Noir (Spider-Verse Living Comic, Halftone & Boom-Bap)",
    },
    {
        "comp": "ToastRubberHoseShort",
        "audio": str(PUBLIC_DIR / "mix_rubberhose.wav"),
        "raw_video": str(OUT_DIR / "toast_rubberhose_raw.mp4"),
        "final_video": str(TOAST_OUT_DIR / "The_Buttered_Toast_Law_RubberHose.mp4"),
        "title": "Rubber Hose (1930s Cuphead Vintage, Film Gate & Ragtime)",
    },
    {
        "comp": "ToastKurzgesagtShort",
        "audio": str(PUBLIC_DIR / "mix_kurzgesagt.wav"),
        "raw_video": str(OUT_DIR / "toast_kurzgesagt_raw.mp4"),
        "final_video": str(TOAST_OUT_DIR / "The_Buttered_Toast_Law_Kurzgesagt.mp4"),
        "title": "Kurzgesagt (Flat Geometric Infographic, Gradients & Synth)",
    },
]

def render_all():
    print("=================================================================")
    print("   RENDER PIPELINE: 1 STORY IN 3 STYLES (10.0s / 300 FRAMES)")
    print("=================================================================\n")
    
    t_start = time.time()
    rendered_files = []
    npx_bin = "npx.cmd" if os.name == "nt" else "npx"
    browser_bin = find_browser_executable()

    for idx, item in enumerate(STYLES, 1):
        print(f"\n[{idx}/3] Rendering Style: {item['title']}")
        print(f"  Composition: {item['comp']} (300 frames @ 30 fps, 1080x1920)")
        
        # 1. Render Video with Remotion & ANGLE WebGL
        cmd = [
            npx_bin, "remotion", "render",
            "src/index.ts", item["comp"],
            item["raw_video"],
            "--gl=angle",
            "--concurrency=4",
            "--overwrite"
        ]
        if browser_bin:
            cmd.append(f"--browser-executable={browser_bin}")
        
        t0 = time.time()
        subprocess.run(cmd, cwd=str(ENGINE_DIR), check=True)
        t_render = time.time() - t0
        print(f"  Visual pass rendered in {t_render:.1f} s. Size: {os.path.getsize(item['raw_video'])} bytes")

        # 2. Mux synthesized 48kHz audio mix
        print(f"  Muxing audio track: {os.path.basename(item['audio'])}...")
        mux_cmd = [
            "ffmpeg", "-y",
            "-i", item["raw_video"],
            "-i", item["audio"],
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            item["final_video"]
        ]
        subprocess.run(mux_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        file_sz_mb = os.path.getsize(item["final_video"]) / (1024 * 1024)
        print(f"  SUCCESS: Master MP4 rendered -> {item['final_video']} ({file_sz_mb:.2f} MB)")
        rendered_files.append(item["final_video"])

    total_time = time.time() - t_start
    print(f"\nALL 3 STYLES RENDERED AND MASTERED IN {total_time:.1f} SECONDS!")
    for f in rendered_files:
        print(f" - {f}")

if __name__ == "__main__":
    render_all()
