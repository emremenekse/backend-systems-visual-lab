using System.Net.Http.Json;
using DuplicatePayment.Api;
using Xunit;

namespace DuplicatePayment.Api.Tests;

[Collection(LabCollection.Name)]
public sealed class LabRunTests(LabFixture fixture)
{
    [Fact]
    public async Task Unprotected_mode_creates_two_charges()
    {
        var result = await RunAsync("unprotected");

        Assert.Equal(2, result.Provider.Attempts);
        Assert.Equal(2, result.Provider.Charges);
        Assert.Equal(2, result.Results.Count(item => item.Outcome == "charged"));
        Assert.Contains("invariant failed", result.Summary.Verdict);
    }

    [Fact]
    public async Task Database_constraint_allows_one_charge()
    {
        var result = await RunAsync("database-constraint");

        Assert.Equal(1, result.Provider.Attempts);
        Assert.Equal(1, result.Provider.Charges);
        Assert.Single(result.Results, item => item.Outcome == "charged");
        Assert.Single(result.Results, item => item.Outcome == "duplicate-blocked");
    }

    [Fact]
    public async Task Idempotent_api_replays_the_stored_response()
    {
        var result = await RunAsync("idempotent-api");

        Assert.Equal(1, result.Provider.Attempts);
        Assert.Equal(1, result.Provider.Charges);
        Assert.Single(result.Results, item => item.Replayed);
        Assert.Single(result.Results, item => item.Outcome == "response-replayed");
        Assert.Equal(
            result.Results[0].ProviderChargeId,
            result.Results[1].ProviderChargeId);
    }

    [Fact]
    public async Task Different_keys_cannot_charge_the_same_payment_intent_twice()
    {
        var paymentIntentId = $"intent-{Guid.NewGuid():N}";
        var first = await PayAsync(paymentIntentId, $"key-a-{Guid.NewGuid():N}");
        var second = await PayAsync(paymentIntentId, $"key-b-{Guid.NewGuid():N}");

        Assert.Equal("charged", first.Result.Outcome);
        Assert.Equal("response-replayed", second.Result.Outcome);
        Assert.True(second.Result.Replayed);
        Assert.Equal(first.Result.PaymentId, second.Result.PaymentId);
        Assert.Equal(first.Result.ProviderChargeId, second.Result.ProviderChargeId);
        Assert.DoesNotContain(
            second.Trace,
            item => item.Lane == "provider" && item.Kind == "call");
    }

    private async Task<LabRunResult> RunAsync(string mode)
    {
        var response = await fixture.ApiClient.PostAsJsonAsync(
            "/api/lab/runs",
            new RunLabRequest(mode));
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<LabRunResult>()
               ?? throw new InvalidOperationException("Lab returned no result.");
    }

    private async Task<DirectPaymentResponse> PayAsync(
        string paymentIntentId,
        string idempotencyKey)
    {
        var response = await fixture.ApiClient.PostAsJsonAsync(
            "/api/payments",
            new DirectPaymentRequest(
                "idempotent-api",
                paymentIntentId,
                4999,
                "TRY",
                idempotencyKey));
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<DirectPaymentResponse>()
               ?? throw new InvalidOperationException("Payment API returned no result.");
    }
}
