# API

This application will execute the failure scenarios and emit trace events from real runtime behavior.

The first implementation must support:

- two concurrent payment requests;
- a deterministic concurrency barrier;
- unprotected, database-constraint, and idempotent modes;
- a real database in integration tests;
- structured trace output consumed by the web and video applications.

Framework selection is intentionally deferred until the first lab implementation. The scenario contract should not depend on the framework.
