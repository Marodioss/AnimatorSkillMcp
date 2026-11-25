// Cast staging & Pool-cached sprite cards for "Burn It to Earn It" (Episode 1)
// Uses cardShade() lighting, NOINK layer separation, and multiply contact shadows.
import * as THREE from "three";
import { NOINK } from "../../templates/bridge/ink";
import { cardShade, blobMaterial, CARD_K } from "../../templates/bridge/cardshade";
import { Pen, fxContact, fxShadow } from "../../templates/bridge/toon";
import {
  CharacterExpr,
  CharacterId,
  CharacterPose,
  DrawCharOpts,
  Viseme,
  drawCharacter,
  fxComicSpark,
  fxDustMote,
  fxSteam,
} from "./toon";
import {
  FPS,
  HENDERSON_THREE,
  IMAD_BOOTH,
  IMAD_THREE,
  SARAH_BOOTH,
  SARAH_THREE,
  V3,
  isSpeaking,
  shotAt,
  smootherstep,
  visemeAt,
} from "./story";

// ---------------- Canvas Pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };

const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { cv, tex, w, h };
};

export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];

  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }

  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) {
      const l = want.get(r.key);
      if (l) l.push(r);
      else want.set(r.key, [r]);
    }
    for (const [key, e] of this.live) {
      if (!want.has(key)) {
        this.live.delete(key);
        this.free.push(e);
      }
    }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0];
        const i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, e.w, e.h);
        g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- Sprite Meshes ----------------
const blank = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  return new THREE.CanvasTexture(c);
})();

// 1000 design units = 1.75m standing height (head center ~1.18m, seated elbows ~0.78m above y=0 floor)
export const SU = 0.00175;
const BODY = (() => {
  const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU);
  g.translate(0, (975 - 500) * SU, 0);
  return g;
})();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh;
  mat: THREE.MeshLambertMaterial;
  dmat: THREE.MeshDepthMaterial;
  r: Req | null = null;

  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: blank,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => {
      const rt = r.getRenderTarget();
      CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920;
    };
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ";
    this.mesh.renderOrder = 2;
    this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }

  bind() {
    const t = this.r?.tex;
    if (t) {
      this.mat.map = t;
      this.dmat.map = t;
    }
  }
}

export class Fx {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  soft: THREE.MeshBasicMaterial;
  blob: THREE.MeshBasicMaterial;
  r: Req | null = null;

  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({
      map: blank,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false;
    this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }

  use(soft: boolean) {
    this.mesh.material = soft ? this.soft : this.mat;
  }

  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) {
        t.generateMipmaps = false;
        t.minFilter = THREE.LinearFilter;
        t.needsUpdate = true;
      }
      this.blob.map = t;
      this.mesh.material = this.blob;
      this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t;
      this.soft.map = t;
      this.mesh.renderOrder = 3;
    }
  }
}

export type Place = {
  key: string;
  draw: (p: Pen) => void;
  x: number;
  y: number;
  z: number;
  scale?: number;
  size: [number, number, number];
};

export type FxPlace = {
  key: string;
  cw: number;
  ch: number;
  draw: (p: Pen) => void;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  flat?: boolean;
  rot?: number;
  soft?: boolean;
};

export type Stage = { places: Place[]; fx: FxPlace[]; imadHoldingMug: boolean };

// ---------------- Deterministic Helpers ----------------

const q = (v: number, n = 60) => Math.round(v * n) / n;
const hh = (i: number, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, seed: number): number => {
  let s = Math.round(-40 * hh(seed, 9));
  for (let n = 0; s <= f && n < 200; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(45 + 65 * hh(seed * 29 + n, 11)); // natural blink every 1.5 - 3.6s
  }
  return 0;
};

const tier = (d: number): [number, number, number] =>
  d < 1.8 ? [1500, 2500, 2.5] : d < 3.0 ? [1050, 1750, 1.75] : [750, 1250, 1.25];

function makeActorPlace(
  camPos: THREE.Vector3,
  id: CharacterId,
  pos: V3,
  opts: Omit<DrawCharOpts, "id">,
  scale = 1.0
): Place {
  const d = camPos.distanceTo(new THREE.Vector3(pos[0], pos[1] + 1.0, pos[2]));
  const [w, h, k] = tier(d);
  const cleanOpts: DrawCharOpts = {
    id,
    ...opts,
    look: q(opts.look ?? 0, 20),
    headTilt: q(opts.headTilt ?? 0, 10),
    gesturePhase: q(opts.gesturePhase ?? 0, 24),
    light: q(opts.light ?? -2.09, 8),
  };
  return {
    key: `${id}|${JSON.stringify(cleanOpts)}`,
    draw: (p) => drawCharacter(p, cleanOpts),
    x: pos[0],
    y: pos[1],
    z: pos[2],
    scale,
    size: [w, h, k],
  };
}

function addContactShadow(out: Stage, x: number, y: number, z: number, sc = 1.0) {
  out.fx.push({
    key: `blob|contact|#3b263d`,
    cw: 128,
    ch: 128,
    draw: (p) => fxContact(p, "#3b263d"),
    x,
    y: y + 0.015,
    z,
    w: 0.48 * sc,
    h: 0.36 * sc,
    flat: true,
    rot: 0,
  });
  out.fx.push({
    key: `blob|shadow|#6a4c5e`,
    cw: 128,
    ch: 256,
    draw: (p) => fxShadow(p, "#6a4c5e"),
    x: x - 0.16 * sc,
    y: y + 0.012,
    z: z + 0.08 * sc,
    w: 0.54 * sc,
    h: 0.9 * sc,
    flat: true,
    rot: 1.0,
  });
}

// ---------------- Per-Shot Staging ----------------

export function stageAt(f: number, camPos: THREE.Vector3): Stage {
  const out: Stage = { places: [], fx: [], imadHoldingMug: false };
  const s = shotAt(f);
  if (s.insert) return out;

  const t = f / FPS;
  const breathImad = Math.sin(t * 2.1) * 0.8;
  const breathSarah = Math.sin(t * 2.1 + 1.4) * 0.6;
  const breathHend = Math.sin(t * 2.4 + 2.3) * 0.8;

  // Lip sync states (strictly ONLY when lip_sync=true in words.json!)
  const spImad = isSpeaking(f, "imad");
  const visImad = (spImad ? visemeAt(f, "imad") : "rest") as Viseme;

  const spSarah = isSpeaking(f, "sarah");
  const visSarah = (spSarah ? visemeAt(f, "sarah") : "rest") as Viseme;

  const spHend = isSpeaking(f, "henderson");
  const visHend = (spHend ? visemeAt(f, "henderson") : "rest") as Viseme;

  const blinkI = lidAt(f, 1);
  const blinkS = lidAt(f, 2);
  const blinkH = lidAt(f, 3);

  // Ambient Steam Wisps over Imad's Mug (tracks held mug or table mug without covering smile!)
  const steamPhase = (t * 0.45) % 1;
  const heldMug = s.id === 1 || s.id === 2 || s.id === 6 || s.id === 11 || s.id === 12 || s.id === 20;
  const steamX = heldMug ? 0.34 : 0.24;
  const steamY = heldMug ? 0.90 : 0.96;
  const steamZ = heldMug ? -0.32 : 0.06;
  if (s.id !== 18 && s.id !== 19) {
    out.fx.push({
      key: `steam|${q(steamPhase, 24)}`,
      cw: 200,
      ch: 300,
      draw: (p) => fxSteam(p, q(steamPhase, 24)),
      x: steamX,
      y: steamY,
      z: steamZ,
      w: 0.16,
      h: 0.24,
      soft: true,
    });
  }

  // Floating golden dust motes high in sunlit café beam (kept well clear of faces!)
  if (s.light === "warm") {
    for (let i = 0; i < 6; i++) {
      const dx = 0.85 - ((t * 0.07 + i * 0.24) % 1.35);
      const dy = 1.52 + Math.sin(t * 0.85 + i * 1.7) * 0.18 + ((i % 3) - 1) * 0.14;
      const dz = -0.85 + (i % 3) * 0.28;
      const a = 0.28 + 0.22 * Math.sin(t * 2.0 + i * 1.3);
      out.fx.push({
        key: `mote|${q(a, 10)}`,
        cw: 64,
        ch: 64,
        draw: (p) => fxDustMote(p, q(a, 10)),
        x: dx,
        y: dy,
        z: dz,
        w: 0.022,
        h: 0.022,
        soft: true,
      });
    }
  }

  // Decide cast positions, expressions, and poses per shot
  let imadPos: V3 = IMAD_BOOTH;
  let sarahPos: V3 = SARAH_BOOTH;
  let hendPos: V3 | null = null;

  let imadExpr: CharacterExpr = "calm_grin";
  let imadPose: CharacterPose = "sit_mug";
  let imadLook = -0.35;
  let imadFacing: -1 | 0 | 1 = -1;

  let sarahExpr: CharacterExpr = "skeptical";
  let sarahPose: CharacterPose = "sit_tablet";
  let sarahLook = 0.45;
  let sarahFacing: -1 | 0 | 1 = 1;

  let hendExpr: CharacterExpr = "nervous";
  let hendPose: CharacterPose = "walk_mop";
  let hendLook = -0.3;
  let hendFacing: -1 | 0 | 1 = -1;

  switch (s.id) {
    case 1:
      imadExpr = "calm_grin";
      imadPose = "sit_mug";
      sarahExpr = "skeptical";
      sarahPose = "sit_tablet";
      break;
    case 2:
      imadExpr = "calm_grin";
      imadPose = "sit_mug";
      imadLook = 0.1;
      imadFacing = 0;
      break;
    case 3:
      sarahExpr = "skeptical";
      sarahPose = "sit_tablet";
      sarahLook = 0.4;
      break;
    case 6:
      imadExpr = "calm_grin";
      imadPose = "sit_mug";
      imadLook = 0.0;
      break;
    case 7:
      // Extreme comedic deadpan stare ("if I leave even one dollar behind? I get zero.")
      imadExpr = "deadpan";
      imadPose = "sit_relaxed";
      imadLook = 0.0;
      imadFacing = 0;
      break;
    case 8:
      sarahExpr = "stern";
      sarahPose = "sit_warn";
      sarahLook = 0.3;
      break;
    case 10:
      sarahExpr = "shock";
      sarahPose = "sit_warn";
      sarahLook = 0.2;
      break;
    case 11:
      imadExpr = "smug_wink";
      imadPose = "sit_mug";
      imadLook = -0.1;
      break;
    case 12:
      imadExpr = "calm_grin";
      imadPose = "sit_mug";
      sarahExpr = "stern";
      sarahPose = "sit_tablet";
      break;
    case 13:
      imadExpr = "happy_talk";
      imadPose = "sit_wave";
      imadLook = -0.3;
      break;
    case 14:
      imadExpr = "happy_talk";
      imadPose = "sit_wave";
      // Keep Sarah tight-lipped stern/exasperated while Imad speaks (never mirror an open-O speaking mouth!)
      sarahExpr = "stern";
      sarahPose = "sit_tablet";
      break;
    case 15:
      sarahExpr = "facepalm";
      sarahPose = "sit_facepalm";
      break;
    case 16:
      imadExpr = "calm_grin";
      imadPose = "sit_wave";
      break;
    case 17:
      imadExpr = "calm_grin";
      imadPose = "sit_wave";
      // Clean comic golden star sparkles around Imad ("We pay everyone today!")
      if (f >= 1226 && f < 1262) {
        const bu = (f - 1226) / 36;
        out.fx.push({
          key: `spark_pay|${q(bu, 20)}`,
          cw: 500,
          ch: 500,
          draw: (p) => fxComicSpark(p, q(bu, 20), "#ffe169", 8, 130, 215),
          x: IMAD_BOOTH[0],
          y: 1.15,
          z: IMAD_BOOTH[2] - 0.12,
          w: 0.88,
          h: 0.88,
        });
      }
      break;
    case 18: {
      // Henderson entering café door at back-left (clear of booth!)
      const u = smootherstep(s.a, s.b, f);
      hendPos = [-1.68 + u * 0.23, 0.0, -1.96 + u * 0.44];
      hendExpr = "nervous";
      hendPose = "walk_mop";
      hendFacing = 1;
      hendLook = 0.4;
      break;
    }
    case 19: {
      // Tracking Henderson shuffling nervously down unobstructed left café aisle
      const u = smootherstep(s.a, s.b, f);
      hendPos = [-1.45 + u * 0.18, 0.0, -1.52 + u * 0.45];
      hendExpr = "nervous";
      hendPose = "walk_mop";
      hendFacing = 1;
      hendLook = 0.25;
      break;
    }
    case 20:
      imadExpr = "calm_grin";
      imadPose = "sit_mug";
      imadLook = 0.1;
      break;
    case 21:
      imadPos = IMAD_THREE;
      sarahPos = SARAH_THREE;
      hendPos = HENDERSON_THREE;
      hendExpr = "relief_tears";
      hendPose = "sit_clutch";
      hendLook = -0.35;
      hendFacing = -1;
      break;
    case 23:
      imadPos = IMAD_THREE;
      sarahPos = SARAH_THREE;
      hendPos = HENDERSON_THREE;
      imadExpr = "calm_grin";
      imadPose = "sit_relaxed";
      sarahExpr = "skeptical";
      sarahPose = "sit_tablet";
      hendExpr = "relief_tears";
      hendPose = "sit_clutch";
      break;
    case 24:
      imadPos = IMAD_THREE;
      sarahPos = SARAH_THREE;
      hendPos = HENDERSON_THREE;
      hendExpr = "proud_beam";
      hendPose = "sit_key";
      hendLook = -0.30;
      hendFacing = -1;
      break;
    case 26:
      imadPos = IMAD_THREE;
      sarahPos = SARAH_THREE;
      hendPos = HENDERSON_THREE;
      imadExpr = "shock";
      imadPose = "sit_shock";
      imadLook = 0.2;
      sarahExpr = "shock";
      sarahPose = "sit_shock";
      hendExpr = "proud_beam";
      hendPose = "sit_key";
      break;
    case 27:
      imadPos = IMAD_THREE;
      sarahPos = SARAH_THREE;
      hendPos = HENDERSON_THREE;
      // Lip-sync "dollars?!" cleanly in shock, then snap wide into panic_no scream right at "Nooo!" (f>=2015)
      imadExpr = f >= 2015 ? "panic_no" : "shock";
      imadPose = "sit_shock";
      imadLook = 0.0;
      imadFacing = 0;
      // Crimson-pink panic comic sparks around Imad when screaming "Nooo!"
      if (f >= 2014) {
        const bu = ((f - 2014) % 16) / 16;
        out.fx.push({
          key: `spark_panic|${q(bu, 16)}`,
          cw: 500,
          ch: 500,
          draw: (p) => fxComicSpark(p, q(bu, 16), "#ff4d88", 10, 145, 225),
          x: IMAD_THREE[0],
          y: 1.16,
          z: IMAD_THREE[2] - 0.12,
          w: 0.92,
          h: 0.92,
        });
      }
      break;
  }

  // Push visible actors + grounded contact shadows (height scaled per Bible: Sarah 162cm, Henderson 170cm, Imad 178cm)
  const gPhase = (t * 0.85) % 1;

  // Determine which characters belong in this shot (never waste GPU rendering hidden off-axis sprites!)
  const showBoothPair = s.id <= 17 || s.id === 20;
  const showThree = s.id === 21 || s.id === 23 || s.id === 24 || s.id === 26 || s.id === 27;
  out.imadHoldingMug = (showBoothPair || showThree) && imadPose === "sit_mug";

  if (showBoothPair || showThree) {
    out.places.push(
      makeActorPlace(
        camPos,
        "imad",
        imadPos,
        {
          expr: imadExpr,
          pose: imadPose,
          viseme: visImad,
          speaking: spImad,
          look: imadLook,
          blink: blinkI,
          facing: imadFacing,
          headTilt: breathImad,
          gesturePhase: gPhase,
        },
        1.0
      )
    );
    out.places.push(
      makeActorPlace(
        camPos,
        "sarah",
        sarahPos,
        {
          expr: sarahExpr,
          pose: sarahPose,
          viseme: visSarah,
          speaking: spSarah,
          look: sarahLook,
          blink: blinkS,
          facing: sarahFacing,
          headTilt: breathSarah,
          gesturePhase: gPhase,
        },
        0.95
      )
    );
  }

  if (hendPos) {
    out.places.push(
      makeActorPlace(
        camPos,
        "henderson",
        hendPos,
        {
          expr: hendExpr,
          pose: hendPose,
          viseme: visHend,
          speaking: spHend,
          look: hendLook,
          blink: blinkH,
          facing: hendFacing,
          headTilt: breathHend,
          gesturePhase: gPhase,
        },
        0.96
      )
    );
    // Standing/walking Henderson gets full multiply contact + directional ground shadow!
    if (s.id === 18 || s.id === 19) {
      addContactShadow(out, hendPos[0], hendPos[1], hendPos[2], 0.96);
    }
  }

  return out;
}
