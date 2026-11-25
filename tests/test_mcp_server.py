"""End-to-end stdio verification test suite for AnimatorSkillMcp."""

from __future__ import annotations

import asyncio
import json
import sys
import tempfile
import unittest
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

REPO_ROOT = Path(__file__).resolve().parent.parent
SERVER_SCRIPT = REPO_ROOT / "mcp_server" / "server.py"


class TestAnimatorSkillMcp(unittest.TestCase):
    def test_mcp_stdio_roundtrip(self) -> None:
        async def _run() -> None:
            params = StdioServerParameters(command=sys.executable, args=[str(SERVER_SCRIPT)], cwd=str(REPO_ROOT))
            async with stdio_client(params) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()

                    tools_res = await session.list_tools()
                    tool_names = {t.name for t in tools_res.tools}
                    expected_tools = {
                        "preflight_studio",
                        "list_styles_and_stops",
                        "create_episode_project",
                        "generate_voice_with_alignment",
                        "master_audio_mix",
                        "render_short_video",
                        "audit_short_quality",
                    }
                    self.assertTrue(expected_tools.issubset(tool_names), f"Missing tools: {expected_tools - tool_names}")

                    resources_res = await session.list_resources()
                    uris = {str(r.uri) for r in resources_res.resources}
                    self.assertIn("animator://skill", uris)
                    self.assertIn("animator://stops", uris)

                    prompts_res = await session.list_prompts()
                    prompt_names = {p.name for p in prompts_res.prompts}
                    self.assertIn("create_kounkan_plus_short", prompt_names)

                    # 1. preflight_studio
                    pf_res = await session.call_tool("preflight_studio", {})
                    pf = json.loads(pf_res.content[0].text)
                    self.assertTrue(pf["ready_for_local_kounkan_plus"], f"Preflight failed: {pf}")
                    self.assertGreaterEqual(pf["sfx_library_wav_count"], 43)

                    # 2. list_styles_and_stops
                    st_res = await session.call_tool("list_styles_and_stops", {})
                    st = json.loads(st_res.content[0].text)
                    style_ids = {s["id"] for s in st["styles"]}
                    self.assertIn("kounkan_plus", style_ids)
                    self.assertEqual(len(st["production_stops"]), 9)

                    # 3. create_episode_project inside a disposable temp directory
                    with tempfile.TemporaryDirectory() as tmpdir:
                        sc_res = await session.call_tool(
                            "create_episode_project",
                            {
                                "slug": "smoke_test_ep",
                                "title": "Smoke Test Episode",
                                "premise": "Testing Kounkan+ scaffold creation cleanly.",
                                "style": "kounkan_plus",
                                "duration_sec": 30.0,
                                "target_base_dir": tmpdir,
                            },
                        )
                        sc = json.loads(sc_res.content[0].text)
                        self.assertEqual(sc["shot_count"], 12)
                        for fp in sc["files_created"]:
                            self.assertTrue(Path(fp).exists(), f"Missing scaffold file: {fp}")

                    # 4. audit_short_quality (physics & cadence self-tests + Ep1 timestamps)
                    ep1_voice = REPO_ROOT / "studio" / "episodes" / "imad_episode1" / "voice"
                    qa_res = await session.call_tool(
                        "audit_short_quality",
                        {
                            "words_json": str(ep1_voice / "words.json"),
                            "segments_json": str(ep1_voice / "segments.json"),
                            "run_engine_self_tests": True,
                        },
                    )
                    qa = json.loads(qa_res.content[0].text)
                    self.assertTrue(qa["passed"], f"QA failed: {qa}")
                    self.assertEqual(qa["words_audit"]["overlaps"], 0)
                    self.assertEqual(qa["segments_audit"]["overlaps"], 0)

                    # 5. master_audio_mix smoke test on synthetic 2.0s 48kHz voice wave
                    import numpy as np
                    from scipy.io import wavfile

                    with tempfile.TemporaryDirectory() as tmpdir:
                        tp = Path(tmpdir)
                        sr = 48000
                        t = np.linspace(0, 2.0, sr * 2, endpoint=False)
                        sig = (0.12 * np.sin(2 * np.pi * 220 * t) * 32767.0).astype(np.int16)
                        v_wav = tp / "voice.wav"
                        w_json = tp / "words.json"
                        m_wav = tp / "mix.wav"
                        wavfile.write(str(v_wav), sr, sig)
                        w_json.write_text(json.dumps([{"w": "test", "s": 0.2, "e": 1.6}]), encoding="utf-8")

                        mix_res = await session.call_tool(
                            "master_audio_mix",
                            {
                                "voice_wav": str(v_wav),
                                "words_json": str(w_json),
                                "out_wav": str(m_wav),
                                "target_lufs": -14.4,
                                "duration_sec": 2.0,
                            },
                        )
                        mix = json.loads(mix_res.content[0].text)
                        self.assertTrue(m_wav.exists())
                        lufs = mix["ebur128"]["integrated_lufs"]
                        self.assertTrue(-16.0 <= lufs <= -12.5, f"Unexpected LUFS: {mix}")
                        self.assertLessEqual(mix["ebur128"]["true_peak_dbfs"], -1.0)

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
