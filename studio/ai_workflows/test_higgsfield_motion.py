"""
Higgsfield AI Narrative Motion Pipeline
Connects to Higgsfield AI API via official credentials or MCP server.
Uses Higgsfield's multi-model suite (Soul Character, Seedance, Kling, Wan) for animated story shorts.
"""

import os
import sys
import json
import time
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent.parent
ENV_PATH = REPO_ROOT / ".env" if (REPO_ROOT / ".env").exists() else BASE_DIR / ".env"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def load_keys():
    keys = dict(os.environ)
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    k, v = line.strip().split("=", 1)
                    keys[k.strip()] = v.strip()
                    os.environ[k.strip()] = v.strip()
    return keys

def check_higgsfield_balance():
    keys = load_keys()
    api_key = keys.get("HIGGSFIELD_API_KEY")
    secret = keys.get("HIGGSFIELD_SECRET")
    if (not api_key or not secret) and ":" in keys.get("HF_KEY", ""):
        api_key, secret = keys["HF_KEY"].split(":", 1)

    if not api_key or not secret or "your_higgsfield" in api_key:
        print("[!] Please set HF_KEY (id:secret) or HIGGSFIELD_API_KEY + HIGGSFIELD_SECRET in .env")
        return False

    headers = {
        "Authorization": f"Key {api_key}:{secret}",
        "Content-Type": "application/json"
    }

    try:
        # Check balance endpoint
        res = requests.get("https://api.higgsfield.ai/v1/balance", headers=headers, timeout=10)
        if res.status_code == 200:
            data = res.json()
            print(f"[✓] Higgsfield Authenticated successfully!")
            print(f"    Balance: {data}")
            return True
        elif res.status_code == 401 or res.status_code == 403:
            print(f"[!] Authentication failed: {res.text}")
            return False
        else:
            print(f"[*] API Response ({res.status_code}): {res.text}")
            return True
    except Exception as e:
        print(f"[!] Connection error: {e}")
        return False

if __name__ == "__main__":
    check_higgsfield_balance()
