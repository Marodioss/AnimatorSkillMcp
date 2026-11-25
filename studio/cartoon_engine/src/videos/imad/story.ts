// 70-Second "Kounkan+" Story Timeline & 28-Shot Pacing for "Burn It to Earn It" (Episode 1)
// Synchronized 1:1 to real Edge-TTS WordBoundary timestamps (words.json) & segment boundaries (segments.json).
import wordsData from "./words.json";
import segmentsData from "./segments.json";

export const TOTAL_FRAMES = 2100;
export const FPS = 30;

export type V3 = [number, number, number];
export type LightMood = "warm" | "alert";
export type InsertKind =
  | null
  | "karma_meter"
  | "karma_rules"
  | "audit_file"
  | "golden_signature"
  | "brass_key"
  | "cta_endcard";

export interface WordEntry {
  w: string;
  raw: string;
  seg: number;
  scene: number;
  speaker: string;
  actor: string;
  lip_sync: boolean;
  s: number;
  e: number;
  f_start: number;
  f_end: number;
  viseme: string;
}

export interface SegmentEntry {
  id: number;
  scene: number;
  speaker: string;
  actor: string;
  lip_sync: boolean;
  start: number;
  end: number;
  dur: number;
  f_start: number;
  f_end: number;
  word_count: number;
  text: string;
}

export const WORDS = wordsData as WordEntry[];
export const SEGMENTS = segmentsData as SegmentEntry[];

export interface ShotDef {
  id: number;
  a: number;
  b: number;
  name: string;
  light: LightMood;
  insert: InsertKind;
  cInf: number;
  focusOffset?: V3;
}

// 28 fast, rhythmic shots (2.50s average shot length, matching kounkan.ma's 2.4-3.9s benchmark)
export const SHOTS: ShotDef[] = [
  // Scene 1: The Golden Bean Café — Hook (Seg 1: f 7..261)
  { id: 1, a: 0, b: 78, name: "cafe_wide_hook", light: "warm", insert: null, cInf: 8 },
  { id: 2, a: 78, b: 158, name: "imad_sip_cu", light: "warm", insert: null, cInf: 14 },
  { id: 3, a: 158, b: 264, name: "sarah_skeptic_cu", light: "warm", insert: null, cInf: 14 },

  // Scene 2: The Rules of the Karma Fund (Seg 2: f 267..591)
  { id: 4, a: 264, b: 345, name: "insert_karma_meter", light: "warm", insert: "karma_meter", cInf: 0 },
  { id: 5, a: 345, b: 432, name: "insert_karma_rules", light: "warm", insert: "karma_rules", cInf: 0 },
  { id: 6, a: 432, b: 520, name: "imad_ots_dreamy", light: "warm", insert: null, cInf: 13 },
  { id: 7, a: 520, b: 594, name: "imad_zero_zoom", light: "warm", insert: null, cInf: 18 },

  // Scene 3: Sarah's Reality Check (Seg 3: f 598..801, Seg 4: f 806..913)
  { id: 8, a: 594, b: 675, name: "sarah_warn_cu", light: "warm", insert: null, cInf: 14 },
  { id: 9, a: 675, b: 756, name: "insert_audit_file", light: "warm", insert: "audit_file", cInf: 0 },
  { id: 10, a: 756, b: 804, name: "sarah_madness_cu", light: "warm", insert: null, cInf: 15 },
  { id: 11, a: 804, b: 862, name: "imad_smirk_cu", light: "warm", insert: null, cInf: 14 },
  { id: 12, a: 862, b: 916, name: "booth_contrast_wide", light: "warm", insert: null, cInf: 8 },

  // Scene 4: The Generous Overpay (Seg 5: 919..1066, Seg 6: 1071..1148, Seg 7: 1154..1276)
  { id: 13, a: 916, b: 1000, name: "imad_deal_cu", light: "warm", insert: null, cInf: 14 },
  { id: 14, a: 1000, b: 1068, name: "imad_seamstress_two_shot", light: "warm", insert: null, cInf: 9 },
  { id: 15, a: 1068, b: 1151, name: "sarah_facepalm_cu", light: "warm", insert: null, cInf: 16 },
  { id: 16, a: 1151, b: 1216, name: "imad_tab_cu", light: "warm", insert: null, cInf: 15 },
  { id: 17, a: 1216, b: 1280, name: "imad_pay_celebrate", light: "warm", insert: null, cInf: 13 },

  // Scene 5: The Relieved Craftsman (Seg 8: 1284..1525)
  { id: 18, a: 1280, b: 1365, name: "cafe_door_enter", light: "warm", insert: null, cInf: 10 },
  { id: 19, a: 1365, b: 1450, name: "henderson_mop_walk", light: "warm", insert: null, cInf: 14 },
  { id: 20, a: 1450, b: 1528, name: "imad_eager_reverse", light: "warm", insert: null, cInf: 15 },

  // Scene 6: The Golden Signature (Seg 9: 1532..1624, Seg 10: 1630..1793)
  { id: 21, a: 1528, b: 1627, name: "henderson_grateful_cu", light: "warm", insert: null, cInf: 15 },
  { id: 22, a: 1627, b: 1716, name: "insert_golden_signature", light: "warm", insert: "golden_signature", cInf: 0 },
  { id: 23, a: 1716, b: 1796, name: "three_shot_celebrate", light: "warm", insert: null, cInf: 8 },

  // Scene 7: The Cliffhanger Twist & CTA (Seg 11: 1799..1899, Seg 12: 1906..2031, Seg 13: 2038..2081)
  { id: 24, a: 1796, b: 1860, name: "henderson_gift_cu", light: "warm", insert: null, cInf: 15 },
  { id: 25, a: 1860, b: 1904, name: "insert_brass_key", light: "warm", insert: "brass_key", cInf: 0 },
  { id: 26, a: 1904, b: 1992, name: "alert_imad_shock", light: "alert", insert: null, cInf: 13 },
  { id: 27, a: 1992, b: 2035, name: "imad_nooo_zoom", light: "alert", insert: null, cInf: 18 },
  { id: 28, a: 2035, b: TOTAL_FRAMES, name: "insert_cta_endcard", light: "alert", insert: "cta_endcard", cInf: 0 },
];

export function shotAt(f: number): ShotDef {
  for (const s of SHOTS) {
    if (f >= s.a && f < s.b) return s;
  }
  return SHOTS[SHOTS.length - 1];
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export interface CameraState {
  pos: V3;
  look: V3;
  fov: number;
  roll: number;
}

const dolly = (pos: V3, look: V3, f: number, f0: number, rate: number, fov: number, roll = 0): CameraState => {
  const k = Math.exp(-rate * Math.max(0, f - f0));
  return {
    pos: [
      look[0] + (pos[0] - look[0]) * k,
      look[1] + (pos[1] - look[1]) * k,
      look[2] + (pos[2] - look[2]) * k,
    ],
    look,
    fov,
    roll,
  };
};

// Actor World Positions (all seated actors cleanly behind oak table z = -0.32!)
export const IMAD_BOOTH: V3 = [0.34, 0.0, -0.36];
export const SARAH_BOOTH: V3 = [-0.34, 0.0, -0.36];
export const IMAD_THREE: V3 = [0.02, 0.0, -0.38];
export const SARAH_THREE: V3 = [-0.48, 0.0, -0.38];
export const HENDERSON_THREE: V3 = [0.54, 0.0, -0.36];

export function cameraAt(f: number): CameraState {
  const s = shotAt(f);
  const f0 = s.a;

  switch (s.id) {
    case 1:
      // Wide sunlit café booth establishing shot (fits both Sarah & Imad cleanly inside 9:16!)
      return dolly([0.0, 1.12, 2.75], [0.0, 0.96, -0.24], f, f0, 0.0018, 46, 0.004 * Math.sin(f * 0.04));
    case 2:
      // Imad sipping cocoa CU (head & hair crown cleanly below Top HUD!)
      return dolly([0.24, 1.16, 1.54], [0.34, 1.14, -0.36], f, f0, 0.0020, 40, -0.01);
    case 3:
      // Sarah skeptical reaction CU (hair & stylus cleanly below Top HUD!)
      return dolly([-0.24, 1.16, 1.54], [-0.34, 1.14, -0.36], f, f0, 0.0020, 40, 0.01);
    case 6:
      // OTS past Sarah's foreground shoulder toward grinning Imad + sunlit window
      return dolly([-0.78, 1.16, 1.12], [0.08, 1.10, -0.36], f, f0, 0.0022, 46, -0.012);
    case 7:
      // Extreme comedic face zoom on Imad ("I get zero") — full curls, eyebrows & eyes clear of HUD!
      return dolly([0.34, 1.18, 1.18], [0.34, 1.17, -0.36], f, f0, 0.0034, 36, 0.018);
    case 8:
      // Sarah urgent warning CU (hand & glasses completely clear of HUD and edges!)
      return dolly([-0.26, 1.15, 1.52], [-0.30, 1.13, -0.36], f, f0, 0.0022, 41, 0.0);
    case 10:
      // Sarah shocked warning ("is financial madness!") — punchy yet below HUD!
      return dolly([-0.30, 1.16, 1.38], [-0.32, 1.14, -0.36], f, f0, 0.0028, 39, -0.015);
    case 11:
      // Imad cool smirk CU ("world's best fire sale")
      return dolly([0.30, 1.16, 1.48], [0.34, 1.14, -0.36], f, f0, 0.0024, 40, 0.012);
    case 12:
      // Contrast two-shot: sunny Imad vs stunned Sarah
      return dolly([0.0, 1.12, 2.65], [0.0, 0.96, -0.25], f, f0, 0.0018, 46, 0.0);
    case 13:
      // Imad confident deal pitch CU (waving hand fits cleanly inside right edge!)
      return dolly([0.28, 1.15, 1.58], [0.38, 1.12, -0.36], f, f0, 0.0022, 42, 0.0);
    case 14:
      // Two-shot ("seamstresses two months of back pay?")
      return dolly([-0.06, 1.14, 2.58], [0.02, 0.98, -0.28], f, f0, 0.0016, 46, 0.008);
    case 15:
      // Sarah exasperated facepalm CU (cleanly framed below Top HUD!)
      return dolly([-0.30, 1.16, 1.42], [-0.34, 1.14, -0.36], f, f0, 0.0022, 39, -0.016);
    case 16:
      // Imad cheerful "Perfect! Add it to my tab"
      return dolly([0.28, 1.15, 1.54], [0.36, 1.13, -0.36], f, f0, 0.0024, 41, 0.012);
    case 17:
      // Imad celebration punch-in ("We pay everyone today!") — waving hand inside frame!
      return dolly([0.36, 1.15, 1.46], [0.38, 1.13, -0.36], f, f0, 0.0028, 41, -0.012);
    case 18:
      // Café entrance door angle: full-figure Henderson entering left door & clear aisle!
      return dolly([-1.56, 0.98, 0.72], [-1.58, 0.78, -1.75], f, f0, 0.0020, 47, 0.0);
    case 19: {
      // Tracking Henderson nervously walking down unobstructed left aisle (feet + contact shadow visible!)
      const u = smootherstep(f0, s.b, f);
      const hx = -1.45 + 0.18 * u;
      const hz = -1.52 + 0.45 * u;
      return dolly([hx - 0.16, 0.98, hz + 2.42], [hx, 0.78, hz], f, f0, 0.0018, 47, 0.008);
    }
    case 20:
      // Reverse CU on Imad grinning warmly ("hand him a bag of cash")
      return dolly([0.26, 1.16, 1.48], [0.34, 1.14, -0.36], f, f0, 0.0022, 40, 0.0);
    case 21:
      // Henderson grateful emotional CU clutching contract (centered on Henderson, zero edge peek!)
      return dolly([0.60, 1.16, 1.36], [0.60, 1.12, -0.36], f, f0, 0.0022, 40, 0.0);
    case 23:
      // Three-shot celebration around the sunlit oak table (all 3 cleanly framed!)
      return dolly([0.04, 1.14, 3.16], [0.04, 0.98, -0.32], f, f0, 0.0015, 48, 0.0);
    case 24:
      // Henderson proudly beaming holding brass gift key (key & head 100% inside safe frame, zero edge peek!)
      return dolly([0.62, 1.16, 1.44], [0.62, 1.12, -0.36], f, f0, 0.0024, 41, 0.008);
    case 26: {
      // Alert shatter: Crimson lighting 3-shot (all 3 characters + brass key completely inside frame!)
      const sf = Math.max(0, f - f0);
      const shakeY = sf < 22 ? Math.sin(sf * 1.9) * 0.014 * Math.exp(-sf * 0.1) : 0;
      return dolly([0.04, 1.15 + shakeY, 3.06], [0.05, 1.00, -0.34], f, f0, 0.0022, 48, -0.012);
    }
    case 27: {
      // Extreme comedic panic zoom on Imad ("dollars?! Nooo!") — brows, eyes & mouth clear of HUD & captions!
      const sf = Math.max(0, f - f0);
      const shakeY = Math.sin(sf * 2.2) * 0.018 * Math.exp(-sf * 0.06);
      const shakeR = Math.sin(sf * 2.7) * 0.022 * Math.exp(-sf * 0.06);
      return dolly([0.02, 1.18 + shakeY, 1.08], [0.02, 1.16, -0.38], f, f0, 0.0040, 36, shakeR);
    }
    default:
      // Insert shots keep camera parked cleanly
      return { pos: [0.0, 1.12, 2.75], look: [0.0, 0.96, -0.24], fov: 46, roll: 0 };
  }
}

export function dofAt(f: number): { cInf: number; focus?: V3 } {
  const s = shotAt(f);
  if (s.insert) return { cInf: 0 };
  return { cInf: s.cInf, focus: s.focusOffset };
}

export function visemeAt(f: number, actor: string): string {
  for (const w of WORDS) {
    if (w.lip_sync && w.actor === actor && f >= w.f_start && f <= w.f_end) {
      return w.viseme || "ai";
    }
  }
  return "rest";
}

export function isSpeaking(f: number, actor: string): boolean {
  for (const w of WORDS) {
    if (w.lip_sync && w.actor === actor && f >= w.f_start && f <= w.f_end) {
      return true;
    }
  }
  return false;
}

export function activeWordAt(f: number): WordEntry | null {
  for (const w of WORDS) {
    if (f >= w.f_start && f <= w.f_end) return w;
  }
  return null;
}

export function activeSegmentAt(f: number): SegmentEntry | null {
  for (const s of SEGMENTS) {
    if (f >= s.f_start && f <= s.f_end) return s;
  }
  return null;
}
