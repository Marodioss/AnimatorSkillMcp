// 3D Golden Bean Bakery & Café Environment for "Burn It to Earn It" (Episode 1)
// Cel-shaded 3D world using twoTone() materials, InkPass outlines, contact shadows, and volumetric sunbeams.
import * as THREE from "three";
import { NOINK } from "../../templates/bridge/ink";
import { CHAR, TONE, twoTone } from "../../templates/bridge/shade";
import { Actor, Fx, Pool, stageAt } from "./cast";
import {
  cafeBrickHD,
  cafeDoorTex,
  cafeFloorHD,
  chalkboardTex,
  oakTableHD,
  sunbeamTex,
  wainscotHD,
  windowViewTex,
} from "./paint";
import { FPS, cameraAt, shotAt } from "./story";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export class ImadWorld {
  root = new THREE.Group();

  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private warmPoint: THREE.PointLight;
  private alertPoint: THREE.PointLight;
  private sunbeams: THREE.Mesh[] = [];
  private pendantBulbs: THREE.MeshBasicMaterial[] = [];
  private imadTableMug: THREE.Group | null = null;
  private fog = new THREE.Fog("#f5d7b8", 6.5, 22.0);
  private tmpV = new THREE.Vector3();

  constructor() {
    // 1. Lighting Rig (directional light 0 = sunlit café window key light)
    this.sun = new THREE.DirectionalLight("#ffe6bf", 2.4);
    this.sun.position.set(2.6, 3.2, 2.1);
    this.sun.target.position.set(0.0, 0.8, -0.35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -4.0;
    sc.right = 4.0;
    sc.top = 4.0;
    sc.bottom = -4.0;
    sc.near = 0.5;
    sc.far = 14.0;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.root.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight("#ffe8d6", "#7a4e3b", 0.85);
    this.root.add(this.hemi);

    this.warmPoint = new THREE.PointLight("#ffb668", 1.1, 8.0);
    this.warmPoint.position.set(0.0, 2.05, 0.0);
    this.root.add(this.warmPoint);

    this.alertPoint = new THREE.PointLight("#ff2a6d", 0.0, 9.0);
    this.alertPoint.position.set(0.1, 1.8, 0.8);
    this.root.add(this.alertPoint);

    this.buildCafeArchitecture();
    this.buildBoothAndTable();
    this.buildBotanicals();
    this.buildSunbeams();
  }

  private getActor(i: number): Actor {
    while (this.actors.length <= i) this.actors.push(new Actor(this.root));
    return this.actors[i];
  }

  private getFx(i: number): Fx {
    while (this.fxs.length <= i) this.fxs.push(new Fx(this.root));
    return this.fxs[i];
  }

  private buildCafeArchitecture() {
    const g = new THREE.Group();

    // Warm Wooden Plank Floor (y = 0.0)
    const floorTex = cafeFloorHD();
    floorTex.repeat.set(3.5, 3.5);
    const floorMat = twoTone(new THREE.MeshLambertMaterial({ map: floorTex }));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 7.0), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);

    // Warm Terracotta Brick Back Wall (z = -2.25)
    const brickTex = cafeBrickHD();
    brickTex.repeat.set(3.2, 1.8);
    const brickMat = twoTone(new THREE.MeshLambertMaterial({ map: brickTex }));
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, 0.14), brickMat);
    backWall.position.set(-0.4, 1.9, -2.25);
    backWall.receiveShadow = true;
    g.add(backWall);

    // Lower Wood Wainscoting along Back Wall & Left Wall
    const wainTex = wainscotHD();
    wainTex.repeat.set(6, 1);
    const wainMat = twoTone(new THREE.MeshLambertMaterial({ map: wainTex }));
    const backWain = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.88, 0.18), wainMat);
    backWain.position.set(-0.4, 0.44, -2.21);
    backWain.receiveShadow = true;
    g.add(backWain);

    // Left Wall (shifted left so entrance aisle is wide and clear of the booth!)
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 3.8, 6.0),
      twoTone(new THREE.MeshLambertMaterial({ color: "#dfa87e" }))
    );
    leftWall.position.set(-2.85, 1.9, 0.3);
    leftWall.receiveShadow = true;
    g.add(leftWall);

    // Timber Structural Pillars (ink-outlined for depth!)
    const pillarMat = twoTone(new THREE.MeshLambertMaterial({ color: "#52311d" }));
    for (const [px, pz] of [
      [-2.35, -2.10],
      [-0.95, -2.10],
      [1.15, -2.10],
    ]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 0.20), pillarMat);
      p.position.set(px, 1.8, pz);
      p.castShadow = true;
      p.receiveShadow = true;
      g.add(p);
    }

    // Café Entrance Door on Back-Left (x = -1.68, z = -2.14, cleanly clear of booth!)
    const doorMat = twoTone(new THREE.MeshLambertMaterial({ map: cafeDoorTex() }));
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.10, 0.08), doorMat);
    door.position.set(-1.68, 1.05, -2.14);
    door.receiveShadow = true;
    g.add(door);

    // Brass Café Door Bell above Door
    const brassMat = twoTone(
      new THREE.MeshPhongMaterial({ color: "#f0c24b", specular: "#fff3c4", shininess: 65 })
    );
    const doorBell = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.08, 12), brassMat);
    doorBell.position.set(-1.68, 2.15, -2.05);
    g.add(doorBell);

    // Chalkboard Menu on Back Brick Wall — positioned cleanly below top safe-zone HUD/Hook Pill!
    const chalkMat = twoTone(new THREE.MeshLambertMaterial({ map: chalkboardTex() }));
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.76, 0.06), chalkMat);
    board.position.set(0.20, 1.50, -2.15);
    board.castShadow = true;
    board.receiveShadow = true;
    g.add(board);

    // Floor-to-Ceiling Sunlit Café Window on Right Wall (x = +2.15)
    const outsideView = new THREE.Mesh(
      new THREE.PlaneGeometry(5.0, 3.8),
      new THREE.MeshBasicMaterial({ map: windowViewTex() })
    );
    outsideView.position.set(3.1, 1.9, -0.3);
    outsideView.rotation.y = -Math.PI / 2;
    outsideView.layers.set(NOINK);
    g.add(outsideView);

    // Timber Window Mullion Frame (no solid blocking glass so sunlight pours cleanly in!)
    const frameMat = twoTone(new THREE.MeshLambertMaterial({ color: "#4e2e1b" }));
    for (const wz of [-1.8, -0.85, 0.15, 1.15]) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 0.08), frameMat);
      mullion.position.set(2.05, 1.7, wz);
      g.add(mullion);
    }
    for (const wy of [0.55, 1.65, 2.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.6), frameMat);
      rail.position.set(2.05, wy, -0.3);
      g.add(rail);
    }

    // Warm Hanging Brass Pendant Lamps
    for (const lx of [-0.52, 0.56]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 8), frameMat);
      cord.position.set(lx, 2.65, -0.15);
      g.add(cord);

      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 16, 1, true), brassMat);
      shade.position.set(lx, 2.18, -0.15);
      g.add(shade);

      const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.15, 0.7) });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), bulbMat);
      bulb.position.set(lx, 2.12, -0.15);
      bulb.layers.set(NOINK);
      this.pendantBulbs.push(bulbMat);
      g.add(bulb);
    }

    this.root.add(g);
  }

  private buildBoothAndTable() {
    const g = new THREE.Group();

    // Plush Warm Terracotta-Camel Upholstered Booth Bench behind Table (wide enough for all 3 in Scene 6-7!)
    const leatherMat = twoTone(new THREE.MeshLambertMaterial({ color: "#b6613e" }));
    const woodTrimMat = twoTone(new THREE.MeshLambertMaterial({ color: "#54321e" }));

    const benchBase = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.48, 0.56), woodTrimMat);
    benchBase.position.set(0.08, 0.24, -0.44);
    benchBase.castShadow = true;
    benchBase.receiveShadow = true;
    g.add(benchBase);

    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.10, 0.60), leatherMat);
    benchSeat.position.set(0.08, 0.50, -0.42);
    benchSeat.castShadow = true;
    benchSeat.receiveShadow = true;
    g.add(benchSeat);

    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.50, 0.14), leatherMat);
    benchBack.position.set(0.08, 0.74, -0.68);
    benchBack.castShadow = true;
    benchBack.receiveShadow = true;
    g.add(benchBack);

    // Solid Varnished Oak Café Table (Top surface y = 0.74m, #C48B58) + Deep Walnut Apron Skirt
    const oakMat = twoTone(
      new THREE.MeshPhongMaterial({
        map: oakTableHD(),
        specular: "#ffdcb5",
        shininess: 22,
      })
    );
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.055, 0.68), oakMat);
    tableTop.position.set(0.0, 0.7125, 0.02);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    g.add(tableTop);

    // Deeper warm wood apron skirt cleanly frames seated waists & hides torso bottoms
    const apron = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.14, 0.60), woodTrimMat);
    apron.position.set(0.0, 0.62, 0.02);
    apron.castShadow = true;
    apron.receiveShadow = true;
    g.add(apron);

    const ironMat = twoTone(
      new THREE.MeshPhongMaterial({ color: "#2d2a32", specular: "#7c7e88", shininess: 40 })
    );
    for (const px of [-0.42, 0.42]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.64, 12), ironMat);
      col.position.set(px, 0.34, 0.02);
      col.castShadow = true;
      g.add(col);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.44), ironMat);
      foot.position.set(px, 0.0175, 0.02);
      foot.castShadow = true;
      foot.receiveShadow = true;
      g.add(foot);
    }

    // ---- Table Props (Pinned flush to y = 0.74m!) ----
    const creamCeramic = twoTone(
      new THREE.MeshPhongMaterial({ color: "#fbf6eb", specular: "#ffffff", shininess: 50 })
    );
    const sageCeramic = twoTone(new THREE.MeshLambertMaterial({ color: "#4e756b" }));
    const cocoaMat = twoTone(new THREE.MeshLambertMaterial({ color: "#522714" }));

    // 1) Imad's Ceramic Cocoa Mug on Table (hidden automatically when Imad holds it in sit_mug!)
    const mugGrp = new THREE.Group();
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 0.085, 16), creamCeramic);
    mug.position.set(0.24, 0.7825, 0.06);
    mug.castShadow = true;
    mugGrp.add(mug);

    const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 8, 14, Math.PI), creamCeramic);
    mugHandle.rotation.z = -Math.PI / 2;
    mugHandle.position.set(0.284, 0.785, 0.06);
    mugGrp.add(mugHandle);

    const cocoa = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.006, 16), cocoaMat);
    cocoa.position.set(0.24, 0.822, 0.06);
    mugGrp.add(cocoa);
    this.imadTableMug = mugGrp;
    g.add(mugGrp);

    // 2) Sarah's Espresso Cup & Saucer (x = -0.26, y = 0.74, z = +0.10)
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.042, 0.01, 16), sageCeramic);
    saucer.position.set(-0.26, 0.745, 0.10);
    g.add(saucer);

    const espCup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.052, 16), sageCeramic);
    espCup.position.set(-0.26, 0.775, 0.10);
    espCup.castShadow = true;
    g.add(espCup);

    // 3) Sarah's Digital Tablet & Audit Binder on Table (x = -0.28, y = 0.74, z = -0.06)
    const folder = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.014, 0.26),
      twoTone(new THREE.MeshLambertMaterial({ color: "#e8c488" }))
    );
    folder.position.set(-0.28, 0.747, -0.06);
    folder.rotation.y = 0.18;
    folder.castShadow = true;
    g.add(folder);

    // 4) Acquisition Contract Stack + Fountain Pen (x = +0.02, y = 0.74, z = +0.04)
    const contract = new THREE.Mesh(
      new THREE.BoxGeometry(0.21, 0.010, 0.27),
      twoTone(new THREE.MeshLambertMaterial({ color: "#fdf8eb" }))
    );
    contract.position.set(0.02, 0.745, 0.04);
    contract.rotation.y = -0.12;
    contract.castShadow = true;
    g.add(contract);

    const goldPen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.005, 0.14, 8),
      twoTone(new THREE.MeshPhongMaterial({ color: "#ebb938", specular: "#fff7cc", shininess: 80 }))
    );
    goldPen.rotation.z = Math.PI / 2;
    goldPen.rotation.y = 0.45;
    goldPen.position.set(0.06, 0.756, 0.11);
    g.add(goldPen);

    this.root.add(g);
  }

  private buildBotanicals() {
    const g = new THREE.Group();
    const potMat = twoTone(new THREE.MeshLambertMaterial({ color: "#c96a47" }));
    const leafA = twoTone(new THREE.MeshLambertMaterial({ color: "#55a446" }));
    const leafB = twoTone(new THREE.MeshLambertMaterial({ color: "#68b853" }));
    const stemMat = twoTone(new THREE.MeshLambertMaterial({ color: "#3d6b34" }));

    // 1) Small Tabletop Terracotta Succulent (center-back of table, y = 0.74)
    const miniPot = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.065, 12), potMat);
    miniPot.position.set(0.0, 0.7725, -0.22);
    miniPot.castShadow = true;
    g.add(miniPot);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), i % 2 ? leafA : leafB);
      leaf.scale.set(1.2, 0.75, 0.9);
      leaf.position.set(Math.cos(a) * 0.022, 0.812, -0.22 + Math.sin(a) * 0.022);
      g.add(leaf);
    }

    // 2) Floor Potted Monstera (Left Corner clear of entrance aisle & Right Window Corner)
    for (const [px, pz, sc] of [
      [-2.35, -1.65, 1.0],
      [1.45, -1.65, 1.15],
    ]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * sc, 0.13 * sc, 0.32 * sc, 14), potMat);
      pot.position.set(px, 0.16 * sc, pz);
      pot.castShadow = true;
      pot.receiveShadow = true;
      g.add(pot);

      for (let k = 0; k < 7; k++) {
        const a = (k * Math.PI * 2) / 7 + 0.3;
        const h = (0.45 + (k % 3) * 0.14) * sc;
        const r = (0.14 + (k % 2) * 0.08) * sc;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, h, 6), stemMat);
        stem.position.set(px + Math.cos(a) * r * 0.5, 0.30 * sc + h * 0.4, pz + Math.sin(a) * r * 0.5);
        stem.rotation.z = -Math.cos(a) * 0.25;
        stem.rotation.x = Math.sin(a) * 0.25;
        g.add(stem);

        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.15 * sc, 12, 10), k % 2 ? leafA : leafB);
        lobe.scale.set(1.25, 0.55, 1.0);
        lobe.position.set(px + Math.cos(a) * r, 0.32 * sc + h * 0.8, pz + Math.sin(a) * r);
        lobe.castShadow = true;
        g.add(lobe);
      }
    }

    // 3) Hanging English Ivy Planters near top window & back wall
    for (const [ix, iy, iz] of [
      [1.55, 2.25, -1.25],
      [-0.85, 2.35, -1.95],
    ]) {
      const hPot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.13, 12), potMat);
      hPot.position.set(ix, iy, iz);
      g.add(hPot);
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI * 2) / 6;
        const ivy = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), j % 2 ? leafA : leafB);
        ivy.position.set(ix + Math.cos(a) * 0.11, iy - 0.05 - (j % 3) * 0.08, iz + Math.sin(a) * 0.11);
        g.add(ivy);
      }
    }

    this.root.add(g);
  }

  private buildSunbeams() {
    const mat = new THREE.MeshBasicMaterial({
      map: sunbeamTex(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      opacity: 0.45,
    });
    // Placed strictly behind the booth (z <= -0.95) so sunbeam planes NEVER intersect character cards!
    for (const [bx, by, bz, rz] of [
      [1.35, 1.65, -1.25, 0.48],
      [0.85, 1.55, -1.05, 0.44],
    ]) {
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.3), mat);
      beam.position.set(bx, by, bz);
      beam.rotation.z = rz;
      beam.rotation.y = -0.15;
      beam.layers.set(NOINK);
      beam.renderOrder = 4;
      this.sunbeams.push(beam);
      this.root.add(beam);
    }
  }

  public update(frame: number, camera: THREE.PerspectiveCamera, scene: THREE.Scene): THREE.Vector3 {
    const s = shotAt(frame);
    const cam = cameraAt(frame);

    camera.position.set(...cam.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(...cam.look);
    camera.rotateZ(cam.roll);
    camera.fov = cam.fov;
    camera.near = 0.15;
    camera.far = 45;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    camera.layers.enable(NOINK);

    const isAlert = s.light === "alert";
    const t = frame / FPS;

    // Two-Tone & Card Shading Uniforms (Warm Golden Bean Afternoon vs Crimson Alert Surge)
    if (isAlert) {
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.65);
      TONE.uLitCol.value.set(1.45, 0.92 + 0.25 * pulse, 1.02 + 0.2 * pulse);
      TONE.uShadeCol.value.set(0.44, 0.20, 0.36);
      TONE.uShadeLift.value.set(0.14, 0.03, 0.08);
      TONE.uBounce.value.set(0.08, 0.02, 0.05);
      TONE.uSat.value = 1.12;
      CHAR.uCharTint.value.set(1.0, 0.84 + 0.08 * pulse, 0.88);
      CHAR.uCharShade.value = 0.86;
      CHAR.uGrad.value = 0.10;
      CHAR.uBodyGrad.value = 0.24;
      CHAR.uSideTint.value.set(0.95, 0.72, 0.88);

      this.alertPoint.intensity = 1.6 + 1.0 * pulse;
      this.warmPoint.intensity = 0.5;
      this.sun.intensity = 1.6;
      this.fog.color.set("#4a1b30");
      for (const bm of this.pendantBulbs) bm.color.setRGB(1.5, 0.35, 0.65);
      for (const sb of this.sunbeams) sb.visible = false;
    } else {
      TONE.uLitCol.value.set(1.50, 1.38, 1.20);
      TONE.uShadeCol.value.set(0.46, 0.37, 0.44);
      TONE.uShadeLift.value.set(0.08, 0.06, 0.08);
      TONE.uBounce.value.set(0.06, 0.03, 0.01);
      TONE.uSat.value = 1.10;
      CHAR.uCharTint.value.set(1.0, 0.93, 0.88);
      CHAR.uCharShade.value = 0.88;
      CHAR.uGrad.value = 0.08;
      CHAR.uBodyGrad.value = 0.20;
      CHAR.uSideTint.value.set(0.96, 0.88, 0.92);

      this.alertPoint.intensity = 0.0;
      this.warmPoint.intensity = 1.15;
      this.sun.intensity = 2.4;
      this.fog.color.set("#f2cfac");
      for (const bm of this.pendantBulbs) bm.color.setRGB(1.4, 1.15, 0.7);
      for (const sb of this.sunbeams) sb.visible = true;
    }

    TONE.uLambert.value = 0.36;
    TONE.uSideK.value = 0.85;
    TONE.uTerm.value = 0.22;

    scene.fog = this.fog;
    scene.background = new THREE.Color(isAlert ? "#2e1220" : "#edd0b2");

    // Skip expensive 2D sprite canvas updates when covered by full-screen 2D Insert
    if (s.insert) {
      for (const a of this.actors) a.mesh.visible = false;
      for (const fx of this.fxs) fx.mesh.visible = false;
      return this.tmpV.set(...cam.look);
    }

    // Update Cast & Effect Sprites
    const st = stageAt(frame, camera.position);
    if (this.imadTableMug) {
      // Only show 3D mug on table when Imad isn't holding his mug in his hands!
      this.imadTableMug.visible = !st.imadHoldingMug;
    }
    const usedActors: Actor[] = [];
    for (let i = 0; i < st.places.length; i++) {
      const p = st.places[i];
      const a = this.getActor(i);
      const [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(camera.position.x - p.x, camera.position.z - p.z), 0);
      const sc = p.scale ?? 1;
      a.mesh.scale.set(sc, sc, sc);
      usedActors.push(a);
    }
    for (let i = st.places.length; i < this.actors.length; i++) {
      this.actors[i].mesh.visible = false;
    }

    const usedFx: Fx[] = [];
    for (let i = 0; i < st.fx.length; i++) {
      const p = st.fx[i];
      const e = this.getFx(i);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) {
        e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      } else {
        e.mesh.quaternion.copy(camera.quaternion);
        e.mesh.rotateZ(p.rot ?? 0);
      }
      e.mesh.scale.set(p.w, p.h, 1);
      usedFx.push(e);
    }
    for (let i = st.fx.length; i < this.fxs.length; i++) {
      this.fxs[i].mesh.visible = false;
    }

    this.pool.flush();
    for (const a of usedActors) a.bind();
    for (const e of usedFx) e.bind();

    // Subtle animated sunbeam shimmer
    for (let i = 0; i < this.sunbeams.length; i++) {
      const mat = this.sunbeams[i].material as THREE.MeshBasicMaterial;
      mat.opacity = 0.42 + 0.08 * Math.sin(t * 1.4 + i);
    }

    return this.tmpV.set(...cam.look);
  }
}
