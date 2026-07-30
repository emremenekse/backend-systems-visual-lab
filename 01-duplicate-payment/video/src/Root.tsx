import { Composition } from "remotion";
import { DuplicatePaymentVideo } from "./DuplicatePaymentVideo";
import sampleRun from "./sample-run.json";
import type { LabRunResult } from "./types";

export function RemotionRoot() {
  return (
    <Composition
      id="DuplicatePayment"
      component={DuplicatePaymentVideo}
      durationInFrames={360}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={sampleRun as LabRunResult}
    />
  );
}
