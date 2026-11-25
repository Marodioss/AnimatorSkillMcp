// Dynamic Screen-Space Radial Action Speedlines Shader (Sakuga Style).
// Renders high-velocity manga focus lines radiating outward from screen center.
import * as THREE from "three";
import { Pass } from "postprocessing";

export interface SpeedlineOptions {
  center?: [number, number]; // Normalized screen center [0..1]
  density?: number;          // Number of radial streaks (default: 48)
  speed?: number;            // Animation flicker rate
  intensity?: number;        // Opacity of lines (default: 0.8)
}

export const SPEEDLINE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uCenter;
uniform float uTime;
uniform float uDensity;
uniform float uIntensity;

varying vec2 vUv;

// Hash noise
float hash1(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vec2 d = vUv - uCenter;
  float dist = length(d);
  float angle = atan(d.y, d.x);

  // Radial streak generation
  float streakId = floor((angle + 3.14159) / 6.28318 * uDensity);
  float streakRandom = hash1(streakId + floor(uTime * 24.0) * 17.0);

  // Falloff: speedlines only appear at screen periphery (dist > 0.35)
  float edgeMask = smoothstep(0.32, 0.75, dist);
  float isLine = step(0.65, streakRandom) * edgeMask * uIntensity;

  vec4 scene = texture2D(tDiffuse, vUv);
  // Composite white manga speedlines over scene
  vec3 outColor = mix(scene.rgb, vec3(1.0), isLine);

  gl_FragColor = vec4(outColor, scene.a);
}
`;

export class SpeedlinePass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(options: SpeedlineOptions = {}) {
    super("SpeedlinePass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: SPEEDLINE_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 },
        uDensity: { value: options.density ?? 54.0 },
        uIntensity: { value: options.intensity ?? 0.8 },
      },
    });
  }

  updateTime(t: number) {
    this.material.uniforms.uTime.value = t;
  }
}
