import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../../templates/bridge/ink";
import { LensBlur } from "../../templates/bridge/lensblur";
import { GradeEffect, GradeParams } from "../../templates/bridge/grade";
import { ImadWorld } from "./world";
import { TOTAL_FRAMES, dofAt, shotAt } from "./story";
import { InsertOverlay } from "./Inserts";
import { HudAndCaptionOverlay } from "./Overlays";

export const IMAD_EP1_FRAMES = TOTAL_FRAMES;

const GRADE_CAFE: GradeParams = {
  ky: [0.0, 0.10, 0.27, 0.56, 0.82, 0.94, 1.0],
  sat: [1.02, 1.08, 1.06],
  tintS: [0.004, 0.008], // warm cozy shadow lift
  tintM: [-0.006, 0.005], // gentle warm amber mids
  tintH: [-0.010, 0.006], // golden highlights
  vig: [0.16, 0.48],
};

const GRADE_ALERT: GradeParams = {
  ky: [0.0, 0.08, 0.24, 0.54, 0.84, 0.95, 1.0],
  sat: [1.05, 1.15, 1.12],
  tintS: [0.015, 0.014], // magenta-crimson drama
  tintM: [0.005, 0.012],
  tintH: [-0.005, 0.010],
  vig: [0.28, 0.38],
};

const makeBloom = () => {
  const b = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    intensity: 0.42,
    luminanceThreshold: 0.98,
    luminanceSmoothing: 0.22,
    mipmapBlur: true,
    levels: 5,
    radius: 0.55,
  });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3();
const fpt = new THREE.Vector3();

const InnerScene: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new ImadWorld(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  const fx = useMemo(
    () => ({
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera, {
        color: "#1e1522",
        widthNear: 3.6,
        widthFar: 2.0,
        distNear: 1.2,
        distFar: 14.0,
        creaseScale: 0.72,
        depthLo: 0.014,
        depthHi: 0.038,
        angleLo: 38,
        angleHi: 55,
        fadeNear: 20,
        fadeFar: 42,
      }),
      lens: new LensBlur({ maxCoC: 16, nearScale: 1.05 }),
      bloom: makeBloom(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(GRADE_CAFE, 0.72),
    }),
    [camera, scene]
  );

  useEffect(() => {
    return () => {
      try {
        InkPass.prototype.dispose.call(fx.ink);
        fx.lens.dispose();
      } catch (_) {}
    };
  }, [fx]);

  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(f, cam, scene));
  noInkFallback(world.root);

  const shot = shotAt(f);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus);
  else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;

  const gradeTag = fx.grade as unknown as { _mood?: string };
  if (gradeTag._mood !== shot.light) {
    fx.grade.set(shot.light === "alert" ? GRADE_ALERT : GRADE_CAFE);
    gradeTag._mood = shot.light;
  }
  fx.grade.amount = shot.light === "alert" ? 0.85 : 0.70;

  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={fx.ink} dispose={null} />
        <primitive object={fx.lens.pre} dispose={null} />
        <primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.bloom} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
        <primitive object={fx.grade} dispose={null} />
      </EffectComposer>
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;

export const ImadEpisode1Short: React.FC = () => {
  const f = useCurrentFrame();
  const shot = shotAt(f);
  const isInsert = shot.insert !== null;

  return (
    <AbsoluteFill style={{ backgroundColor: "#241712" }}>
      <AbsoluteFill style={{ opacity: isInsert ? 0 : 1 }}>
        <ThreeCanvas
          width={1080}
          height={1920}
          {...(dprOverride() ? { dpr: dprOverride() } : {})}
          shadows
          gl={{
            antialias: false,
            stencil: false,
            powerPreference: "high-performance",
            toneMappingExposure: 1.0,
          }}
          camera={{ fov: 46, near: 0.15, far: 45 }}
        >
          <InnerScene />
        </ThreeCanvas>
      </AbsoluteFill>

      <InsertOverlay shot={shot} />
      <HudAndCaptionOverlay shot={shot} />
      <Audio src={staticFile("mix_imad_ep1.wav")} />
    </AbsoluteFill>
  );
};
