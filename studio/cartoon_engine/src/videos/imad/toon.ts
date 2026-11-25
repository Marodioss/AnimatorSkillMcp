// Custom "Kounkan+" 2D character art & prop sprite library for "Burn It to Earn It" (Episode 1)
// Built on cartoon_engine's Pen / blobPts / inkRing / shadedFill / gradFill pipeline.
// Characters strictly follow character_design_bible.md locks for Imad, Sarah, and Mr. Henderson.
import {
  Pen,
  INK,
  mul,
  shade,
  mix,
  blobPts,
  headBlob,
  thickAngle,
  Blob,
} from "../../templates/bridge/toon";

export { Pen, INK, mul, shade, mix };

type P2 = [number, number];
type C3 = [number, number, number];

const WHITE = "#ffffff";
const MOUTH_BG = "#5a1e28";
const TONGUE = "#e86e78";
const SH_SKIN: C3 = [0.94, 0.84, 0.80];
const SH_CLOTH: C3 = [0.68, 0.68, 0.75];
const SH_HAIR: C3 = [0.64, 0.62, 0.68];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2];
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = 1 - t;
    out.push([
      s * s * a[0] + 2 * s * t * c[0] + t * t * b[0],
      s * s * a[1] + 2 * s * t * c[1] + t * t * b[1],
    ]);
  }
  return out;
};

const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  p.poly(
    [
      [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
      [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
      [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
      [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
    ],
    col,
    0
  );
  p.dot(a[0], a[1], wa / 2, col);
  p.dot(b[0], b[1], wb / 2, col);
};

export type CharacterId = "imad" | "sarah" | "henderson";
export type Viseme = "rest" | "mbp" | "fv" | "o" | "u" | "wq" | "e" | "ai";
export type CharacterExpr =
  | "calm_grin"
  | "smug_wink"
  | "happy_talk"
  | "deadpan"
  | "shock"
  | "panic_no"
  | "skeptical"
  | "stern"
  | "facepalm"
  | "nervous"
  | "relief_tears"
  | "proud_beam";

export type CharacterPose =
  | "sit_mug"
  | "sit_relaxed"
  | "sit_wave"
  | "sit_sign"
  | "sit_tablet"
  | "sit_warn"
  | "sit_facepalm"
  | "sit_shock"
  | "walk_mop"
  | "sit_clutch"
  | "sit_key"
  | "stand_mop"
  | "stand_happy";

export interface DrawCharOpts {
  id: CharacterId;
  expr: CharacterExpr;
  pose: CharacterPose;
  viseme?: Viseme;
  speaking?: boolean;
  look?: number; // -1..1
  blink?: number; // 0..1
  facing?: -1 | 0 | 1;
  light?: number;
  headTilt?: number; // degrees
  gesturePhase?: number; // 0..1
}

// ---------------- Face & Visemes ----------------

function drawEye(
  p: Pen,
  mode: "warm" | "happy" | "squint" | "shock" | "blink" | "half" | "tired",
  cx: number,
  cy: number,
  u: number,
  side: number,
  look: number,
  irisCol: string,
  skin: string
) {
  const lx = cx + look * 3.2 * u;
  const lw = 3.8 * u;

  if (mode === "blink") {
    p.arc(cx, cy + 2 * u, 9.5 * u, 4 * u, 195, 345, lw);
    return;
  }
  if (mode === "happy") {
    p.arc(cx, cy + 3 * u, 9.5 * u, 6.5 * u, 195, 345, lw * 1.15);
    return;
  }
  if (mode === "shock") {
    p.ell(cx, cy, 13.5 * u, 14.5 * u, WHITE, 3.0 * u);
    p.dot(lx - side * 0.8 * u, cy + 0.5 * u, 4.2 * u, INK);
    p.dot(lx - 2.0 * u, cy - 2.5 * u, 1.8 * u, WHITE);
    return;
  }

  // Warm stylized expressive eye (white sclera + colored iris + pupil + glint + top lash)
  const rx = 10.5 * u;
  const ry = mode === "squint" || mode === "tired" ? 8.5 * u : 11.5 * u;
  p.ell(cx, cy, rx, ry, WHITE, 2.6 * u);
  p.ell(lx, cy + 0.6 * u, 6.2 * u, 6.8 * u, irisCol, 0);
  p.dot(lx, cy + 0.8 * u, 3.4 * u, INK);
  p.dot(lx - 2.2 * u, cy - 2.2 * u, 2.1 * u, WHITE);

  if (mode === "half" || mode === "squint" || mode === "tired") {
    const lidY = mode === "half" ? cy : cy - 2.5 * u;
    p.clip(
      [
        [cx - rx - 3 * u, cy - ry - 4 * u],
        [cx + rx + 3 * u, cy - ry - 4 * u],
        [cx + rx + 3 * u, lidY],
        [cx - rx - 3 * u, lidY],
      ],
      () => p.ell(cx, cy, rx + 2 * u, ry + 2 * u, skin, 0)
    );
    p.stroke([[cx - rx - 1 * u, lidY], [cx + rx + 1 * u, lidY]], 3.0 * u);
  }
  // Upper lash curve
  p.arc(cx, cy, rx, ry, 195, 345, 3.4 * u);
  if (mode === "tired") {
    // Subtle crow's-foot smile/tired crease
    p.arc(cx, cy + 7.5 * u, 7.5 * u, 2.8 * u, 15, 165, 1.8 * u, shade(skin, 0.78));
  }
}

function drawMouth(
  p: Pen,
  expr: CharacterExpr,
  viseme: Viseme,
  speaking: boolean,
  mx: number,
  my: number,
  u: number
) {
  const lw = 3.8 * u;
  if (expr === "panic_no") {
    p.ell(mx, my + 2 * u, 13.5 * u, 16.5 * u, MOUTH_BG, 3.6 * u);
    p.clip(
      [
        [mx - 14 * u, my - 15 * u],
        [mx + 14 * u, my - 15 * u],
        [mx + 14 * u, my - 5 * u],
        [mx - 14 * u, my - 5 * u],
      ],
      () => p.ell(mx, my + 2 * u, 13.5 * u, 16.5 * u, WHITE, 0)
    );
    p.ell(mx, my + 11 * u, 7 * u, 4.5 * u, TONGUE, 0);
    p.ell(mx, my + 2 * u, 13.5 * u, 16.5 * u, null, 3.6 * u);
    return;
  }

  if (speaking && viseme !== "rest") {
    switch (viseme) {
      case "mbp":
        p.stroke([[mx - 9 * u, my], [mx + 9 * u, my]], 4.2 * u);
        return;
      case "fv":
        p.poly(
          [
            [mx - 8 * u, my - 3 * u],
            [mx + 8 * u, my - 3 * u],
            [mx + 7 * u, my + 3 * u],
            [mx - 7 * u, my + 3 * u],
          ],
          WHITE,
          2.6 * u
        );
        p.arc(mx, my + 3.5 * u, 8.5 * u, 3 * u, 10, 170, 3.2 * u);
        return;
      case "o":
        p.ell(mx, my + 1 * u, 6.8 * u, 9.5 * u, MOUTH_BG, 3.2 * u);
        p.ell(mx, my + 5 * u, 3.5 * u, 2.5 * u, TONGUE, 0);
        return;
      case "u":
      case "wq":
        p.ell(mx, my + 1 * u, 4.8 * u, 5.8 * u, MOUTH_BG, 3.2 * u);
        return;
      case "e":
        p.poly(
          [
            [mx - 11.5 * u, my - 3.5 * u],
            [mx + 11.5 * u, my - 3.5 * u],
            [mx + 10 * u, my + 3.8 * u],
            [mx - 10 * u, my + 3.8 * u],
          ],
          WHITE,
          2.8 * u
        );
        return;
      case "ai":
      default:
        p.ell(mx, my - 1 * u, 12.5 * u, 9.5 * u, MOUTH_BG, 0, 0, 180);
        p.clip(
          [
            [mx - 13 * u, my - 1 * u],
            [mx + 13 * u, my - 1 * u],
            [mx + 13 * u, my + 3.2 * u],
            [mx - 13 * u, my + 3.2 * u],
          ],
          () => p.ell(mx, my - 1 * u, 12.5 * u, 9.5 * u, WHITE, 0, 0, 180)
        );
        p.ell(mx, my + 4.5 * u, 5.5 * u, 3 * u, TONGUE, 0);
        p.ell(mx, my - 1 * u, 12.5 * u, 9.5 * u, null, 3.0 * u, 0, 180);
        return;
    }
  }

  // Non-speaking expressive resting mouths
  switch (expr) {
    case "calm_grin":
    case "proud_beam":
    case "relief_tears":
      p.ell(mx, my - 2 * u, 12.5 * u, 7.8 * u, MOUTH_BG, 0, 0, 180);
      p.clip(
        [
          [mx - 13 * u, my - 2 * u],
          [mx + 13 * u, my - 2 * u],
          [mx + 13 * u, my + 3 * u],
          [mx - 13 * u, my + 3 * u],
        ],
        () => p.ell(mx, my - 2 * u, 12.5 * u, 7.8 * u, WHITE, 0, 0, 180)
      );
      p.ell(mx, my - 2 * u, 12.5 * u, 7.8 * u, null, 3.0 * u, 0, 180);
      break;
    case "happy_talk":
    case "smug_wink":
      p.arc(mx + 1 * u, my - 3 * u, 11 * u, 5.5 * u, 15, 165, lw);
      break;
    case "shock":
      p.ell(mx, my + 2 * u, 8.5 * u, 10.5 * u, MOUTH_BG, 3.2 * u);
      break;
    case "stern":
    case "facepalm":
      p.arc(mx, my + 4 * u, 8.5 * u, 4 * u, 200, 340, lw);
      break;
    case "nervous": {
      const wpts: P2[] = [];
      for (let i = 0; i <= 10; i++) {
        wpts.push([mx - 9 * u + i * 1.8 * u, my + 1.8 * u * Math.sin(i * 1.3)]);
      }
      p.stroke(wpts, 3.2 * u);
      break;
    }
    case "skeptical":
    case "deadpan":
    default:
      p.stroke([[mx - 7.5 * u, my + 0.5 * u], [mx + 7.5 * u, my - 1.2 * u]], lw);
      break;
  }
}

// ---------------- Prop Drawers ----------------

function drawMugInHands(p: Pen, cx: number, cy: number, u: number) {
  // Cozy cream ceramic mug with latte foam
  const mw = 20 * u;
  const mh = 22 * u;
  // Handle
  p.arc(cx + mw * 0.52, cy, 8 * u, 7 * u, -80, 80, 4.2 * u, "#d9ccb8");
  p.arc(cx + mw * 0.52, cy, 8 * u, 7 * u, -80, 80, 2.0 * u);
  // Body
  p.poly(
    [
      [cx - mw * 0.52, cy - mh * 0.45],
      [cx + mw * 0.52, cy - mh * 0.45],
      [cx + mw * 0.44, cy + mh * 0.55],
      [cx - mw * 0.44, cy + mh * 0.55],
    ],
    "#fbf6ea",
    4.5 * u
  );
  // Rim cocoa
  p.ell(cx, cy - mh * 0.45, mw * 0.5, 4.5 * u, "#5e301c", 3.2 * u);
  p.ell(cx, cy - mh * 0.46, mw * 0.22, 2.2 * u, "#f3e5d0", 0);
}

function drawDigitalTablet(p: Pen, cx: number, cy: number, u: number) {
  p.poly(
    [
      [cx - 22 * u, cy - 28 * u],
      [cx + 22 * u, cy - 24 * u],
      [cx + 20 * u, cy + 28 * u],
      [cx - 24 * u, cy + 24 * u],
    ],
    "#252932",
    4.5 * u
  );
  p.poly(
    [
      [cx - 18 * u, cy - 23 * u],
      [cx + 18 * u, cy - 20 * u],
      [cx + 16 * u, cy + 23 * u],
      [cx - 20 * u, cy + 20 * u],
    ],
    "#4fb8aa",
    2.2 * u
  );
  // Crisp chart bars on screen
  p.stroke([[cx - 12 * u, cy + 8 * u], [cx - 4 * u, cy - 2 * u], [cx + 4 * u, cy + 3 * u], [cx + 12 * u, cy - 12 * u]], 2.6 * u, "#ffffff");
}

function drawHandkerchief(p: Pen, cx: number, cy: number, u: number) {
  p.poly(
    [
      [cx - 14 * u, cy - 12 * u],
      [cx + 12 * u, cy - 15 * u],
      [cx + 16 * u, cy + 12 * u],
      [cx - 10 * u, cy + 16 * u],
    ],
    "#f9f1e4",
    3.8 * u
  );
  // Plaid red stripes
  p.stroke([[cx - 10 * u, cy - 4 * u], [cx + 13 * u, cy - 6 * u]], 2.6 * u, "#d13f42");
  p.stroke([[cx - 8 * u, cy + 5 * u], [cx + 14 * u, cy + 3 * u]], 2.6 * u, "#d13f42");
  p.stroke([[cx - 2 * u, cy - 12 * u], [cx, cy + 13 * u]], 2.6 * u, "#d13f42");
}

function drawBrassKey(p: Pen, cx: number, cy: number, u: number) {
  // Ornate glowing antique brass key
  p.ell(cx, cy - 20 * u, 13 * u, 13 * u, "#f6c945", 4.0 * u);
  p.ell(cx, cy - 20 * u, 5.5 * u, 5.5 * u, "#8a5a18", 2.4 * u);
  p.band([[cx, cy - 7 * u], [cx, cy + 26 * u]], "#f6c945", 5.2 * u, 2.2 * u, "round");
  p.poly(
    [
      [cx + 2 * u, cy + 12 * u],
      [cx + 12 * u, cy + 12 * u],
      [cx + 12 * u, cy + 17 * u],
      [cx + 2 * u, cy + 17 * u],
    ],
    "#f6c945",
    2.5 * u
  );
  p.poly(
    [
      [cx + 2 * u, cy + 20 * u],
      [cx + 14 * u, cy + 20 * u],
      [cx + 14 * u, cy + 25 * u],
      [cx + 2 * u, cy + 25 * u],
    ],
    "#f6c945",
    2.5 * u
  );
}

// ---------------- Main Character Drawers (600x1000 Design Space, soles at y=975) ----------------

export function drawCharacter(p: Pen, opts: DrawCharOpts) {
  const {
    id,
    expr,
    pose,
    viseme = "rest",
    speaking = false,
    look = 0,
    blink = 0,
    facing = 0,
    light = rad(-120),
    headTilt = 0,
    gesturePhase = 0,
  } = opts;

  const isSeated = pose.startsWith("sit_");
  const isStout = id === "henderson";
  const isPetite = id === "sarah";

  const headA = isPetite ? 108 : isStout ? 116 : 114;
  const seed = id === "imad" ? 11 : id === "sarah" ? 23 : 37;
  const H: Blob = {
    ...headBlob(seed, headA, facing),
    rot: rad(headTilt),
    noise: 0.006,
  };
  const W = 2 * H.a;
  const HH = 2 * H.b;
  const u = W / 100;
  const thick = thickAngle(light);
  const ow = 5.4 * u;

  // Vertical layout in 600x1000 space (sole = 975)
  const sole = 975;
  const torsoH = (isPetite ? 1.05 : 1.12) * HH;
  const torsoBot = isSeated ? 660 : 645;
  const hipY = torsoBot - 0.12 * HH;
  const chin = torsoBot - torsoH;
  const hc = chin - H.b;

  // Palette per Character Design Bible
  const palette =
    id === "imad"
      ? {
          skin: "#f8d3b3",
          top: "#e5a93b",
          pants: "#3d5a80",
          shoes: "#e07a5f",
          hair: "#2b1b10",
          iris: "#6a4526",
        }
      : id === "sarah"
      ? {
          skin: "#fde2ce",
          top: "#52796f",
          pants: "#d4a373",
          shoes: "#3d312a",
          hair: "#1c1c24",
          iris: "#2b2024",
        }
      : {
          skin: "#f0c29e",
          top: "#6b4226", // tweed vest
          shirt: "#a8dadc", // chambray shirt
          pants: "#474a52",
          shoes: "#4a2c18",
          hair: "#cfd4dc",
          iris: "#2b5c8f",
        };

  // ---- 1. Legs & Footwear ----
  p.rot = null;
  const legCol = mix(palette.pants, INK, 0.35);
  const legW = (isStout ? 6.6 : 5.8) * u;
  const footW = 8.2 * u;

  if (isSeated) {
    // Seated knees & planted shoes
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 16 * u, hipY + 10 * u];
      const k: P2 = [300 + side * 30 * u, hipY + 46 * u];
      const f: P2 = [300 + side * 26 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      p.stroke([[f[0] - side * 2 * u, f[1]], [f[0] + side * 14 * u, f[1] - 3 * u]], footW + 4, INK);
      p.stroke([[f[0] - side * 2 * u, f[1]], [f[0] + side * 14 * u, f[1] - 3 * u]], footW, palette.shoes);
    }
  } else {
    // Walking / Standing
    const walkSwing = pose === "walk_mop" ? Math.sin(gesturePhase * Math.PI * 2) * 18 * u : 0;
    for (const [side, dir] of [[-1, 1], [1, -1]] as const) {
      const hx = 300 + side * 16 * u;
      const fx = 300 + side * 18 * u + dir * walkSwing;
      const fy = sole - 6 * u - Math.max(0, dir * Math.sin(gesturePhase * Math.PI * 2)) * 12 * u;
      p.stroke([[hx, hipY], [(hx + fx) / 2, (hipY + fy) / 2], [fx, fy]], legW, legCol);
      p.stroke([[fx - side * 3 * u, fy], [fx + side * 14 * u, fy]], footW + 4, INK);
      p.stroke([[fx - side * 3 * u, fy], [fx + side * 14 * u, fy]], footW, palette.shoes);
    }
  }

  // ---- 2. Torso ----
  const tcx = 300 + 3 * u * facing;
  const tw = (isStout ? 0.90 : isPetite ? 0.72 : 0.80) * W * 0.5;
  const T: Blob = {
    a: tw,
    b: 0.5 * (torsoBot - (chin - 0.18 * HH)),
    nTop: 2.1,
    nBot: 2.5,
    egg: isStout ? 0.16 : 0.08,
    asym: 0.04 * facing,
    rot: 0,
    noise: 0.005,
    seed: seed + 5,
  };
  const tcy = torsoBot - T.b;
  const tp = blobPts(tcx, tcy, T);

  // Arms behind torso?
  const armCol = id === "henderson" ? mix("#a8dadc", INK, 0.25) : mix(palette.top, INK, 0.25);
  const sh = (s: number): P2 => [tcx + s * 0.86 * T.a, chin + 0.14 * HH];
  type ArmDef = { pts: [P2, P2, P2]; front: boolean; handProp?: "mug" | "tablet" | "mop" | "key" | "pen" };
  const arms: ArmDef[] = [];

  if (pose === "sit_mug") {
    // Cozy two-handed mug grip raised cleanly above table & caption zone
    arms.push({ pts: [sh(-1), [tcx - 1.12 * T.a, chin + 0.46 * HH], [tcx - 15 * u, chin + 0.45 * HH]], front: true });
    arms.push({ pts: [sh(1), [tcx + 1.12 * T.a, chin + 0.46 * HH], [tcx + 15 * u, chin + 0.45 * HH]], front: true, handProp: "mug" });
  } else if (pose === "sit_wave") {
    const wv = Math.sin(gesturePhase * Math.PI * 2) * 12 * u;
    arms.push({ pts: [sh(-1), [tcx - 1.08 * T.a, chin + 0.54 * HH], [tcx - 0.88 * T.a, chin + 0.86 * HH]], front: false });
    arms.push({ pts: [sh(1), [tcx + 1.16 * T.a, chin + 0.42 * HH], [tcx + 1.18 * T.a + wv, chin + 0.14 * HH]], front: true });
  } else if (pose === "sit_sign") {
    const scrib = Math.sin(gesturePhase * Math.PI * 4) * 6 * u;
    arms.push({ pts: [sh(-1), [tcx - 1.1 * T.a, chin + 0.52 * HH], [tcx - 20 * u, chin + 0.80 * HH]], front: true });
    arms.push({ pts: [sh(1), [tcx + 1.05 * T.a, chin + 0.56 * HH], [tcx + 16 * u + scrib, chin + 0.82 * HH]], front: true, handProp: "pen" });
  } else if (pose === "sit_shock" || expr === "panic_no") {
    const jx = expr === "panic_no" ? Math.sin(gesturePhase * Math.PI * 6) * 4 * u : 0;
    arms.push({ pts: [sh(-1), [tcx - 1.24 * T.a, chin + 0.25 * HH], [tcx - 40 * u + jx, hc - 6 * u]], front: true });
    arms.push({ pts: [sh(1), [tcx + 1.24 * T.a, chin + 0.25 * HH], [tcx + 40 * u + jx, hc - 6 * u]], front: true });
  } else if (pose === "sit_tablet") {
    arms.push({ pts: [sh(-1), [tcx - 1.08 * T.a, chin + 0.48 * HH], [tcx - 16 * u, chin + 0.50 * HH]], front: true });
    arms.push({ pts: [sh(1), [tcx + 1.08 * T.a, chin + 0.48 * HH], [tcx + 12 * u, chin + 0.48 * HH]], front: true, handProp: "tablet" });
  } else if (pose === "sit_warn") {
    const pt = Math.sin(gesturePhase * Math.PI * 2) * 8 * u;
    arms.push({ pts: [sh(-1), [tcx - 1.08 * T.a, chin + 0.48 * HH], [tcx - 18 * u, chin + 0.52 * HH]], front: true, handProp: "tablet" });
    arms.push({ pts: [sh(1), [tcx + 1.14 * T.a, chin + 0.42 * HH], [tcx + 1.18 * T.a + pt, chin + 0.18 * HH]], front: true });
  } else if (pose === "sit_facepalm") {
    arms.push({ pts: [sh(-1), [tcx - 1.08 * T.a, chin + 0.56 * HH], [tcx - 16 * u, chin + 0.76 * HH]], front: true });
    arms.push({ pts: [sh(1), [tcx + 1.18 * T.a, chin + 0.12 * HH], [300 + 6.5 * u * facing + 14 * u, hc - 19 * u]], front: true });
  } else if (pose === "walk_mop" || pose === "stand_mop") {
    const dab = Math.sin(gesturePhase * Math.PI * 2) * 4 * u;
    arms.push({ pts: [sh(-1), [tcx - 1.12 * T.a, chin + 0.56 * HH], [tcx - 0.9 * T.a, chin + 0.88 * HH]], front: false });
    arms.push({ pts: [sh(1), [tcx + 1.24 * T.a, chin + 0.16 * HH], [300 + 6.5 * u * facing + 24 * u + dab, hc - 22 * u]], front: true, handProp: "mop" });
  } else if (pose === "sit_clutch") {
    arms.push({ pts: [sh(-1), [tcx - 1.12 * T.a, chin + 0.52 * HH], [tcx - 14 * u, chin + 0.44 * HH]], front: true });
    arms.push({ pts: [sh(1), [tcx + 1.12 * T.a, chin + 0.52 * HH], [tcx + 14 * u, chin + 0.44 * HH]], front: true });
  } else if (pose === "sit_key") {
    arms.push({ pts: [sh(-1), [tcx - 1.06 * T.a, chin + 0.58 * HH], [tcx - 0.86 * T.a, chin + 0.82 * HH]], front: false });
    arms.push({ pts: [sh(1), [tcx + 1.14 * T.a, chin + 0.36 * HH], [tcx + 1.04 * T.a, chin + 0.12 * HH]], front: true, handProp: "key" });
  } else {
    arms.push({ pts: [sh(-1), [tcx - 1.08 * T.a, chin + 0.54 * HH], [tcx - 0.92 * T.a, chin + 0.86 * HH]], front: false });
    arms.push({ pts: [sh(1), [tcx + 1.08 * T.a, chin + 0.54 * HH], [tcx + 0.92 * T.a, chin + 0.86 * HH]], front: false });
  }

  const drawArm = (a: ArmDef, skipHand = false) => {
    const pts = curve(a.pts[0], a.pts[1], a.pts[2]);
    p.stroke(pts, 6.2 * u + ow * 1.4, INK);
    p.stroke(pts, 6.2 * u, armCol);
    if (!skipHand) {
      const [hx, hy] = a.pts[2];
      p.dot(hx, hy, 6.5 * u + ow * 0.4, INK);
      p.dot(hx, hy, 6.2 * u, palette.skin);
    }
  };

  for (const a of arms) if (!a.front) drawArm(a);

  // Torso fill + Character-specific wardrobe details
  if (id === "henderson") {
    // Light blue chambray base shirt
    p.gradFill(tp, palette.shirt!, mul(palette.shirt!, SH_CLOTH), light);
    p.clip(tp, () => {
      // Tweed brown vest over chambray
      p.poly(
        [
          [tcx - T.a * 1.1, chin + 0.04 * HH],
          [tcx - 12 * u, chin + 0.04 * HH],
          [tcx, chin + 0.36 * HH],
          [tcx + 12 * u, chin + 0.04 * HH],
          [tcx + T.a * 1.1, chin + 0.04 * HH],
          [tcx + T.a * 1.1, torsoBot + 10],
          [tcx - T.a * 1.1, torsoBot + 10],
        ],
        palette.top,
        0
      );
      // Loosened burgundy knit tie
      p.poly(
        [
          [tcx - 5 * u, chin + 0.08 * HH],
          [tcx + 5 * u, chin + 0.08 * HH],
          [tcx + 9 * u, chin + 0.52 * HH],
          [tcx, chin + 0.62 * HH],
          [tcx - 9 * u, chin + 0.52 * HH],
        ],
        "#9b2226",
        2.5 * u
      );
      // Tweed buttons
      for (const by of [chin + 0.42 * HH, chin + 0.60 * HH, chin + 0.78 * HH]) {
        p.dot(tcx, by, 2.8 * u, "#3b2314");
      }
    });
    p.inkRing(tp, ow, thick);
  } else if (id === "sarah") {
    // Sage-green blazer over ivory turtleneck
    p.gradFill(tp, palette.top, mul(palette.top, SH_CLOTH), light);
    p.clip(tp, () => {
      // Ivory turtleneck V
      p.poly(
        [
          [tcx - 24 * u, chin - 4 * u],
          [tcx + 24 * u, chin - 4 * u],
          [tcx, chin + 0.44 * HH],
        ],
        "#f8f9fa",
        2.5 * u
      );
      // Tailored lapels
      p.poly(
        [
          [tcx - 24 * u, chin - 2 * u],
          [tcx - 36 * u, chin + 0.25 * HH],
          [tcx, chin + 0.44 * HH],
        ],
        "#3d5c54",
        2.2 * u
      );
      p.poly(
        [
          [tcx + 24 * u, chin - 2 * u],
          [tcx + 36 * u, chin + 0.25 * HH],
          [tcx, chin + 0.44 * HH],
        ],
        "#3d5c54",
        2.2 * u
      );
      p.dot(tcx, chin + 0.56 * HH, 3.0 * u, "#d4af37");
    });
    p.inkRing(tp, ow, thick);
  } else {
    // Imad's Mustard Yellow Oversized Knit Hoodie (#E5A93B) + Cream Tee (#FDFBF7)
    p.gradFill(tp, palette.top, mul(palette.top, SH_CLOTH), light);
    p.clip(tp, () => {
      // Cream inner t-shirt
      p.ell(tcx, chin + 0.04 * HH, 19 * u, 16 * u, "#fdfbf7", 2.5 * u);
      // Hoodie collar fold
      p.arc(tcx, chin + 0.08 * HH, 26 * u, 11 * u, 10, 170, 5.2 * u, "#c48a24");
      // Kangaroo pocket
      p.poly(
        [
          [tcx - 28 * u, torsoBot - 0.34 * HH],
          [tcx + 28 * u, torsoBot - 0.34 * HH],
          [tcx + 36 * u, torsoBot - 0.08 * HH],
          [tcx - 36 * u, torsoBot - 0.08 * HH],
        ],
        "#cf932a",
        2.8 * u
      );
      // Cream drawstrings
      p.stroke([[tcx - 9 * u, chin + 0.14 * HH], [tcx - 11 * u, chin + 0.38 * HH]], 2.8 * u, "#fdfbf7");
      p.stroke([[tcx + 9 * u, chin + 0.14 * HH], [tcx + 11 * u, chin + 0.38 * HH]], 2.8 * u, "#fdfbf7");
      p.dot(tcx - 11 * u, chin + 0.39 * HH, 3.0 * u, "#fdfbf7");
      p.dot(tcx + 11 * u, chin + 0.39 * HH, 3.0 * u, "#fdfbf7");
    });
    p.inkRing(tp, ow, thick);
  }

  // Clutching contract visual on torso for Henderson
  if (pose === "sit_clutch") {
    p.poly(
      [
        [tcx - 24 * u, chin + 0.30 * HH],
        [tcx + 24 * u, chin + 0.28 * HH],
        [tcx + 22 * u, chin + 0.66 * HH],
        [tcx - 26 * u, chin + 0.68 * HH],
      ],
      "#fbf6ea",
      3.5 * u
    );
    p.stroke([[tcx - 16 * u, chin + 0.40 * HH], [tcx + 14 * u, chin + 0.39 * HH]], 2.4 * u, "#8c7a62");
    p.stroke([[tcx - 16 * u, chin + 0.50 * HH], [tcx + 10 * u, chin + 0.49 * HH]], 2.4 * u, "#2e8b57");
  }

  // Arms in front + Held props (defer facepalm & mop forehead arms until after head so hand & handkerchief connect cleanly!)
  for (let ai = 0; ai < arms.length; ai++) {
    const a = arms[ai];
    if (!a.front) continue;
    if ((pose === "sit_facepalm" || pose === "walk_mop" || pose === "stand_mop") && ai === 1) continue;
    if (a.handProp === "tablet") {
      drawDigitalTablet(p, a.pts[2][0] - 8 * u, a.pts[2][1] - 4 * u, u);
    } else if (a.handProp === "mug") {
      drawMugInHands(p, tcx, a.pts[2][1] - 4 * u, u);
    } else if (a.handProp === "key") {
      drawBrassKey(p, a.pts[2][0] + 2 * u, a.pts[2][1] - 12 * u, u);
    } else if (a.handProp === "pen") {
      p.band([a.pts[2], [a.pts[2][0] - 10 * u, a.pts[2][1] + 22 * u]], "#e8b93c", 3.5 * u, 1.5 * u, "round");
    }
    drawArm(a);
  }

  // ---- 3. Head, Hair, Glasses, Face ----
  p.rot = headTilt ? [rad(headTilt), 300, chin] : null;
  const cx = 300;
  const hp = blobPts(cx, hc, H);

  // Sarah's back ponytail + gold hoops behind head
  if (id === "sarah") {
    p.ell(cx + 38 * u, hc - 14 * u, 19 * u, 36 * u, palette.hair, ow * 0.85, 0, 360, 22);
    // Gold hoop earrings
    p.arc(cx - 48 * u, hc + 12 * u, 6.5 * u, 7.5 * u, 20, 330, 3.0 * u, "#e8be4a");
    p.arc(cx + 48 * u, hc + 12 * u, 6.5 * u, 7.5 * u, 210, 160, 3.0 * u, "#e8be4a");
  }

  // Face skin base with cel crescent shade + thick-thin plum ink ring
  p.shadedFill(hp, palette.skin, mul(palette.skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);

  const fx = cx + 6.5 * u * facing;

  // Rosy cheeks & five o'clock shadow
  if (id === "imad") {
    p.ell(fx - 26 * u, hc + 13 * u, 9 * u, 5.5 * u, "rgba(235, 110, 85, 0.25)", 0);
    p.ell(fx + 26 * u, hc + 13 * u, 9 * u, 5.5 * u, "rgba(235, 110, 85, 0.25)", 0);
  } else if (id === "henderson") {
    // 5 o'clock shadow + weathered rosy cheeks
    p.clip(hp, () => {
      p.ell(fx, hc + 30 * u, 42 * u, 24 * u, "rgba(110, 100, 112, 0.18)", 0);
    });
    p.ell(fx - 26 * u, hc + 12 * u, 11 * u, 7 * u, "rgba(210, 80, 75, 0.28)", 0);
    p.ell(fx + 26 * u, hc + 12 * u, 11 * u, 7 * u, "rgba(210, 80, 75, 0.28)", 0);
  }

  // Hair styles (drawn over crown)
  if (id === "imad") {
    // Tousled curly dark brown hair with amber sun-highlights!
    const curls: [number, number, number][] = [
      [-32, -28, 22],
      [-14, -40, 24],
      [10, -41, 25],
      [31, -30, 22],
      [-43, -10, 16],
      [43, -10, 16],
      [-2, -28, 22],
    ];
    for (const [dx, dy, r] of curls) {
      p.dot(cx + dx * u, hc + dy * u, r * u + ow * 0.65, INK);
    }
    for (const [dx, dy, r] of curls) {
      p.dot(cx + dx * u, hc + dy * u, r * u, palette.hair);
    }
    // Warm amber sun-highlight curls catching afternoon sunlight
    p.arc(cx + 8 * u, hc - 38 * u, 14 * u, 6 * u, 195, 335, 4.2 * u, "#8f592c");
    p.arc(cx - 18 * u, hc - 34 * u, 11 * u, 5 * u, 200, 325, 3.6 * u, "#8f592c");
  } else if (id === "sarah") {
    // Sleek black hair with soft parted face-framing bangs + stylus tucked behind ear!
    p.clip(hp, () => {
      p.poly(
        [
          [cx - 56 * u, hc - 56 * u],
          [cx + 56 * u, hc - 56 * u],
          [cx + 56 * u, hc - 10 * u],
          [cx + 16 * u, hc - 24 * u],
          [cx - 6 * u, hc - 12 * u],
          [cx - 56 * u, hc - 16 * u],
        ],
        palette.hair,
        0
      );
      p.stroke([[cx - 26 * u, hc - 30 * u], [cx + 18 * u, hc - 34 * u]], 4.0 * u, "#44485c");
    });
    // Crown hairline seam cleanly tracing inside top outline (no floating outer halo!)
    p.arc(cx, hc, H.a * 0.99, H.b * 0.99, 195, 345, ow * 0.85);
    // Smart stylus pen tucked behind right ear!
    p.band([[cx + 42 * u, hc - 10 * u], [cx + 58 * u, hc - 32 * u]], "#d8dee9", 3.6 * u, 1.8 * u, "round");
    p.dot(cx + 59 * u, hc - 33 * u, 2.5 * u, "#4fb8aa");
  } else {
    // Henderson: Receding silver-grey hair with sculpted bushy side tufts (hugging temples)
    for (const side of [-1, 1]) {
      p.ell(cx + side * 45 * u, hc - 4 * u, 11 * u, 18 * u, palette.hair, ow * 0.8, 0, 360, side * 10);
      p.ell(cx + side * 39 * u, hc - 16 * u, 8.5 * u, 10 * u, palette.hair, ow * 0.7, 0, 360, side * -12);
      p.arc(cx + side * 44 * u, hc - 6 * u, 5 * u, 10 * u, side > 0 ? -50 : 130, side > 0 ? 50 : 230, 2.0 * u, "#9aa3b2");
    }
    // Gentle forehead shine safely inside skull rim
    p.arc(cx - 4 * u, hc - 22 * u, 20 * u, 7 * u, 205, 325, 2.2 * u, "#fce6d2");
  }

  // Eyes & Eyebrows
  const ey = hc - 2 * u;
  const exOff = 17.5 * u;
  const isBlinking = blink >= 0.7 && expr !== "shock" && expr !== "panic_no";

  for (const side of [-1, 1]) {
    const ex = fx + side * exOff;
    let eyeMode: "warm" | "happy" | "squint" | "shock" | "blink" | "half" | "tired" = "warm";
    if (isBlinking) eyeMode = "blink";
    else if (expr === "shock" || expr === "panic_no") eyeMode = "shock";
    else if (expr === "calm_grin" || expr === "proud_beam") eyeMode = "happy";
    else if (expr === "smug_wink") eyeMode = side > 0 ? "blink" : "half";
    else if (expr === "facepalm") eyeMode = "blink";
    else if (expr === "nervous") eyeMode = "tired";
    else if (expr === "relief_tears") eyeMode = "happy";
    else if (expr === "skeptical" && side < 0) eyeMode = "squint";

    drawEye(p, eyeMode, ex, ey, u, side, look, palette.iris, palette.skin);

    // Joyful tear drops on Henderson in Shot 19!
    if (expr === "relief_tears") {
      p.ell(ex + side * 4 * u, ey + 13 * u, 3.6 * u, 5.2 * u, "#88e0f6", 1.8 * u);
    }

    // Eyebrows
    const by = ey - 17 * u;
    const browCol = id === "henderson" ? "#b4bac4" : id === "sarah" ? "#1c1c24" : "#2b1b10";
    const bw = id === "henderson" ? 6.5 * u : 5.2 * u;

    if (expr === "shock" || expr === "panic_no") {
      p.arc(ex, by - 5 * u, 10 * u, 3.8 * u, 195, 345, bw * 0.8, browCol);
    } else if (expr === "skeptical") {
      // Sarah's iconic raised left brow!
      if (side < 0) {
        taper(p, [ex - 10 * u, by - 5 * u], [ex + 10 * u, by - 8 * u], bw, bw * 0.55, browCol);
      } else {
        taper(p, [ex + 10 * u, by + 1 * u], [ex - 10 * u, by + 3 * u], bw, bw * 0.55, browCol);
      }
    } else if (expr === "stern" || expr === "deadpan") {
      taper(p, [ex - side * 10 * u, by + 3.5 * u], [ex + side * 10 * u, by - 2.0 * u], bw, bw * 0.55, browCol);
    } else if (expr === "nervous") {
      taper(p, [ex - side * 10 * u, by - 3.5 * u], [ex + side * 10 * u, by + 2.5 * u], bw, bw * 0.55, browCol);
    } else {
      taper(p, [ex - side * 10 * u, by - 1 * u], [ex + side * 10 * u, by - 3 * u], bw, bw * 0.55, browCol);
    }
  }

  // Sarah's Round Tortoiseshell Glasses (#8B5A2B)
  if (id === "sarah") {
    const tiltG = pose === "sit_facepalm" ? -4 : 0;
    const gR = 14.5 * u;
    for (const side of [-1, 1]) {
      const gx = fx + side * exOff;
      const gy = ey + tiltG * 0.4 * u;
      p.ell(gx, gy, gR, gR, "rgba(255,255,255,0.14)", 0);
      p.arc(gx, gy, gR, gR, 0, 360, 4.4 * u, "#8b5a2b");
      p.arc(gx, gy, gR, gR, 210, 260, 2.0 * u, "#d49b5a"); // tortoiseshell highlight
    }
    p.arc(fx, ey - 1 * u, 4.5 * u, 3 * u, 190, 350, 3.8 * u, "#8b5a2b");
  }

  // Subtle nose bridge hint
  p.arc(fx + 2 * u * facing, hc + 9 * u, 3.5 * u, 2.2 * u, 10, 140, 2.2 * u, shade(palette.skin, 0.72));

  // Mouth / Lip-Sync Viseme
  drawMouth(p, expr, viseme, speaking, cx + 6 * u * facing, hc + 24 * u, u);

  // Sweat drop cleanly on forehead/temple skin when nervous / panicking
  if (expr === "nervous" || expr === "panic_no") {
    const sx = id === "henderson" ? fx - 27 * u : cx + 34 * u;
    const sy = id === "henderson" ? hc - 18 * u : hc - 18 * u;
    p.poly(
      [[sx, sy - 9 * u], [sx + 5.5 * u, sy + 2 * u], [sx, sy + 7.5 * u], [sx - 5.5 * u, sy + 2 * u]],
      "#8be0ff",
      2.6 * u
    );
  }

  // Draw connected right sleeve + stylized multi-finger cartoon hand slapping forehead/temple!
  if (pose === "sit_facepalm") {
    if (arms[1]) drawArm(arms[1], true);
    const [hx, hy] = [fx + 14 * u, ey - 17 * u];
    p.ell(hx, hy, 11.5 * u, 8.5 * u, palette.skin, ow * 0.85, 0, 360, -18);
    // Finger crease lines across upper temple/forehead
    p.stroke([[hx - 8 * u, hy - 3 * u], [hx - 3 * u, hy + 4 * u]], 1.8 * u, INK);
    p.stroke([[hx - 2 * u, hy - 5 * u], [hx + 3 * u, hy + 3 * u]], 1.8 * u, INK);
    p.stroke([[hx + 4 * u, hy - 5 * u], [hx + 8 * u, hy + 2 * u]], 1.8 * u, INK);
  }

  // Draw Henderson's mop arm + plaid handkerchief cleanly IN FRONT of head/hair!
  if ((pose === "walk_mop" || pose === "stand_mop") && arms[1]) {
    drawArm(arms[1]);
    drawHandkerchief(p, arms[1].pts[2][0] - 4 * u, arms[1].pts[2][1] - 2 * u, u);
  }

  p.rot = null;
}

// ---------------- 2D Effect Cards (Steam, Dust Motes, Clean Comic Sparks) ----------------

export function fxComicSpark(
  p: Pen,
  t: number,
  col = "#ffe169",
  count = 8,
  rInner = 135,
  rOuter = 215
) {
  const g = p.g;
  g.clearRect(0, 0, 500, 500);
  const c = 250;
  const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 2.5);
  const alpha = t < 0.72 ? 1.0 : Math.max(0, 1 - (t - 0.72) / 0.28);
  if (alpha <= 0.02) return;
  g.save();
  g.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const a = rad((i * 360) / count + 12 * (i % 2));
    const r = rInner + (rOuter - rInner) * e * (0.85 + 0.15 * (i % 2));
    const sx = c + Math.cos(a) * r;
    const sy = c + Math.sin(a) * r;
    const sr = (18 + (i % 2) * 8) * (1 - 0.35 * t);
    // 4-point crisp bright comic star spark
    const pts: P2[] = [];
    for (let k = 0; k < 8; k++) {
      const ka = a + (k * Math.PI) / 4;
      const kr = k % 2 === 0 ? sr : sr * 0.32;
      pts.push([sx + Math.cos(ka) * kr, sy + Math.sin(ka) * kr]);
    }
    p.poly(pts, i % 2 === 0 ? col : "#ffffff", 3.5);
  }
  g.restore();
}

export function fxSteam(p: Pen, phase: number) {
  const g = p.g;
  g.clearRect(0, 0, 200, 300);
  for (let i = 0; i < 3; i++) {
    const t = (phase + i * 0.33) % 1;
    const x = 100 + Math.sin(t * Math.PI * 3 + i * 2.0) * 18;
    const y = 260 - t * 220;
    const alpha = Math.sin(t * Math.PI) * 0.38;
    const rad = 16 + t * 24;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(255, 246, 234, ${alpha.toFixed(3)})`);
    gr.addColorStop(1, "rgba(255, 246, 234, 0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
}

export function fxDustMote(p: Pen, alpha: number) {
  const g = p.g;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  gr.addColorStop(0, `rgba(255, 240, 200, ${(0.75 * alpha).toFixed(3)})`);
  gr.addColorStop(0.5, `rgba(255, 224, 155, ${(0.28 * alpha).toFixed(3)})`);
  gr.addColorStop(1, "rgba(255, 224, 155, 0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
}
