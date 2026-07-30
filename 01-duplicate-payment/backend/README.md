# Backend

.NET 10 solution containing:

- `DuplicatePayment.Api` — payment API and lab runner;
- `DuplicatePayment.Provider` — fake external payment provider;
- `DuplicatePayment.Api.Tests` — concurrent integration tests with PostgreSQL Testcontainers.

Build and test:

```bash
dotnet build DuplicatePayment.slnx
dotnet test DuplicatePayment.slnx
```
