#!/usr/bin/env python3
"""Cross-platform installer for AnimatorSkillMcp skill symlinks, commands, and dependencies."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def link_or_copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() or dst.is_symlink():
        if dst.is_symlink() or dst.is_file():
            dst.unlink()
        else:
            shutil.rmtree(dst)
    try:
        os.symlink(str(src), str(dst), target_is_directory=src.is_dir())
        print(f"  [symlink] {dst} -> {src}")
    except OSError:
        if src.is_dir():
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
        print(f"  [copied]  {dst} <- {src}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Install AnimatorSkillMcp locally")
    parser.add_argument("--install-python", action="store_true", help="pip install -r requirements.txt")
    parser.add_argument("--install-node", action="store_true", help="npm install inside studio/cartoon_engine")
    parser.add_argument("--link-skills", action="store_true", help="Link skill & commands into ~/.claude and ~/.gemini")
    args = parser.parse_args()

    if args.install_python:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(REPO_ROOT / "requirements.txt")], check=True)

    if args.install_node:
        npm_bin = "npm.cmd" if os.name == "nt" else "npm"
        subprocess.run([npm_bin, "install"], cwd=str(REPO_ROOT / "studio" / "cartoon_engine"), check=True)

    if args.link_skills:
        home = Path.home()
        for root in (
            home / ".claude" / "skills",
            home / ".gemini" / "config" / "skills",
            home / ".gemini" / "skills",
            home / ".agents" / "skills",
        ):
            link_or_copy(REPO_ROOT, root / "cartoon-3d-short")
        cmd_dir = home / ".claude" / "commands"
        for md in (REPO_ROOT / "commands").glob("*.md"):
            link_or_copy(md, cmd_dir / md.name)

    mcp_snippet = {
        "mcpServers": {
            "animator-skill": {
                "command": sys.executable,
                "args": [str(REPO_ROOT / "mcp_server" / "server.py")],
            }
        }
    }
    print("\nAdd this to your mcp_config.json / .mcp.json to enable the AnimatorSkillMcp server:")
    print(json.dumps(mcp_snippet, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
