// Dynamic Secondary Motion & Inertia Engine for Character Accessories.
// Computes lagging follow-through, sway, and rebound for hats, plumes, scabbards, belts, and coats.
import { Spring1D, SpringConfig } from "../physics/springs";
import { MathPool } from "../engine/math_pool";

export interface SecondaryAttachment {
  name: string;
  angleSpring: Spring1D;
  displacementSpring: Spring1D;
}

export class SecondaryDynamics {
  private hatSway: Spring1D;
  private scabbardSway: Spring1D;
  private coatTailSway: Spring1D;
  private plumeBounce: Spring1D;

  constructor() {
    // Hat: stiffer spring with critical damping to prevent floating off head
    this.hatSway = new Spring1D(0, { stiffness: 28, damping: 0.75 });
    // Scabbard: pendulum-like hanging inertia
    this.scabbardSway = new Spring1D(0, { stiffness: 18, damping: 0.55 });
    // Coat tail: soft cloth flow
    this.coatTailSway = new Spring1D(0, { stiffness: 14, damping: 0.65 });
    // Plume/feather: high frequency spring
    this.plumeBounce = new Spring1D(0, { stiffness: 32, damping: 0.45 });
  }

  /**
   * Updates all secondary attachments based on character horizontal velocity and vertical jerk.
   *
   * @param dt Frame delta time in seconds
   * @param charVelocityX Horizontal velocity of character
   * @param charAccelY Vertical acceleration (stomp, jump, bounce)
   */
  update(
    dt: number,
    charVelocityX: number,
    charAccelY: number
  ): { hatAngle: number; scabbardAngle: number; coatAngle: number; plumeY: number } {
    // Horizontal inertial drag target (tilts backward when accelerating forward)
    const dragAngle = MathPool.clamp(-charVelocityX * 0.12, -0.4, 0.4);

    this.hatSway.target = dragAngle;
    this.scabbardSway.target = dragAngle * 1.5;
    this.coatTailSway.target = dragAngle * 1.8;

    // Vertical inertia target
    this.plumeBounce.target = MathPool.clamp(charAccelY * 0.05, -15, 25);

    return {
      hatAngle: this.hatSway.evaluateExact(dt),
      scabbardAngle: this.scabbardSway.evaluateExact(dt),
      coatAngle: this.coatTailSway.evaluateExact(dt),
      plumeY: this.plumeBounce.evaluateExact(dt),
    };
  }

  reset() {
    this.hatSway.reset(0);
    this.scabbardSway.reset(0);
    this.coatTailSway.reset(0);
    this.plumeBounce.reset(0);
  }
}
