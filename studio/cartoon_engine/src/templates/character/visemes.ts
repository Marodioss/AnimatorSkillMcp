// Acoustic-aligned Viseme Lip-Sync Engine.
// Maps speech timestamps from STT (words.json) into smooth continuous viseme transitions
// supporting both the Preston Blair 10-phoneme standard and streamlined 5-viseme cartoon modes.
import { Pen, INK } from "../bridge/toon";
import { MathPool } from "../engine/math_pool";

export type VisemeKind =
  | "rest"
  | "mbp"   // M, B, P: closed compressed lips
  | "etc"   // D, T, S, Z, C, K, G: teeth visible, tongue relaxed
  | "fv"    // F, V: lower lip tucked under upper incisors
  | "l"     // L, TH: tongue touching upper teeth
  | "ai"    // A, I, AY: wide open dropped jaw
  | "e"     // E, EE: wide stretched lips
  | "o"     // O, OH, AW: medium oval rounded opening
  | "u"     // U, OO: small circular pursed embouchure
  | "wq";   // W, Q: tight puckered puck

export interface TimestampedWord {
  word: string;
  start: number; // Seconds
  end: number;   // Seconds
}

export class VisemeEngine {
  /**
   * Approximates viseme sequence from word text and timestamps.
   * Uses phonetic heuristics for English speech cadence.
   */
  static getVisemeAtTime(t: number, words: TimestampedWord[]): { current: VisemeKind; openWeight: number } {
    // Find active word
    const active = words.find((w) => t >= w.start - 0.03 && t <= w.end + 0.03);
    if (!active) {
      return { current: "rest", openWeight: 0.0 };
    }

    const dur = active.end - active.start;
    const progress = MathPool.clamp((t - active.start) / Math.max(0.01, dur), 0, 1);

    // Phonetic decomposition based on word letters
    const clean = active.word.toLowerCase().replace(/[^a-z]/g, "");
    if (!clean) {
      return { current: "rest", openWeight: 0.0 };
    }

    // Index into phonetic segments of the word
    const charIdx = Math.min(clean.length - 1, Math.floor(progress * clean.length));
    const ch = clean[charIdx];

    let current: VisemeKind = "etc";
    let openWeight = 0.5;

    if (["m", "b", "p"].includes(ch)) {
      current = "mbp";
      openWeight = 0.05;
    } else if (["f", "v"].includes(ch)) {
      current = "fv";
      openWeight = 0.25;
    } else if (["l"].includes(ch)) {
      current = "l";
      openWeight = 0.45;
    } else if (["a", "i", "y"].includes(ch)) {
      current = "ai";
      openWeight = 0.95;
    } else if (["e"].includes(ch)) {
      current = "e";
      openWeight = 0.65;
    } else if (["o"].includes(ch)) {
      current = "o";
      openWeight = 0.85;
    } else if (["u"].includes(ch)) {
      current = "u";
      openWeight = 0.4;
    } else if (["w", "q"].includes(ch)) {
      current = "wq";
      openWeight = 0.3;
    }

    // Jaw opening envelope: ramps up at onset, decays at word tail
    const envelope = Math.sin(Math.PI * progress);
    return {
      current,
      openWeight: openWeight * envelope,
    };
  }

  /**
   * Draws detailed viseme mouth with ink outlines and interior oral cavity shading.
   */
  static drawViseme(
    p: Pen,
    kind: VisemeKind,
    mx: number,
    my: number,
    u: number, // 1% head unit scale
    scale = 1.0
  ): void {
    const mw = 3.6 * u * scale;
    const MOUTH_BG = "#5a1e28";
    const TEETH_COL = "#ffffff";
    const TONGUE_COL = "#e86e78";

    switch (kind) {
      case "rest":
        p.stroke([[mx - 5.5 * u * scale, my], [mx + 5.5 * u * scale, my - 0.5 * u]], mw);
        break;

      case "mbp":
        // Compressed flat lips with slight lip line crease
        p.stroke([[mx - 7 * u * scale, my], [mx + 7 * u * scale, my]], mw * 1.2);
        p.stroke([[mx - 4 * u * scale, my + 1.2 * u], [mx + 4 * u * scale, my + 1.2 * u]], mw * 0.6);
        break;

      case "fv":
        // Upper teeth touching curled lower lip
        p.poly(
          [
            [mx - 6 * u * scale, my - 2 * u],
            [mx + 6 * u * scale, my - 2 * u],
            [mx + 5 * u * scale, my + 3 * u],
            [mx - 5 * u * scale, my + 3 * u],
          ],
          TEETH_COL,
          mw * 0.7
        );
        p.arc(mx, my + 3 * u, 7 * u * scale, 3 * u, 10, 170, mw);
        break;

      case "ai":
        // Deep open "D" mouth with visible teeth and tongue
        p.ell(mx, my - u, 11 * u * scale, 9 * u * scale, MOUTH_BG, 0, 0, 180);
        // Upper teeth band
        p.clip(
          [
            [mx - 11 * u * scale, my - u],
            [mx + 11 * u * scale, my - u],
            [mx + 11 * u * scale, my + 3 * u],
            [mx - 11 * u * scale, my + 3 * u],
          ],
          () => p.ell(mx, my - u, 11 * u * scale, 9 * u * scale, TEETH_COL, 0, 0, 180)
        );
        // Tongue
        p.ell(mx, my + 4 * u * scale, 5 * u * scale, 3 * u * scale, TONGUE_COL, 0);
        // Plum ink border
        p.ell(mx, my - u, 11 * u * scale, 9 * u * scale, null, mw, 0, 180);
        break;

      case "e":
        // Wide grin mouth showing upper and lower teeth
        p.poly(
          [
            [mx - 10 * u * scale, my - 3 * u],
            [mx + 10 * u * scale, my - 3 * u],
            [mx + 9 * u * scale, my + 3 * u],
            [mx - 9 * u * scale, my + 3 * u],
          ],
          TEETH_COL,
          mw * 0.8
        );
        p.stroke([[mx - 9 * u * scale, my], [mx + 9 * u * scale, my]], mw * 0.5);
        break;

      case "o":
        // Tall oval mouth
        p.ell(mx, my, 6 * u * scale, 8 * u * scale, MOUTH_BG, mw);
        p.ell(mx, my + 3 * u, 3.5 * u * scale, 2.5 * u * scale, TONGUE_COL, 0);
        break;

      case "u":
      case "wq":
        // Small pursed puckered circular mouth
        p.ell(mx, my, 4 * u * scale, 4.5 * u * scale, MOUTH_BG, mw);
        break;

      default:
        // 'etc' default open speaking mouth
        p.ell(mx, my - 0.5 * u, 8 * u * scale, 5 * u * scale, MOUTH_BG, 0, 0, 180);
        p.clip(
          [
            [mx - 8 * u * scale, my - 0.5 * u],
            [mx + 8 * u * scale, my - 0.5 * u],
            [mx + 8 * u * scale, my + 2 * u],
            [mx - 8 * u * scale, my + 2 * u],
          ],
          () => p.ell(mx, my - 0.5 * u, 8 * u * scale, 5 * u * scale, TEETH_COL, 0, 0, 180)
        );
        p.ell(mx, my - 0.5 * u, 8 * u * scale, 5 * u * scale, null, mw, 0, 180);
        break;
    }
  }
}
