// Comic Noir & Spider-Verse Articulated Character Drawing Rig.
// Emphasizes angular ink silhouettes, stark black cross-hatching, and onomatopoeia graphic typography.
import { Pen, Outfit } from "../../bridge/toon";
import { ArticulatedCharacterRig, RigPoseOptions } from "../../character/rig";

export interface ComicPoseOptions extends RigPoseOptions {
  breath?: number;
  weightShift?: number;
  expr?: string;
  volumetric?: boolean;
  gazeY?: number;
}

export class ComicRig {
  private baseRig = new ArticulatedCharacterRig();

  /**
   * Draws a character styled as a graphic-novel comic illustration.
   */
  draw(p: Pen, outfit: Outfit, opts: ComicPoseOptions, dt = 1 / 30): void {
    // 1. High-contrast comic albedo palette override
    const comicOutfit: Outfit = {
      ...outfit,
      boots: "#000000",
      belt: "#ffffff",
    };

    // 2. Base Articulated Rig with sharp light angle
    this.baseRig.draw(p, comicOutfit, { ...opts, lightAngle: -1.2 }, dt);

    // 3. Ink Cross-Hatching Overlay on Shadow Side
    this.drawCrossHatching(p, 300, 500, 120, 180);
  }

  /**
   * Renders procedural pen-and-ink cross-hatching lines.
   */
  private drawCrossHatching(p: Pen, x: number, y: number, w: number, h: number): void {
    const spacing = 12;
    for (let i = -w; i < w + h; i += spacing) {
      const x0 = Math.max(x - w / 2, x - w / 2 + i);
      const y0 = y - h / 2;
      const x1 = Math.min(x + w / 2, x0 + h * 0.7);
      const y1 = y0 + (x1 - x0) * 1.2;

      if (x1 > x0) {
        p.stroke([[x0, y0], [x1, y1]], 2.5, "#000000");
      }
    }
  }

  /**
   * Renders pop-up comic typography ("POW!", "CRACK!", "SNAP!").
   */
  drawOnomatopoeia(p: Pen, text: string, x: number, y: number, scale = 1.0): void {
    const g = p.g;
    g.save();
    g.translate(x, y);
    g.rotate(-0.15); // Dynamic comic tilt

    // Starburst burst background
    const points = 14;
    const outerR = 90 * scale;
    const innerR = 55 * scale;
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = "#ffea2b"; // Vibrant comic yellow
    g.fill();
    g.lineWidth = 6 * scale;
    g.strokeStyle = "#000000";
    g.stroke();

    // Bold impactful text
    g.font = `900 ${Math.round(42 * scale)}px "Impact", "Arial Black", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#e22b2b"; // Red fill
    g.fillText(text, 2, 2);
    g.lineWidth = 4 * scale;
    g.strokeStyle = "#000000";
    g.strokeText(text, 2, 2);

    g.restore();
  }
}
