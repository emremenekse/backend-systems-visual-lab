# Infrastructure

`compose.yaml` starts the entire lab:

- PostgreSQL 17
- fake payment provider on port `8081`
- .NET API on port `8080`
- visual lab on port `4173`

Run the lab from the repository root:

```bash
docker compose up -d --build
```

Use `docker compose down -v` when you also want to remove the lab database
volume.
