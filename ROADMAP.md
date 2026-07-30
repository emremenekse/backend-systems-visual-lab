# Roadmap

Each topic gets a runnable failure, a visual explanation, and a comparison of fixes.

1. **Duplicate payment** — idempotency
2. **Overselling** — locking and optimistic concurrency
3. **Lost event** — transactional outbox
4. **Retry storm** — backoff, DLQ, and backpressure
5. **Cache stampede** — request coalescing
6. **Overload** — admission control and load shedding
7. **Schema migration** — expand and contract
8. **Service extraction** — boundaries and migration
9. **Reliability budget** — SLO, capacity, and cost

We will add detail only when a lab starts.

## Expansion tracks

Future labs can also include the production layer around the backend:

- **Platform** — Kubernetes, Terraform, Helm, Argo CD, and CI/CD
- **Security** — IAM, secrets management, image scanning, SAST/DAST,
  dependency security, and container security
- **Policy** — Kyverno/OPA, network policies, least privilege, and audit rules
- **Operations** — Prometheus/Grafana, OpenTelemetry, incident response, and
  safe deployment strategies

These are not a checklist for every project. Each lab will add only the tools
needed to expose, prevent, observe, or recover from its specific failure.
