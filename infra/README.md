# Infrastructure

Local infrastructure will contain only dependencies required to reproduce a lab:

- PostgreSQL for the first concurrency labs;
- a controllable payment-provider fake;
- later, a queue and cache when their failure modes enter the curriculum.

Infrastructure should expose explicit failure controls instead of relying on random outages.
