// Timeline of the Vienna 1907 short: "The Rejection That Shook the World"
// Timed to voice/words.json, classical architectural staging and camera grammar.
export const FPS = 30;
export const TOTAL = 2350;
export const D0 = 6.0;
export const HALF = 27;
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 20;
export const PARK: V3 = [70, D0, -75];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

export const SNAP = 41.5, DROP0 = 42.0, DROP1 = 43.0;
export const front = (tau: number) => -30 + 1.2 * (tau - 0);
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1;
export const amp = (tau: number) => 0;
export const stomp = (tau: number) => 1.0;
export const shapeZ = (z: number) => 0;
export const dropW = (z: number) => 0;
export const dropU = (tau: number) => 0;
export const DROP_H = 0;

export type BridgeState = { bounce: number; drop: number; snap: number; collapsed: boolean };
export const deckY = (z: number, b: BridgeState) => D0;
export const ANCHOR: V3 = [0, D0, -40];
export const snapEnd = (snap: number): V3 => [0, D0, -40];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "hook" | "town" | "arrival" | "exam" | "eval" | "drawing" | "stamp" | "luckily" | "unluckily" | "statue" | "shelter" | "twist";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 245, light: "day", crowd: "hook", tau: (t) => t, towns: true },
  { id: 2, a: 245, b: 455, light: "golden", crowd: "town", tau: (t) => t, towns: true },
  { id: 3, a: 455, b: 690, light: "day", crowd: "arrival", tau: (t) => t, towns: true },
  { id: 4, a: 690, b: 850, light: "day", crowd: "exam", tau: (t) => t },
  { id: 5, a: 850, b: 1115, light: "day", crowd: "eval", tau: (t) => t },
  { id: 6, a: 1115, b: 1245, light: "day", crowd: "drawing", tau: (t) => t },
  { id: 7, a: 1245, b: 1365, light: "day", crowd: "stamp", tau: (t) => t },
  { id: 8, a: 1365, b: 1475, light: "day", crowd: "luckily", tau: (t) => t },
  { id: 9, a: 1475, b: 1680, light: "golden", crowd: "unluckily", tau: (t) => t, towns: true },
  { id: 10, a: 1680, b: 1910, light: "golden", crowd: "statue", tau: (t) => t },
  { id: 11, a: 1910, b: 2160, light: "day", crowd: "shelter", tau: (t) => t, towns: true },
  { id: 12, a: 2160, b: TOTAL, light: "day", crowd: "twist", tau: (t) => t, towns: true },
];

export const XFADE: Record<number, number> = { 2: 6, 4: 8, 5: 6, 6: 6, 8: 6, 9: 8, 10: 8, 11: 8, 12: 8 };
export const FLASH_AT = 245;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export const bridgeState = (id: number, t: number): BridgeState => ({ bounce: 0, drop: 0, snap: 0, collapsed: false });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};

const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

// Camera Framings
// Shot 1: Hook - Low dramatic wide in front of Academy
const S1a = (f: number) => dolly([0, D0 + 1.6, -26], [0, D0 + 1.8, -36], pushK(f, 0, 0.0018), { fov: 44, roll: -0.02 });
const S1b = (f: number) => dolly([1.2, D0 + 1.7, -30], [0, D0 + 1.6, -36], pushK(f, 130, 0.002), { fov: 40, roll: 0.03 });

// Shot 2: Setting - Imperial Vienna Ringstrasse tracking
const S2a = (f: number) => zoom([18, 14, -54], [0, 8, -30], 45, pushK(f, 245, 0.0015));
const S2b = (f: number) => zoom([12, 10, -46], [0, 7.5, -28], 42, pushK(f, 350, 0.002));

// Shot 3: Arrival - Young applicant with portfolio
const S3a = (f: number) => dolly([0.6, D0 + 1.65, -34], [0, D0 + 1.55, -37.8], pushK(f, 455, 0.0025), { fov: 38 });
const S3b = (f: number) => dolly([-0.3, D0 + 1.6, -34.5], [0, D0 + 1.55, -37.8], pushK(f, 570, 0.002), { fov: 36, roll: -0.03 });

// Shot 4: Examination Hall - Drafting desks
const S4a = (f: number) => dolly([1.8, D0 + 2.0, -34.5], [0, D0 + 1.3, -37.8], pushK(f, 690, 0.002), { fov: 40, roll: 0.03 });
const S4b = (f: number) => dolly([0.8, D0 + 1.8, -35.2], [0, D0 + 1.3, -37.8], pushK(f, 770, 0.0025), { fov: 38 });

// Shot 5: Admissions Committee Evaluation
const S5a = (f: number) => dolly([-0.8, D0 + 1.65, -34.2], [0, D0 + 1.5, -37.5], pushK(f, 850, 0.002), { fov: 38 });
const S5b = (f: number) => dolly([0.2, D0 + 1.65, -34.5], [0, D0 + 1.5, -37.5], pushK(f, 980, 0.0025), { fov: 35, roll: -0.02 });

// Shot 6: Macro close-up on the drawing card (no human face)
const S6a = (f: number) => dolly([0, D0 + 1.45, -35.2], [0, D0 + 1.45, -37.5], pushK(f, 1115, 0.003), { fov: 32 });

// Shot 7: The Stamp slamming down (impact kick)
const S7a = (f: number) => dolly([0, D0 + 1.45, -35.2], [0, D0 + 1.45, -37.5], pushK(f, 1245, 0.0025, 0.008, 20), { fov: 33, roll: 0.03 });

// Shot 8: Luckily - Fine Art Protected (Professor next to bust)
const S8a = (f: number) => dolly([0.15, D0 + 1.6, -34.2], [0.15, D0 + 1.5, -37.5], pushK(f, 1365, 0.002), { fov: 38 });

// Shot 9: Unluckily - Rector points to the door
const S9a = (f: number) => dolly([0, D0 + 1.6, -33.8], [0, D0 + 1.5, -37.5], pushK(f, 1475, 0.002), { fov: 42, roll: -0.03 });
const S9b = (f: number) => dolly([0.4, D0 + 1.65, -33.2], [0, D0 + 1.5, -37.5], pushK(f, 1580, 0.0025), { fov: 44 });

// Shot 10: Explanation - Human statue vs rigid stone
const S10a = (f: number) => dolly([0, D0 + 1.6, -34.0], [0, D0 + 1.5, -37.5], pushK(f, 1680, 0.002), { fov: 40 });
const S10b = (f: number) => dolly([-0.4, D0 + 1.6, -34.2], [0, D0 + 1.5, -37.5], pushK(f, 1795, 0.0022), { fov: 38, roll: 0.03 });

// Shot 11: Consequence - Winter homeless shelter alley
const S11a = (f: number) => dolly([0, D0 + 1.6, -34.2], [0, D0 + 1.5, -37.5], pushK(f, 1910, 0.002), { fov: 38, roll: -0.03 });
const S11b = (f: number) => dolly([0.8, D0 + 1.8, -33.0], [0, D0 + 1.5, -37.5], pushK(f, 2030, 0.0018), { fov: 42 });

// Shot 12: Callback Twist & Outro Crane Pullback
const S12a = (f: number) => dolly([0, D0 + 1.4, -35.0], [0, D0 + 1.2, -37.5], pushK(f, 2160, 0.002), { fov: 36 });
const S12b = (f: number) => {
  const u = glide((f - 2240) / 100);
  return {
    pos: [0 + 6 * u, D0 + 1.4 + 10 * u, -35.0 + 15 * u] as V3,
    look: [0, D0 + 3, -40] as V3,
    fov: 36 + 12 * u,
    roll: 0,
  };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 130, dur: 26, s: S1b }],
  2: [{ f: 245, s: S2a }, { f: 350, dur: 26, s: S2b }],
  3: [{ f: 455, s: S3a }, { f: 570, dur: 24, s: S3b }],
  4: [{ f: 690, s: S4a }, { f: 770, dur: 22, s: S4b }],
  5: [{ f: 850, s: S5a }, { f: 980, dur: 24, s: S5b }],
  6: [{ f: 1115, s: S6a }],
  7: [{ f: 1245, s: S7a }],
  8: [{ f: 1365, s: S8a }],
  9: [{ f: 1475, s: S9a }, { f: 1580, dur: 24, s: S9b }],
  10: [{ f: 1680, s: S10a }, { f: 1795, dur: 24, s: S10b }],
  11: [{ f: 1910, s: S11a }, { f: 2030, dur: 26, s: S11b }],
  12: [{ f: 2160, s: S12a }, { f: 2240, dur: 30, s: S12b }],
};

export const camAt = (id: number, f: number): Cam => {
  const keys = CAMS[id] ?? CAMS[1];
  return run(keys, f);
};

// Impact kick on rejection stamp
export const KICKS: Record<number, number> = {
  1248: 1.0,
  1256: 0.4,
};

export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const s = shotAt(f);
  switch (s.id) {
    case 1: return { cInf: 11 };
    case 2: return { cInf: 4 };
    case 3: return { cInf: 13, focus: () => [0, D0 + 1.7, -38] };
    case 4: return { cInf: 10, focus: () => [0, D0 + 1.3, -37.8] };
    case 5: return { cInf: 13, focus: () => [0, D0 + 1.6, -37.5] };
    case 6: return { cInf: 16, focus: () => [0, D0 + 1.5, -37.5] };
    case 7: return { cInf: 12, focus: () => [0, D0 + 1.5, -37.5] };
    case 8: return { cInf: 11, focus: () => [-0.4, D0 + 1.6, -37.5] };
    case 9: return { cInf: 12, focus: () => [1.0, D0 + 1.6, -37.5] };
    case 10: return { cInf: 11, focus: () => [0, D0 + 1.5, -37.5] };
    case 11: return { cInf: 14, focus: () => [0, D0 + 1.6, -37.5] };
    case 12: return { cInf: 6, focus: () => [0, D0 + 1.5, -37.5] };
    default: return { cInf: 10 };
  }
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
