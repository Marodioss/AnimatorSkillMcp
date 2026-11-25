import React from "react";
import { Composition } from "remotion";
import { ViennaShort, VIENNA_FRAMES } from "./videos/vienna/Vienna";
import { StoneAgeShort, STONEAGE_FRAMES } from "./videos/stoneage/StoneAge";
import { ToastComicShort, TOAST_FRAMES } from "./videos/toast/ToastComic";
import { ToastRubberHoseShort } from "./videos/toast/ToastRubberHose";
import { ToastKurzgesagtShort } from "./videos/toast/ToastKurzgesagt";
import { ImadEpisode1Short, IMAD_EP1_FRAMES } from "./videos/imad/ImadEpisode1";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ImadEpisode1Short"
        component={ImadEpisode1Short}
        durationInFrames={IMAD_EP1_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ToastComicShort"
        component={ToastComicShort}
        durationInFrames={TOAST_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ToastRubberHoseShort"
        component={ToastRubberHoseShort}
        durationInFrames={TOAST_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ToastKurzgesagtShort"
        component={ToastKurzgesagtShort}
        durationInFrames={TOAST_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ViennaShort"
        component={ViennaShort}
        durationInFrames={VIENNA_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="StoneAgeShort"
        component={StoneAgeShort}
        durationInFrames={STONEAGE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
