# 01 — Duplicate Payment

Two concurrent requests try to charge the same payment intent. The lab shows
which protection actually prevents a duplicate financial side effect.

## Run it

From the repository root:

```bash
docker compose up -d --build
```

Open [http://localhost:4173](http://localhost:4173).

## What to look for

| Mode | What request B does | Customer result |
| --- | --- | --- |
| No protection | Calls the provider | Can be charged twice |
| Unique constraint only | Loses the unique insert | Charged once; B gets an error |
| Full idempotency workflow | Waits and replays A's stored response | Charged once; A and B get the same result |

The key distinction:

> The unique constraint selects one owner. Stored state and response replay
> complete the idempotency contract.

## Project map

```text
backend/   API, fake provider, and integration tests
visual/    interactive experiment and execution animation
video/     optional Remotion export
infra/     Docker Compose
```
