import type { PaymentMode } from "./types";

export interface LessonMode {
  title: string;
  mechanism: string;
  guarantee: string;
  explanation: string;
  limitation: string;
  interviewLine: string;
  codeLanguage: string;
  code: string;
}

export const lessonModes: Record<PaymentMode, LessonMode> = {
  unprotected: {
    title: "No protection",
    mechanism: "Every request executes independently",
    guarantee: "None",
    explanation:
      "The API treats two HTTP requests as two separate operations. Both reach the payment provider.",
    limitation:
      "A retry, double click, or network redelivery can repeat the same business operation.",
    interviewLine:
      "Deduplicate the business operation, not the HTTP request.",
    codeLanguage: "csharp",
    code: `// Both requests can reach this line.
var charge = await provider.ChargeAsync(payment);
await InsertPaymentAsync(charge);`,
  },
  "database-constraint": {
    title: "Unique constraint only",
    mechanism: "A unique insert selects one winner",
    guarantee: "One charge; duplicate requests return an error",
    explanation:
      "Both requests insert the same payment intent. PostgreSQL accepts one row and rejects the duplicate through a unique constraint.",
    limitation:
      "The constraint prevents a second charge, but it does not store and replay the first response. Pending rows and process crashes still need recovery rules.",
    interviewLine:
      "A unique constraint chooses one winner, but it is not the complete idempotency contract.",
    codeLanguage: "sql",
    code: `CREATE UNIQUE INDEX ux_payment_intent
ON payments (payment_intent_id);

INSERT INTO payments (...)
VALUES (...)
ON CONFLICT DO NOTHING;`,
  },
  "idempotent-api": {
    title: "Full idempotency workflow",
    mechanism: "Unique key claim, state, and response replay",
    guarantee: "One charge; duplicate requests return the same response",
    explanation:
      "This starts with the same primitive: an atomic insert protected by a unique constraint. The winner performs the charge and stores its response; duplicates wait for and replay that response.",
    limitation:
      "You still need rules for key expiry, payload mismatch, owner crashes, provider timeouts, and reconciliation.",
    interviewLine:
      "The unique constraint chooses one owner; stored state and response replay complete the idempotency contract.",
    codeLanguage: "csharp",
    code: `// idempotency_key is a PRIMARY KEY.
var ownsKey = await TryInsertProcessingRowAsync(
    key,
    requestHash);

if (!ownsKey)
    return await ReplayStoredResponseAsync(key);

var charge = await provider.ChargeAsync(
    payment,
    idempotencyKey: key);

await StoreResponseAsync(key, charge);
return charge;`,
  },
};

export const sixtySecondAnswer =
  "A duplicate payment is one business operation executing more than once. I identify it with an idempotency key and use a database unique constraint to atomically select one owner. The owner calls the provider and stores the result; duplicates wait for and replay that response. I propagate the same key downstream and use processing states plus reconciliation for crashes and ambiguous timeouts. That gives an effectively-once side effect under at-least-once delivery—not a blanket exactly-once guarantee.";
