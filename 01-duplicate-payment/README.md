# 01 — Duplicate Payment

Two concurrent requests attempt to charge the same payment intent. The lab shows
where duplicate protection must live and what each strategy actually guarantees.

## Run it

```bash
docker compose -f infra/compose.yaml up --build
```

Open [http://localhost:4173](http://localhost:4173). The lesson asks for a
prediction, runs two real concurrent requests, explains the result in four
steps, and finishes with interview questions and a Remotion video.

Stop the lab with:

```bash
docker compose -f infra/compose.yaml down
```

## Modes

| Mode | Result |
| --- | --- |
| Unprotected | Two provider charges; invariant fails |
| Database constraint | One charge; the duplicate is rejected |
| Idempotent API | One charge; the stored response is replayed |

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
