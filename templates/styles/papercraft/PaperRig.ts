// Stop-Motion Papercut Puppet Rig.
// Emulates physical cardstock cutouts joined by brass fasteners (rivets)
// with subtle organic jitter and scissor-cut contours.
import { Pen, Outfit } from "../../bridge/toon";
import { ArticulatedCharacterRig, RigPoseOptions } from "../../character/rig";

export class PaperRig {
  private baseRig = new ArticulatedCharacterRig();

  /**
   * Draws a character styled as a paper cutout puppet.
   */
  draw(p: Pen, outfit: Outfit, opts: RigPoseOptions, frame = 0, dt = 1 / 30): void {
    // 1. Organic micro-jitter for stop-motion hand-animated tactile imperfection
    const jitterAngle = (Math.sin(frame * 12.7) * 0.015);
    const jitterX = Math.cos(frame * 8.3) * 1.5;

    const paperOutfit: Outfit = {
      ...outfit,
      jacket: outfit.jacket,
      boots: outfit.boots,
    };

    const g = p.g;
    g.save();
    g.translate(jitterX, 0);
    g.rotate(jitterAngle);

    // 2. Base Articulated Rig
    this.baseRig.draw(p, paperOutfit, opts, dt);

    // 3. Draw Brass Paper Fasteners (Eyelets / Rivets) at the Joints
    this.drawBrassRivet(p, 300 - 30, 635); // Left hip
    this.drawBrassRivet(p, 300 + 30, 635); // Right hip
    this.drawBrassRivet(p, 300 - 45, 375); // Left shoulder
    this.drawBrassRivet(p, 300 + 45, 375); // Right shoulder

    g.restore();
  }

  /**
   * Renders a small metallic brass split-pin fastener.
   */
  private drawBrassRivet(p: Pen, x: number, y: number): void {
    p.ell(x, y, 5, 5, "#c99a38", 2); // Brass body
    p.dot(x, y, 2, "#4a3510");       // Center hole
    p.dot(x - 1, y - 1, 1.5, "#fff2b3"); // Specular glint
  }
}
