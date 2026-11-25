// Fast Separable Depth-of-Field Blur Shader.
// Computes thin-lens defocus with Circle-of-Confusion (CoC) weighting in two separable passes
// (horizontal + vertical Gaussian/Poisson filter), achieving cinematic bokeh with minimal GPU overhead.
import * as THREE from "three";
import { Pass } from "postprocessing";

export interface FastLensOptions {
  focusDistance?: number; // Distance in meters where scene is in sharp focus
  aperture?: number;      // Virtual lens aperture (focal blur intensity)
  maxCoC?: number;        // Maximum blur radius in pixels at 1080p
}

export const FAST_LENS_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uDirection;
uniform vec2 uTexelSize;
uniform float uFocus;
uniform float uAperture;
uniform float uMaxCoC;
uniform float uCameraNear;
uniform float uCameraFar;

varying vec2 vUv;

float linearizeDepth(float d) {
  return (2.0 * uCameraNear) / (uCameraFar + uCameraNear - d * (uCameraFar - uCameraNear));
}

void main() {
  float rawD = texture2D(tDepth, vUv).r;
  float viewZ = linearizeDepth(rawD) * (uCameraFar - uCameraNear);

  // Circle of Confusion: CoC = |d - d_focus| / d * aperture
  float coc = clamp(abs(viewZ - uFocus) / max(viewZ, 0.1) * uAperture, 0.0, uMaxCoC);

  if (coc < 0.5) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }

  vec4 accum = vec4(0.0);
  float weightSum = 0.0;

  // 9-tap separable Gaussian blur along uDirection
  const float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  accum += texture2D(tDiffuse, vUv) * weights[0];
  weightSum += weights[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = uDirection * uTexelSize * float(i) * (coc / 4.0);
    accum += texture2D(tDiffuse, vUv + offset) * weights[i];
    accum += texture2D(tDiffuse, vUv - offset) * weights[i];
    weightSum += weights[i] * 2.0;
  }

  gl_FragColor = accum / weightSum;
}
`;

export class FastLensBlurPass extends Pass {
  readonly materialH: THREE.ShaderMaterial;
  readonly materialV: THREE.ShaderMaterial;

  constructor(options: FastLensOptions = {}) {
    super("FastLensBlurPass");

    const baseUniforms = {
      tDiffuse: { value: null },
      tDepth: { value: null },
      uDirection: { value: new THREE.Vector2(1, 0) },
      uTexelSize: { value: new THREE.Vector2(1 / 1080, 1 / 1920) },
      uFocus: { value: options.focusDistance ?? 6.0 },
      uAperture: { value: options.aperture ?? 12.0 },
      uMaxCoC: { value: options.maxCoC ?? 16.0 },
      uCameraNear: { value: 0.2 },
      uCameraFar: { value: 1500.0 },
    };

    this.materialH = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: FAST_LENS_FRAG,
      uniforms: THREE.UniformsUtils.clone(baseUniforms),
    });
    this.materialH.uniforms.uDirection.value.set(1, 0);

    this.materialV = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: FAST_LENS_FRAG,
      uniforms: THREE.UniformsUtils.clone(baseUniforms),
    });
    this.materialV.uniforms.uDirection.value.set(0, 1);
  }
}
