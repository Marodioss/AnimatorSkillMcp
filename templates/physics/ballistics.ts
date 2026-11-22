// Newtonian Ballistics and Impact Dynamics for characters, props, and debris.
// Computes true gravitational acceleration, aerodynamic drag, impact restitution, and water deceleration.
import { MathPool } from "../engine/math_pool";

export interface BallisticState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;    // Tumbling angle in radians
  vRot: number;   // Angular velocity in rad/s
  settled: boolean;
}

export class BallisticsSolver {
  static readonly G = 9.80665; // Standard gravitational acceleration m/s^2
  static readonly AIR_DENSITY = 1.225; // kg/m^3

  /**
   * Evaluates closed-form ballistic trajectory under constant gravity with aerodynamic drag.
   *
   * @param t Time in seconds since release/launch
   * @param x0 Initial position [x, y, z]
   * @param v0 Initial velocity [vx, vy, vz]
   * @param mass Mass in kg (default: 75kg for adult, 1.2kg for rifle/hat)
   * @param dragCoeff Aerodynamic drag coefficient Cd * Area (default: ~0.4 m^2 for human tumble)
   */
  static trajectory(
    t: number,
    x0: [number, number, number],
    v0: [number, number, number],
    mass = 75,
    dragArea = 0.4
  ): { pos: [number, number, number]; vel: [number, number, number] } {
    if (t <= 0) {
      return { pos: [...x0], vel: [...v0] };
    }

    // Linear drag approximation parameter k = (0.5 * rho * Cd * A) / m
    const k = Math.max(1e-5, (0.5 * BallisticsSolver.AIR_DENSITY * dragArea) / mass);
    const expKt = Math.exp(-k * t);

    // Terminal vertical velocity: v_term = -g / k
    const vTerm = -BallisticsSolver.G / k;

    // Horizontal positions under drag: x(t) = x0 + (v0 / k) * (1 - e^(-kt))
    const x = x0[0] + (v0[0] / k) * (1 - expKt);
    const z = x0[2] + (v0[2] / k) * (1 - expKt);
    const vx = v0[0] * expKt;
    const vz = v0[2] * expKt;

    // Vertical position under gravity and drag:
    // y(t) = y0 + vTerm * t + ((v0y - vTerm) / k) * (1 - e^(-kt))
    const y = x0[1] + vTerm * t + ((v0[1] - vTerm) / k) * (1 - expKt);
    const vy = vTerm + (v0[1] - vTerm) * expKt;

    return {
      pos: [x, y, z],
      vel: [vx, vy, vz],
    };
  }

  /**
   * Simulates bounce and splash impacts when crossing a ground or water boundary.
   *
   * @param state Current kinematic state
   * @param surfaceY Surface plane elevation
   * @param isWater True if fluid medium (applies high hydrodynamic drag and splash)
   * @param restitution Coefficient of restitution (0 = completely inelastic, 0.4 = wood/dirt bounce)
   */
  static resolveCollision(
    state: BallisticState,
    surfaceY: number,
    isWater = false,
    restitution = 0.25
  ): void {
    if (state.y <= surfaceY) {
      state.y = surfaceY;

      if (isWater) {
        // High fluid viscous damping
        state.vy *= -0.05;
        state.vx *= 0.3;
        state.vz *= 0.3;
        state.vRot *= 0.1;
        state.settled = Math.abs(state.vy) < 0.05;
      } else {
        // Elastic / Inelastic rebound
        state.vy = -state.vy * restitution;
        state.vx *= 0.6; // Ground friction
        state.vz *= 0.6;
        state.vRot *= 0.5;

        if (Math.abs(state.vy) < 0.2 && Math.abs(state.vx) < 0.1 && Math.abs(state.vz) < 0.1) {
          state.vy = 0;
          state.vx = 0;
          state.vz = 0;
          state.vRot = 0;
          state.settled = true;
        }
      }
    }
  }
}
