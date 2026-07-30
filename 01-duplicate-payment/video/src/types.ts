export type TraceLane =
  | "lab"
  | "request-a"
  | "request-b"
  | "database"
  | "provider";

export interface TraceEvent {
  sequence: number;
  offsetMs: number;
  lane: TraceLane;
  kind: string;
  label: string;
  detail: string;
  requestId: string;
}

export type LabRunResult = {
  runId: string;
  mode: "unprotected" | "database-constraint" | "idempotent-api";
  paymentIntentId: string;
  results: Array<{
    requestId: string;
    outcome: string;
    replayed: boolean;
    paymentId: string | null;
    providerChargeId: string | null;
  }>;
  provider: {
    paymentIntentId: string;
    attempts: number;
    charges: number;
    replays: number;
  };
  summary: {
    providerAttempts: number;
    providerCharges: number;
    replayedResponses: number;
    verdict: string;
  };
  trace: TraceEvent[];
} & Record<string, unknown>;
