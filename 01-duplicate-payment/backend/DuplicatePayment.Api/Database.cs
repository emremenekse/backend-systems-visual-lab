using Npgsql;

namespace DuplicatePayment.Api;

public sealed class DatabaseInitializer(
    NpgsqlDataSource dataSource,
    ILogger<DatabaseInitializer> logger) : IHostedService
{
    private const string SchemaSql = """
        CREATE TABLE IF NOT EXISTS payments (
            id uuid PRIMARY KEY,
            run_id uuid NOT NULL,
            mode text NOT NULL,
            payment_intent_id text NOT NULL,
            amount bigint NOT NULL,
            currency text NOT NULL,
            provider_charge_id text NULL,
            status text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_guarded_payment_intent
            ON payments (mode, payment_intent_id)
            WHERE mode IN ('database-constraint', 'idempotent-api');

        CREATE TABLE IF NOT EXISTS idempotency_records (
            idempotency_key text PRIMARY KEY,
            request_hash text NOT NULL,
            owner_request_id text NOT NULL,
            state text NOT NULL,
            response_json jsonb NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            completed_at timestamptz NULL
        );
        """;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        Exception? lastError = null;

        for (var attempt = 1; attempt <= 20; attempt++)
        {
            try
            {
                await using var command = dataSource.CreateCommand(SchemaSql);
                await command.ExecuteNonQueryAsync(cancellationToken);
                logger.LogInformation("Database schema is ready.");
                return;
            }
            catch (Exception exception) when (attempt < 20)
            {
                lastError = exception;
                logger.LogWarning(
                    "Database is not ready. Attempt {Attempt}/20.",
                    attempt);
                await Task.Delay(TimeSpan.FromMilliseconds(500), cancellationToken);
            }
        }

        throw new InvalidOperationException("Database schema initialization failed.", lastError);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
