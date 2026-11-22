// Analytical 2-Bone Inverse Kinematics (IK) Solver for Remotion characters.
// Solves limb articulation (shoulder-elbow-hand and hip-knee-foot) with exact trigonometric constraint
// and zero iterative relaxation lag.
import { MathPool } from "../engine/math_pool";

export interface IKResult2D {
  jointX: number;
  jointY: number;
  endX: number;
  endY: number;
  angle1: number; // Root angle in radians
  angle2: number; // Mid-joint angle in radians relative to bone 1
  reached: boolean;
}

export interface JointLimits {
  minAngle: number; // minimum relative bend angle
  maxAngle: number; // maximum relative bend angle
}

export class InverseKinematics2D {
  /**
   * Solves 2D two-bone IK analytically using the Law of Cosines.
   *
   * @param x0 Root origin X (e.g., shoulder or hip)
   * @param y0 Root origin Y
   * @param xt Target goal X (e.g., desired hand or foot position)
   * @param yt Target goal Y
   * @param l1 Length of proximal segment (upper arm / thigh)
   * @param l2 Length of distal segment (forearm / shin)
   * @param bendDir Bend direction: +1 (e.g. knee forward / elbow down), -1 (opposite)
   * @param limits Optional angular bounds on the middle joint
   */
  static solve2Bone(
    x0: number,
    y0: number,
    xt: number,
    yt: number,
    l1: number,
    l2: number,
    bendDir: 1 | -1 = 1,
    limits?: JointLimits
  ): IKResult2D {
    const dx = xt - x0;
    const dy = yt - y0;
    const dSq = dx * dx + dy * dy;
    const d = Math.sqrt(dSq);

    const baseAngle = Math.atan2(dy, dx);

    // Target out of reach (stretched to max extension)
    if (d >= l1 + l2) {
      const jx = x0 + l1 * Math.cos(baseAngle);
      const jy = y0 + l1 * Math.sin(baseAngle);
      const ex = x0 + (l1 + l2) * Math.cos(baseAngle);
      const ey = y0 + (l1 + l2) * Math.sin(baseAngle);
      return {
        jointX: jx,
        jointY: jy,
        endX: ex,
        endY: ey,
        angle1: baseAngle,
        angle2: 0,
        reached: false,
      };
    }

    // Target too close (collapsed)
    if (d <= Math.abs(l1 - l2)) {
      const dir = l1 > l2 ? 1 : -1;
      const jx = x0 + l1 * Math.cos(baseAngle);
      const jy = y0 + l1 * Math.sin(baseAngle);
      const ex = jx + l2 * Math.cos(baseAngle + Math.PI);
      const ey = jy + l2 * Math.sin(baseAngle + Math.PI);
      return {
        jointX: jx,
        jointY: jy,
        endX: ex,
        endY: ey,
        angle1: baseAngle,
        angle2: Math.PI * dir,
        reached: false,
      };
    }

    // Law of Cosines for root angle alpha (between bone 1 and line to target)
    // l2^2 = l1^2 + d^2 - 2 * l1 * d * cos(alpha)
    const cosAlpha = MathPool.clamp((l1 * l1 + dSq - l2 * l2) / (2 * l1 * d), -1, 1);
    const alpha = Math.acos(cosAlpha);

    // Law of Cosines for interior joint angle beta (between bone 1 and bone 2)
    // d^2 = l1^2 + l2^2 - 2 * l1 * l2 * cos(beta)
    const cosBeta = MathPool.clamp((l1 * l1 + l2 * l2 - dSq) / (2 * l1 * l2), -1, 1);
    let beta = Math.PI - Math.acos(cosBeta);

    if (bendDir < 0) {
      beta = -beta;
    }

    if (limits) {
      beta = MathPool.clamp(beta, limits.minAngle, limits.maxAngle);
    }

    const bone1Angle = baseAngle + bendDir * alpha;
    const jointX = x0 + l1 * Math.cos(bone1Angle);
    const jointY = y0 + l1 * Math.sin(bone1Angle);

    const bone2Angle = bone1Angle + beta;
    const endX = jointX + l2 * Math.cos(bone2Angle);
    const endY = jointY + l2 * Math.sin(bone2Angle);

    return {
      jointX,
      jointY,
      endX,
      endY,
      angle1: bone1Angle,
      angle2: beta,
      reached: true,
    };
  }
}
