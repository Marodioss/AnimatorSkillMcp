// Flat Geometric Vector Character Rig (Kurzgesagt Style).
// Constructed strictly from geometric primitives (circles, capsule pills, wedges)
// with zero ink outlines, high-contrast flat pastel colors, and context-motivated animation.
import { Pen, Outfit } from "../../bridge/toon";

export interface VectorPoseOptions {
  phase?: number;
  mode?: "stand" | "walk";
  scale?: number;
  facing?: -1 | 1;
  beakKind?: "bird" | "human_nose";
  look?: number;
  gazeY?: number;
  breath?: number;
  weightShift?: number;
  nudgeX?: number;
  expr?: string;
}

export class VectorRig {
  /**
   * Evaluates overshoot spring curve: x(t) = 1 - exp(-lambda * t) * cos(omega * t)
   */
  static overshootEasing(t: number, lambda = 6.0, omega = 12.0): number {
    return 1.0 - Math.exp(-lambda * t) * Math.cos(omega * t);
  }

  /**
   * Draws a minimalist vector geometric character on canvas.
   * Legs ONLY cycle during locomotion ('walk'); when standing, feet are strictly stationary.
   */
  draw(p: Pen, outfit: Outfit, opts: VectorPoseOptions = {}): void {
    const {
      phase = 0,
      mode = "stand",
      scale = 1.0,
      facing = 1,
      look = 0,
      gazeY = 0,
      breath = 0,
      weightShift = 0,
      nudgeX = 0,
      expr = "neutral",
    } = opts;

    const two = Math.PI * 2;
    const g = p.g;
    const cx = 300 + (mode === "walk" ? 0 : weightShift * 4);
    const soleY = 975;
    
    // Body bob: ONLY bob significantly when physically walking; when standing, only subtle breathing
    const bodyBob = mode === "walk" ? Math.sin(two * phase * 2) * 12 : breath * 2.5;
    const hipY = 660 + bodyBob;
    const headY = hipY - 210;

    // Saturated pastel vector palette (zero black ink outlines)
    const featherPrimary = outfit.jacket || "#3088e0"; // Vibrant cyan/blue
    const featherBelly = "#e6f4ff";                    // Soft white/cream
    const beakCol = "#ff9820";                         // Bright orange
    const eyeCol = "#181424";                          // Dark navy pupil

    // 1. Legs (Thin geometric capsule pill struts)
    // CRITICAL: When standing, feet are firmly planted with ZERO cycling!
    const legW = 10 * scale;
    for (const side of [-1, 1]) {
      const lx = cx + side * 28 * scale;
      // Foot position: ONLY oscillates if mode === "walk"! In stand mode, foot is completely stationary.
      const footX = mode === "walk"
        ? lx + Math.sin(two * phase + (side > 0 ? Math.PI : 0)) * 45 * scale
        : lx + side * 6 * scale;

      // Leg strut
      p.stroke([[lx, hipY], [footX, soleY]], legW, beakCol);
      // Wedge triangular foot
      p.poly(
        [
          [footX - 18 * scale * facing, soleY],
          [footX + 24 * scale * facing, soleY],
          [footX + 2 * scale * facing, soleY - 14 * scale],
        ],
        beakCol,
        0 // ZERO OUTLINE
      );
    }

    // 2. Oval Body (Plump geometric teardrop/egg)
    p.ell(cx, hipY - 90 * scale, 95 * scale, 120 * scale, featherPrimary, 0);
    // Belly patch (sub-ellipse)
    p.ell(cx + 20 * scale * facing, hipY - 80 * scale, 65 * scale, 85 * scale, featherBelly, 0);

    // 3. Perfect Circular Head
    p.ell(cx, headY, 82 * scale, 82 * scale, featherPrimary, 0);

    // 4. Characteristic Clean Eye (White circle + crisp dark dot)
    const ex = cx + 28 * scale * facing + look * 8 * scale;
    const ey = headY - 10 * scale + gazeY * 12 * scale;
    const eyeR = expr === "shock" ? 24 * scale : 18 * scale;
    p.ell(ex, ey, eyeR, eyeR, "#ffffff", 0);
    p.ell(ex + 4 * scale * facing, ey + gazeY * 4 * scale, 7 * scale, 7 * scale, eyeCol, 0);

    // 5. Crisp Triangular Beak / Wedge Nose
    const bx = cx + 65 * scale * facing;
    const by = headY + 5 * scale;
    if (expr === "shock") {
      // Open beak during shock
      p.poly(
        [
          [bx, by - 16 * scale],
          [bx + 46 * scale * facing, by - 2 * scale],
          [bx, by],
        ],
        beakCol,
        0
      );
      p.poly(
        [
          [bx, by + 4 * scale],
          [bx + 40 * scale * facing, by + 12 * scale],
          [bx, by + 22 * scale],
        ],
        beakCol,
        0
      );
    } else {
      p.poly(
        [
          [bx, by - 12 * scale],
          [bx + 42 * scale * facing, by + 4 * scale],
          [bx, by + 18 * scale],
        ],
        beakCol,
        0
      );
    }

    // 6. Wing (Stylized geometric leaf shape with contextual nudge)
    const wx = cx - 20 * scale * facing + nudgeX;
    const wy = hipY - 95 * scale;
    const wingRotation = expr === "shock" ? -0.4 : 0;
    
    g.save();
    g.translate(wx, wy);
    g.rotate(wingRotation);
    p.poly(
      [
        [0, 0],
        [50 * scale * facing, 25 * scale],
        [20 * scale * facing, 80 * scale],
        [-30 * scale * facing, 40 * scale],
      ],
      outfit.pants || "#1f6cb8",
      0
    );
    g.restore();
  }
}
