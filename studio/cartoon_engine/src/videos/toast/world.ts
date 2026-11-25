// 3D Scene Architecture for "The Buttered Toast Law"
// Supports 3 distinct visual styles (Comic Noir, Rubber Hose, Kurzgesagt)
// Adheres to Stop 4 (Newtonian/structural kinematics), Stop 5 (Rig), and Stop 6 (Zero-GC MathPool)
import * as THREE from "three";
import { Pen, Outfit } from "../../templates/bridge/toon";
import { ComicRig } from "../../templates/styles/comic_noir/ComicRig";
import { HoseRig } from "../../templates/styles/rubber_hose/HoseRig";
import { VectorRig } from "../../templates/styles/kurzgesagt/VectorRig";
import { MathPool } from "../../templates/engine/math_pool";
import { cameraAt, toastAt, visemeAt, blinkAt, shotAt, IMPACT_FRAME, ShotDef } from "./story";

export type ShortStyleId = "comic_noir" | "rubber_hose" | "kurzgesagt";

function stepFrameInShot(f: number, shot: ShotDef, step: number): number {
  if (step <= 1) return f;
  const shotRel = f - shot.start;
  const steppedRel = Math.floor(shotRel / step) * step;
  return shot.start + steppedRel;
}

export class ToastWorld {
  root = new THREE.Group();

  // Scene sub-groups
  private kitchenGroup = new THREE.Group();
  private towerGroup = new THREE.Group();
  private toastMesh: THREE.Group;
  private butterMesh: THREE.Mesh;
  private breadMesh: THREE.Mesh;
  private splatMesh: THREE.Mesh;

  // Character Billboards
  private charCanvas: HTMLCanvasElement;
  private charCtx: CanvasRenderingContext2D;
  private charTexture: THREE.CanvasTexture;
  private charMesh: THREE.Mesh;

  // Impact Graphic Billboard ("SLAP!" / "180°" / stars)
  private fxCanvas: HTMLCanvasElement;
  private fxCtx: CanvasRenderingContext2D;
  private fxTexture: THREE.CanvasTexture;
  private fxMesh: THREE.Mesh;

  // Rigs
  private comicRig = new ComicRig();
  private hoseRig = new HoseRig();
  private vectorRig = new VectorRig();

  // Outfits
  private outfit: Outfit = {
    jacket: "#2255aa",
    pants: "#1b2233",
    boots: "#111111",
    skin: "#ffe0bd",
  };

  constructor(public style: ShortStyleId) {
    this.root.add(this.kitchenGroup);
    this.root.add(this.towerGroup);

    // 1. Build Environment & Kitchen Counter
    this.buildKitchenEnvironment();

    // 2. Build 10-Foot Tower Table (Shot 3)
    this.buildTowerTable();

    // 3. Build Buttered Toast Model
    const toastResult = this.buildToast();
    this.toastMesh = toastResult.group;
    this.breadMesh = toastResult.bread;
    this.butterMesh = toastResult.butter;
    this.splatMesh = toastResult.splat;
    // ToastMesh is added directly to root so it is visible in ALL shots (including Shot 3 table top)
    this.root.add(this.toastMesh);
    this.kitchenGroup.add(this.splatMesh);

    // 4. Character Canvas Billboard (600x1000 standard toon space)
    this.charCanvas = document.createElement("canvas");
    this.charCanvas.width = 600;
    this.charCanvas.height = 1000;
    this.charCtx = this.charCanvas.getContext("2d")!;
    this.charTexture = new THREE.CanvasTexture(this.charCanvas);
    this.charTexture.minFilter = THREE.LinearFilter;
    this.charTexture.magFilter = THREE.LinearFilter;

    const charMat = new THREE.MeshBasicMaterial({
      map: this.charTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.charMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), charMat);
    this.charMesh.position.set(-0.18, 0.88, -0.48);
    this.root.add(this.charMesh);

    // 5. FX Graphic Billboard (512x512) centered over impact point (x=0.48), placed strictly in front of front table leg (z=0.28 > 0.22)
    this.fxCanvas = document.createElement("canvas");
    this.fxCanvas.width = 512;
    this.fxCanvas.height = 512;
    this.fxCtx = this.fxCanvas.getContext("2d")!;
    this.fxTexture = new THREE.CanvasTexture(this.fxCanvas);
    const fxMat = new THREE.MeshBasicMaterial({
      map: this.fxTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.fxMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), fxMat);
    this.fxMesh.position.set(0.52, 0.34, 0.28);
    this.fxMesh.visible = false;
    this.kitchenGroup.add(this.fxMesh);

    // 6. Lights
    this.setupLighting();
  }

  private buildKitchenEnvironment() {
    // Floor: Checkered kitchen floor or flat styled ground
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorColor =
      this.style === "rubber_hose"
        ? 0xd4c7ae
        : this.style === "comic_noir"
        ? 0xcdc6b8 // Warm light comic paper ground
        : 0x4d2680; // Saturated Kurzgesagt purple
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.kitchenGroup.add(floor);

    // Back wall
    const wallGeo = new THREE.PlaneGeometry(12, 8);
    const wallColor =
      this.style === "rubber_hose"
        ? 0xeae0cc
        : this.style === "comic_noir"
        ? 0x3d3a4c
        : 0x22104a;
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.8,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4.0, -2.5);
    this.kitchenGroup.add(wall);

    // Standard Kitchen Counter Table (Height = 0.82m, Lip at x = 0.40m)
    // Table top extends from x = -0.75 to +0.40 (width = 1.15m), depth = 0.60m (-0.30 to +0.30)
    const tableTopGeo = new THREE.BoxGeometry(1.15, 0.06, 0.60);
    const tableMat = new THREE.MeshStandardMaterial({
      color: this.style === "rubber_hose" ? 0x6e4828 : this.style === "comic_noir" ? 0xdd8833 : 0x3a1d70,
      roughness: 0.5,
    });
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.position.set(-0.175, 0.79, 0); // Top surface is at 0.79 + 0.03 = 0.82m
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.kitchenGroup.add(tableTop);

    // 4 Table Legs (inset under table top, right edge cantilevers 5cm to lip at 0.40)
    const legGeo = new THREE.BoxGeometry(0.06, 0.76, 0.06);
    const legPositions = [
      [-0.66, 0.38, -0.22],
      [0.32, 0.38, -0.22],
      [-0.66, 0.38, 0.22],
      [0.32, 0.38, 0.22],
    ];
    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(lx, ly, lz);
      this.kitchenGroup.add(leg);
    }

    // Kitchen Props: Toaster & Mug resting firmly on table top surface (y = 0.82)
    const toasterGeo = new THREE.BoxGeometry(0.22, 0.16, 0.14);
    const toasterMat = new THREE.MeshStandardMaterial({
      color: this.style === "kurzgesagt" ? 0x00f0ff : 0xd8d8d8,
      metalness: 0.7,
      roughness: 0.2,
    });
    const toaster = new THREE.Mesh(toasterGeo, toasterMat);
    toaster.position.set(-0.35, 0.90, -0.05);
    this.kitchenGroup.add(toaster);

    const mugGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.10, 16);
    const mugMat = new THREE.MeshStandardMaterial({
      color: this.style === "rubber_hose" ? 0xffffff : this.style === "comic_noir" ? 0xffea2b : 0xff3b6b,
      roughness: 0.3,
    });
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.set(-0.08, 0.87, 0.08);
    this.kitchenGroup.add(mug);
  }

  private buildTowerTable() {
    // Shot 3 Solution: 3.2-meter tall breakfast table (10-foot table)
    const towerMat = new THREE.MeshStandardMaterial({
      color: this.style === "kurzgesagt" ? 0x5a2ea6 : 0x553018,
      roughness: 0.5,
    });
    const topGeo = new THREE.BoxGeometry(1.6, 0.08, 1.0);
    const top = new THREE.Mesh(topGeo, towerMat);
    top.position.set(0, 3.20, 0);
    this.towerGroup.add(top);

    // 4 High Legs (3.2m tall)
    const legGeo = new THREE.BoxGeometry(0.08, 3.20, 0.08);
    const legPositions = [
      [-0.72, 1.60, -0.42],
      [0.72, 1.60, -0.42],
      [-0.72, 1.60, 0.42],
      [0.72, 1.60, 0.42],
    ];
    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, towerMat);
      leg.position.set(lx, ly, lz);
      this.towerGroup.add(leg);
    }

    // Tall Step-ladder leading up to the table
    const ladderMat = new THREE.MeshStandardMaterial({ color: 0x886644 });
    for (let r = 0; r < 10; r++) {
      const rungGeo = new THREE.BoxGeometry(0.40, 0.03, 0.03);
      const rung = new THREE.Mesh(rungGeo, ladderMat);
      rung.position.set(-0.55, 0.32 * r + 0.2, 0.50);
      this.towerGroup.add(rung);
    }
  }

  private buildToast(): { group: THREE.Group; bread: THREE.Mesh; butter: THREE.Mesh; splat: THREE.Mesh } {
    const group = new THREE.Group();

    // 1. Bread Slice Base (Square slice: 12cm x 2cm x 12cm)
    const breadGeo = new THREE.BoxGeometry(0.13, 0.020, 0.13);
    const breadMat = new THREE.MeshStandardMaterial({
      color: this.style === "rubber_hose" ? 0xd4a373 : this.style === "comic_noir" ? 0xe09848 : 0xff9933,
      roughness: 0.8,
    });
    const bread = new THREE.Mesh(breadGeo, breadMat);
    bread.castShadow = true;
    group.add(bread);

    // 2. Butter Layer on Top Face (+Y)
    // Glistening golden butter square: 8.5cm x 8.5cm x 0.6cm
    const butterGeo = new THREE.BoxGeometry(0.09, 0.007, 0.09);
    const butterMat = new THREE.MeshStandardMaterial({
      color: 0xffea2b, // Bright buttery yellow
      roughness: 0.15,
      metalness: 0.1,
    });
    const butter = new THREE.Mesh(butterGeo, butterMat);
    butter.position.set(0, 0.013, 0); // strictly on positive Y face!
    group.add(butter);

    // 3. Butter Splat on Floor (Appears on impact butter-side down at x=0.48)
    const splatGeo = new THREE.CircleGeometry(0.10, 24);
    const splatMat = new THREE.MeshBasicMaterial({
      color: 0xffea2b,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const splat = new THREE.Mesh(splatGeo, splatMat);
    splat.rotation.x = -Math.PI / 2;
    splat.position.set(0.48, 0.002, 0.0);

    return { group, bread, butter, splat };
  }

  private setupLighting() {
    // Ambient light: prevent crushed black frames in all styles
    const ambientColor =
      this.style === "comic_noir"
        ? 0x9898b0
        : this.style === "rubber_hose"
        ? 0xf4ecd8
        : 0xab99e0;
    const ambientIntensity = this.style === "kurzgesagt" ? 1.6 : 1.25;
    const ambient = new THREE.AmbientLight(ambientColor, ambientIntensity);
    this.root.add(ambient);

    // Hemisphere light ensures fill light from ground
    const hemiLight = new THREE.HemisphereLight(
      this.style === "comic_noir" ? 0xffffff : 0xffeedd,
      this.style === "comic_noir" ? 0x777790 : 0x555566,
      0.9
    );
    this.root.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff8ee, 1.3);
    dirLight.position.set(1.5, 3.8, 2.2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.root.add(dirLight);

    const pointLight = new THREE.PointLight(0xffeedd, 0.6, 5.0);
    pointLight.position.set(0.2, 1.5, 0.8);
    this.root.add(pointLight);
  }

  // ==========================================================================
  // PER-FRAME UPDATE LOOP (Stop 6: Zero Allocations via MathPool)
  // ==========================================================================
  update(f: number, camera: THREE.PerspectiveCamera, scene: THREE.Scene): void {
    // Shot boundaries cut strictly on real frame f (zero-lag cuts)
    const currentShot = shotAt(f);
    const camState = cameraAt(f); // Camera glides smoothly at full frame rate

    // Step frame cadence within shot
    const step = this.style === "comic_noir" ? 2 : 1;
    const steppedF = stepFrameInShot(f, currentShot, step);

    const toastState = toastAt(steppedF);
    const viseme = visemeAt(steppedF);
    const blink = blinkAt(steppedF);

    // 1. Update Camera Position and Frustum
    camera.position.set(camState.posX, camState.posY, camState.posZ);
    MathPool.V0.set(camState.targetX, camState.targetY, camState.targetZ);
    camera.lookAt(MathPool.V0);
    camera.rotation.z = camState.roll;

    // 2. Toggle Environment Groups for Shot 3
    if (currentShot.id === 3) {
      this.kitchenGroup.visible = false;
      this.towerGroup.visible = true;
    } else {
      this.kitchenGroup.visible = true;
      this.towerGroup.visible = false;
    }

    // 3. Update Toast Position, Rotation & Squash
    this.toastMesh.position.set(toastState.x, toastState.y, toastState.z);
    this.toastMesh.rotation.z = toastState.rotZ;
    this.toastMesh.scale.set(toastState.squashX, toastState.squashY, toastState.squashX);

    // Floor butter splat mark
    (this.splatMesh.material as THREE.MeshBasicMaterial).opacity = toastState.splatAlpha;

    // 4. Update Character Billboard Position & Pose
    // Strictly behind table counter in Shots 1 & 2 (table back edge is z = -0.30, char is at z = -0.48)
    // Strictly in front of table top in Shot 3 (table front edge is z = 0.50, char is at z = 0.58)
    if (currentShot.id === 1) {
      this.charMesh.position.set(-0.18, 0.88, -0.48);
      this.charMesh.scale.set(1.0, 1.0, 1.0);
    } else if (currentShot.id === 2) {
      // In Shot 2: Character visible in background upper-left, peering in shock as toast falls
      this.charMesh.position.set(0.04, 0.88, -0.48);
      this.charMesh.scale.set(1.0, 1.0, 1.0);
    } else {
      // Shot 3: Character perched atop the tall ladder looking at the 10-foot table (z=0.58 in front of table mesh)
      this.charMesh.position.set(-0.55, 3.20, 0.58);
      this.charMesh.scale.set(1.0, 1.0, 1.0);
    }

    // Keep character strictly vertical (Y-axis billboard only) and bounded to eliminate table mesh clipping
    if (currentShot.id === 3) {
      const camAngleY = Math.atan2(
        camera.position.x - this.charMesh.position.x,
        camera.position.z - this.charMesh.position.z
      );
      this.charMesh.rotation.set(0, camAngleY, 0);
    } else {
      const camAngleY = Math.atan2(
        camera.position.x - this.charMesh.position.x,
        camera.position.z - this.charMesh.position.z
      );
      const clampedAngleY = Math.max(-0.16, Math.min(0.16, camAngleY));
      this.charMesh.rotation.set(0, clampedAngleY, 0);
    }

    // 5. Draw Character Canvas Texture with Volumetric Vitality
    this.renderCharacter(steppedF, viseme, blink, currentShot.id);

    // 6. Draw Impact FX Graphic Billboard
    this.renderImpactFX(f, currentShot.id);
  }

  private renderCharacter(f: number, viseme: any, blink: number, shotId: number) {
    const ctx = this.charCtx;
    ctx.clearRect(0, 0, 600, 1000);
    const pen = new Pen(ctx);

    const dt = 1.0 / 30.0;
    const phase = (f * 0.05) % 1.0;

    // Volumetric Vitality: subtle breathing cycle (~2.3s period) and physical weight shift
    const breath = Math.sin(f * (Math.PI * 2 / 70));
    const weightShift = Math.sin(f * (Math.PI * 2 / 95));

    // Dynamic gaze: positive canvas Y is DOWNWARD toward the table / floor!
    let look = 0.0;
    let gazeY = 0.0;
    if (shotId === 1) {
      if (f < 40) {
        look = 0.0;
        gazeY = 0.0;
      } else if (f < 48) {
        look = 0.45;
        gazeY = 0.15;
      } else {
        look = 0.85; // Wide eyes watching toast slide toward table edge
        gazeY = 0.20;
      }
    } else if (shotId === 2) {
      const uTumble = Math.min(1.0, (f - 85) / (IMPACT_FRAME - 85));
      look = 0.85; // Toast is on right
      gazeY = 0.35 + 0.55 * uTumble; // Tracks smoothly down from table to floor in canvas coordinates!
    } else {
      look = 0.65; // Looking right at upright toast on table
      gazeY = 0.15;
    }

    if (this.style === "comic_noir") {
      let handRightTarget: [number, number] | undefined = undefined;
      if (shotId === 1 && f >= 38 && f <= 50) {
        // Dynamic elbow bump in Shot 1: right elbow/arm jabs toward toast (+X in canvas)
        const bumpProg = Math.sin(((f - 38) / 12) * Math.PI);
        handRightTarget = [340 + 75 * bumpProg, 400 - 25 * bumpProg];
      } else if (shotId === 1 && f > 50) {
        handRightTarget = [345, 380];
      } else if (shotId === 2) {
        handRightTarget = [355, 350];
      }

      const comicExpr = shotId === 2 ? "shock" : shotId === 3 ? "grin" : f >= 45 ? "shock" : "neutral";
      this.comicRig.draw(
        pen,
        this.outfit,
        {
          phase: phase,
          mode: "stand", // Strictly stationary feet - moves ONLY with story context
          viseme: viseme,
          look: look,
          gazeY: gazeY,
          blink: blink,
          squash: 1.0,
          breath: breath,
          weightShift: weightShift,
          expr: comicExpr,
          handRightTarget: handRightTarget,
          volumetric: true,
        },
        dt
      );
    } else if (this.style === "rubber_hose") {
      // 1930s rubber hose with elbow bump, pearl buttons, and shock expression
      // Legs are firmly in 'stand' mode (no continuous unmotivated noodle cycling)
      let armR = -0.5;
      let armL = 0.5;
      if (shotId === 1) {
        if (f >= 38 && f <= 48) {
          const bumpProg = Math.sin(((f - 38) / 10) * Math.PI);
          armR = -0.5 - 1.2 * bumpProg; // Outward elbow jab rightwards knocking toast
        } else if (f > 48) {
          armR = -1.6; // Shocked hand to cheek
          armL = -1.2;
        }
      } else if (shotId === 2) {
        armR = -1.8;
        armL = -1.2;
      }
      const hoseExpr = shotId === 2 ? "shock" : shotId === 3 ? "relief" : f >= 45 ? "shock" : "smile";
      this.hoseRig.draw(pen, this.outfit, {
        phase: (f * (132 / 60) * 0.5) % 1.0,
        mode: "stand", // Strictly stationary planted noodle legs
        squash: 1.0,
        armAngleLeft: armL,
        armAngleRight: armR,
        pieLook: look > 0.3 ? 1 : 0,
        gazeY: gazeY,
        breath: breath,
        weightShift: weightShift,
        expr: hoseExpr,
      });
    } else {
      // Kurzgesagt: Flat geometric vector rig with volumetric multi-stop gradients & rim light
      // Legs are in 'stand' mode with ZERO continuous foot paddling
      let nudgeX = 0;
      if (shotId === 1 && f >= 38 && f <= 48) {
        nudgeX = Math.sin(((f - 38) / 10) * Math.PI) * 16;
      }
      const vectorExpr = shotId === 2 ? "shock" : shotId === 3 ? "happy" : f >= 45 ? "shock" : "neutral";
      this.vectorRig.draw(pen, this.outfit, {
        phase: phase,
        mode: "stand", // Stationary feet - no unmotivated leg paddling
        scale: 1.0,
        facing: 1,
        look: look,
        gazeY: gazeY,
        breath: breath,
        weightShift: weightShift,
        nudgeX: nudgeX,
        expr: vectorExpr,
      });
    }

    this.charTexture.needsUpdate = true;
  }

  private renderImpactFX(f: number, shotId: number) {
    if (shotId !== 2 || f < IMPACT_FRAME || f > IMPACT_FRAME + 24) {
      this.fxMesh.visible = false;
      return;
    }

    this.fxMesh.visible = true;
    const ctx = this.fxCtx;
    ctx.clearRect(0, 0, 512, 512);
    const pen = new Pen(ctx);

    const kf = f - IMPACT_FRAME;
    const scale = kf === 0 ? 0.35 : Math.min(1.0, 0.45 + (kf / 4.0) * 0.55);

    if (this.style === "comic_noir") {
      // Iconic Ben-Day "SLAP!" starburst comic onomatopoeia
      this.comicRig.drawOnomatopoeia(pen, "SLAP!", 256, 256, scale * 1.3);
    } else if (this.style === "rubber_hose") {
      // 1930s cartoon comic impact poof stars
      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate(kf * 0.1);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#11100e";
      ctx.lineWidth = 6;
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        ctx.arc(80 * scale * Math.cos(s * Math.PI / 2), 80 * scale * Math.sin(s * Math.PI / 2), 22 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Kurzgesagt: Flat vector technical rotation arc: Δθ = 180°
      ctx.save();
      ctx.translate(256, 256);
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 10 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, 110 * scale, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.moveTo(0, 125 * scale);
      ctx.lineTo(25 * scale, 100 * scale);
      ctx.lineTo(-25 * scale, 100 * scale);
      ctx.fill();

      // Text label
      ctx.font = `bold ${Math.round(44 * scale)}px "Impact", "Arial Black", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("Δθ = 180°", 0, -10);
      ctx.font = `bold ${Math.round(26 * scale)}px "Arial", sans-serif`;
      ctx.fillStyle = "#ffaa3b";
      ctx.fillText("BUTTER-SIDE DOWN", 0, 30);
      ctx.restore();
    }

    this.fxTexture.needsUpdate = true;
  }
}
