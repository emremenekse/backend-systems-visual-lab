# 01 — Duplicate payment

## Question

What happens when the same payment request arrives twice?

## Versions

1. No duplicate protection
2. Database unique constraint
3. Idempotency key and response replay

## Project

```text
backend/   API and payment behavior
visual/    interactive event flow
video/     Remotion explanation
infra/     database and fake provider
tests/     concurrency scenarios
```

The backend technology will be selected for this lab. The visual and video must use events produced by the running backend.

## Status

Planning.
