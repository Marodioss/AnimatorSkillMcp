// 2.5D Anime & Sakuga 3-Tone Stepped Cel Shader.
// Quantizes continuous diffuse illumination into crisp anime color bands with rim lighting.
import * as THREE from "three";

export const CEL_RAMP_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const CEL_RAMP_FRAG = /* glsl */ `
uniform vec3 uKeyLightDir;
uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform vec3 uRimColor;
uniform float uRimThreshold;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uKeyLightDir);
  vec3 V = normalize(vViewPosition);

  // 1. 3-Tone Stepped Cel Quantization
  float NdotL = dot(N, L);
  vec3 diffuseCol;

  if (NdotL > 0.45) {
    diffuseCol = uBaseColor;             // Full lit highlight
  } else if (NdotL > 0.12) {
    diffuseCol = mix(uShadowColor, uBaseColor, 0.55); // Mid-tone
  } else {
    diffuseCol = uShadowColor;           // Deep shadow
  }

  // 2. Anime Rim Lighting (Fresnel)
  float rim = 1.0 - max(0.0, dot(N, V));
  float rimBand = step(uRimThreshold, rim) * max(0.0, NdotL + 0.3);

  vec3 finalColor = diffuseCol + uRimColor * rimBand * 0.75;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export class CelShadeMaterial extends THREE.ShaderMaterial {
  constructor(baseColor = "#ffd9b3", shadowColor = "#443054", rimColor = "#66ccff") {
    super({
      vertexShader: CEL_RAMP_VERT,
      fragmentShader: CEL_RAMP_FRAG,
      uniforms: {
        uKeyLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
        uBaseColor: { value: new THREE.Color(baseColor) },
        uShadowColor: { value: new THREE.Color(shadowColor) },
        uRimColor: { value: new THREE.Color(rimColor) },
        uRimThreshold: { value: 0.65 },
      },
    });
  }
}
