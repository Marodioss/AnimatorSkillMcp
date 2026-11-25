// 1930s Rubber Hose Character Rig (Cuphead / Fleischer Style).
// Features continuous-curvature noodle limbs, pie-cut eyes, 3-dart cartoon gloves,
// and context-motivated animation (stationary legs when standing, zero unmotivated twitching).
import { Pen, Outfit } from "../../bridge/toon";

export interface HosePoseOptions {
  phase?: number;        // Bounce rhythm cycle [0, 1)
  mode?: "stand" | "bounce" | "walk";
  squash?: number;       // Rubbery stretch factor
  armAngleLeft?: number; // In radians
  armAngleRight?: number;
  pieLook?: number;      // -1 (left), 0 (center), 1 (right)
  gazeY?: number;        // Downward eye look offset
  breath?: number;       // Subtle breathing cycle
  weightShift?: number;  // Settled posture offset
  expr?: string;
}

export class HoseRig {
  /**
   * Draws a vintage rubber-hose character on canvas.
   * Legs ONLY cycle during locomotion or musical dance; in 'stand' mode, feet are firmly planted.
   */
  draw(p: Pen, outfit: Outfit, opts: HosePoseOptions = {}): void {
    const {
      phase = 0,
      mode = "stand",
      squash = 1.0,
      armAngleLeft = 0.5,
      armAngleRight = -0.5,
      pieLook = 0,
      gazeY = 0,
      breath = 0,
      weightShift = 0,
      expr = "smile",
    } = opts;

    const two = Math.PI * 2;
    // Rhythmic 2-beat bouncing: ONLY active during 'bounce' or 'walk'; standing uses subtle breathing
    const bounce = mode === "bounce" || mode === "walk"
      ? Math.abs(Math.sin(two * phase)) * 35
      : breath * 3.0;

    const cx = 300 + (mode === "stand" ? weightShift * 4 : 0);
    const hipY = 680 - bounce;
    const headY = hipY - 220;
    const soleY = 975;

    // 1. Noodle Legs (Smooth S-curves with zero rigid knees)
    // CRITICAL: When standing, legs are stationary with zero cycling!
    const legW = 18;
    const legCol = "#1a1816";

    for (const side of [-1, 1]) {
      const hx = cx + side * 35;
      const fx = cx + side * (mode === "stand" ? 42 : 55);
      // kx only oscillates during walk/bounce; when standing, legs are in a stable settled stance
      const kx = mode === "walk"
        ? (hx + fx) / 2 + side * 35 * Math.sin(two * phase)
        : (hx + fx) / 2 + side * 6;
      const ky = (hipY + soleY) / 2;

      // Draw noodle leg
      p.stroke([[hx, hipY], [kx, ky], [fx, soleY]], legW, legCol);

      // Oversized vintage cartoon shoes (rounded beans)
      p.ell(fx + side * 12, soleY - 10, 36, 22, "#2b1a10", 8);
    }

    // 2. Oval Torso with high contrast pants/trousers
    const torsoW = 85 * (1.0 / Math.sqrt(squash));
    const torsoH = 120 * squash;
    p.ell(cx, hipY - torsoH * 0.45, torsoW, torsoH, "#1a1816", 9);

    // Large cartoon buttons on trousers
    p.ell(cx - 20, hipY - 25, 12, 16, "#ffffff", 4);
    p.ell(cx + 20, hipY - 25, 12, 16, "#ffffff", 4);

    // 3. Noodle Arms with Cartoon Gloves
    for (const side of [-1, 1]) {
      const sx = cx + side * torsoW * 0.7;
      const sy = headY + 50;
      const angle = side === -1 ? armAngleLeft : armAngleRight;

      const ex = sx + Math.cos(angle) * 110 * side;
      const ey = sy + Math.sin(angle) * 110;
      const mx = (sx + ex) / 2 + side * 20;
      const my = (sy + ey) / 2 - 15;

      p.stroke([[sx, sy], [mx, my], [ex, ey]], legW, legCol);

      // White 3-dart cartoon glove
      p.ell(ex, ey, 24, 24, "#ffffff", 6);
      p.stroke([[ex - 6, ey - 6], [ex - 6, ey + 6]], 3, "#1a1816");
      p.stroke([[ex, ey - 7], [ex, ey + 7]], 3, "#1a1816");
      p.stroke([[ex + 6, ey - 6], [ex + 6, ey + 6]], 3, "#1a1816");
    }

    // 4. Large Circular Head
    p.ell(cx, headY, 115, 110, "#ffffff", 10);

    // 5. Authentic 1930s Pie-Cut Eyes
    const eyeSpacing = 32;
    for (const side of [-1, 1]) {
      const ex = cx + side * eyeSpacing + pieLook * 8;
      const ey = headY - 8 + gazeY * 14;
      this.drawPieCutEye(p, ex, ey, 22, 28, side * 0.5 + pieLook * 0.5);
    }

    // Contextual mouth expression
    if (expr === "shock") {
      // Big open cartoon 'O' mouth of shock
      p.ell(cx, headY + 35, 24, 32, "#11100e", 0);
      p.ell(cx, headY + 42, 14, 12, "#e86e78", 0); // tongue
    } else if (expr === "relief") {
      // Wide smile with closed happy eyes
      p.arc(cx, headY + 25, 42, 24, 20, 160, 8);
    } else {
      // Wide open rubbery smile
      p.arc(cx, headY + 30, 48, 30, 20, 160, 8);
      // Cheek dimples
      p.arc(cx - 45, headY + 30, 12, 12, 200, 340, 5);
      p.arc(cx + 45, headY + 30, 12, 12, 200, 340, 5);
    }
  }

  /**
   * Draws a classic 1930s pie-cut cartoon eye.
   */
  private drawPieCutEye(p: Pen, x: number, y: number, rx: number, ry: number, wedgeAngle = 0.5): void {
    const g = p.g;
    g.save();
    g.translate(x, y);

    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = "#11100e";
    g.fill();

    // Cut out missing pie wedge pointing toward upper-outer direction
    g.beginPath();
    g.moveTo(0, 0);
    const a0 = -Math.PI / 2 + wedgeAngle - 0.35;
    const a1 = -Math.PI / 2 + wedgeAngle + 0.35;
    g.lineTo(Math.cos(a0) * (rx + 5), Math.sin(a0) * (ry + 5));
    g.lineTo(Math.cos(a1) * (rx + 5), Math.sin(a1) * (ry + 5));
    g.closePath();
    g.fillStyle = "#ffffff";
    g.fill();

    g.restore();
  }
}
