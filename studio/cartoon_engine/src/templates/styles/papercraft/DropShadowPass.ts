// Stop-Motion Papercraft Layer Drop-Shadow & Texture Pass.
// Casts realistic directional paper-edge contact shadows between 2.5D cutout layers,
// producing a tangible, tactile diorama feel.
import * as THREE from "three";
import { Pass } from "postprocessing";

export interface PapercraftOptions {
  shadowDistance?: number; // Pixels at 1080p (default: 12.0)
  shadowAngle?: number;    // Direction angle in radians (default: 45 deg)
  shadowOpacity?: number;  // Shadow intensity (default: 0.45)
  paperGrain?: number;     // Fine fibrous noise strength (default: 0.08)
}

export const PAPERCRAFT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uShadowDistance;
uniform float uShadowAngle;
uniform float uShadowOpacity;
uniform float uPaperGrain;

varying vec2 vUv;

// Fast pseudo-random hash for paper cardstock grain
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 screenPos = vUv / uTexelSize;

  // Directional shadow offset vector
  vec2 shadowOffset = vec2(cos(uShadowAngle), sin(uShadowAngle)) * uShadowDistance * uTexelSize;

  vec4 col = texture2D(tDiffuse, vUv);
  vec4 shadowSample = texture2D(tDiffuse, vUv - shadowOffset);

  // Cast shadow on regions where a foreground cutout exists offset from the current pixel
  float shadowMask = clamp(shadowSample.a - col.a, 0.0, 1.0);

  // Apply fibrous cardstock grain
  float grain = (hash(screenPos) - 0.5) * uPaperGrain;

  vec3 paperColor = col.rgb * (1.0 - shadowMask * uShadowOpacity) + grain;

  gl_FragColor = vec4(paperColor, col.a);
}
`;

export class DropShadowPass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(options: PapercraftOptions = {}) {
    super("DropShadowPass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: PAPERCRAFT_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 1080, 1 / 1920) },
        uShadowDistance: { value: options.shadowDistance ?? 12.0 },
        uShadowAngle: { value: options.shadowAngle ?? 0.785398 },
        uShadowOpacity: { value: options.shadowOpacity ?? 0.45 },
        uPaperGrain: { value: options.paperGrain ?? 0.08 },
      },
    });
  }

  setSize(width: number, height: number) {
    this.material.uniforms.uTexelSize.value.set(1 / width, 1 / height);
  }
}
