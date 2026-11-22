// Flat Geometric Vector Character Rig (Kurzgesagt Style).
// Constructed strictly from geometric primitives (circles, capsule pills, wedges)
// with zero ink outlines, high-contrast flat pastel colors, and spring-settle overshoot.
import { Pen, Outfit } from "../../bridge/toon";

export interface VectorPoseOptions {
  phase?: number;
  scale?: number;
  facing?: -1 | 1;
  beakKind?: "bird" | "human_nose";
  look?: number;
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
   */
  draw(p: Pen, outfit: Outfit, opts: VectorPoseOptions = {}): void {
    const {
      phase = 0,
      scale = 1.0,
      facing = 1,
      look = 0,
    } = opts;

    const two = Math.PI * 2;
    const g = p.g;
    const cx = 300;
    const soleY = 975;
    const bodyBob = Math.sin(two * phase * 2) * 12;
    const hipY = 660 + bodyBob;
    const headY = hipY - 210;

    // Saturated pastel vector palette (zero black ink outlines)
    const featherPrimary = outfit.jacket || "#3088e0"; // Vibrant cyan/blue
    const featherBelly = "#e6f4ff";                    // Soft white/cream
    const beakCol = "#ff9820";                         // Bright orange
    const eyeCol = "#181424";                          // Dark navy pupil

    // 1. Legs (Thin geometric capsule pill struts)
    const legW = 10 * scale;
    for (const side of [-1, 1]) {
      const lx = cx + side * 30 * scale;
      const footX = lx + Math.sin(two * phase + (side > 0 ? Math.PI : 0)) * 45 * scale;
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
    const ex = cx + 28 * scale * facing + look * 6 * scale;
    const ey = headY - 10 * scale;
    p.ell(ex, ey, 18 * scale, 18 * scale, "#ffffff", 0);
    p.ell(ex + 4 * scale * facing, ey, 8 * scale, 8 * scale, eyeCol, 0);

    // 5. Crisp Triangular Beak / Wedge Nose
    const bx = cx + 65 * scale * facing;
    const by = headY + 5 * scale;
    p.poly(
      [
        [bx, by - 12 * scale],
        [bx + 42 * scale * facing, by + 4 * scale],
        [bx, by + 18 * scale],
      ],
      beakCol,
      0
    );

    // 6. Wing (Stylized geometric leaf shape)
    const wx = cx - 20 * scale * facing;
    const wy = hipY - 95 * scale;
    p.poly(
      [
        [wx, wy],
        [wx + 50 * scale * facing, wy + 25 * scale],
        [wx + 20 * scale * facing, wy + 80 * scale],
        [wx - 30 * scale * facing, wy + 40 * scale],
      ],
      outfit.pants || "#1f6cb8",
      0
    );
  }
}
