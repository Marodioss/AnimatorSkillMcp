import subprocess
import sys
import os
import time

CHUNKS = [
    (0, 549),
    (550, 1099),
    (1100, 1649),
    (1650, 2149),
]

CHROME_BIN = os.environ.get("CHROME_BIN") or (r"C:\Program Files\Google\Chrome\Application\chrome.exe" if os.path.exists(r"C:\Program Files\Google\Chrome\Application\chrome.exe") else "")
OUT_DIR = os.path.abspath("out")
AUDIO_FILE = os.path.abspath("../episodes/stone_age/audio/mix.wav")
FINAL_OUT = os.path.join(OUT_DIR, "The_Stone_Age_Hoodie_Short.mp4")

os.makedirs(OUT_DIR, exist_ok=True)

part_files = []
t0 = time.time()

for idx, (s, e) in enumerate(CHUNKS, 1):
    part_name = f"stone_part_{idx}.mp4"
    part_path = os.path.join(OUT_DIR, part_name)
    part_files.append(part_path)
    
    print(f"\n==========================================")
    print(f"Rendering Chunk {idx}/{len(CHUNKS)}: frames {s}-{e} ({e - s + 1} frames)")
    print(f"==========================================")
    
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx", "remotion", "render",
        "src/index.ts", "StoneAgeShort",
        part_path,
        f"--frames={s}-{e}",
        "--gl=angle",
        "--concurrency=4",
        "--overwrite"
    ]
    if CHROME_BIN:
        cmd.append(f"--browser-executable={CHROME_BIN}")
    
    ret = subprocess.run(cmd, check=True)
    print(f"Chunk {idx} done! File size: {os.path.getsize(part_path)} bytes")

# Write concat list
concat_list = os.path.join(OUT_DIR, "concat_stone_parts.txt")
with open(concat_list, "w") as f:
    for p in part_files:
        norm_p = p.replace("\\", "/")
        f.write(f"file '{norm_p}'\n")

print(f"\n==========================================")
print("Concatenating visual segments and muxing audio...")
print(f"==========================================")

mux_cmd = [
    "ffmpeg", "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concat_list,
    "-i", AUDIO_FILE,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    FINAL_OUT
]

subprocess.run(mux_cmd, check=True)

dt = time.time() - t0
print(f"\nSUCCESS! Rendered and assembled complete Stone Age short in {dt:.1f} s")
print(f"Final video: {FINAL_OUT} ({os.path.getsize(FINAL_OUT)} bytes)")
