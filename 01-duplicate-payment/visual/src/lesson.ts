import type { LabRunResult, PaymentMode } from "./types";

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

export interface StoryStep {
  label: string;
  title: string;
  explanation: string;
  focus: "customer" | "api" | "database" | "provider" | "result";
  tone: "neutral" | "danger" | "success";
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

export function createStorySteps(result: LabRunResult): StoryStep[] {
  const charges = result.summary.providerCharges;
  const failed = charges > 1;

  const guardStep: StoryStep =
    result.mode === "unprotected"
      ? {
          label: "02 / Decision",
          title: "Both requests are accepted",
          explanation:
            "The API has no key or database rule that identifies them as the same payment operation.",
          focus: "api",
          tone: "danger",
        }
      : result.mode === "database-constraint"
        ? {
            label: "02 / Decision",
            title: "The unique index selects one owner",
            explanation:
              "The first insert wins. The second conflicts on the payment intent.",
            focus: "database",
            tone: "success",
          }
        : {
            label: "02 / Decision",
            title: "Idempotency key selects one owner",
            explanation:
              "The owner executes. The duplicate waits for the response that will be stored against the same key.",
            focus: "database",
            tone: "success",
          };

  const providerStep: StoryStep =
    charges > 1
      ? {
          label: "03 / Side effect",
          title: "The provider creates two charges",
          explanation:
            "Two outbound calls become two separate financial effects on the customer's account.",
          focus: "provider",
          tone: "danger",
        }
      : {
          label: "03 / Side effect",
          title: "The provider is called once",
            explanation:
            result.mode === "idempotent-api"
              ? "The duplicate never reaches the provider; it receives a replay of the stored response."
              : "The unique constraint stops the duplicate before a second provider call.",
          focus: "provider",
          tone: "success",
        };

  return [
    {
      label: "01 / Race",
      title: "One order produces two concurrent requests",
      explanation:
        "Request A and Request B reach the API with the same payment intent and amount.",
      focus: "customer",
      tone: "neutral",
    },
    guardStep,
    providerStep,
    {
      label: "04 / Result",
      title: failed
        ? "Invariant broken: one intent, two charges"
        : "Invariant preserved: one intent, one charge",
      explanation: failed
        ? "Both HTTP requests succeeded, but the business operation executed twice. This is a data and money error."
        : result.mode === "idempotent-api"
          ? "Both callers see the same payment and charge IDs. The second response is a replay."
          : "The duplicate is rejected before it can create another financial side effect.",
      focus: "result",
      tone: failed ? "danger" : "success",
    },
  ];
}
