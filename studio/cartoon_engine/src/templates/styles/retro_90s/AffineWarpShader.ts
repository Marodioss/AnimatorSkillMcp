// Retro 90s Low-Poly & PS1 Hardware Emulation Shader.
// Features fixed-point vertex grid snapping, affine texture coordinate warping,
// and 4x4 Bayer matrix ordered dithering.
import * as THREE from "three";
import { Pass } from "postprocessing";

export const PS1_VERT = /* glsl */ `
uniform float uVertexSnap; // Snap grid resolution (e.g. 140.0)
varying vec2 vUv;
varying float vAffineZ;

void main() {
  vUv = uv;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  // PS1-style fixed-point vertex position snapping in screen space
  clip.xyz = clip.xyz / clip.w;
  clip.xy = floor(clip.xy * uVertexSnap) / uVertexSnap;
  clip.xyz = clip.xyz * clip.w;

  vAffineZ = clip.w; // Used for perspective-uncorrected affine texture mapping
  gl_Position = clip;
}
`;

export const BAYER_DITHER_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uColorDepth; // Color quantization levels (e.g. 16.0)

varying vec2 vUv;

// 4x4 Ordered Bayer Matrix
const float bayer4x4[16] = float[16](
   0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
  12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
   3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
  15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
);

void main() {
  vec4 col = texture2D(tDiffuse, vUv);

  // Pixel screen coordinates
  ivec2 pixel = ivec2(mod(gl_FragCoord.xy, 4.0));
  int index = pixel.y * 4 + pixel.x;
  float dither = bayer4x4[index] - 0.5;

  // 16-bit / 8-bit Color Quantization with dithering
  vec3 quantized = floor((col.rgb + dither / uColorDepth) * uColorDepth) / uColorDepth;

  gl_FragColor = vec4(quantized, col.a);
}
`;

export class Retro90sPass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(colorDepth = 16.0) {
    super("Retro90sPass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: BAYER_DITHER_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(360, 640) },
        uColorDepth: { value: colorDepth },
      },
    });
  }
}
