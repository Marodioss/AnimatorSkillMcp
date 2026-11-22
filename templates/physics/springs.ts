// Second-order spring-damper physical dynamics engine for secondary motion.
// Computes physics-accurate inertia, lag, and follow-through for props, hats, hair, cloth, and weapons.
import { MathPool } from "../engine/math_pool";

export interface SpringConfig {
  stiffness: number; // Natural frequency omega_n in rad/s (typical: 15-35)
  damping: number;   // Damping ratio zeta: <1.0 underdamped, 1.0 critical, >1.0 overdamped (typical: 0.5-0.85)
  mass?: number;     // Effective inertial mass (default 1.0)
}

export class Spring1D {
  position: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
  mass: number;

  constructor(initial = 0, config: SpringConfig = { stiffness: 22, damping: 0.7, mass: 1.0 }) {
    this.position = initial;
    this.velocity = 0;
    this.target = initial;
    this.stiffness = config.stiffness;
    this.damping = config.damping;
    this.mass = config.mass ?? 1.0;
  }

  reset(val = 0) {
    this.position = val;
    this.velocity = 0;
    this.target = val;
  }

  /**
   * Semi-implicit Euler integration step (stable and energy-conserving for animations)
   * @param dt Time delta in seconds (e.g. 1 / 30 for 30fps)
   */
  update(dt: number): number {
    const omega = this.stiffness;
    const zeta = this.damping;
    
    // Spring force: -k * (x - x_target)
    // Damping force: -c * v = -2 * zeta * omega * v
    const springForce = -omega * omega * (this.position - this.target);
    const dampingForce = -2 * zeta * omega * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.velocity += acceleration * dt;
    this.position += this.velocity * dt;

    return this.position;
  }

  /**
   * Analytical step evaluation (independent of frame rate, exact closed-form solution)
   */
  evaluateExact(dt: number): number {
    const omega = this.stiffness;
    const zeta = this.damping;
    const x0 = this.position - this.target;
    const v0 = this.velocity;

    if (zeta < 1.0) {
      // Underdamped (oscillatory decay)
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-zeta * omega * dt);
      const c1 = x0;
      const c2 = (v0 + zeta * omega * x0) / omegaD;

      const cos = Math.cos(omegaD * dt);
      const sin = Math.sin(omegaD * dt);

      this.position = this.target + decay * (c1 * cos + c2 * sin);
      this.velocity = decay * ((c2 * omegaD - c1 * zeta * omega) * cos - (c1 * omegaD + c2 * zeta * omega) * sin);
    } else if (Math.abs(zeta - 1.0) < 1e-4) {
      // Critically damped (fastest settle with zero overshoot)
      const decay = Math.exp(-omega * dt);
      const c1 = x0;
      const c2 = v0 + omega * x0;

      this.position = this.target + decay * (c1 + c2 * dt);
      this.velocity = decay * (c2 - omega * (c1 + c2 * dt));
    } else {
      // Overdamped
      const gamma = omega * Math.sqrt(zeta * zeta - 1);
      const s1 = -zeta * omega + gamma;
      const s2 = -zeta * omega - gamma;
      const c2 = (v0 - s1 * x0) / (s2 - s1);
      const c1 = x0 - c2;

      this.position = this.target + c1 * Math.exp(s1 * dt) + c2 * Math.exp(s2 * dt);
      this.velocity = c1 * s1 * Math.exp(s1 * dt) + c2 * s2 * Math.exp(s2 * dt);
    }

    return this.position;
  }
}

export class Spring2D {
  x: Spring1D;
  y: Spring1D;

  constructor(initX = 0, initY = 0, config: SpringConfig = { stiffness: 22, damping: 0.7 }) {
    this.x = new Spring1D(initX, config);
    this.y = new Spring1D(initY, config);
  }

  setTarget(tx: number, ty: number) {
    this.x.target = tx;
    this.y.target = ty;
  }

  update(dt: number): [number, number] {
    return [this.x.evaluateExact(dt), this.y.evaluateExact(dt)];
  }

  reset(rx = 0, ry = 0) {
    this.x.reset(rx);
    this.y.reset(ry);
  }
}
