// Centralized Style Registry and Preset Catalog.
// Allows any Remotion short composition to select a visual style with a single configuration flag.
import { StyleId, StyleDefinition } from "./types";

export const STYLES: Record<StyleId, StyleDefinition> = {
  storybook: {
    id: "storybook",
    displayName: "Painted Storybook",
    description: "2D bean-head characters in a painted 3D world with plum ink and depth of field",
    cadence: { characterStep: 1, cameraStep: 1, microJitter: 0 },
    palette: {
      keyLightColor: "#fff2e0",
      shadowColor: "#444380",
      rimColor: "#ffd08a",
      inkColor: "#241726",
      backgroundColor: "#3e7fd2",
      contrastGain: 1.0,
      saturationGain: 1.08,
    },
    audio: {
      genre: "orchestral_march",
      bpm: 120,
      percussionKind: "field_snare_and_timpani",
      duckingDepthDb: -4.5,
      reverbDecaySec: 1.8,
    },
  },

  comic_noir: {
    id: "comic_noir",
    displayName: "Living Comic-Book / Spider-Verse",
    description: "High-contrast comic book print, Ben-Day halftone screentones, stark hatching, animated on twos",
    cadence: { characterStep: 2, cameraStep: 1, microJitter: 0 },
    palette: {
      keyLightColor: "#ffffff",
      shadowColor: "#050508",
      rimColor: "#ffea2b",
      inkColor: "#000000",
      backgroundColor: "#111018",
      contrastGain: 1.6,
      saturationGain: 1.35,
    },
    audio: {
      genre: "urban_boom_bap",
      bpm: 92,
      percussionKind: "crunchy_vinyl_kick_snare",
      duckingDepthDb: -6.0,
      reverbDecaySec: 0.8,
    },
  },

  papercraft: {
    id: "papercraft",
    displayName: "Stop-Motion Papercraft Diorama",
    description: "Layered cardstock cutouts, deckled torn edges, cast drop shadows, animated on twos and threes",
    cadence: { characterStep: 2, cameraStep: 1, microJitter: 0.8 },
    palette: {
      keyLightColor: "#fff8ed",
      shadowColor: "#2c2a26",
      rimColor: "#ffffff",
      inkColor: "#3b362f",
      backgroundColor: "#c5beaf",
      contrastGain: 1.15,
      saturationGain: 0.9,
    },
    audio: {
      genre: "acoustic_foley_whimsical",
      bpm: 104,
      percussionKind: "cardboard_snaps_woodblocks",
      duckingDepthDb: -3.5,
      reverbDecaySec: 1.2,
    },
  },

  rubber_hose: {
    id: "rubber_hose",
    displayName: "1930s Vintage Cartoon (Cuphead)",
    description: "Curving noodle limbs, pie-cut eyes, 2-beat bounce, film gate weave and celluloid scratches",
    cadence: { characterStep: 1, cameraStep: 1, microJitter: 1.2 },
    palette: {
      keyLightColor: "#fcf6e8",
      shadowColor: "#1b1916",
      rimColor: "#f4ede1",
      inkColor: "#11100e",
      backgroundColor: "#22201b",
      contrastGain: 1.4,
      saturationGain: 0.45, // Desaturated / Technicolor sepia tone
    },
    audio: {
      genre: "ragtime_big_band",
      bpm: 132,
      percussionKind: "phonograph_woodblocks_cowbell",
      duckingDepthDb: -5.0,
      reverbDecaySec: 2.2,
    },
  },

  kurzgesagt: {
    id: "kurzgesagt",
    displayName: "Flat Geometric Infographic",
    description: "Minimalist vector geometry, rich saturated gradients, snappy spring overshoot, zero ink lines",
    cadence: { characterStep: 1, cameraStep: 1, microJitter: 0 },
    palette: {
      keyLightColor: "#ffffff",
      shadowColor: "#231145",
      rimColor: "#00f0ff",
      inkColor: "transparent",
      backgroundColor: "#0d0426",
      contrastGain: 1.25,
      saturationGain: 1.5,
    },
    audio: {
      genre: "ambient_electronic",
      bpm: 110,
      percussionKind: "sub_bass_and_crisp_ui_clicks",
      duckingDepthDb: -4.0,
      reverbDecaySec: 3.5,
    },
  },

  anime_sakuga: {
    id: "anime_sakuga",
    displayName: "2.5D Cel-Shaded Anime / Sakuga",
    description: "Sharp 3-tone cel shading, dynamic radial action speedlines, impact flash frames",
    cadence: { characterStep: 2, cameraStep: 1, microJitter: 0 },
    palette: {
      keyLightColor: "#fff4e0",
      shadowColor: "#332244",
      rimColor: "#66ccff",
      inkColor: "#18121f",
      backgroundColor: "#203055",
      contrastGain: 1.3,
      saturationGain: 1.25,
    },
    audio: {
      genre: "cinematic_taiko_action",
      bpm: 140,
      percussionKind: "taiko_cannon_distorted_metal",
      duckingDepthDb: -5.5,
      reverbDecaySec: 2.0,
    },
  },

  retro_90s: {
    id: "retro_90s",
    displayName: "Retro 90s Low-Poly (PS1 / Lo-Fi)",
    description: "Chunky low-poly facets, affine texture warping, vertex grid jitter, Bayer matrix dithering",
    cadence: { characterStep: 1, cameraStep: 1, microJitter: 0.5 },
    palette: {
      keyLightColor: "#f0f0ff",
      shadowColor: "#181828",
      rimColor: "#a0a0d0",
      inkColor: "transparent",
      backgroundColor: "#000000",
      contrastGain: 1.2,
      saturationGain: 0.85,
    },
    audio: {
      genre: "chiptune_16bit_synth",
      bpm: 124,
      percussionKind: "bitcrushed_808_noise_bursts",
      duckingDepthDb: -4.0,
      reverbDecaySec: 1.5,
    },
  },

  sumi_ink: {
    id: "sumi_ink",
    displayName: "Traditional Sumi-e Ink Wash",
    description: "Calligraphic brush outlines with procedural ink bleed, rice paper grain, atmospheric wash",
    cadence: { characterStep: 1, cameraStep: 1, microJitter: 0 },
    palette: {
      keyLightColor: "#faf6ed",
      shadowColor: "#2a2825",
      rimColor: "#e6e0d3",
      inkColor: "#151413",
      backgroundColor: "#ebe4d5",
      contrastGain: 1.1,
      saturationGain: 0.35,
    },
    audio: {
      genre: "traditional_zen_meditation",
      bpm: 68,
      percussionKind: "bamboo_water_drops_singing_bowl",
      duckingDepthDb: -3.0,
      reverbDecaySec: 4.2,
    },
  },
};

export function getStyle(id: StyleId): StyleDefinition {
  return STYLES[id] ?? STYLES.storybook;
}

export function listStyles(): StyleDefinition[] {
  return Object.values(STYLES);
}
