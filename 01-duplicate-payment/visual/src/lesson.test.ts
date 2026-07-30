import { describe, expect, it } from "vitest";
import { lessonModes, sixtySecondAnswer } from "./lesson";

describe("lesson content", () => {
  it("defines the unprotected failure in business-operation terms", () => {
    expect(lessonModes.unprotected.guarantee).toBe("None");
    expect(lessonModes.unprotected.interviewLine).toContain(
      "business operation",
    );
  });

  it("describes ownership and replay for an idempotent API", () => {
    const lesson = lessonModes["idempotent-api"];

    expect(lesson.mechanism).toContain("Key claim");
    expect(lesson.explanation).toContain("stored response");
    expect(lesson.limitation).toContain("provider timeouts");
  });

  it("keeps the database boundary and interview guarantee explicit", () => {
    expect(lessonModes["database-constraint"].limitation).toContain(
      "idempotent API",
    );
    expect(sixtySecondAnswer).toContain("effectively-once");
    expect(sixtySecondAnswer).toContain("at-least-once");
  });
});
