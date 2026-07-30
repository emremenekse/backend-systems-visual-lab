# Backend Systems Visual Lab

A working lab for learning senior backend concepts with real code and simple visuals.

For every topic we will:

1. build the naive version;
2. reproduce the failure;
3. visualize what happened;
4. implement and compare the fixes.

## First lab

### What happens when “Pay” is clicked twice?

We will compare:

- no protection;
- a database unique constraint;
- an idempotency key with response replay.

The backend will produce the real event trace. The web app and Remotion video will visualize the same trace.

[Open the first lab](labs/01-duplicate-payment/README.md)

## Structure

```text
apps/api       runnable backend
apps/web       interactive visual
apps/video     Remotion video
labs           one folder per topic
packages       shared contracts
infra          local dependencies
```

This stays as one repository while the labs share the same tools and visual system.

## Next topics

- Race conditions and overselling
- Transactional outbox
- Retry storms and backpressure
- Cache stampede
- Zero-downtime migrations
- Service boundaries
- SLO, capacity, and cost

[See the roadmap](ROADMAP.md)
