namespace DuplicatePayment.Api;

public enum PaymentMode
{
    Unprotected,
    DatabaseConstraint,
    IdempotentApi
}

public static class PaymentModeParser
{
    public static bool TryParse(string? value, out PaymentMode mode)
    {
        mode = value switch
        {
            "unprotected" => PaymentMode.Unprotected,
            "database-constraint" => PaymentMode.DatabaseConstraint,
            "idempotent-api" => PaymentMode.IdempotentApi,
            _ => default
        };

        return value is "unprotected" or "database-constraint" or "idempotent-api";
    }

    public static string ToSlug(this PaymentMode mode) => mode switch
    {
        PaymentMode.Unprotected => "unprotected",
        PaymentMode.DatabaseConstraint => "database-constraint",
        PaymentMode.IdempotentApi => "idempotent-api",
        _ => throw new ArgumentOutOfRangeException(nameof(mode))
    };
}

public sealed record RunLabRequest(string Mode);

public sealed record DirectPaymentRequest(
    string Mode,
    string PaymentIntentId,
    long Amount,
    string Currency,
    string? IdempotencyKey);

public sealed record PaymentInput(string PaymentIntentId, long Amount, string Currency);

public sealed record PaymentResult(
    string RequestId,
    string Outcome,
    bool Replayed,
    Guid? PaymentId,
    string? ProviderChargeId);

public sealed record DirectPaymentResponse(
    PaymentResult Result,
    IReadOnlyList<TraceEvent> Trace);

public sealed record ProviderChargeRequest(string PaymentIntentId, long Amount, string Currency);

public sealed record ProviderChargeResponse(
    string ChargeId,
    string PaymentIntentId,
    bool Replayed);

public sealed record ProviderStats(
    string PaymentIntentId,
    int Attempts,
    int Charges,
    int Replays);

public sealed record TraceEvent(
    int Sequence,
    double OffsetMs,
    string Lane,
    string Kind,
    string Label,
    string Detail,
    string RequestId);

public sealed record LabRunSummary(
    int ProviderAttempts,
    int ProviderCharges,
    int ReplayedResponses,
    string Verdict);

public sealed record LabRunResult(
    Guid RunId,
    string Mode,
    string PaymentIntentId,
    IReadOnlyList<PaymentResult> Results,
    ProviderStats Provider,
    LabRunSummary Summary,
    IReadOnlyList<TraceEvent> Trace);

internal sealed record StoredIdempotencyResponse(
    string Outcome,
    Guid PaymentId,
    string ProviderChargeId);
