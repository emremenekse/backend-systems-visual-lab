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
    title: "Database constraint",
    mechanism: "A unique index selects one owner",
    guarantee: "At most one charge for one payment intent",
    explanation:
      "Both requests try to claim the same payment intent. PostgreSQL allows one insert and rejects the other.",
    limitation:
      "A constraint does not form a complete idempotent API contract: it cannot replay the original response, and it still needs a recovery plan for pending rows and process crashes.",
    interviewLine:
      "A unique constraint is the last line of defence, not a complete idempotency contract.",
    codeLanguage: "sql",
    code: `CREATE UNIQUE INDEX ux_payment_intent
ON payments (payment_intent_id);

INSERT INTO payments (...)
VALUES (...)
ON CONFLICT DO NOTHING;`,
  },
  "idempotent-api": {
    title: "Idempotent API",
    mechanism: "Key claim, request hash, response replay",
    guarantee: "One execution; duplicate callers see the same result",
    explanation:
      "The first request owns the key and stores its result. A duplicate with the same key and payload receives that stored response without calling the provider again.",
    limitation:
      "You still need rules for key expiry, payload mismatch, owner crashes, provider timeouts, and reconciliation.",
    interviewLine:
      "The same key and payload should produce the same side effect and the same response.",
    codeLanguage: "csharp",
    code: `var ownsKey = await TryClaimAsync(key, requestHash);

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
  "A duplicate payment is one business operation executing more than once. I identify that operation with a payment intent and idempotency key, then atomically select one owner in durable storage. Only the owner calls the provider; duplicates receive the stored response. I propagate the same key downstream and use processing states plus reconciliation for crashes and ambiguous timeouts. That gives an effectively-once side effect under at-least-once delivery—not a blanket exactly-once guarantee.";
