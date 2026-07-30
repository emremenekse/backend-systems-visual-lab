import { describe, expect, it } from "vitest";
import { lessonModes, sixtySecondAnswer } from "./lesson";

describe("lesson content", () => {
  it("defines the unprotected failure in business-operation terms", () => {
    expect(lessonModes.unprotected.guarantee).toBe("None");
    expect(lessonModes.unprotected.interviewLine).toContain(
      "business operation",
    );
  });

  it("shows that the full workflow builds on a unique constraint", () => {
    const lesson = lessonModes["idempotent-api"];

    expect(lesson.title).toBe("Full idempotency workflow");
    expect(lesson.mechanism).toContain("Unique key claim");
    expect(lesson.explanation).toContain("same primitive");
    expect(lesson.explanation).toContain("unique constraint");
    expect(lesson.explanation).toContain("replay");
    expect(lesson.limitation).toContain("provider timeouts");
  });

  it("keeps the constraint-only boundary explicit", () => {
    expect(lessonModes["database-constraint"].title).toBe(
      "Unique constraint only",
    );
    expect(lessonModes["database-constraint"].limitation).toContain(
      "does not store and replay",
    );
    expect(sixtySecondAnswer).toContain("database unique constraint");
    expect(sixtySecondAnswer).toContain("effectively-once");
    expect(sixtySecondAnswer).toContain("at-least-once");
  });
});
