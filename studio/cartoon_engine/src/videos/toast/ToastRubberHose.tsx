import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, staticFile, Audio } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { ToastWorld } from "./world";
import { FilmGateEffect } from "./effects";
import { TOTAL } from "./story";

const InnerRubberHose: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new ToastWorld("rubber_hose"), []);

  const fx = useMemo(() => {
    return {
      filmGate: new FilmGateEffect({
        gateWeave: 1.8,
        scratchDensity: 0.04,
        vignette: 0.85,
        sepiaTone: 0.88,
      }),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    };
  }, []);

  fx.filmGate.setFrame(f);
  world.update(f, camera as THREE.PerspectiveCamera, scene);

  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={2}>
        <primitive object={fx.filmGate} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
      </EffectComposer>
    </>
  );
};

export const ToastRubberHoseShort: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1e1c18" }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 200 }}
      >
        <InnerRubberHose />
      </ThreeCanvas>
      <Audio src={staticFile("mix_rubberhose.wav")} />
    </AbsoluteFill>
  );
};
