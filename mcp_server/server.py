"""AnimatorSkillMcp — Model Context Protocol (MCP) server for animated story shorts creation."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

try:
    from mcp.server.mcpserver import MCPServer as _ServerClass
except ImportError:
    from mcp.server.fastmcp import FastMCP as _ServerClass  # type: ignore[no-redef]

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import studio_ops as ops  # noqa: E402

mcp = _ServerClass("animator-skill-mcp")


@mcp.tool()
def preflight_studio() -> str:
    """Check Python packages, FFmpeg, Node/Remotion, WebGL browser, SFX assets, and optional API keys."""
    return json.dumps(ops.preflight_studio(), indent=2)


@mcp.tool()
def list_styles_and_stops() -> str:
    """List all 9 animation styles (Kounkan+ Hybrid + 8 presets), Remotion compositions, and the 9 Production Stops."""
    return json.dumps(ops.list_styles_and_stops(), indent=2)


@mcp.tool()
def create_episode_project(
    slug: str,
    title: str,
    premise: str,
    style: str = "kounkan_plus",
    duration_sec: float = 60.0,
    characters_json: str = "",
    target_base_dir: str = "",
) -> str:
    """Scaffold a vertical 9:16 short project with SCRIPT.md, character_bible.json, rhythmic shots.json, and voice template."""
    chars = json.loads(characters_json) if characters_json.strip() else None
    result = ops.create_episode_project(
        slug=slug,
        title=title,
        premise=premise,
        style=style,
        duration_sec=duration_sec,
        characters=chars,
        target_base_dir=target_base_dir or None,
    )
    return json.dumps(result, indent=2)


@mcp.tool()
def generate_voice_with_alignment(
    segments_json: str,
    out_dir: str,
    total_duration: float = 70.0,
    start_offset_s: float = 0.25,
) -> str:
    """Synthesize zero-overlap Edge-TTS multi-voice audio + exact WordBoundary words.json & segments.json."""
    parsed = json.loads(segments_json)
    segments = parsed["segments"] if isinstance(parsed, dict) and "segments" in parsed else parsed
    result = ops.generate_voice_with_alignment(
        segments=segments,
        out_dir=out_dir,
        total_duration=total_duration,
        start_offset_s=start_offset_s,
    )
    return json.dumps(result, indent=2)


@mcp.tool()
def master_audio_mix(
    voice_wav: str,
    words_json: str,
    out_wav: str,
    target_lufs: float = -14.4,
    duration_sec: float | None = None,
) -> str:
    """Master 48kHz stereo audio mixing voice, ducked Rhodes BGM, look-ahead limiter, and EBU R128 loudness check."""
    result = ops.master_audio_mix(
        voice_wav=voice_wav,
        words_json=words_json,
        out_wav=out_wav,
        target_lufs=target_lufs,
        duration_sec=duration_sec,
    )
    return json.dumps(result, indent=2)


@mcp.tool()
def render_short_video(
    composition_id: str,
    out_path: str,
    audio_wav: str = "",
    still_frame: int | None = None,
    scale: float = 1.0,
) -> str:
    """Render a Remotion still frame (still_frame>=0) or full 9:16 H.264/AAC MP4 master via ANGLE WebGL."""
    result = ops.render_short_video(
        composition_id=composition_id,
        out_path=out_path,
        audio_wav=audio_wav or None,
        still_frame=still_frame,
        scale=scale,
    )
    return json.dumps(result, indent=2)


@mcp.tool()
def audit_short_quality(
    video_mp4: str = "",
    words_json: str = "",
    segments_json: str = "",
    run_engine_self_tests: bool = True,
) -> str:
    """Execute Stop 9 QA audit: physics/cadence self-tests, zero voice overlap check, ffprobe, EBU R128 loudness, and cuts."""
    result = ops.audit_short_quality(
        video_mp4=video_mp4 or None,
        words_json=words_json or None,
        segments_json=segments_json or None,
        run_engine_self_tests=run_engine_self_tests,
    )
    return json.dumps(result, indent=2)


@mcp.resource("animator://skill")
def resource_skill() -> str:
    """Full cartoon-3d-short & Kounkan+ SKILL.md specification."""
    return (ops.REPO_ROOT / "SKILL.md").read_text(encoding="utf-8")


@mcp.resource("animator://style-bible")
def resource_style_bible() -> str:
    """Reference style bible measured from 20+ viral shorts."""
    return (ops.REPO_ROOT / "references" / "STYLE_BIBLE.md").read_text(encoding="utf-8")


@mcp.resource("animator://stops")
def resource_stops() -> str:
    """The 9 Gated Production Stops JSON checklist."""
    return json.dumps(ops.PRODUCTION_STOPS, indent=2)


@mcp.prompt()
def create_kounkan_plus_short(topic: str, duration_sec: float = 65.0) -> str:
    """Prompt template for producing a viral Kounkan+ Hybrid 2D-in-3D vertical story short."""
    return (
        f"Create a {duration_sec:.0f}-second vertical (1080x1920, 30 fps) animated story short about: {topic}\n\n"
        "Workflow using AnimatorSkillMcp:\n"
        "1. Call preflight_studio() and list_styles_and_stops().\n"
        "2. Call create_episode_project(...) using style='kounkan_plus' and rhythmic 2.0-3.5s shots.\n"
        "3. Separate inner monologue/narrator (lip_sync=False) from spoken dialogue, then call generate_voice_with_alignment().\n"
        "4. Build the Remotion scene with InkPass + LensBlur + GradeEffect + custom 2D close-up inserts + <AbsoluteFill> safe-zone overlays.\n"
        "5. Call master_audio_mix() (-14.4 LUFS stereo) -> render_short_video() -> audit_short_quality()."
    )


if __name__ == "__main__":
    mcp.run(transport="stdio")
