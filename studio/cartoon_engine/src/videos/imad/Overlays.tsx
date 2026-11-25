import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SEGMENTS, ShotDef, WORDS, WordEntry, activeSegmentAt, clamp01 } from "./story";

interface CaptionChunk {
  segId: number;
  speaker: string;
  lipSync: boolean;
  fStart: number;
  fEnd: number;
  words: WordEntry[];
}

function buildCaptionChunks(): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];
  const bySeg = new Map<number, WordEntry[]>();
  for (const w of WORDS) {
    const arr = bySeg.get(w.seg);
    if (arr) arr.push(w);
    else bySeg.set(w.seg, [w]);
  }

  for (const seg of SEGMENTS) {
    const ws = bySeg.get(seg.id) ?? [];
    let cur: WordEntry[] = [];
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      cur.push(w);
      const endsSentence = /[.!?:]$/.test(w.w);
      const endsClause = /[,;]$/.test(w.w) && cur.length >= 3;
      const isLast = i === ws.length - 1;
      if (cur.length >= 4 || endsSentence || endsClause || isLast) {
        chunks.push({
          segId: seg.id,
          speaker: seg.speaker,
          lipSync: seg.lip_sync,
          fStart: cur[0].f_start,
          fEnd: cur[cur.length - 1].f_end,
          words: cur,
        });
        cur = [];
      }
    }
  }

  // Smooth tiny 1-3 frame gaps *within* the same segment, and keep final word readable through acoustic tail
  const segById = new Map(SEGMENTS.map((s) => [s.id, s]));
  for (let i = 0; i < chunks.length; i++) {
    const isSameNext = i < chunks.length - 1 && chunks[i].segId === chunks[i + 1].segId;
    if (isSameNext) {
      chunks[i].fEnd = Math.max(chunks[i].fEnd, chunks[i + 1].fStart - 1);
    } else {
      const seg = segById.get(chunks[i].segId);
      if (seg) {
        chunks[i].fEnd = Math.min(seg.f_end, chunks[i].fEnd + 2);
      }
    }
  }
  return chunks;
}

const SPEAKER_META: Record<string, { label: string; accent: string; badgeBg: string }> = {
  imad_vo: { label: "IMAD (THOUGHT)", accent: "#FFDD00", badgeBg: "#3b2c18" },
  imad: { label: "IMAD", accent: "#FFDD00", badgeBg: "#e5a93b" },
  sarah: { label: "SARAH", accent: "#64dfdf", badgeBg: "#3d6b61" },
  henderson: { label: "MR. HENDERSON", accent: "#ffb76b", badgeBg: "#6b4226" },
  narrator: { label: "EPISODE 2 NEXT", accent: "#FFDD00", badgeBg: "#d91e5b" },
};

export const HudAndCaptionOverlay: React.FC<{ shot: ShotDef }> = ({ shot }) => {
  const f = useCurrentFrame();
  const chunks = useMemo(() => buildCaptionChunks(), []);

  const activeChunk = useMemo(() => {
    for (const c of chunks) {
      if (f >= c.fStart && f <= c.fEnd) return c;
    }
    return null;
  }, [chunks, f]);

  // Hide compact top HUD on inserts that already show full-screen Karma Fund UI or CTA endcard
  const hideTopHud =
    shot.insert === "karma_meter" || shot.insert === "karma_rules" || shot.insert === "cta_endcard";

  const isHook = shot.id === 1;
  const isAlert = shot.light === "alert";
  const isPostSpend = f >= 1669; // drops from $1,000,000 -> $550,000 right when PAID ✔ slams the signed contract!

  const currentFund = isAlert ? "$2,550,000" : isPostSpend ? "$550,000" : "$1,000,000";
  const statusRight = isAlert
    ? "⚠ +500% VALUE SURGE!"
    : isPostSpend
    ? "✔ $450K SPENT"
    : "GOAL: <$1,000 • 48H";

  const flashPulse = isAlert && f % 10 < 5;

  const activeSeg = activeSegmentAt(f);
  const spKey = activeChunk?.speaker ?? activeSeg?.speaker ?? "imad_vo";
  const meta = SPEAKER_META[spKey] ?? SPEAKER_META.imad_vo;

  // Determine active word index inside chunk (keep last word lit during intra-chunk micro-pauses)
  let activeWordIdx = -1;
  if (activeChunk) {
    for (let i = 0; i < activeChunk.words.length; i++) {
      const w = activeChunk.words[i];
      if (f >= w.f_start && f <= w.f_end) {
        activeWordIdx = i;
        break;
      }
      if (f > w.f_end) activeWordIdx = i;
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* TOP SAFE-ZONE HUD (starts at top=294px >= 15% of 1920px, compact height clears all character heads!) */}
      {!hideTopHud && (
        <div
          style={{
            position: "absolute",
            top: 294,
            left: 68,
            right: 68,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {isHook ? (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(25, 16, 28, 0.92), rgba(45, 28, 18, 0.90))",
                border: "4px solid #FFDD00",
                borderRadius: 24,
                padding: "13px 26px",
                boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
                textAlign: "center",
                maxWidth: 920,
              }}
            >
              <div
                style={{
                  fontFamily: "'Arial Black', Impact, sans-serif",
                  fontSize: 35,
                  fontWeight: 900,
                  color: "#FFFFFF",
                  letterSpacing: 0.6,
                  lineHeight: 1.12,
                  textShadow: "0 3px 0 #1b1020",
                }}
              >
                HOW TO BLOW <span style={{ color: "#FFDD00" }}>$1,000,000</span> IN 48 HOURS
              </div>
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: 920,
                background: isAlert
                  ? flashPulse
                    ? "rgba(224, 24, 82, 0.94)"
                    : "rgba(176, 12, 58, 0.92)"
                  : "rgba(245, 166, 35, 0.90)",
                border: `4px solid ${isAlert ? "#ff77a8" : "#241726"}`,
                borderRadius: 22,
                padding: "10px 22px",
                boxShadow: isAlert
                  ? "0 0 28px rgba(255, 45, 110, 0.65)"
                  : "0 8px 22px rgba(36, 23, 38, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "'Segoe UI', Arial, sans-serif",
                    fontSize: 18,
                    fontWeight: 800,
                    color: isAlert ? "#ffe0ec" : "#3a2008",
                    letterSpacing: 1.0,
                  }}
                >
                  {isAlert ? "⚠ CRITICAL PROFIT ALERT" : "✦ KARMA FUND BALANCE"}
                </span>
                <span
                  style={{
                    fontFamily: "'Arial Black', Impact, sans-serif",
                    fontSize: 38,
                    fontWeight: 900,
                    color: isAlert ? "#ffeb57" : "#ffffff",
                    WebkitTextStroke: "2px #241726",
                    paintOrder: "stroke fill",
                    lineHeight: 1.05,
                  }}
                >
                  {currentFund}
                </span>
              </div>

              <div
                style={{
                  background: isAlert ? "#241726" : "rgba(36, 23, 38, 0.88)",
                  borderRadius: 14,
                  padding: "8px 16px",
                  border: `2px solid ${isAlert ? "#ffdd00" : "#ffe28a"}`,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Arial Black', sans-serif",
                    fontSize: 20,
                    fontWeight: 900,
                    color: isAlert ? "#ff5c93" : isPostSpend ? "#6ff7a7" : "#ffdd00",
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusRight}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM SAFE-ZONE WORD-EXACT CAPTIONS (bottom=400px -> y <= 1520px, clear of bottom 20%!) */}
      {activeChunk && (
        <div
          style={{
            position: "absolute",
            bottom: 400,
            left: 68,
            right: 68,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Compact Speaker Pill */}
          <div
            style={{
              backgroundColor: meta.badgeBg,
              border: "3px solid #241726",
              borderRadius: 14,
              padding: "4px 16px",
              marginBottom: 8,
              boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
            }}
          >
            <span
              style={{
                fontFamily: "'Arial Black', sans-serif",
                fontSize: 21,
                fontWeight: 900,
                color: spKey === "imad" ? "#241726" : "#FFFFFF",
                letterSpacing: 0.8,
              }}
            >
              {meta.label}
            </span>
          </div>

          {/* Chunked Word-Synced Caption Pill */}
          <div
            style={{
              backgroundColor: "rgba(16, 12, 22, 0.82)",
              border: `3.5px solid ${isAlert ? "#ff4d88" : "rgba(255, 221, 0, 0.45)"}`,
              borderRadius: 24,
              padding: "16px 28px",
              maxWidth: 920,
              boxShadow: "0 10px 26px rgba(0, 0, 0, 0.45)",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              gap: "10px 22px",
            }}
          >
            {activeChunk.words.map((w, idx) => {
              const isLit = idx === activeWordIdx;
              const u = isLit
                ? clamp01((f - w.f_start + 1) / Math.max(2, (w.f_end - w.f_start) * 0.4))
                : 0;
              const sc = isLit ? 1.0 + 0.05 * Math.sin(u * Math.PI * 0.5) : 1.0;
              const wordColor = isLit ? (isAlert ? "#ff5c93" : meta.accent) : "#FFFFFF";

              return (
                <span
                  key={`${w.seg}-${w.f_start}-${idx}`}
                  style={{
                    fontFamily: "'Arial Black', Impact, 'Segoe UI', sans-serif",
                    fontSize: 45,
                    fontWeight: 900,
                    lineHeight: 1.15,
                    padding: "0 2px",
                    color: wordColor,
                    WebkitTextStroke: "7px #1a111d",
                    paintOrder: "stroke fill",
                    textShadow: "0 4px 0 #1a111d",
                    transform: `scale(${sc.toFixed(3)})`,
                    display: "inline-block",
                    transition: "none",
                  }}
                >
                  {w.w}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
