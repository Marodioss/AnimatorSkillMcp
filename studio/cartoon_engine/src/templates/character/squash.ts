// Volume-Preserving Squash & Stretch Modifier.
// Enforces the core animation principle of volume conservation:
// When an object or character compresses vertically under impact, it expands horizontally.
import { MathPool } from "../engine/math_pool";

export interface SquashTransform {
  scaleX: number;
  scaleY: number;
  offsetY: number; // Vertical translation to maintain floor contact
}

export class SquashAndStretch {
  /**
   * Computes volume-preserving scale factors anchored to ground contact.
   *
   * @param factor Compression / elongation factor (1.0 = neutral, 0.8 = 20% impact squash, 1.25 = stretch)
   * @param groundY Ground anchor Y coordinate (soles stay pinned to ground)
   * @param height Uncompressed character height
   */
  static evaluate(factor: number, groundY = 975, height = 700): SquashTransform {
    // Clamp to prevent degenerate inversion
    const sy = MathPool.clamp(factor, 0.5, 1.8);

    // 2D Volume preservation: Sx * Sy = 1.0  => Sx = 1 / Sy
    const sx = 1.0 / Math.sqrt(sy);

    // Anchor compensation:
    // If scaled around center, sole would lift or penetrate floor.
    // We adjust offsetY so (groundY - height) * sy + offsetY matches ground contact.
    const deltaH = height * (1.0 - sy);
    const offsetY = deltaH;

    return {
      scaleX: sx,
      scaleY: sy,
      offsetY,
    };
  }

  /**
   * Generates impact squash impulse decaying via damped oscillation.
   *
   * @param t Time in seconds since impact
   * @param intensity Impact strength (e.g. 0.3 for hard stomp, 0.6 for bridge fall)
   * @param frequency Oscillation frequency in Hz (e.g. 8 Hz)
   * @param decay Damping rate (e.g. 14 / s)
   */
  static impactImpulse(t: number, intensity = 0.3, frequency = 8, decay = 14): number {
    if (t < 0) return 1.0;
    // Compress at t = 0, then bounce back with damped oscillation
    const envelope = Math.exp(-decay * t);
    const wave = Math.cos(2 * Math.PI * frequency * t);
    return 1.0 - intensity * envelope * wave;
  }
}
