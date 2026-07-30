import { describe, expect, it } from "vitest";
import {
  createStorySteps,
  lessonModes,
  sixtySecondAnswer,
} from "./lesson";
import type { LabRunResult, PaymentMode } from "./types";

function createResult(
  mode: PaymentMode,
  providerCharges: number,
): LabRunResult {
  return {
    runId: "run-1",
    mode,
    paymentIntentId: "intent-1",
    results: [],
    provider: {
      paymentIntentId: "intent-1",
      attempts: providerCharges,
      charges: providerCharges,
      replays: 0,
    },
    summary: {
      providerAttempts: providerCharges,
      providerCharges,
      replayedResponses: mode === "idempotent-api" ? 1 : 0,
      verdict: "test",
    },
    trace: [],
  };
}

describe("guided lesson content", () => {
  it("turns an unprotected run into a four-step failure explanation", () => {
    const steps = createStorySteps(createResult("unprotected", 2));

    expect(steps).toHaveLength(4);
    expect(steps[1]?.title).toContain("Both requests");
    expect(steps[2]?.title).toContain("two charges");
    expect(steps[3]?.tone).toBe("danger");
  });

  it("explains response replay for the idempotent mode", () => {
    const steps = createStorySteps(createResult("idempotent-api", 1));

    expect(steps[1]?.title).toContain("Idempotency key");
    expect(steps[2]?.explanation).toContain("replay");
    expect(steps[3]?.tone).toBe("success");
  });

  it("includes guarantee limits and a complete interview answer", () => {
    expect(lessonModes["database-constraint"].limitation).toContain(
      "idempotent API",
    );
    expect(sixtySecondAnswer).toContain("effectively-once");
  });
});
