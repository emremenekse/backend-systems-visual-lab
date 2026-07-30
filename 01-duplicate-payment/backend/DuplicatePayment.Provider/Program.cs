using System.Collections.Concurrent;
using DuplicatePayment.Provider;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<ProviderStore>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/charges", async (
    HttpRequest httpRequest,
    ChargeRequest request,
    ProviderStore store,
    CancellationToken cancellationToken) =>
{
    await Task.Delay(180, cancellationToken);

    var idempotencyKey = httpRequest.Headers["Idempotency-Key"].FirstOrDefault();
    return Results.Ok(store.Charge(request, idempotencyKey));
});

app.MapPost("/admin/reset/{paymentIntentId}", (
    string paymentIntentId,
    ProviderStore store) =>
{
    store.Reset(paymentIntentId);
    return Results.NoContent();
});

app.MapGet("/admin/stats/{paymentIntentId}", (
    string paymentIntentId,
    ProviderStore store) =>
{
    return Results.Ok(store.GetStats(paymentIntentId));
});

app.Run();

public sealed class ProviderAssemblyMarker;

namespace DuplicatePayment.Provider
{
    public sealed record ChargeRequest(string PaymentIntentId, long Amount, string Currency);

    public sealed record ChargeResponse(
        string ChargeId,
        string PaymentIntentId,
        bool Replayed);

    public sealed record ProviderStats(
        string PaymentIntentId,
        int Attempts,
        int Charges,
        int Replays);

    public sealed class ProviderStore
    {
        private readonly object _sync = new();
        private readonly ConcurrentDictionary<string, IntentStats> _stats = new();
        private readonly Dictionary<string, StoredCharge> _idempotency = [];

        public ChargeResponse Charge(ChargeRequest request, string? idempotencyKey)
        {
            lock (_sync)
            {
                var stats = _stats.GetOrAdd(request.PaymentIntentId, _ => new IntentStats());
                stats.Attempts++;

                if (!string.IsNullOrWhiteSpace(idempotencyKey)
                    && _idempotency.TryGetValue(idempotencyKey, out var existing))
                {
                    stats.Replays++;
                    return new ChargeResponse(
                        existing.ChargeId,
                        existing.PaymentIntentId,
                        Replayed: true);
                }

                var chargeId = $"ch_{Guid.NewGuid():N}";
                stats.Charges++;

                if (!string.IsNullOrWhiteSpace(idempotencyKey))
                {
                    _idempotency[idempotencyKey] =
                        new StoredCharge(chargeId, request.PaymentIntentId);
                }

                return new ChargeResponse(
                    chargeId,
                    request.PaymentIntentId,
                    Replayed: false);
            }
        }

        public void Reset(string paymentIntentId)
        {
            lock (_sync)
            {
                _stats.TryRemove(paymentIntentId, out _);

                foreach (var key in _idempotency
                             .Where(item => item.Value.PaymentIntentId == paymentIntentId)
                             .Select(item => item.Key)
                             .ToArray())
                {
                    _idempotency.Remove(key);
                }
            }
        }

        public ProviderStats GetStats(string paymentIntentId)
        {
            lock (_sync)
            {
                var stats = _stats.GetOrAdd(paymentIntentId, _ => new IntentStats());
                return new ProviderStats(
                    paymentIntentId,
                    stats.Attempts,
                    stats.Charges,
                    stats.Replays);
            }
        }

        private sealed class IntentStats
        {
            public int Attempts { get; set; }
            public int Charges { get; set; }
            public int Replays { get; set; }
        }

        private sealed record StoredCharge(string ChargeId, string PaymentIntentId);
    }
}
