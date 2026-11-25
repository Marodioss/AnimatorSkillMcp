// Traditional Sumi-e Calligraphic Ink Bleed Shader.
// Simulates the natural capillary dispersion of black sumi ink bleeding into absorbent xuan rice paper.
import * as THREE from "three";
import { Pass } from "postprocessing";

export const SUMI_BLEED_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexelSize;
uniform float uBleedRadius;
uniform float uPaperGrain;

varying vec2 vUv;

// Pseudo-random noise
float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec4 center = texture2D(tDiffuse, vUv);

  // Capillary rice paper fiber displacement
  vec2 fiberOffset = (vec2(hash2(vUv * 340.0), hash2(vUv * 510.0)) - 0.5) * uBleedRadius * uTexelSize;

  vec4 displaced = texture2D(tDiffuse, vUv + fiberOffset);

  // Ink wash bleeding: soft feathered feathering at edge boundaries
  float inkAlpha = max(center.a, displaced.a * 0.75);
  vec3 paperTint = vec3(0.94, 0.92, 0.86); // Warm antique rice paper

  vec3 outColor = mix(paperTint, displaced.rgb, inkAlpha);

  gl_FragColor = vec4(outColor, 1.0);
}
`;

export class SumiBleedPass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(bleedRadius = 4.5) {
    super("SumiBleedPass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: SUMI_BLEED_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 1080, 1 / 1920) },
        uBleedRadius: { value: bleedRadius },
        uPaperGrain: { value: 0.06 },
      },
    });
  }
}
