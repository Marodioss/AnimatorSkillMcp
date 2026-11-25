// Enhanced Articulated Character Rig.
// Unites analytical 2-bone IK limbs, zero-skate gait footplants, volume-conserving squash,
// micro-saccadic eye tracking, viseme lip sync, and dynamic secondary inertia into one
// unified, production-grade 2D character drawing pipeline.
import { Pen, Outfit, INK, SKIN, shade, mul } from "../bridge/toon";
import { InverseKinematics2D } from "../physics/ik";
import { ZeroSkateGaitSolver } from "../physics/contacts";
import { SquashAndStretch } from "./squash";
import { EyeController } from "./eyes";
import { VisemeEngine, VisemeKind } from "./visemes";
import { SecondaryDynamics } from "./secondary";
import { MathPool } from "../engine/math_pool";

export interface RigPoseOptions {
  phase?: number;            // Gait cycle phase [0, 1)
  mode?: "march" | "stroll" | "stand" | "sit" | "fall";
  viseme?: VisemeKind;
  look?: number;             // Gaze target [-1, 1]
  blink?: number;            // Eyelid closure [0: open, 1: shut]
  squash?: number;           // Volume squash factor (1.0 = normal, 0.8 = impact)
  handLeftTarget?: [number, number];  // Explicit IK hand target [x, y]
  handRightTarget?: [number, number];
  velocityX?: number;
  accelY?: number;
  lightAngle?: number;       // Direction of key light in radians
  seed?: number;
}

export class ArticulatedCharacterRig {
  private eyes = new EyeController();
  private secondary = new SecondaryDynamics();

  /**
   * Evaluates and renders a fully articulated character on canvas with zero foot-skating
   * and anatomical 2-bone limbs.
   */
  draw(p: Pen, outfit: Outfit, opts: RigPoseOptions, dt = 1 / 30): void {
    const {
      phase = 0,
      mode = "stand",
      viseme = "rest",
      look = 0,
      blink = 0,
      squash = 1.0,
      velocityX = 0,
      accelY = 0,
      lightAngle = -2.1,
      seed = 1,
    } = opts;

    const u = 2.4; // 1% head unit scale for 600x1000 canvas
    const soleY = 975;
    const hipY = soleY - 340;
    const shoulderY = hipY - 260;
    const neckY = shoulderY - 50;
    const headCenterY = neckY - 110;

    // 1. Squash & Stretch Transform
    const sq = SquashAndStretch.evaluate(squash, soleY, 700);

    // 2. Secondary Dynamics
    const sec = this.secondary.update(dt, velocityX, accelY);

    // 3. Eye Micro-saccades
    const gaze = this.eyes.update(dt, look);

    // 4. Zero-Skate Gait Foot Placement
    const isWalking = mode === "march" || mode === "stroll";
    const stride = mode === "march" ? 180 : 120;
    const liftH = mode === "march" ? 75 : 40;

    const gait = ZeroSkateGaitSolver.solveBiped(
      phase,
      stride,
      liftH,
      soleY,
      300,
      0,
      1
    );

    const leftFootPos: [number, number] = isWalking
      ? [300 - 35 + gait.left.relZ * 0.5, gait.left.worldY]
      : [300 - 35, soleY];

    const rightFootPos: [number, number] = isWalking
      ? [300 + 35 + gait.right.relZ * 0.5, gait.right.worldY]
      : [300 + 35, soleY];

    const currentHipY = isWalking ? hipY + gait.pelvisBob : hipY;
    const hipX = isWalking ? 300 + gait.pelvisSway : 300;

    // 5. Analytical 2-Bone IK for Legs (thigh 170u, shin 170u)
    const thighL = 170;
    const shinL = 170;

    const leftLeg = InverseKinematics2D.solve2Bone(
      hipX - 30,
      currentHipY,
      leftFootPos[0],
      leftFootPos[1],
      thighL,
      shinL,
      1 // knee bends forward
    );

    const rightLeg = InverseKinematics2D.solve2Bone(
      hipX + 30,
      currentHipY,
      rightFootPos[0],
      rightFootPos[1],
      thighL,
      shinL,
      1
    );

    // Draw Legs
    const legCol = outfit.pants;
    const legWidth = 14;
    const bootCol = outfit.boots;

    // Left leg
    p.stroke([[hipX - 30, currentHipY], [leftLeg.jointX, leftLeg.jointY], [leftLeg.endX, leftLeg.endY]], legWidth, legCol);
    p.stroke([[leftLeg.endX - 10, leftLeg.endY], [leftLeg.endX + 22, leftLeg.endY]], 18, bootCol);

    // Right leg
    p.stroke([[hipX + 30, currentHipY], [rightLeg.jointX, rightLeg.jointY], [rightLeg.endX, rightLeg.endY]], legWidth, legCol);
    p.stroke([[rightLeg.endX - 10, rightLeg.endY], [rightLeg.endX + 22, rightLeg.endY]], 18, bootCol);

    // 6. Draw Torso
    const torsoW = 100 * sq.scaleX;
    const torsoH = (currentHipY - shoulderY) * sq.scaleY;
    p.poly(
      [
        [hipX - torsoW * 0.5, currentHipY],
        [hipX + torsoW * 0.5, currentHipY],
        [hipX + torsoW * 0.42, currentHipY - torsoH],
        [hipX - torsoW * 0.42, currentHipY - torsoH],
      ],
      outfit.jacket,
      8
    );

    // Belt & Buttons
    if (outfit.belt) {
      p.stroke([[hipX - torsoW * 0.48, currentHipY - 20], [hipX + torsoW * 0.48, currentHipY - 20]], 12, outfit.belt);
    }
    if (outfit.buttons) {
      for (let b = 1; b <= 3; b++) {
        p.dot(hipX, currentHipY - torsoH + b * (torsoH / 4), 6, outfit.buttons);
      }
    }

    // 7. Scabbard / Sword with Secondary Inertia
    if (outfit.sword) {
      const swordRot = 0.45 + sec.scabbardAngle;
      const s0: [number, number] = [hipX - torsoW * 0.4, currentHipY - 25];
      const s1: [number, number] = [
        s0[0] - Math.sin(swordRot) * 160,
        s0[1] + Math.cos(swordRot) * 160,
      ];
      p.stroke([s0, s1], 8, "#c9ccd2");
      p.dot(s0[0], s0[1], 8, "#e8c45a");
    }

    // 8. Analytical 2-Bone IK for Arms (upper arm 130u, forearm 130u)
    const armL1 = 130;
    const armL2 = 130;
    const shoulderLeft: [number, number] = [hipX - torsoW * 0.42, currentHipY - torsoH + 15];
    const shoulderRight: [number, number] = [hipX + torsoW * 0.42, currentHipY - torsoH + 15];

    // Default arm targets or march swing
    const armSwing = isWalking ? Math.sin(2 * Math.PI * phase) * 80 : 0;
    const leftHand: [number, number] = opts.handLeftTarget ?? [shoulderLeft[0] - 20, shoulderLeft[1] + 210 - armSwing];
    const rightHand: [number, number] = opts.handRightTarget ?? [shoulderRight[0] + 20, shoulderRight[1] + 210 + armSwing];

    const leftArm = InverseKinematics2D.solve2Bone(
      shoulderLeft[0],
      shoulderLeft[1],
      leftHand[0],
      leftHand[1],
      armL1,
      armL2,
      -1 // elbow bends outward/back
    );

    const rightArm = InverseKinematics2D.solve2Bone(
      shoulderRight[0],
      shoulderRight[1],
      rightHand[0],
      rightHand[1],
      armL1,
      armL2,
      1
    );

    // Draw Arms
    p.stroke([[shoulderLeft[0], shoulderLeft[1]], [leftArm.jointX, leftArm.jointY], [leftArm.endX, leftArm.endY]], 12, outfit.jacket);
    p.dot(leftArm.endX, leftArm.endY, 11, outfit.skin ?? SKIN);

    p.stroke([[shoulderRight[0], shoulderRight[1]], [rightArm.jointX, rightArm.jointY], [rightArm.endX, rightArm.endY]], 12, outfit.jacket);
    p.dot(rightArm.endX, rightArm.endY, 11, outfit.skin ?? SKIN);

    // 9. Head & Face
    const headY = headCenterY + sq.offsetY * 0.3;
    const headW = 118 * sq.scaleX;
    const headH = 110 * sq.scaleY;

    // Head base ellipse with plum ink
    p.ell(hipX, headY, headW, headH, outfit.skin ?? SKIN, 10);

    // Eyes with Micro-Saccade Gaze and Eyelid Blink
    const eyeSpacing = 32 * sq.scaleX;
    const eyeY = headY - 8;
    const lidClosure = MathPool.clamp(blink, 0, 1);

    for (const side of [-1, 1]) {
      const ex = hipX + side * eyeSpacing + gaze.lookX * 7;
      const ey = eyeY + gaze.lookY * 4;

      if (lidClosure >= 0.8) {
        // Closed blink slit
        p.stroke([[ex - 12, ey], [ex + 12, ey]], 6, INK);
      } else {
        // Open eye with dynamic pupil gaze
        p.ell(ex, ey, 9, 11, "#ffffff", 4);
        p.dot(ex + gaze.lookX * 3, ey + gaze.lookY * 2, 5, INK);

        if (lidClosure > 0.2) {
          // Half-lid drop
          p.stroke([[ex - 10, ey - 5 + lidClosure * 10], [ex + 10, ey - 5 + lidClosure * 10]], 5, INK);
        }
      }
    }

    // Viseme Lip Sync Mouth
    VisemeEngine.drawViseme(p, viseme, hipX, headY + 45, u, sq.scaleX);

    // 10. Hat & Headgear with Dynamic Secondary Inertia
    if (outfit.hat === "shako" || outfit.hat === "shako_tall") {
      const hatH = outfit.hat === "shako_tall" ? 170 : 130;
      const hatY = headY - headH + 15;
      const hatAngle = sec.hatAngle;

      // Draw angled shako
      const c = Math.cos(hatAngle);
      const s = Math.sin(hatAngle);

      const rotPt = (x: number, y: number): [number, number] => [
        hipX + (x - hipX) * c - (y - hatY) * s,
        hatY + (x - hipX) * s + (y - hatY) * c,
      ];

      const p0 = rotPt(hipX - 70, hatY);
      const p1 = rotPt(hipX + 70, hatY);
      const p2 = rotPt(hipX + 62, hatY - hatH);
      const p3 = rotPt(hipX - 62, hatY - hatH);

      p.poly([p0, p1, p2, p3], "#262b2f", 9);

      // Shako plate / badge
      const badgePt = rotPt(hipX, hatY - hatH * 0.45);
      p.dot(badgePt[0], badgePt[1], 14, "#e8c45a");

      // Plume with vertical spring bounce
      const plumeBase = rotPt(hipX, hatY - hatH);
      const plumeTop = rotPt(hipX, hatY - hatH - 45 - sec.plumeY);
      p.stroke([plumeBase, plumeTop], 10, "#c0353a");
    }
  }
}
