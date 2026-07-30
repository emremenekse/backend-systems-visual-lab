import { describe, expect, it } from "vitest";
import { groupTraceByLane, shortId } from "./trace";
import type { TraceEvent } from "./types";

describe("trace helpers", () => {
  it("groups events without losing order", () => {
    const events: TraceEvent[] = [
      {
        sequence: 1,
        offsetMs: 0,
        lane: "request-a",
        kind: "request",
        label: "A",
        detail: "",
        requestId: "request-a",
      },
      {
        sequence: 2,
        offsetMs: 1,
        lane: "provider",
        kind: "effect",
        label: "Charge",
        detail: "",
        requestId: "request-a",
      },
    ];

    const grouped = groupTraceByLane(events);

    expect(grouped["request-a"]).toHaveLength(1);
    expect(grouped.provider[0]?.sequence).toBe(2);
    expect(grouped.database).toEqual([]);
  });

  it("shortens long identifiers", () => {
    expect(shortId("ch_123456789012345")).toBe("ch_1234567…");
    expect(shortId(null)).toBe("—");
  });
});
