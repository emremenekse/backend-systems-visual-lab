# Tests

The integration tests start a real PostgreSQL container, send two requests
through an explicit concurrency barrier, and verify provider charge counts for
all three modes.

```bash
dotnet test ../backend/DuplicatePayment.slnx
```
