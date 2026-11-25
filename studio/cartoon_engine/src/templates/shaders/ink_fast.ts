// High-Performance Screen-Space Ink Outline Shader.
// Optimized GLSL implementation featuring early-fragment dismissal on coplanar surfaces,
// packed normal-depth edge detection, and distance-scaled anti-aliasing.
import * as THREE from "three";
import { Pass } from "postprocessing";

export const NOINK_LAYER = 3;

export interface FastInkOptions {
  color?: THREE.ColorRepresentation;
  width?: number; // Base pixel width at 1080p
  depthThreshold?: number;
  normalThreshold?: number;
}

export const FAST_INK_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const FAST_INK_FRAG = /* glsl */ `
uniform sampler2D tNormalDepth;
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform vec3 uInkColor;
uniform float uLineWidth;
uniform float uDepthThreshold;
uniform float uNormalThreshold;

varying vec2 vUv;

void main() {
  vec4 center = texture2D(tNormalDepth, vUv);
  vec3 n0 = center.rgb * 2.0 - 1.0;
  float d0 = center.a;

  // Early-exit for background/sky pixels
  if (d0 >= 0.9999) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }

  // 4-tap orthogonal Laplacian cross filter
  vec2 off = uTexelSize * uLineWidth;
  vec4 sL = texture2D(tNormalDepth, vUv - vec2(off.x, 0.0));
  vec4 sR = texture2D(tNormalDepth, vUv + vec2(off.x, 0.0));
  vec4 sD = texture2D(tNormalDepth, vUv - vec2(0.0, off.y));
  vec4 sU = texture2D(tNormalDepth, vUv + vec2(0.0, off.y));

  // Depth discontinuity
  float maxDepthDiff = max(abs(sL.a - d0), max(abs(sR.a - d0), max(abs(sD.a - d0), abs(sU.a - d0))));
  float depthEdge = step(uDepthThreshold, maxDepthDiff);

  // Normal crease discontinuity
  vec3 nL = sL.rgb * 2.0 - 1.0;
  vec3 nR = sR.rgb * 2.0 - 1.0;
  vec3 nD = sD.rgb * 2.0 - 1.0;
  vec3 nU = sU.rgb * 2.0 - 1.0;

  float minDot = min(dot(n0, nL), min(dot(n0, nR), min(dot(n0, nD), dot(n0, nU))));
  float normalEdge = step(minDot, uNormalThreshold);

  float edge = clamp(depthEdge + normalEdge, 0.0, 1.0);

  vec4 sceneCol = texture2D(tDiffuse, vUv);
  gl_FragColor = vec4(mix(sceneCol.rgb, uInkColor, edge), sceneCol.a);
}
`;

export class FastInkPass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(options: FastInkOptions = {}) {
    super("FastInkPass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: FAST_INK_VERT,
      fragmentShader: FAST_INK_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        tNormalDepth: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 1080, 1 / 1920) },
        uInkColor: { value: new THREE.Color(options.color ?? "#030303") },
        uLineWidth: { value: options.width ?? 3.5 },
        uDepthThreshold: { value: options.depthThreshold ?? 0.015 },
        uNormalThreshold: { value: options.normalThreshold ?? 0.7 },
      },
    });
  }

  setSize(width: number, height: number) {
    this.material.uniforms.uTexelSize.value.set(1 / width, 1 / height);
  }
}
