import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, staticFile, Audio } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction } from "postprocessing";
import { ToastWorld } from "./world";
import { HalftoneEffect } from "./effects";
import { TOTAL } from "./story";

export const TOAST_FRAMES = TOTAL;

const InnerComic: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new ToastWorld("comic_noir"), []);

  const fx = useMemo(() => {
    return {
      halftone: new HalftoneEffect({ dotSize: 7.5, dotAngle: 0.785, cmykOffset: 2.2, contrast: 1.5 }),
      bloom: new BloomEffect({
        blendFunction: BlendFunction.SCREEN,
        intensity: 0.45,
        luminanceThreshold: 0.85,
        luminanceSmoothing: 0.2,
      }),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    };
  }, []);

  world.update(f, camera as THREE.PerspectiveCamera, scene);

  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={fx.bloom} dispose={null} />
        <primitive object={fx.halftone} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
      </EffectComposer>
    </>
  );
};

export const ToastComicShort: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111018" }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 200 }}
      >
        <InnerComic />
      </ThreeCanvas>
      <Audio src={staticFile("mix_comic.wav")} />
    </AbsoluteFill>
  );
};
