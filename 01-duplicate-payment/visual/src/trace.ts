import type { PaymentMode, TraceEvent, TraceLane } from "./types";

export const laneOrder: TraceLane[] = [
  "lab",
  "request-a",
  "request-b",
  "database",
  "provider",
];

export const laneLabels: Record<TraceLane, string> = {
  lab: "Lab",
  "request-a": "Request A",
  "request-b": "Request B",
  database: "PostgreSQL",
  provider: "Provider",
};

export const modeCopy: Record<
  PaymentMode,
  { title: string; mechanism: string; risk: string }
> = {
  unprotected: {
    title: "Unprotected",
    mechanism: "No guard",
    risk: "Both requests can create an external charge.",
  },
  "database-constraint": {
    title: "Database constraint",
    mechanism: "Unique index",
    risk: "One request owns the payment intent; the other is rejected.",
  },
  "idempotent-api": {
    title: "Idempotent API",
    mechanism: "Key + replay",
    risk: "One request executes; duplicates receive the stored response.",
  },
};

export function groupTraceByLane(
  events: TraceEvent[],
): Record<TraceLane, TraceEvent[]> {
  return laneOrder.reduce<Record<TraceLane, TraceEvent[]>>(
    (result, lane) => {
      result[lane] = events.filter((event) => event.lane === lane);
      return result;
    },
    {
      lab: [],
      "request-a": [],
      "request-b": [],
      database: [],
      provider: [],
    },
  );
}

export function shortId(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value.length > 12 ? `${value.slice(0, 10)}…` : value;
}
