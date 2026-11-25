// Sandbox entry for the look pass: renders an isolated composition (e.g. ViennaShort or ImadEpisode1Short).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { ImadEpisode1Short, IMAD_EP1_FRAMES } from "../videos/imad/ImadEpisode1";

const Root: React.FC = () => <Composition id="ImadEpisode1Short" component={ImadEpisode1Short} durationInFrames={IMAD_EP1_FRAMES} fps={30} width={1080} height={1920} />;
registerRoot(Root);
