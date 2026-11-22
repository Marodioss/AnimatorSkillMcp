// 1930s Vintage Film Projector Shader.
// Replicates antique celluloid characteristics: film gate weave, vertical dust scratches,
// sepia / 2-strip Technicolor toning, and vignetting.
import * as THREE from "three";
import { Pass } from "postprocessing";

export interface VintageFilmOptions {
  gateWeave?: number;    // Vertical/horizontal jitter intensity in pixels (default: 1.5)
  scratchDensity?: number;// Frequency of vertical film hairs (default: 0.04)
  vignette?: number;     // Circular corner falloff (default: 0.8)
  sepiaTone?: number;    // Sepia blend factor [0: mono, 1: warm sepia] (default: 0.85)
}

export const VINTAGE_FILM_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uTime;
uniform float uGateWeave;
uniform float uScratchDensity;
uniform float uVignette;
uniform float uSepiaTone;

varying vec2 vUv;

// Pseudo-random noise
float hash1(float n) { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  // 1. Film Gate Weave (subtle rhythmic jitter)
  float weaveX = (hash1(floor(uTime * 18.0) * 1.3) - 0.5) * uGateWeave * uTexelSize.x;
  float weaveY = (hash1(floor(uTime * 18.0) * 2.7) - 0.5) * uGateWeave * uTexelSize.y;
  vec2 uv = vUv + vec2(weaveX, weaveY);

  vec4 col = texture2D(tDiffuse, uv);
  float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));

  // 2. Vertical Scratches / Dust
  float scratchCoord = uv.x / uTexelSize.x;
  float scratchHash = hash1(floor(scratchCoord * 0.25) + floor(uTime * 12.0) * 31.0);
  float isScratch = step(1.0 - uScratchDensity, scratchHash) * (1.0 - abs(fract(scratchCoord * 0.25) - 0.5) * 2.0);

  // 3. Vintage Sepia Tone Emulsion
  vec3 sepia = vec3(luma * 1.15, luma * 0.95, luma * 0.72);
  vec3 graded = mix(vec3(luma), sepia, uSepiaTone) + isScratch * 0.25;

  // 4. Optical Vignette Falloff
  vec2 center = uv - 0.5;
  float vig = 1.0 - dot(center, center) * uVignette * 2.0;
  graded *= clamp(vig, 0.0, 1.0);

  gl_FragColor = vec4(graded, col.a);
}
`;

export class FilmGatePass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(options: VintageFilmOptions = {}) {
    super("FilmGatePass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: VINTAGE_FILM_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 1080, 1 / 1920) },
        uTime: { value: 0 },
        uGateWeave: { value: options.gateWeave ?? 1.5 },
        uScratchDensity: { value: options.scratchDensity ?? 0.035 },
        uVignette: { value: options.vignette ?? 0.8 },
        uSepiaTone: { value: options.sepiaTone ?? 0.85 },
      },
    });
  }

  updateTime(timeSec: number) {
    this.material.uniforms.uTime.value = timeSec;
  }

  setSize(width: number, height: number) {
    this.material.uniforms.uTexelSize.value.set(1 / width, 1 / height);
  }
}
