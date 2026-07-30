# Backend Systems Visual Lab

Runnable backend failure scenarios explained with real code and browser visuals.

## Run the first lab

You only need Docker Compose 2.20 or newer:

```bash
docker compose up -d --build
```

Open [http://localhost:4173](http://localhost:4173).

Stop everything with:

```bash
docker compose down
```

## What you will examine

The first lab sends the same payment twice and compares three outcomes:

| Mode | Result |
| --- | --- |
| No protection | Two requests can create two charges |
| Unique constraint only | One charge; the duplicate request fails |
| Full idempotency workflow | One charge; both requests receive the same response |

Run each mode, follow the execution diagram, then open the raw runtime trace if
you want the implementation detail.

## Repository shape

Each numbered folder is an independent project. Its language and stack may
change without affecting the other labs.

```text
01-duplicate-payment/
  backend/   .NET API, provider, and tests
  visual/    React experiment and browser animation
  video/     optional Remotion export
  infra/     Docker Compose
```

## Labs

| Lab | Topic | Status |
| --- | --- | --- |
| [01](01-duplicate-payment/README.md) | Duplicate payment and idempotency · .NET | Runnable |

[Roadmap](ROADMAP.md)
