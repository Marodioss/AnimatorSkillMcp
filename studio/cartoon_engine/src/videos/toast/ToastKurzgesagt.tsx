import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, staticFile, Audio } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction } from "postprocessing";
import { ToastWorld } from "./world";
import { VectorGradientEffect } from "./effects";
import { TOTAL } from "./story";

const InnerKurzgesagt: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new ToastWorld("kurzgesagt"), []);

  const fx = useMemo(() => {
    return {
      gradient: new VectorGradientEffect({
        topColor: "#0f0524",
        middleColor: "#271257",
        bottomColor: "#ff9933",
        vibrancy: 1.4,
      }),
      bloom: new BloomEffect({
        blendFunction: BlendFunction.ADD,
        intensity: 0.65,
        luminanceThreshold: 0.8,
        luminanceSmoothing: 0.3,
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
        <primitive object={fx.gradient} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
      </EffectComposer>
    </>
  );
};

export const ToastKurzgesagtShort: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b031c" }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 200 }}
      >
        <InnerKurzgesagt />
      </ThreeCanvas>
      <Audio src={staticFile("mix_kurzgesagt.wav")} />
    </AbsoluteFill>
  );
};
