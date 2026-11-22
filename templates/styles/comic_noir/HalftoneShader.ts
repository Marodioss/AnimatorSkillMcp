// Ben-Day Halftone Dot Matrix and CMYK Print Misregistration Shader.
// Transforms 3D scene rendering into a Living Comic-Book / Spider-Verse aesthetic.
import * as THREE from "three";
import { Pass } from "postprocessing";

export interface HalftoneOptions {
  dotSize?: number;      // Grid cell size in pixels at 1080p (default: 8.0)
  dotAngle?: number;     // Grid rotation angle in radians (default: 45 degrees = 0.785)
  cmykOffset?: number;   // Color misregistration offset in pixels (default: 1.8)
  contrast?: number;     // Black threshold multiplier (default: 1.4)
}

export const HALFTONE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uDotSize;
uniform float uDotAngle;
uniform float uCmykOffset;
uniform float uContrast;

varying vec2 vUv;

// Luminance calculation
float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Rotated grid coordinate
vec2 rotateGrid(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
}

void main() {
  vec2 screenPos = vUv / uTexelSize; // Screen coordinate in pixels

  // 1. CMYK Print Misregistration (Chromatic offset)
  vec2 offC = vec2(-uCmykOffset, 0.0) * uTexelSize;
  vec2 offM = vec2(uCmykOffset, 0.0) * uTexelSize;
  vec2 offY = vec2(0.0, -uCmykOffset * 0.7) * uTexelSize;

  float r = texture2D(tDiffuse, vUv + offM).r;
  float g = texture2D(tDiffuse, vUv + offY).g;
  float b = texture2D(tDiffuse, vUv + offC).b;
  vec3 rgb = vec3(r, g, b);

  // 2. Halftone Dot Calculation
  vec2 rotPos = rotateGrid(screenPos, uDotAngle);
  vec2 gridUV = fract(rotPos / uDotSize) - 0.5;
  float distFromDotCenter = length(gridUV);

  float lum = clamp(luma(rgb) * uContrast, 0.0, 1.0);
  // In darker areas, dots grow larger (covering up to sqrt(1 - lum))
  float dotRadius = 0.707 * sqrt(1.0 - lum);

  float isDot = step(distFromDotCenter, dotRadius);

  // Blend comic ink black dots into scene
  vec3 comicColor = mix(rgb, vec3(0.02, 0.02, 0.04), isDot * 0.85);

  gl_FragColor = vec4(comicColor, 1.0);
}
`;

export class HalftonePass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(options: HalftoneOptions = {}) {
    super("HalftonePass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: HALFTONE_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 1080, 1 / 1920) },
        uDotSize: { value: options.dotSize ?? 8.0 },
        uDotAngle: { value: options.dotAngle ?? 0.785398 },
        uCmykOffset: { value: options.cmykOffset ?? 1.8 },
        uContrast: { value: options.contrast ?? 1.4 },
      },
    });
  }

  setSize(width: number, height: number) {
    this.material.uniforms.uTexelSize.value.set(1 / width, 1 / height);
  }
}
