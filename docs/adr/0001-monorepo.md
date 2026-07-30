# ADR-0001: Keep the learning labs in one repository

- Status: Accepted
- Date: 2026-07-30

## Context

The labs share a scenario schema, trace protocol, interactive viewer, Remotion components, test utilities, and local infrastructure. Each lab demonstrates a different failure mode but belongs to one curriculum.

## Decision

Use a monorepo. Place each topic under `labs/` and keep shared runtime code under `apps/` and `packages/`.

## Consequences

- A single change can update the scenario contract, viewer, and video together.
- Visual language and trace semantics stay consistent.
- CI can verify every scenario against the same invariants.
- The repository will need selective test execution as the number of labs grows.
- A badly isolated lab can create dependency sprawl, so labs may depend on shared contracts but not on each other.

## Split triggers

Move a lab to a separate repository only if it gains an independent release lifecycle, incompatible runtime, separate ownership model, or reusable product surface.

Topic count alone is not a split trigger.
