// Custom postprocessing Effect implementations for the 3 distinct styles
// Compatible with @react-three/postprocessing and postprocessing v6
import * as THREE from "three";
import { Effect, BlendFunction } from "postprocessing";

// ============================================================================
// 1. COMIC NOIR: Ben-Day Halftone & CMYK Print Offset Effect
// ============================================================================
const HALFTONE_FRAG = /* glsl */ `
uniform vec2 uTexelSize;
uniform float uDotSize;
uniform float uDotAngle;
uniform float uCmykOffset;
uniform float uContrast;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec2 rotateGrid(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 screenPos = uv / uTexelSize;
  vec3 rgb = inputColor.rgb;

  float lum = clamp(luma(rgb) * uContrast, 0.0, 1.0);

  // Ben-Day dot grid: authentic comic book screen tone
  // Modulates cleanly in midtones and shadows without solid black void
  vec2 rotPos = rotateGrid(screenPos, uDotAngle);
  vec2 gridUV = fract(rotPos / uDotSize) - 0.5;
  float distFromDotCenter = length(gridUV);

  // Dot radius reaches maximum 0.46 in shadows, keeping paper gaps
  float dotRadius = clamp((1.0 - lum) * 0.46, 0.0, 0.46);
  float isDot = smoothstep(dotRadius, dotRadius - 0.06, distFromDotCenter);

  // Authentic Spider-Verse ink tone
  vec3 inkColor = vec3(0.04, 0.03, 0.07);
  vec3 comicColor = mix(rgb, inkColor, isDot * 0.55);

  outputColor = vec4(comicColor, inputColor.a);
}
`;

export class HalftoneEffect extends Effect {
  constructor(options: { dotSize?: number; dotAngle?: number; cmykOffset?: number; contrast?: number } = {}) {
    super("HalftoneEffect", HALFTONE_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uTexelSize", new THREE.Uniform(new THREE.Vector2(1 / 1080, 1 / 1920))],
        ["uDotSize", new THREE.Uniform(options.dotSize ?? 7.5)],
        ["uDotAngle", new THREE.Uniform(options.dotAngle ?? 0.785398)],
        ["uCmykOffset", new THREE.Uniform(options.cmykOffset ?? 1.8)],
        ["uContrast", new THREE.Uniform(options.contrast ?? 1.25)],
      ]),
    });
  }
}

// ============================================================================
// 2. RUBBER HOSE: 1930s Film Gate Weave, Celluloid Scratches & Sepia Effect
// ============================================================================
const FILM_GATE_FRAG = /* glsl */ `
uniform vec2 uTexelSize;
uniform float uTime;
uniform float uGateWeave;
uniform float uScratchDensity;
uniform float uVignette;
uniform float uSepiaTone;

float hash1(float n) { return fract(sin(n) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Gate weave: smooth organic bob
  vec2 wovenUV = uv + vec2(0.0, sin(uTime * 37.7) * 0.0005 * uGateWeave);

  float luma = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));

  // Celluloid vertical dust / hair scratches: subtle, vintage
  float scratchCoord = wovenUV.x / uTexelSize.x;
  float scratchHash = hash1(floor(scratchCoord * 0.25) + floor(uTime * 8.0) * 19.0);
  float isScratch = step(1.0 - uScratchDensity, scratchHash) * (1.0 - abs(fract(scratchCoord * 0.25) - 0.5) * 2.0);

  // 1930s Sepia Emulsion Tone
  vec3 sepia = vec3(luma * 1.15, luma * 0.95, luma * 0.72);
  vec3 graded = mix(vec3(luma), sepia, uSepiaTone) + isScratch * 0.06;

  // Vignette optical falloff
  vec2 center = wovenUV - 0.5;
  float vig = 1.0 - dot(center, center) * uVignette * 1.6;
  graded *= clamp(vig, 0.15, 1.0);

  outputColor = vec4(graded, inputColor.a);
}
`;

export class FilmGateEffect extends Effect {
  constructor(options: { gateWeave?: number; scratchDensity?: number; vignette?: number; sepiaTone?: number } = {}) {
    super("FilmGateEffect", FILM_GATE_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uTexelSize", new THREE.Uniform(new THREE.Vector2(1 / 1080, 1 / 1920))],
        ["uTime", new THREE.Uniform(0.0)],
        ["uGateWeave", new THREE.Uniform(options.gateWeave ?? 1.2)],
        ["uScratchDensity", new THREE.Uniform(options.scratchDensity ?? 0.025)],
        ["uVignette", new THREE.Uniform(options.vignette ?? 0.7)],
        ["uSepiaTone", new THREE.Uniform(options.sepiaTone ?? 0.85)],
      ]),
    });
  }

  setFrame(frame: number) {
    const uTime = this.uniforms.get("uTime");
    if (uTime) uTime.value = frame / 30.0;
  }
}

// ============================================================================
// 3. KURZGESAGT: Vector Gradient Ramp & Vibrant Saturated Atmosphere Effect
// ============================================================================
const VECTOR_GRADIENT_FRAG = /* glsl */ `
uniform vec3 uTopColor;
uniform vec3 uMiddleColor;
uniform vec3 uBottomColor;
uniform float uVibrancy;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Saturated vertical background gradient ramp
  vec3 bgGrad;
  if (uv.y > 0.5) {
    bgGrad = mix(uMiddleColor, uTopColor, (uv.y - 0.5) * 2.0);
  } else {
    bgGrad = mix(uBottomColor, uMiddleColor, uv.y * 2.0);
  }

  // Composite 3D elements
  vec3 col = inputColor.rgb;

  // Saturation vibrancy boost (Kurzgesagt signature flat pop)
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uVibrancy);

  // Prevent pitch-black crushed areas in flat vector style
  col = max(col, bgGrad * 0.20);

  outputColor = vec4(col, 1.0);
}
`;

export class VectorGradientEffect extends Effect {
  constructor(options: { topColor?: string; middleColor?: string; bottomColor?: string; vibrancy?: number } = {}) {
    super("VectorGradientEffect", VECTOR_GRADIENT_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uTopColor", new THREE.Uniform(new THREE.Color(options.topColor ?? "#12082b"))],
        ["uMiddleColor", new THREE.Uniform(new THREE.Color(options.middleColor ?? "#2a155c"))],
        ["uBottomColor", new THREE.Uniform(new THREE.Color(options.bottomColor ?? "#ffaa3b"))],
        ["uVibrancy", new THREE.Uniform(options.vibrancy ?? 1.35)],
      ]),
    });
  }
}
