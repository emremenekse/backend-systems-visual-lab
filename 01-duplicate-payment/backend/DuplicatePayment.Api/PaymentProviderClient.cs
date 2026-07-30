using System.Net.Http.Json;

namespace DuplicatePayment.Api;

public interface IPaymentProviderClient
{
    Task ResetAsync(string paymentIntentId, CancellationToken cancellationToken);

    Task<ProviderChargeResponse> ChargeAsync(
        ProviderChargeRequest request,
        string? idempotencyKey,
        CancellationToken cancellationToken);

    Task<ProviderStats> GetStatsAsync(
        string paymentIntentId,
        CancellationToken cancellationToken);
}

public sealed class PaymentProviderClient(HttpClient httpClient) : IPaymentProviderClient
{
    public async Task ResetAsync(
        string paymentIntentId,
        CancellationToken cancellationToken)
    {
        var response = await httpClient.PostAsync(
            $"/admin/reset/{Uri.EscapeDataString(paymentIntentId)}",
            content: null,
            cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<ProviderChargeResponse> ChargeAsync(
        ProviderChargeRequest request,
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, "/charges")
        {
            Content = JsonContent.Create(request)
        };

        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            message.Headers.Add("Idempotency-Key", idempotencyKey);
        }

        var response = await httpClient.SendAsync(message, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ProviderChargeResponse>(
                   cancellationToken)
               ?? throw new InvalidOperationException("Provider returned an empty response.");
    }

    public async Task<ProviderStats> GetStatsAsync(
        string paymentIntentId,
        CancellationToken cancellationToken)
    {
        return await httpClient.GetFromJsonAsync<ProviderStats>(
                   $"/admin/stats/{Uri.EscapeDataString(paymentIntentId)}",
                   cancellationToken)
               ?? throw new InvalidOperationException("Provider returned empty stats.");
    }
}
