// 10-Second Story Kinematics & Shot Planning for "The Buttered Toast Law"
// Total: 300 frames @ 30 fps (strictly 10.00 seconds)
// Adheres strictly to the 9 Gated Production Stops (Stop 1, Stop 3, Stop 4, Stop 5)
import wordsData from "./words.json";

export const TOTAL = 300;
export const FPS = 30;

export interface ShotDef {
  id: number;
  start: number;
  end: number;
  name: string;
}

export const SHOTS: ShotDef[] = [
  { id: 1, start: 0, end: 84, name: "The_Bump" },
  { id: 2, start: 85, end: 200, name: "The_Tumble_And_Impact" },
  { id: 3, start: 201, end: TOTAL, name: "The_Ten_Foot_Table" },
];

export const IMPACT_FRAME = 175; // Frame where toast strikes floor butter-side down

export function shotAt(f: number): ShotDef {
  for (const s of SHOTS) {
    if (f >= s.start && f <= s.end) return s;
  }
  return SHOTS[SHOTS.length - 1];
}

// ============================================================================
// CAMERA SMOOTHERSTEP & GRAMMAR (Stop 3)
// ============================================================================
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export interface CameraState {
  posX: number;
  posY: number;
  posZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  roll: number;
}

export function cameraAt(f: number): CameraState {
  const shot = shotAt(f);

  if (shot.id === 1) {
    // Shot 1 (f 0 - 84): Push-in on character elbow bump & sliding toast
    // Continuous push-in glide at 0.25% per frame
    const u = smootherstep(0, 84, f);
    const push = 1.0 - f * 0.0025;
    return {
      posX: 0.0,
      posY: 1.00,
      posZ: 2.45 * push,
      targetX: 0.05 + 0.05 * u,
      targetY: 0.88,
      targetZ: 0.0,
      roll: 0.0,
    };
  } else if (shot.id === 2) {
    // Shot 2 (f 85 - 200): Cinematic tracking shot of falling toast & shocked character in background
    // Frames 85 to 175 track the tumble downward
    const u = smootherstep(85, IMPACT_FRAME, Math.min(f, IMPACT_FRAME));
    
    // Impact kick shake: 7 frames decaying sign-flip (Stop 3)
    let kickY = 0;
    let roll = 0;
    if (f >= IMPACT_FRAME && f < IMPACT_FRAME + 8) {
      const kf = f - IMPACT_FRAME;
      const decay = [0, 0.028, -0.020, 0.014, -0.009, 0.005, -0.003, 0.001][kf] ?? 0;
      kickY = decay;
      roll = decay * 2.8; // ~4.5 degrees roll on impact
    }

    // Camera tracks from table height down toward floor
    // Continuous push-in glide during tumble and post-impact hold (Stop 3: 0.25%/f, zero static holds)
    const holdPush = f >= IMPACT_FRAME ? 1.0 - (f - IMPACT_FRAME) * 0.0035 : 1.0;
    const camX = 0.26 + 0.05 * u;
    const camY = 0.72 - 0.42 * u + kickY;
    const camZ = (1.68 - 0.15 * u) * holdPush;

    const targetX = 0.32 + 0.08 * u;
    const targetY = 0.68 - 0.50 * u;

    return {
      posX: camX,
      posY: camY,
      posZ: camZ,
      targetX: targetX,
      targetY: targetY,
      targetZ: 0.0,
      roll: roll,
    };
  } else {
    // Shot 3 (f 201 - 300): Majestic upward tilt from floor to reveal 10-foot table and upright toast
    const u = smootherstep(201, 300, f);
    return {
      posX: -0.05,
      posY: 1.20 + 2.05 * u,
      posZ: 4.40 - 0.60 * u,
      targetX: -0.10,
      targetY: 1.00 + 2.20 * u,
      targetZ: 0.0,
      roll: 0.0,
    };
  }
}

// ============================================================================
// NEWTONIAN TOAST KINEMATICS, EXACT EDGE PIVOTING & FREE-FALL (Stop 4)
// ============================================================================
export interface ToastPhysicsState {
  x: number;
  y: number;
  z: number;
  rotZ: number;       // Radians: 0 = butter up, -PI = butter down
  squashX: number;    // Volume conserving: squashX = 1 / sqrt(squashY)
  squashY: number;
  splatAlpha: number; // Butter mark on floor
}

export function toastAt(f: number): ToastPhysicsState {
  const tableH = 0.82;
  const lipX = 0.40;
  const a = 0.065; // half-width of bread slice (13cm width)
  const b = 0.010; // half-thickness of bread slice (2cm thickness)
  const thetaTip = 0.65; // lip release angle ~37.2 degrees

  if (f < 45) {
    // Resting flat on table top without penetration
    return {
      x: 0.18,
      y: tableH + b,
      z: 0.0,
      rotZ: 0.0,
      squashX: 1.0,
      squashY: 1.0,
      splatAlpha: 0.0,
    };
  } else if (f < 75) {
    // Phase 1: Slide across table top surface until reaching the exact edge lip (x = 0.40)
    const u = smootherstep(45, 74, f);
    const x = 0.18 + (lipX - 0.18) * u;
    return {
      x: x,
      y: tableH + b,
      z: 0.0,
      rotZ: 0.0,
      squashX: 1.0,
      squashY: 1.0,
      splatAlpha: 0.0,
    };
  } else if (f <= 90) {
    // Phase 2: Edge pivoting & tipping over the lip (lipX, tableH) via gravitational torque
    const u = (f - 75) / 15.0;
    const theta = thetaTip * (u * u); // Quadratic acceleration under gravitational torque
    const s = -a * u; // Contact point slips from center (0) to back corner (-a)
    // Contact point at bottom of slice (s, -b).
    // Exact forward kinematics: x = lipX - s*cos(theta) + b*sin(theta), y = tableH + s*sin(theta) + b*cos(theta)
    const x = lipX - s * Math.cos(theta) + b * Math.sin(theta);
    const y = tableH + s * Math.sin(theta) + b * Math.cos(theta);
    return {
      x: x,
      y: y,
      z: 0.0,
      rotZ: -theta,
      squashX: 1.0,
      squashY: 1.0,
      splatAlpha: 0.0,
    };
  } else if (f <= IMPACT_FRAME) {
    // Phase 3: Newtonian free fall with conserved angular momentum
    const w = (f - 90) / (IMPACT_FRAME - 90);
    const yRel = tableH - a * Math.sin(thetaTip) + b * Math.cos(thetaTip);
    const v0 = 0.42;
    const aDrop = yRel - 0.018 - v0;
    const y = Math.max(0.018, yRel - v0 * w - aDrop * (w * w));
    const xRel = lipX + a * Math.cos(thetaTip) + b * Math.sin(thetaTip);
    const x = xRel + (0.48 - xRel) * (1.0 - (1.0 - w) * (1.0 - w));
    const theta = thetaTip + (Math.PI - thetaTip) * w; // Rotates smoothly to 180 degrees at impact
    return {
      x: x,
      y: y,
      z: 0.0,
      rotZ: -theta,
      squashX: 1.0,
      squashY: 1.0,
      splatAlpha: 0.0,
    };
  } else if (f < 201) {
    // Impact on floor: Butter side down! (rotZ = -PI radians = 180.0 degrees)
    // Volume-preserving squash & stretch: Sy = 0.55, Sx = 1/sqrt(Sy)
    const kf = f - IMPACT_FRAME;
    let squashY = 1.0;
    if (kf < 15) {
      // Damped spring bounce
      const t = kf / 15.0;
      squashY = 1.0 - 0.45 * Math.exp(-4 * t) * Math.cos(Math.PI * 2 * t);
    }
    const squashX = 1.0 / Math.sqrt(Math.max(0.2, squashY));

    return {
      x: 0.48,
      y: 0.018,
      z: 0.0,
      rotZ: -Math.PI, // Inverted! (180 deg, butter down)
      squashX: squashX,
      squashY: squashY,
      splatAlpha: Math.min(1.0, kf * 0.20),
    };
  } else {
    // Shot 3: Toast resting upright on top of the 10-foot table surface!
    // Tower table top is at y = 3.20 + 0.04 = 3.24m. Toast center at 3.24 + b = 3.25m.
    return {
      x: 0.15,
      y: 3.25, // Resting firmly on top of 10-foot table surface!
      z: 0.0,
      rotZ: 0.0, // Upright! (0 deg, butter up)
      squashX: 1.0,
      squashY: 1.0,
      splatAlpha: 0.0,
    };
  }
}

// ============================================================================
// VISEME & CHARACTER ANIMATION ALIGNMENT (Stop 2 & Stop 5)
// ============================================================================
export type VisemeKind = "rest" | "mbp" | "fv" | "ai" | "e" | "o" | "u" | "wq";

export function visemeAt(f: number): VisemeKind {
  for (const w of wordsData) {
    if (f >= w.f_start && f <= w.f_end) {
      return (w.viseme as VisemeKind) ?? "ai";
    }
  }
  return "rest";
}

export function blinkAt(f: number): number {
  // Natural biological blinks every ~90 frames (3 seconds)
  const blinkCycles = [40, 130, 220, 275];
  for (const b of blinkCycles) {
    if (f >= b && f <= b + 4) {
      const bf = f - b;
      return [0.6, 1.0, 1.0, 0.4, 0.0][bf] ?? 0;
    }
  }
  return 0;
}

export function expressionAt(f: number): "neutral" | "shock" | "grin" {
  if (f < 42) return "neutral";
  if (f <= 200) return "shock";
  return "grin";
}
