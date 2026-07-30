# Roadmap

The sequence moves from local correctness to system-wide and organizational decisions. A topic is complete only when the failure can be reproduced and the proposed fix can be measured.

## Phase 1 — Correctness under concurrency

### 01. Duplicate payment

- Competing requests with the same business intent
- Database uniqueness versus API idempotency
- Request fingerprinting and response replay
- Invariant: one business effect

**Kill criterion:** the lab is not complete if the duplicate can only be demonstrated with mocked persistence.

### 02. Overselling

- Lost updates and write skew
- Pessimistic versus optimistic concurrency
- Contention, retries, and fairness
- Invariant: inventory never becomes negative

**Kill criterion:** the solution fails or becomes unusable at the documented contention level.

## Phase 2 — Correctness across boundaries

### 03. Lost event

- The dual-write problem
- Transactional outbox and relay ownership
- At-least-once delivery and consumer idempotency
- Invariant: every committed state change eventually produces its event

### 04. Retry storm

- Timeout budgets and retry amplification
- Exponential backoff with jitter
- Dead-letter queues and poison messages
- Backpressure and bounded work

**Kill criterion:** recovery traffic can keep the dependency unavailable after the original incident ends.

## Phase 3 — Performance and overload

### 05. Cache stampede

- Hot-key expiration
- Request coalescing
- Stale-while-revalidate
- Freshness versus availability

### 06. Overload

- Queue growth and latency collapse
- Admission control
- Load shedding and priority
- Capacity model versus benchmark evidence

**Kill criterion:** the system accepts more work while violating its documented latency objective.

## Phase 4 — Change without downtime

### 07. Schema migration

- Mixed-version deployment
- Expand-and-contract
- Backfill, verification, and rollback
- Ownership of destructive cleanup

### 08. Service extraction

- Modular monolith baseline
- Coupling and change-frequency evidence
- Strangler migration
- Data ownership and operational cost

**Kill criterion:** the service split is justified only by expected future scale.

## Phase 5 — Principal-level decisions

### 09. Reliability budget

- SLI and SLO selection
- Error budgets
- Capacity and redundancy cost
- Reliability policy across teams

**Kill criterion:** the proposed target has no traffic model, cost estimate, or escalation policy.
