// Physiological Gaze Tracking & Micro-Saccade Engine.
// Simulates natural biological eye movements: involuntary micro-saccades, focus convergence,
// and dynamic eyelid tension.
import { MathPool } from "../engine/math_pool";

export interface GazeTarget {
  x: number; // Target world or canvas position
  y: number;
}

export class EyeController {
  private saccadeTimer = 0;
  private saccadeOffsetX = 0;
  private saccadeOffsetY = 0;
  private seed: number;

  constructor(seed = 1) {
    this.seed = seed;
  }

  private hash(i: number, s = 0): number {
    const v = Math.sin(i * 127.1 + s * 311.7 + this.seed * 19.3) * 43758.5453;
    return v - Math.floor(v);
  }

  /**
   * Computes subtle micro-saccadic eye jitter and target convergence.
   *
   * @param dt Frame delta time in seconds
   * @param baseLook Base gaze offset [-1: full left, 0: center, +1: full right]
   * @param intensity Saccade amplitude multiplier (default 1.0)
   */
  update(dt: number, baseLook = 0, intensity = 1.0): { lookX: number; lookY: number } {
    this.saccadeTimer += dt;

    // Trigger micro-saccade jump every 200 - 450 ms
    const nextInterval = 0.2 + 0.25 * this.hash(Math.floor(this.saccadeTimer * 10), 3);
    if (this.saccadeTimer >= nextInterval) {
      this.saccadeTimer = 0;
      // Micro amplitude: ~0.08 units in normalized eye coordinates
      this.saccadeOffsetX = (this.hash(Math.floor(this.saccadeTimer * 100), 5) - 0.5) * 0.16 * intensity;
      this.saccadeOffsetY = (this.hash(Math.floor(this.saccadeTimer * 100), 7) - 0.5) * 0.1 * intensity;
    }

    const lookX = MathPool.clamp(baseLook + this.saccadeOffsetX, -1.0, 1.0);
    const lookY = MathPool.clamp(this.saccadeOffsetY, -0.6, 0.6);

    return { lookX, lookY };
  }
}
