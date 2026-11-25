import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { INK } from "../../templates/bridge/toon";
import { InsertKind, ShotDef, clamp01 } from "./story";

const springOut = (u: number) => {
  const t = clamp01(u);
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

function roundBox(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient | null,
  stroke: string | null = INK,
  lw = 7
) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke && lw > 0) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.lineJoin = "round";
    g.stroke();
  }
}

function drawOakBackdrop(g: CanvasRenderingContext2D, w: number, h: number, tint = "#f7d5aa") {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#754426");
  bg.addColorStop(0.55, "#5c341d");
  bg.addColorStop(1, "#3d2112");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  // Diagonal warm café sunbeam across insert panel
  const sun = g.createRadialGradient(w * 0.82, h * 0.18, 30, w * 0.65, h * 0.35, w * 0.95);
  sun.addColorStop(0, tint);
  sun.addColorStop(0.45, "rgba(255, 224, 175, 0.25)");
  sun.addColorStop(1, "rgba(255, 224, 175, 0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);

  // Subtle plank wood lines
  g.strokeStyle = "rgba(45, 22, 10, 0.35)";
  g.lineWidth = 4;
  for (let py = 120; py < h; py += 160) {
    g.beginPath();
    g.moveTo(0, py);
    g.lineTo(w, py);
    g.stroke();
  }
}

function drawKarmaMeter(g: CanvasRenderingContext2D, f: number, f0: number) {
  drawOakBackdrop(g, 1080, 1920);
  const lf = f - f0;
  const pop = springOut(lf / 14);

  // Stylized steaming ceramic coffee mug with saucer & handle at bottom-right (y ~ 1210)
  g.save();
  g.translate(825, 1215);
  // Soft table shadow
  g.fillStyle = "rgba(25, 12, 5, 0.36)";
  g.beginPath();
  g.ellipse(8, 86, 125, 28, 0, 0, Math.PI * 2);
  g.fill();
  // Saucer
  g.fillStyle = "#efe5d2";
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.beginPath();
  g.ellipse(0, 74, 112, 24, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // Mug Handle
  g.strokeStyle = INK;
  g.lineWidth = 22;
  g.lineCap = "round";
  g.beginPath();
  g.arc(72, 6, 36, -Math.PI * 0.45, Math.PI * 0.45);
  g.stroke();
  g.strokeStyle = "#fbf5e8";
  g.lineWidth = 10;
  g.beginPath();
  g.arc(72, 6, 36, -Math.PI * 0.45, Math.PI * 0.45);
  g.stroke();
  // Mug Body & Latte Surface
  roundBox(g, -74, -62, 148, 134, 24, "#fbf5e8", INK, 7);
  g.beginPath();
  g.ellipse(0, -62, 70, 18, 0, 0, Math.PI * 2);
  g.fillStyle = "#5b2a14";
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.stroke();
  g.restore();

  // Centered Holographic Amber Card (cleanly framed in middle safe zone!)
  g.save();
  g.translate(540, 790);
  g.scale(0.88 + 0.12 * pop, 0.88 + 0.12 * pop);

  const grad = g.createLinearGradient(-440, -330, 440, 330);
  grad.addColorStop(0, "rgba(255, 193, 69, 0.95)");
  grad.addColorStop(1, "rgba(235, 145, 28, 0.94)");
  roundBox(g, -440, -330, 880, 660, 38, grad, INK, 9);
  roundBox(g, -422, -312, 844, 624, 30, null, "rgba(255, 245, 214, 0.72)", 4);

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#2b1608";
  g.font = "900 36px 'Arial Black', Impact, sans-serif";
  g.fillText("THE KARMA FUND SYSTEM", 0, -245);

  // Canvas-drawn sparkle stars flanking title
  for (const sx of [-315, 315]) {
    g.fillStyle = "#fff5cc";
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const r = k % 2 === 0 ? 15 : 6;
      const px = sx + Math.cos(a) * r;
      const py = -246 + Math.sin(a) * r;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    g.stroke();
  }

  // Countdown badge with clean vector clock dial
  roundBox(g, -245, -195, 490, 64, 32, "#241726", "#ffe28a", 4);
  g.save();
  g.translate(-186, -163);
  g.fillStyle = "#ffdd00";
  g.beginPath();
  g.arc(0, 0, 15, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#241726";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -9);
  g.moveTo(0, 0);
  g.lineTo(7, 3);
  g.stroke();
  g.restore();
  g.fillStyle = "#ffdd00";
  g.font = "900 32px 'Arial Black', sans-serif";
  g.fillText("48:00:00 DEADLINE", 24, -162);

  // Animated $1,000,000 -> <$1,000 meter (fitted inside card borders!)
  const u = clamp01((lf - 12) / 48);
  const smoothU = u * u * (3 - 2 * u);
  g.fillStyle = "#ffffff";
  g.strokeStyle = INK;
  g.lineWidth = 9;
  g.font = "900 58px 'Arial Black', Impact, sans-serif";
  const valTxt = "$1,000,000  \u2192  <$1,000";
  g.strokeText(valTxt, 0, -40);
  g.fillText(valTxt, 0, -40);

  // Progress bar track
  roundBox(g, -360, 45, 720, 56, 28, "#382210", INK, 6);
  const fillW = Math.max(48, 708 * (1 - smoothU * 0.85));
  const barGrad = g.createLinearGradient(-354, 0, 354, 0);
  barGrad.addColorStop(0, "#52e59b");
  barGrad.addColorStop(1, "#ffdd00");
  roundBox(g, -354, 51, fillW, 44, 22, barGrad, null, 0);

  g.fillStyle = "#fff9e6";
  g.strokeStyle = INK;
  g.lineWidth = 7;
  g.font = "900 31px 'Arial Black', sans-serif";
  const subTxt = "SPEND ALL  \u2192  CONVERT TO PERSONAL CASH";
  g.strokeText(subTxt, 0, 175);
  g.fillText(subTxt, 0, 175);

  // Bottom warning pill
  roundBox(g, -330, 225, 660, 62, 20, "#d93848", INK, 5);
  g.fillStyle = "#ffffff";
  g.font = "900 28px 'Arial Black', sans-serif";
  g.fillText("LEAVE $1 BEHIND = YOU GET ZERO!", 0, 257);

  g.restore();
}

function drawKarmaRules(g: CanvasRenderingContext2D, f: number, f0: number) {
  drawOakBackdrop(g, 1080, 1920);
  const lf = f - f0;

  g.save();
  g.translate(540, 820);
  const grad = g.createLinearGradient(-440, -370, 440, 370);
  grad.addColorStop(0, "rgba(255, 195, 72, 0.95)");
  grad.addColorStop(1, "rgba(232, 140, 26, 0.94)");
  roundBox(g, -440, -370, 880, 740, 38, grad, INK, 9);

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#2b1608";
  g.font = "900 40px 'Arial Black', sans-serif";
  g.fillText("KARMA FUND — STRICT RULES", 0, -295);

  // Fast stagger so all 3 rules slam visibly during the shot!
  const cards = [
    { start: 0, bg: "#e63946", txt: "NO LUXURY CARS OR MANSIONS", mark: "X", y: -165 },
    { start: 8, bg: "#e63946", txt: "NO SCAMS OR FAKE DEALS", mark: "X", y: 10 },
    { start: 16, bg: "#2a9d68", txt: "REAL COMMUNITY BUSINESSES", mark: "OK", y: 185 },
  ];

  for (const c of cards) {
    const s = springOut((lf - c.start) / 11);
    if (s <= 0.01) continue;
    g.save();
    g.translate(0, c.y);
    g.scale(s, s);
    roundBox(g, -385, -64, 770, 128, 28, c.bg, INK, 7);
    g.fillStyle = "#ffffff";
    g.strokeStyle = INK;
    g.lineWidth = 7;
    g.font = "900 33px 'Arial Black', sans-serif";
    const prefix = c.mark === "X" ? "\u2716  " : "\u2714  ";
    g.strokeText(prefix + c.txt, 0, 2);
    g.fillText(prefix + c.txt, 0, 2);
    g.restore();
  }

  g.restore();
}

function drawAuditFile(g: CanvasRenderingContext2D, f: number, f0: number) {
  drawOakBackdrop(g, 1080, 1920);
  const lf = f - f0;

  // Manila Dossier Folder — centered at y=915 so folder tab (y=515) stays well below HUD (y<=425)!
  g.save();
  g.translate(540, 915);
  g.rotate(-0.018);
  roundBox(g, -420, -340, 840, 680, 24, "#f4e6c8", INK, 8);
  // Top folder tab
  roundBox(g, -420, -388, 340, 62, 16, "#e8cf9d", INK, 7);
  g.fillStyle = "#3a2514";
  g.font = "900 28px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("AUDIT FILE #01", -250, -356);

  // Header
  g.fillStyle = "#241726";
  g.font = "900 42px 'Arial Black', sans-serif";
  g.fillText("HENDERSON TEXTILES", 0, -252);
  g.strokeStyle = "#8a7356";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-340, -206);
  g.lineTo(340, -206);
  g.stroke();

  // Valuation vs Overpay rows
  roundBox(g, -355, -172, 710, 128, 20, "#fffdf7", INK, 5);
  g.textAlign = "left";
  g.fillStyle = "#5a4636";
  g.font = "bold 26px sans-serif";
  g.fillText("ACTUAL VALUE:", -325, -126);
  g.fillStyle = "#b83232";
  g.font = "900 46px 'Arial Black', sans-serif";
  g.fillText("$50,000", -325, -76);

  // Red BANKRUPT Stamp slamming right on "bankrupt!" (lf = 23 -> f = 698)
  const stU = clamp01((lf - 23) / 8);
  if (stU > 0) {
    const sc = 1.5 - 0.5 * springOut(stU);
    g.save();
    g.translate(185, -108);
    g.rotate(-0.15);
    g.scale(sc, sc);
    roundBox(g, -135, -42, 270, 84, 12, "rgba(218, 38, 52, 0.14)", "#d62839", 7);
    g.textAlign = "center";
    g.fillStyle = "#d62839";
    g.font = "900 36px 'Arial Black', sans-serif";
    g.fillText("BANKRUPT", 0, 2);
    g.restore();
  }

  // Imad's Crazy Offer Sticker Card popping right on "Paying four hundred thousand" (lf = 48 -> f = 723!)
  const offS = springOut((lf - 48) / 11);
  if (offS > 0.01) {
    g.save();
    g.translate(0, 130);
    g.scale(offS, offS);
    roundBox(g, -365, -120, 730, 240, 28, "#ffdd00", INK, 8);
    g.textAlign = "center";
    g.fillStyle = "#241726";
    g.font = "900 34px 'Arial Black', sans-serif";
    g.fillText("IMAD'S OFFER:", 0, -60);
    g.fillStyle = "#1b7a43";
    g.font = "900 72px 'Arial Black', Impact, sans-serif";
    g.fillText("$400,000!", 0, 15);
    g.fillStyle = "#d62839";
    g.font = "900 28px 'Arial Black', sans-serif";
    g.fillText("(8x VALUATION • +700% OVERPAY!)", 0, 80);
    g.restore();
  }

  g.restore();
}

function drawGoldenSignature(g: CanvasRenderingContext2D, f: number, f0: number) {
  drawOakBackdrop(g, 1080, 1920);
  const lf = f - f0;

  // Shifted down to y=890 so top parchment edge (y=520) clears HUD bottom (y<=425)!
  g.save();
  g.translate(540, 890);

  // Crisp Cream Parchment Contract
  roundBox(g, -420, -360, 840, 720, 20, "#fdf8ea", INK, 8);
  roundBox(g, -396, -336, 792, 672, 14, null, "#d9c296", 4);

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#241726";
  g.font = "900 40px Georgia, serif";
  g.fillText("ACQUISITION CONTRACT", 0, -275);

  g.textAlign = "left";
  g.font = "bold 32px sans-serif";
  g.fillStyle = "#4d3826";
  g.fillText("• HENDERSON TEXTILES", -340, -180);
  g.fillText("• SEAMSTRESS BACK PAY", -340, -115);
  g.textAlign = "right";
  g.fillStyle = "#241726";
  g.font = "900 36px 'Arial Black', sans-serif";
  g.fillText("$400,000", 340, -180);
  g.fillText("$50,000", 340, -115);

  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-340, -64);
  g.lineTo(340, -64);
  g.stroke();

  g.textAlign = "left";
  g.fillStyle = "#241726";
  g.font = "900 36px 'Arial Black', sans-serif";
  g.fillText("TOTAL PAID:", -340, -12);
  g.textAlign = "right";
  g.fillStyle = "#1d8a4e";
  g.font = "900 48px 'Arial Black', sans-serif";
  g.fillText("$450,000", 340, -12);

  // Signature line
  g.strokeStyle = "#5c4a38";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-310, 175);
  g.lineTo(35, 175);
  g.stroke();
  g.textAlign = "left";
  g.font = "bold 24px sans-serif";
  g.fillStyle = "#7a6652";
  g.fillText("BUYER SIGNATURE", -310, 212);

  // Authentic flowing cursive "Imad" signature kept cleanly left of PAID stamp!
  const sigU = clamp01((lf - 4) / 36);
  const ctrlPts: [number, number][] = [
    [-295, 160],
    [-265, 102],
    [-252, 162],
    [-238, 134],
    [-222, 156],
    [-204, 132],
    [-190, 156],
    [-172, 134],
    [-156, 156],
    [-132, 128],
    [-112, 154],
    [-92, 130],
    [-82, 156],
    [-58, 95],
    [-64, 158],
    [-18, 146],
    [18, 150],
  ];
  // Catmull-Rom smooth interpolation across cursive control points
  const pts: [number, number][] = [];
  for (let i = 0; i < ctrlPts.length - 1; i++) {
    const p0 = ctrlPts[Math.max(0, i - 1)];
    const p1 = ctrlPts[i];
    const p2 = ctrlPts[i + 1];
    const p3 = ctrlPts[Math.min(ctrlPts.length - 1, i + 2)];
    for (let s = 0; s < 4; s++) {
      const t = s / 4;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      pts.push([x, y]);
    }
  }
  pts.push(ctrlPts[ctrlPts.length - 1]);

  const maxIdx = Math.floor(sigU * (pts.length - 1));
  if (sigU > 0.02) {
    g.strokeStyle = "#1b3668";
    g.lineWidth = 6.5;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= maxIdx; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }

  // Animated Mustard Sleeve + Golden Fountain Pen while signing
  if (sigU < 0.98) {
    const idxF = sigU * (pts.length - 1);
    const i0 = Math.min(pts.length - 2, Math.floor(idxF));
    const fr = idxF - i0;
    const penX = pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * fr;
    const penY = pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * fr;

    g.save();
    g.translate(penX, penY);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(24, -18);
    g.lineTo(155, -135);
    g.lineTo(132, -162);
    g.lineTo(8, -32);
    g.closePath();
    g.fillStyle = "#f0be42";
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.stroke();
    g.beginPath();
    g.arc(98, -78, 36, 0, Math.PI * 2);
    g.fillStyle = "#f8d3b3";
    g.fill();
    g.stroke();
    roundBox(g, 118, -110, 140, 95, 22, "#e5a93b", INK, 6);
    g.restore();
  }

  // PAID IN FULL Stamp slamming at lf = 42
  const stampU = clamp01((lf - 42) / 10);
  if (stampU > 0) {
    const sc = 1.5 - 0.5 * springOut(stampU);
    g.save();
    g.translate(220, 130);
    g.rotate(-0.14);
    g.scale(sc, sc);
    roundBox(g, -155, -52, 310, 104, 16, "#1f9d55", INK, 7);
    g.textAlign = "center";
    g.fillStyle = "#ffffff";
    g.font = "900 34px 'Arial Black', sans-serif";
    g.fillText("PAID \u2714", 0, 2);
    g.restore();
  }

  g.restore();
}

function drawBrassKey(g: CanvasRenderingContext2D, f: number, f0: number) {
  const lf = f - f0;
  const flicker = lf > 28 && lf % 6 < 3;
  drawOakBackdrop(g, 1080, 1920, flicker ? "rgba(255, 70, 115, 0.75)" : "#ffe8be");

  // Shifted down to y=890 so top GIFT pill (y=500..574) sits cleanly below HUD (y<=425)!
  g.save();
  g.translate(540, 890);

  // Radial sunburst behind key
  const aura = g.createRadialGradient(0, -10, 30, 0, -10, 400);
  aura.addColorStop(0, flicker ? "rgba(255, 65, 115, 0.65)" : "rgba(255, 225, 115, 0.72)");
  aura.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = aura;
  g.fillRect(-540, -540, 1080, 1080);

  // Swinging Vintage Tag (offset right & lower so key teeth never overlap text!)
  const swing = Math.sin(lf * 0.16) * 0.06;
  g.save();
  g.translate(85, 50);
  g.rotate(0.14 + swing);
  g.strokeStyle = "#e6cfa4";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(-45, -15);
  g.lineTo(30, 50);
  g.stroke();
  roundBox(g, -20, 42, 330, 174, 18, "#f3dfb8", INK, 7);
  // Grommet hole on tag
  g.beginPath();
  g.arc(32, 68, 10, 0, Math.PI * 2);
  g.fillStyle = "#5c3419";
  g.fill();
  g.textAlign = "center";
  g.fillStyle = "#5c3419";
  g.font = "900 32px 'Arial Black', sans-serif";
  g.fillText("UNIT #9", 148, 108);
  g.fillStyle = "#9b2226";
  g.font = "900 30px sans-serif";
  g.fillText("VINTAGE SILK", 148, 165);
  g.restore();

  // Ornate Antique Brass Key (Hero center-left)
  const pop = springOut(lf / 14);
  g.save();
  g.translate(-105, -20);
  g.rotate(-0.35 + Math.sin(lf * 0.1) * 0.04);
  g.scale(pop, pop);

  g.beginPath();
  g.arc(0, -145, 92, 0, Math.PI * 2);
  g.fillStyle = "#f2c144";
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 10;
  g.stroke();
  g.beginPath();
  g.arc(0, -145, 42, 0, Math.PI * 2);
  g.fillStyle = "#6e4022";
  g.fill();
  g.stroke();

  roundBox(g, -20, -62, 40, 290, 12, "#f2c144", INK, 9);
  roundBox(g, 18, 130, 82, 34, 8, "#e6af32", INK, 8);
  roundBox(g, 18, 182, 98, 38, 8, "#e6af32", INK, 8);

  for (const [sx, sy] of [
    [-48, -195],
    [15, 35],
    [70, 195],
  ]) {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(sx, sy, 10 + 4 * Math.sin(lf * 0.4 + sx), 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // Top label safely below HUD (y = 890 - 380 = 510 > 425!)
  roundBox(g, -290, -405, 580, 74, 24, flicker ? "#d91e5b" : "#241726", "#ffdd00", 5);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#ffffff";
  g.font = "900 32px 'Arial Black', sans-serif";
  g.fillText(flicker ? "SCANNING GIFT ASSET..." : "GIFT: STORAGE UNIT 9", 0, -368);

  g.restore();
}

function drawCtaEndcard(g: CanvasRenderingContext2D, f: number, f0: number) {
  const lf = f - f0;
  const bg = g.createRadialGradient(540, 780, 60, 540, 780, 960);
  bg.addColorStop(0, "#7a1438");
  bg.addColorStop(0.6, "#3b0a1f");
  bg.addColorStop(1, "#180610");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1080, 1920);

  // Comic starburst rays
  g.save();
  g.translate(540, 760);
  g.rotate(lf * 0.008);
  g.fillStyle = "rgba(255, 221, 0, 0.08)";
  for (let i = 0; i < 16; i++) {
    const a0 = (i * Math.PI * 2) / 16;
    const a1 = a0 + Math.PI / 16;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a0) * 1100, Math.sin(a0) * 1100);
    g.lineTo(Math.cos(a1) * 1100, Math.sin(a1) * 1100);
    g.closePath();
    g.fill();
  }
  g.restore();

  const pop = springOut(lf / 14);
  g.save();
  g.translate(540, 760);
  g.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop);

  roundBox(g, -430, -340, 860, 680, 42, "rgba(25, 14, 28, 0.92)", "#ffdd00", 9);

  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#ff4d88";
  g.font = "900 36px 'Arial Black', sans-serif";
  g.fillText("SYSTEM ALERT: +$2,000,000 PROFIT!", 0, -235);

  g.fillStyle = "#ffffff";
  g.strokeStyle = INK;
  g.lineWidth = 10;
  g.font = "900 66px 'Arial Black', Impact, sans-serif";
  g.strokeText("HOW WILL IMAD LOSE", 0, -110);
  g.fillText("HOW WILL IMAD LOSE", 0, -110);
  g.fillStyle = "#ffdd00";
  g.strokeText("$2,550,000 IN TIME?!", 0, -25);
  g.fillText("$2,550,000 IN TIME?!", 0, -25);

  // Bouncing Follow CTA Pill (roomy horizontal margin around text)
  const pulse = 1.0 + 0.05 * Math.sin(lf * 0.25);
  g.save();
  g.translate(0, 145);
  g.scale(pulse, pulse);
  roundBox(g, -365, -70, 730, 140, 70, "#ffdd00", INK, 9);
  g.fillStyle = "#241726";
  g.font = "900 38px 'Arial Black', sans-serif";
  g.fillText("FOLLOW FOR EPISODE 2  \u25b6", 0, 2);
  g.restore();

  g.fillStyle = "#d8cce0";
  g.font = "bold 28px sans-serif";
  g.fillText("BURN IT TO EARN IT • SERIES", 0, 275);

  g.restore();
}

export const InsertOverlay: React.FC<{ shot: ShotDef }> = ({ shot }) => {
  const f = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kind: InsertKind = shot.insert;

  useLayoutEffect(() => {
    if (!kind) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, 1080, 1920);

    switch (kind) {
      case "karma_meter":
        drawKarmaMeter(g, f, shot.a);
        break;
      case "karma_rules":
        drawKarmaRules(g, f, shot.a);
        break;
      case "audit_file":
        drawAuditFile(g, f, shot.a);
        break;
      case "golden_signature":
        drawGoldenSignature(g, f, shot.a);
        break;
      case "brass_key":
        drawBrassKey(g, f, shot.a);
        break;
      case "cta_endcard":
        drawCtaEndcard(g, f, shot.a);
        break;
    }
  }, [f, kind, shot.a]);

  if (!kind) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <canvas ref={canvasRef} width={1080} height={1920} style={{ width: 1080, height: 1920 }} />
    </AbsoluteFill>
  );
};
