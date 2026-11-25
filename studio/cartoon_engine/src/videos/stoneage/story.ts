// Timeline of the Stone Age short: "The Invention of Wool & The Time-Traveling Hoodie"
// Timed to voice/words.json, primitive camp staging and cinematic camera glides.
export const FPS = 30;
export const TOTAL = 2150;
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
export type Crowd = "shiver" | "camp" | "bark" | "hunt" | "sheep" | "panic" | "sneak" | "spindle" | "touch" | "yarn" | "hoodie";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean };

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 180, light: "day", crowd: "shiver", tau: (t) => t },
  { id: 2, a: 180, b: 360, light: "golden", crowd: "camp", tau: (t) => t },
  { id: 3, a: 360, b: 560, light: "day", crowd: "bark", tau: (t) => t },
  { id: 4, a: 560, b: 780, light: "day", crowd: "hunt", tau: (t) => t },
  { id: 5, a: 780, b: 980, light: "day", crowd: "sheep", tau: (t) => t },
  { id: 6, a: 980, b: 1180, light: "day", crowd: "panic", tau: (t) => t },
  { id: 7, a: 1180, b: 1380, light: "golden", crowd: "sneak", tau: (t) => t },
  { id: 8, a: 1380, b: 1580, light: "day", crowd: "spindle", tau: (t) => t },
  { id: 9, a: 1580, b: 1780, light: "day", crowd: "touch", tau: (t) => t },
  { id: 10, a: 1780, b: 1960, light: "golden", crowd: "yarn", tau: (t) => t },
  { id: 11, a: 1960, b: TOTAL, light: "day", crowd: "hoodie", tau: (t) => t },
];

export const XFADE: Record<number, number> = { 2: 6, 3: 6, 4: 8, 5: 6, 6: 6, 7: 8, 8: 8, 9: 6, 10: 6, 11: 8 };
export const FLASH_AT = 180;

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
  pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * k, a.pos[1] + (b.pos[1] - a.pos[1]) * k, a.pos[2] + (b.pos[2] - a.pos[2]) * k],
  look: [a.look[0] + (b.look[0] - a.look[0]) * k, a.look[1] + (b.look[1] - a.look[1]) * k, a.look[2] + (b.look[2] - a.look[2]) * k],
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

// Camera Framings around the Stone Age Campfire (fire at [0, D0, -29.5])
const S1 = (f: number) => dolly([0, D0 + 2.2, -25], [0, D0 + 0.8, -34.2], pushK(f, 0, 0.0016), { fov: 42, roll: -0.01 });
const S2 = (f: number) => dolly([5, D0 + 2.8, -22], [0, D0 + 1.2, -36], pushK(f, 180, 0.0012), { fov: 46, roll: 0.02 });
const S3 = (f: number) => dolly([-0.6, D0 + 1.2, -31], [-0.5, D0 + 1.1, -34.2], pushK(f, 360, 0.002), { fov: 36, roll: -0.02 });
const S4 = (f: number) => dolly([1.6, D0 + 1.2, -28], [3.2, D0 + 1.1, -37], pushK(f, 560, 0.0018), { fov: 38, roll: 0.01 });
const S5 = (f: number) => dolly([3.2, D0 + 0.9, -32], [3.2, D0 + 0.9, -36.5], pushK(f, 780, 0.0022), { fov: 32, roll: 0.0 });
const S6 = (f: number) => dolly([0, D0 + 1.6, -27], [-0.5, D0 + 1.4, -34], pushK(f, 980, 0.0025), { fov: 40, roll: 0.02 });
const S7 = (f: number) => dolly([2.2, D0 + 1.0, -30], [2.8, D0 + 0.9, -36], pushK(f, 1180, 0.0018), { fov: 35, roll: -0.02 });
const S8 = (f: number) => dolly([0.1, D0 + 1.1, -31], [0.2, D0 + 1.0, -34], pushK(f, 1380, 0.002), { fov: 34, roll: 0.01 });
const S9 = (f: number) => dolly([0.8, D0 + 1.1, -30], [0.5, D0 + 1.1, -34], pushK(f, 1580, 0.0018), { fov: 36, roll: -0.01 });
const S10 = (f: number) => dolly([0, D0 + 2.0, -25], [0, D0 + 1.0, -34], pushK(f, 1780, 0.0015), { fov: 42, roll: 0.02 });
const S11 = (f: number) => dolly([0.0, D0 + 1.1, -31.2], [0.0, D0 + 0.95, -33.5], pushK(f, 1960, 0.002), { fov: 38, roll: -0.01 });

export const CAM_KEYS: Key[] = [
  { f: 0, s: S1 },
  { f: 180, dur: 18, s: S2 },
  { f: 360, dur: 18, s: S3 },
  { f: 560, dur: 20, s: S4 },
  { f: 780, dur: 18, s: S5 },
  { f: 980, dur: 18, s: S6 },
  { f: 1180, dur: 20, s: S7 },
  { f: 1380, dur: 18, s: S8 },
  { f: 1580, dur: 18, s: S9 },
  { f: 1780, dur: 20, s: S10 },
  { f: 1960, dur: 22, s: S11 },
];

export const cameraAt = (f: number): Cam => run(CAM_KEYS, f);
export const camAt = (id: number, f: number): Cam => cameraAt(f);

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];

// ---------------- depth of field ----------------
export type DOF = { focus?: (f: number) => V3; cInf: number };
export const dofAt = (f: number): DOF => {
  const s = shotAt(f);
  if (s.id === 5 || s.id === 8 || s.id === 11) return { cInf: 14, focus: (f) => [0, D0 + 1.1, -34] };
  if (s.id === 3 || s.id === 7 || s.id === 9) return { cInf: 10, focus: (f) => [0, D0 + 1.1, -34] };
  return { cInf: 6 };
};
