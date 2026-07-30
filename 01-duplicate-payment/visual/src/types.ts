export type PaymentMode =
  | "unprotected"
  | "database-constraint"
  | "idempotent-api";

export type TraceLane =
  | "lab"
  | "request-a"
  | "request-b"
  | "database"
  | "provider";

export interface PaymentResult {
  requestId: string;
  outcome: string;
  replayed: boolean;
  paymentId: string | null;
  providerChargeId: string | null;
}

export interface ProviderStats {
  paymentIntentId: string;
  attempts: number;
  charges: number;
  replays: number;
}

export interface TraceEvent {
  sequence: number;
  offsetMs: number;
  lane: TraceLane;
  kind: string;
  label: string;
  detail: string;
  requestId: string;
}

export interface LabRunResult {
  runId: string;
  mode: PaymentMode;
  paymentIntentId: string;
  results: PaymentResult[];
  provider: ProviderStats;
  summary: {
    providerAttempts: number;
    providerCharges: number;
    replayedResponses: number;
    verdict: string;
  };
  trace: TraceEvent[];
}
