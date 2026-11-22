// Core Type Definitions for the Multi-Style Visual Architecture.
// Enforces modular interchangeability across character rigs, frame cadences, shaders, and audio profiles.
import * as THREE from "three";
import { Pen, Outfit } from "../bridge/toon";

export type StyleId =
  | "storybook"       // Baseline: 2D bean head, painted world, plum ink, DoF
  | "comic_noir"      // Living Comic-Book / Spider-Verse: Halftone dots, cross-hatching, on-twos
  | "papercraft"      // Stop-Motion Paper Diorama: Cardstock grain, layer drop shadows, on-twos/threes
  | "rubber_hose"     // 1930s Vintage Cartoon: Noodle limbs, pie-cut eyes, 2-beat bounce, film gate weave
  | "kurzgesagt"      // Flat Geometric Infographic: Saturated ramps, snappy overshoot, zero ink lines
  | "anime_sakuga"    // 2.5D Cel Action: 3-tone cel shading, radial speedlines, impact flash frames
  | "retro_90s"       // Low-Poly Lo-Fi: Affine UV warping, vertex grid snapping, Bayer dithering
  | "sumi_ink";       // Traditional Sumi-e: Procedural ink bleed, rice paper grain, calligraphic strokes

export interface CadenceConfig {
  characterStep: number;  // 1 = 30fps smooth, 2 = 15fps on-twos, 3 = 10fps on-threes
  cameraStep: number;     // Usually 1 for smooth cinematic camera tracking
  microJitter: number;    // Sub-pixel random jitter amplitude (used in stop-motion/papercraft)
}

export interface PaletteConfig {
  keyLightColor: string;
  shadowColor: string;
  rimColor: string;
  inkColor: string;
  backgroundColor: string;
  contrastGain: number;
  saturationGain: number;
}

export interface AudioProfile {
  genre: string;
  bpm: number;
  percussionKind: string;
  duckingDepthDb: number;
  reverbDecaySec: number;
}

export interface StyleDefinition {
  id: StyleId;
  displayName: string;
  description: string;
  cadence: CadenceConfig;
  palette: PaletteConfig;
  audio: AudioProfile;
}

/**
 * Calculates the effective stepped animation frame for characters while preserving smooth camera glide.
 * Example: stepFrame(5, 2) => 4 (holds for 2 frames)
 */
export function stepFrame(f: number, step = 1): number {
  if (step <= 1) return f;
  return Math.floor(f / step) * step;
}
