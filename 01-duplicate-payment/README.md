# 01 — Duplicate Payment

Two concurrent requests attempt to charge the same payment intent. The lab shows
where duplicate protection must live and what each strategy actually guarantees.

## Run it

```bash
docker compose -f infra/compose.yaml up --build
```

Open [http://localhost:4173](http://localhost:4173). One experiment keeps the
payment and concurrent requests fixed while you switch the ownership rule. Run
any of the three modes and compare what request B does, how many times the
customer is charged, and whether a stored response is replayed. The Remotion
recap and raw trace are optional.

Stop the lab with:

```bash
docker compose -f infra/compose.yaml down
```

## Modes

| Mode | Result |
| --- | --- |
| Unprotected | The customer can be charged twice |
| Database constraint | The customer is charged once; request B returns an error |
| Idempotent API | The customer is charged once; both requests return the same response |

## Stack

- .NET 10 Minimal API
- PostgreSQL 17 and explicit SQL
- xUnit + Testcontainers concurrency tests
- React + TypeScript event timeline
- Remotion video generated from the same trace
- Docker Compose

## Project map

```text
backend/   API, fake provider, and integration tests
visual/    live interactive trace
video/     trace-driven Remotion composition
infra/     Docker Compose
```

## Verify

```bash
dotnet test backend/DuplicatePayment.slnx
npm --prefix visual test
npm --prefix visual run build
npm --prefix video run typecheck
npm --prefix video run publish:visual
```

To render a fresh live run, keep Docker Compose running and execute:

```bash
npm --prefix video run capture
npm --prefix video run render
```
