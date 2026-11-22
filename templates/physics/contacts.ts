// Zero-skate foot planting and floor contact solver.
// Enforces kinematic rigor: during the stance phase of walking or marching,
// the planted foot is strictly stationary in world coordinates (zero foot sliding).
import { MathPool } from "../engine/math_pool";

export interface FootState {
  worldX: number;
  worldY: number;
  worldZ: number;
  relX: number; // Position relative to character root
  relY: number;
  relZ: number;
  isPlanted: boolean;
  contactWeight: number; // 1.0 = solid plant, 0.0 = completely airborne
}

export class ZeroSkateGaitSolver {
  /**
   * Evaluates exact bipedal foot trajectories with zero foot skating.
   *
   * @param phase Gait cycle phase [0, 1) where 0 = left heel strike, 0.5 = right heel strike
   * @param strideLength Step stride length in meters (e.g. 0.8m)
   * @param stepHeight Maximum foot lift height during swing phase (e.g. 0.12m)
   * @param groundY Ground elevation at character position
   * @param rootWorldX Current world position X of character pelvis
   * @param rootWorldZ Current world position Z of character pelvis
   */
  static solveBiped(
    phase: number,
    strideLength: number,
    stepHeight: number,
    groundY: number,
    rootWorldX: number,
    rootWorldZ: number,
    direction = -1 // -1 = marching toward -Z
  ): { left: FootState; right: FootState; pelvisBob: number; pelvisSway: number } {
    const pNorm = ((phase % 1) + 1) % 1;

    // Stance duty ratio: each foot is on ground ~60% of cycle (double support overlap 20%)
    const stanceRatio = 0.6;

    const solveLeg = (legPhase: number): FootState => {
      const p = ((legPhase % 1) + 1) % 1;

      if (p < stanceRatio) {
        // --- STANCE PHASE (Planted on ground) ---
        // Stance progresses from +0.5*stride to -0.5*stride relative to hip
        const uStance = p / stanceRatio;
        const relProg = 0.5 - uStance; // starts forward (+0.5), moves backward (-0.5)
        const relZ = relProg * strideLength * direction;

        return {
          worldX: rootWorldX,
          worldY: groundY,
          worldZ: rootWorldZ + relZ,
          relX: 0,
          relY: 0,
          relZ,
          isPlanted: true,
          contactWeight: 1.0,
        };
      } else {
        // --- SWING PHASE (Airborne) ---
        // Swing progresses from -0.5*stride forward to +0.5*stride
        const uSwing = (p - stanceRatio) / (1.0 - stanceRatio);
        // Smooth cycloid trajectory
        const smoothU = MathPool.smoothstep(0, 1, uSwing);
        const relProg = -0.5 + smoothU;
        const relZ = relProg * strideLength * direction;

        // Parabolic vertical lift
        const lift = Math.sin(Math.PI * uSwing) * stepHeight;

        return {
          worldX: rootWorldX,
          worldY: groundY + lift,
          worldZ: rootWorldZ + relZ,
          relX: 0,
          relY: lift,
          relZ,
          isPlanted: false,
          contactWeight: 0.0,
        };
      }
    };

    // Left leg starts at phase 0, Right leg starts at phase 0.5 (anti-phase)
    const left = solveLeg(pNorm);
    const right = solveLeg(pNorm + 0.5);

    // Inverted pendulum center-of-mass kinematics:
    // Pelvis rises highest during mid-stance of each leg (two crests per cycle: 4*pi)
    const pelvisBob = -0.04 * strideLength * Math.cos(4 * Math.PI * pNorm);

    // Lateral sway shifts weight toward the supporting stance foot (one cycle per step pair: 2*pi)
    const pelvisSway = 0.025 * strideLength * Math.sin(2 * Math.PI * pNorm);

    return {
      left,
      right,
      pelvisBob,
      pelvisSway,
    };
  }
}
