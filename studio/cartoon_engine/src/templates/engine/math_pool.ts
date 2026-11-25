// High-performance static math register pool for Three.js.
// Completely eliminates heap allocation and garbage collection churn inside per-frame animation and physics loops.
import * as THREE from "three";

export class MathPool {
  // Scratch Vector3 registers
  static readonly V0 = new THREE.Vector3();
  static readonly V1 = new THREE.Vector3();
  static readonly V2 = new THREE.Vector3();
  static readonly V3 = new THREE.Vector3();
  static readonly V4 = new THREE.Vector3();
  static readonly V5 = new THREE.Vector3();
  static readonly V6 = new THREE.Vector3();
  static readonly V7 = new THREE.Vector3();
  static readonly V8 = new THREE.Vector3();
  static readonly V9 = new THREE.Vector3();
  static readonly V10 = new THREE.Vector3();
  static readonly V11 = new THREE.Vector3();
  static readonly V12 = new THREE.Vector3();
  static readonly V13 = new THREE.Vector3();
  static readonly V14 = new THREE.Vector3();
  static readonly V15 = new THREE.Vector3();

  // Scratch Matrix4 registers
  static readonly M0 = new THREE.Matrix4();
  static readonly M1 = new THREE.Matrix4();
  static readonly M2 = new THREE.Matrix4();
  static readonly M3 = new THREE.Matrix4();
  static readonly M4 = new THREE.Matrix4();
  static readonly M5 = new THREE.Matrix4();
  static readonly M6 = new THREE.Matrix4();
  static readonly M7 = new THREE.Matrix4();

  // Scratch Quaternion registers
  static readonly Q0 = new THREE.Quaternion();
  static readonly Q1 = new THREE.Quaternion();
  static readonly Q2 = new THREE.Quaternion();
  static readonly Q3 = new THREE.Quaternion();

  // Scratch Color registers
  static readonly C0 = new THREE.Color();
  static readonly C1 = new THREE.Color();
  static readonly C2 = new THREE.Color();
  static readonly C3 = new THREE.Color();

  // Vector2 registers for 2D canvas calculations
  static readonly V2_0 = new THREE.Vector2();
  static readonly V2_1 = new THREE.Vector2();
  static readonly V2_2 = new THREE.Vector2();
  static readonly V2_3 = new THREE.Vector2();

  /**
   * Fast clamp utility without branching overhead
   */
  static clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  /**
   * Linear interpolation
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Smooth cubic Hermite interpolation (smoothstep)
   */
  static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = MathPool.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /**
   * Smootherstep (Ken Perlin quintic polynomial)
   */
  static smootherstep(edge0: number, edge1: number, x: number): number {
    const t = MathPool.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
}
