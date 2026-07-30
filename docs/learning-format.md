# Learning format

Every lab must answer the same questions.

## 1. What invariant matters?

State the property that must remain true. “The endpoint returns 200” is not an invariant.

Examples:

- one business intent causes at most one charge;
- inventory never becomes negative;
- every committed state change eventually produces an event.

## 2. Why does the naive version look correct?

Show the smallest plausible implementation. Do not sabotage it with obvious mistakes.

## 3. How is the failure reproduced?

The reproduction must be deterministic enough for CI:

- concurrency barrier;
- injected latency;
- dependency termination;
- duplicate delivery;
- bounded overload.

## 4. What does the viewer see?

Use one shared timeline for:

- request and correlation IDs;
- database transaction boundaries;
- event publication and delivery;
- retries and waits;
- relevant state transitions.

## 5. Which solutions are compared?

Include the minimum number of credible options. State when each option is sufficient and when it fails.

## 6. What is the new cost?

Measure or explicitly identify:

- latency;
- throughput;
- storage;
- operational burden;
- coupling;
- recovery complexity.

## 7. What proves the result?

Each lab needs:

- an executable failure case;
- an integration test for the invariant;
- a visual trace generated from real events;
- a short decision record;
- a benchmark or a reason why one would be misleading.
