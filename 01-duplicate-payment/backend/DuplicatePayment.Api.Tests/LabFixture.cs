using System.Net.Http.Json;
using DotNet.Testcontainers.Builders;
using DuplicatePayment.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using Xunit;

namespace DuplicatePayment.Api.Tests;

public sealed class LabFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithWaitStrategy(
            Wait.ForUnixContainer()
                .UntilCommandIsCompleted("pg_isready", "-U", "postgres"))
        .Build();

    private WebApplicationFactory<ProviderAssemblyMarker>? _providerFactory;
    private WebApplicationFactory<ApiAssemblyMarker>? _apiFactory;

    public HttpClient ApiClient { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        _providerFactory = new WebApplicationFactory<ProviderAssemblyMarker>();
        var providerClient = _providerFactory.CreateClient();
        var provider = new TestPaymentProviderClient(providerClient);

        _apiFactory = new LabApiFactory(_postgres.GetConnectionString(), provider);
        ApiClient = _apiFactory.CreateClient();

        var health = await ApiClient.GetAsync("/health");
        health.EnsureSuccessStatusCode();
    }

    public async Task DisposeAsync()
    {
        ApiClient?.Dispose();
        if (_apiFactory is not null)
        {
            await _apiFactory.DisposeAsync();
        }

        if (_providerFactory is not null)
        {
            await _providerFactory.DisposeAsync();
        }

        await _postgres.DisposeAsync();
    }

    private sealed class LabApiFactory(
        string connectionString,
        IPaymentProviderClient provider)
        : WebApplicationFactory<ApiAssemblyMarker>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("ConnectionStrings:Postgres", connectionString);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IPaymentProviderClient>();
                services.AddSingleton(provider);
            });
        }
    }

    private sealed class TestPaymentProviderClient(HttpClient client)
        : IPaymentProviderClient
    {
        public async Task ResetAsync(
            string paymentIntentId,
            CancellationToken cancellationToken)
        {
            var response = await client.PostAsync(
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

            var response = await client.SendAsync(message, cancellationToken);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<ProviderChargeResponse>(
                       cancellationToken)
                   ?? throw new InvalidOperationException("Provider returned no charge.");
        }

        public async Task<ProviderStats> GetStatsAsync(
            string paymentIntentId,
            CancellationToken cancellationToken)
        {
            return await client.GetFromJsonAsync<ProviderStats>(
                       $"/admin/stats/{Uri.EscapeDataString(paymentIntentId)}",
                       cancellationToken)
                   ?? throw new InvalidOperationException("Provider returned no stats.");
        }
    }
}

[CollectionDefinition(Name)]
public sealed class LabCollection : ICollectionFixture<LabFixture>
{
    public const string Name = "duplicate-payment-lab";
}
