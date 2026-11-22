// Driven Harmonic Structural Resonance Engine.
// Simulates structural response (bridges, decks, cables, swings) to periodic rhythmic excitation
// (e.g. marching troops, pendulum pushes, wind vortex shedding).
import { MathPool } from "../engine/math_pool";

export interface StructuralProperties {
  mass: number;             // Total effective modal mass in kg
  stiffness: number;        // Structural spring stiffness in N/m
  dampingRatio: number;     // Damping ratio zeta (typical steel/iron: 0.015 - 0.05)
  failureDeflection: number;// Maximum deflection threshold before yield/collapse in meters
}

export class DrivenHarmonicOscillator {
  props: StructuralProperties;
  omega0: number; // Natural angular frequency in rad/s
  f0: number;     // Natural frequency in Hz

  deflection = 0; // Current vertical deflection in meters
  velocity = 0;   // Velocity in m/s
  failed = false; // Structural yield flag

  constructor(props: StructuralProperties) {
    this.props = props;
    this.omega0 = Math.sqrt(props.stiffness / props.mass);
    this.f0 = this.omega0 / (2 * Math.PI);
  }

  /**
   * Calculates steady-state dynamic amplification factor M(beta)
   * @param drivingFrequency Forcing frequency in Hz
   */
  magnification(drivingFrequency: number): number {
    const omega = 2 * Math.PI * drivingFrequency;
    const beta = omega / this.omega0; // Frequency ratio
    const zeta = this.props.dampingRatio;

    // M = 1 / sqrt((1 - beta^2)^2 + (2 * zeta * beta)^2)
    const denom = Math.sqrt((1 - beta * beta) ** 2 + (2 * zeta * beta) ** 2);
    return 1 / Math.max(1e-4, denom);
  }

  /**
   * Semi-implicit physical step integration for arbitrary forcing function F(t)
   *
   * @param dt Time step in seconds
   * @param drivingForce External forcing in Newtons (e.g. sum of soldier footstep impacts)
   */
  step(dt: number, drivingForce: number): number {
    if (this.failed) {
      return this.deflection;
    }

    const k = this.props.stiffness;
    const m = this.props.mass;
    const c = 2 * this.props.dampingRatio * Math.sqrt(k * m);

    // Equation of motion: m * x'' + c * x' + k * x = F(t)
    const accel = (drivingForce - c * this.velocity - k * this.deflection) / m;

    this.velocity += accel * dt;
    this.deflection += this.velocity * dt;

    if (Math.abs(this.deflection) >= this.props.failureDeflection) {
      this.failed = true;
    }

    return this.deflection;
  }
}
