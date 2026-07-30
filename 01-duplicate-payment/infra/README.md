# Infrastructure

`compose.yaml` starts the entire lab:

- PostgreSQL 17
- fake payment provider on port `8081`
- .NET API on port `8080`
- visual lab on port `4173`

Run it from `01-duplicate-payment`:

```bash
docker compose -f infra/compose.yaml up --build
```

Use `docker compose -f infra/compose.yaml down -v` when you also want to remove
the lab database volume.
