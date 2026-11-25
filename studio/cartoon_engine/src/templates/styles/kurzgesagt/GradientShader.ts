// Flat Vector Gradient & Vibrant Atmosphere Shader (Kurzgesagt Style).
// Replaces realistic physical lighting with multi-stop saturated vector color ramps,
// high-energy bloom on stars/props, and zero black outline occlusion.
import * as THREE from "three";
import { Pass } from "postprocessing";

export interface GradientOptions {
  topColor?: string;     // Deep cosmos purple/blue
  middleColor?: string;  // Vibrant cyan / magenta
  bottomColor?: string;  // Warm neon ochre
  vibrancy?: number;     // Color saturation boost (default: 1.35)
}

export const VECTOR_GRADIENT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec3 uTopColor;
uniform vec3 uMiddleColor;
uniform vec3 uBottomColor;
uniform float uVibrancy;

varying vec2 vUv;

void main() {
  vec4 scene = texture2D(tDiffuse, vUv);

  // Vertical 3-stop background gradient ramp
  vec3 bgGrad;
  if (vUv.y > 0.5) {
    bgGrad = mix(uMiddleColor, uTopColor, (vUv.y - 0.5) * 2.0);
  } else {
    bgGrad = mix(uBottomColor, uMiddleColor, vUv.y * 2.0);
  }

  // Composite unlit/flat shaded vector characters over saturated gradient
  vec3 finalColor = mix(bgGrad, scene.rgb, scene.a);

  // Saturation boost
  float luma = dot(finalColor, vec3(0.2126, 0.7152, 0.0722));
  finalColor = mix(vec3(luma), finalColor, uVibrancy);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export class VectorGradientPass extends Pass {
  readonly material: THREE.ShaderMaterial;

  constructor(options: GradientOptions = {}) {
    super("VectorGradientPass");

    this.material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: VECTOR_GRADIENT_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uTopColor: { value: new THREE.Color(options.topColor ?? "#12082b") },
        uMiddleColor: { value: new THREE.Color(options.middleColor ?? "#2a155c") },
        uBottomColor: { value: new THREE.Color(options.bottomColor ?? "#ffaa3b") },
        uVibrancy: { value: options.vibrancy ?? 1.35 },
      },
    });
  }
}
