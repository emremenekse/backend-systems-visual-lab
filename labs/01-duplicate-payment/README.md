# Lab 01: Duplicate payment

## Question

What happens when the same payment request arrives twice at the same time?

## Rule

One payment intent must create at most one charge.

## Versions

1. **Unprotected:** both requests may charge.
2. **Database constraint:** only one record survives.
3. **Idempotent API:** one charge is created and the saved response is replayed.

## What we will build

- two concurrent requests;
- a real database;
- a fake payment provider that counts charges;
- an event trace from the backend;
- an interactive visualization;
- a short Remotion video.

The visual must show where the requests overlap and why each solution behaves differently.

## Status

Scenario defined. Implementation not started.
