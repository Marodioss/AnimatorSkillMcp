"""
Fal.ai Narrative Motion (Image-to-Video) Pipeline
1. Generates 2D character keyframe via Flux Schnell ($0.003)
2. Animates character acting & scene narrative via Wan 2.1 / Kling I2V (~$0.05)
"""

import os
import sys
import fal_client
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def load_keys():
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v

def generate_narrative_scene(character_prompt, motion_prompt, scene_name="scene_01"):
    load_keys()
    print(f"[*] Step 1: Generating 2D Keyframe with Flux Schnell...")
    # 1. Keyframe Image
    img_res = fal_client.subscribe(
        "fal-ai/flux/schnell",
        arguments={
            "prompt": character_prompt,
            "image_size": "portrait_16_9",
            "num_inference_steps": 4,
            "enable_safety_checker": False
        }
    )
    image_url = img_res["images"][0]["url"]
    print(f"[+] Keyframe generated: {image_url}")

    # 2. Image-to-Video Motion (Character Acting)
    print(f"[*] Step 2: Animating character motion via Wan 2.1 I2V...")
    video_res = fal_client.subscribe(
        "fal-ai/wan/v2.1/image-to-video",
        arguments={
            "image_url": image_url,
            "prompt": motion_prompt,
            "aspect_ratio": "9:16"
        }
    )
    video_url = video_res["video"]["url"]
    print(f"[✓] Animated Video Scene Ready: {video_url}")
    return video_url

if __name__ == "__main__":
    prompt_img = (
        "Clean 2D vector cartoon style, thick black ink outlines, flat solid color palette, "
        "a nervous young astronaut holding a cracked alien compass, retro-futuristic cockpit background, 9:16 vertical"
    )
    prompt_motion = (
        "2D cartoon character animation: the astronaut gasps in shock, his hands tremble as the needle "
        "spins wildly, blinking eyes in disbelief, subtle floating motion"
    )
    generate_narrative_scene(prompt_img, prompt_motion)
