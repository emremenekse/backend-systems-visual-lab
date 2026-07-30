namespace DuplicatePayment.Api;

public sealed class LabRunner(
    PaymentProcessor processor,
    IPaymentProviderClient provider,
    TraceStore traceStore)
{
    public async Task<LabRunResult> RunAsync(
        PaymentMode mode,
        CancellationToken cancellationToken)
    {
        var runId = Guid.NewGuid();
        var paymentIntentId = $"intent-{runId:N}";
        var idempotencyKey = $"idem-{runId:N}";
        var input = new PaymentInput(paymentIntentId, 4999, "TRY");

        await provider.ResetAsync(paymentIntentId, cancellationToken);

        traceStore.Add(
            runId,
            "lab",
            "lab",
            "start",
            "Scenario started",
            "Two requests will cross the same critical section.");

        var gate = new AsyncBarrier(2);
        var first = processor.ProcessAsync(
            mode,
            input,
            runId,
            "request-a",
            mode == PaymentMode.IdempotentApi ? idempotencyKey : null,
            gate,
            cancellationToken);
        var second = processor.ProcessAsync(
            mode,
            input,
            runId,
            "request-b",
            mode == PaymentMode.IdempotentApi ? idempotencyKey : null,
            gate,
            cancellationToken);

        var results = await Task.WhenAll(first, second);
        var stats = await provider.GetStatsAsync(paymentIntentId, cancellationToken);
        var replayedResponses = results.Count(item => item.Replayed);

        var verdict = mode switch
        {
            PaymentMode.Unprotected =>
                "Both requests created a charge. The invariant failed.",
            PaymentMode.DatabaseConstraint =>
                "The unique index allowed one owner and blocked the duplicate.",
            PaymentMode.IdempotentApi =>
                "One request executed; the other received the stored response.",
            _ => throw new ArgumentOutOfRangeException(nameof(mode))
        };

        traceStore.Add(
            runId,
            "lab",
            "lab",
            "finish",
            "Scenario finished",
            verdict);

        return new LabRunResult(
            runId,
            mode.ToSlug(),
            paymentIntentId,
            results,
            stats,
            new LabRunSummary(
                stats.Attempts,
                stats.Charges,
                replayedResponses,
                verdict),
            traceStore.Snapshot(runId));
    }
}
