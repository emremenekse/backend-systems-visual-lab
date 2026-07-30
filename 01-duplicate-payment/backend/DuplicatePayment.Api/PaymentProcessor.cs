using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Npgsql;

namespace DuplicatePayment.Api;

public sealed class PaymentProcessor(
    NpgsqlDataSource dataSource,
    IPaymentProviderClient provider,
    TraceStore traceStore)
{
    public IReadOnlyList<TraceEvent> GetTrace(Guid runId) => traceStore.Snapshot(runId);

    public Task<PaymentResult> ProcessAsync(
        PaymentMode mode,
        PaymentInput input,
        Guid runId,
        string requestId,
        string? idempotencyKey,
        AsyncBarrier? gate,
        CancellationToken cancellationToken)
    {
        traceStore.Add(
            runId,
            requestId,
            requestId,
            "request",
            "Request received",
            $"{input.PaymentIntentId} · {mode.ToSlug()}");

        return mode switch
        {
            PaymentMode.Unprotected => ProcessUnprotectedAsync(
                input,
                runId,
                requestId,
                gate,
                cancellationToken),
            PaymentMode.DatabaseConstraint => ProcessWithDatabaseConstraintAsync(
                input,
                runId,
                requestId,
                gate,
                cancellationToken),
            PaymentMode.IdempotentApi => ProcessIdempotentlyAsync(
                input,
                runId,
                requestId,
                idempotencyKey
                    ?? throw new InvalidOperationException("Idempotency key is required."),
                gate,
                cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(mode))
        };
    }

    private async Task<PaymentResult> ProcessUnprotectedAsync(
        PaymentInput input,
        Guid runId,
        string requestId,
        AsyncBarrier? gate,
        CancellationToken cancellationToken)
    {
        traceStore.Add(
            runId,
            requestId,
            "database",
            "read",
            "No database guard",
            "Both requests are allowed through.");

        if (gate is not null)
        {
            await gate.SignalAndWaitAsync(cancellationToken);
        }

        var charge = await ChargeProviderAsync(
            input,
            runId,
            requestId,
            idempotencyKey: null,
            cancellationToken);

        var paymentId = Guid.NewGuid();
        await InsertPaymentAsync(
            paymentId,
            runId,
            PaymentMode.Unprotected,
            input,
            charge.ChargeId,
            "succeeded",
            onConflictDoNothing: false,
            cancellationToken);

        traceStore.Add(
            runId,
            requestId,
            "database",
            "write",
            "Payment inserted",
            $"Row {Short(paymentId)} committed without a uniqueness guard.");

        return new PaymentResult(
            requestId,
            "charged",
            Replayed: false,
            paymentId,
            charge.ChargeId);
    }

    private async Task<PaymentResult> ProcessWithDatabaseConstraintAsync(
        PaymentInput input,
        Guid runId,
        string requestId,
        AsyncBarrier? gate,
        CancellationToken cancellationToken)
    {
        traceStore.Add(
            runId,
            requestId,
            "database",
            "guard",
            "Preparing guarded insert",
            "A unique index protects mode + payment intent.");

        if (gate is not null)
        {
            await gate.SignalAndWaitAsync(cancellationToken);
        }

        var paymentId = Guid.NewGuid();
        var ownsPayment = await InsertPaymentAsync(
            paymentId,
            runId,
            PaymentMode.DatabaseConstraint,
            input,
            providerChargeId: null,
            "pending",
            onConflictDoNothing: true,
            cancellationToken);

        if (!ownsPayment)
        {
            traceStore.Add(
                runId,
                requestId,
                "database",
                "conflict",
                "Duplicate blocked",
                "The unique index rejected the second insert.");

            var existing = await WaitForPaymentAsync(
                PaymentMode.DatabaseConstraint,
                input.PaymentIntentId,
                cancellationToken);

            return new PaymentResult(
                requestId,
                "duplicate-blocked",
                Replayed: false,
                existing.PaymentId,
                existing.ProviderChargeId);
        }

        traceStore.Add(
            runId,
            requestId,
            "database",
            "write",
            "Guard acquired",
            $"Pending row {Short(paymentId)} owns the payment intent.");

        var charge = await ChargeProviderAsync(
            input,
            runId,
            requestId,
            idempotencyKey: null,
            cancellationToken);

        await CompletePaymentAsync(paymentId, charge.ChargeId, cancellationToken);

        traceStore.Add(
            runId,
            requestId,
            "database",
            "write",
            "Payment completed",
            "The guarded row now contains the provider charge.");

        return new PaymentResult(
            requestId,
            "charged",
            Replayed: false,
            paymentId,
            charge.ChargeId);
    }

    private async Task<PaymentResult> ProcessIdempotentlyAsync(
        PaymentInput input,
        Guid runId,
        string requestId,
        string idempotencyKey,
        AsyncBarrier? gate,
        CancellationToken cancellationToken)
    {
        var requestHash = CreateRequestHash(input);

        traceStore.Add(
            runId,
            requestId,
            "database",
            "guard",
            "Inserting unique idempotency key",
            $"A primary-key insert for {ShortKey(idempotencyKey)} atomically selects one owner.");

        if (gate is not null)
        {
            await gate.SignalAndWaitAsync(cancellationToken);
        }

        var ownsKey = await TryClaimIdempotencyKeyAsync(
            idempotencyKey,
            requestHash,
            requestId,
            cancellationToken);

        if (!ownsKey)
        {
            traceStore.Add(
                runId,
                requestId,
                "database",
                "wait",
                "Unique-key conflict",
                "The duplicate waits for the winning insert to persist its response.");

            var stored = await WaitForIdempotencyResponseAsync(
                idempotencyKey,
                requestHash,
                cancellationToken);

            traceStore.Add(
                runId,
                requestId,
                requestId,
                "replay",
                "Response replayed",
                "No provider call is made by the second request.");

            return new PaymentResult(
                requestId,
                "response-replayed",
                Replayed: true,
                stored.PaymentId,
                stored.ProviderChargeId);
        }

        traceStore.Add(
            runId,
            requestId,
            "database",
            "write",
            "Unique-key insert succeeded",
            "This request owns execution and response persistence.");

        var paymentId = Guid.NewGuid();
        var ownsPayment = await InsertPaymentAsync(
            paymentId,
            runId,
            PaymentMode.IdempotentApi,
            input,
            providerChargeId: null,
            "pending",
            onConflictDoNothing: true,
            cancellationToken);

        if (!ownsPayment)
        {
            traceStore.Add(
                runId,
                requestId,
                "database",
                "conflict",
                "Payment intent already guarded",
                "A different key cannot create another charge for this intent.");

            var existing = await WaitForPaymentAsync(
                PaymentMode.IdempotentApi,
                input.PaymentIntentId,
                cancellationToken);
            var existingChargeId = existing.ProviderChargeId
                ?? throw new InvalidOperationException(
                    "The guarded payment completed without a provider charge.");
            var existingResponse = new StoredIdempotencyResponse(
                "charged",
                existing.PaymentId,
                existingChargeId);

            await CompleteIdempotencyKeyAsync(
                idempotencyKey,
                existingResponse,
                cancellationToken);

            traceStore.Add(
                runId,
                requestId,
                "database",
                "write",
                "Existing response persisted",
                "This key now resolves to the original successful payment.");

            return new PaymentResult(
                requestId,
                "response-replayed",
                Replayed: true,
                existing.PaymentId,
                existingChargeId);
        }

        var charge = await ChargeProviderAsync(
            input,
            runId,
            requestId,
            idempotencyKey,
            cancellationToken);

        await CompletePaymentAsync(paymentId, charge.ChargeId, cancellationToken);

        var storedResponse = new StoredIdempotencyResponse(
            "charged",
            paymentId,
            charge.ChargeId);
        await CompleteIdempotencyKeyAsync(
            idempotencyKey,
            storedResponse,
            cancellationToken);

        traceStore.Add(
            runId,
            requestId,
            "database",
            "write",
            "Response persisted",
            "Retries can now replay the same successful response.");

        return new PaymentResult(
            requestId,
            "charged",
            Replayed: false,
            paymentId,
            charge.ChargeId);
    }

    private async Task<ProviderChargeResponse> ChargeProviderAsync(
        PaymentInput input,
        Guid runId,
        string requestId,
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        traceStore.Add(
            runId,
            requestId,
            "provider",
            "call",
            "Calling payment provider",
            idempotencyKey is null
                ? "No provider idempotency key."
                : "The same idempotency key crosses the service boundary.");

        var charge = await provider.ChargeAsync(
            new ProviderChargeRequest(
                input.PaymentIntentId,
                input.Amount,
                input.Currency),
            idempotencyKey,
            cancellationToken);

        traceStore.Add(
            runId,
            requestId,
            "provider",
            charge.Replayed ? "replay" : "effect",
            charge.Replayed ? "Provider replayed charge" : "Provider created charge",
            charge.ChargeId);

        return charge;
    }

    private async Task<bool> InsertPaymentAsync(
        Guid paymentId,
        Guid runId,
        PaymentMode mode,
        PaymentInput input,
        string? providerChargeId,
        string status,
        bool onConflictDoNothing,
        CancellationToken cancellationToken)
    {
        var sql = """
            INSERT INTO payments (
                id,
                run_id,
                mode,
                payment_intent_id,
                amount,
                currency,
                provider_charge_id,
                status)
            VALUES (
                @id,
                @run_id,
                @mode,
                @payment_intent_id,
                @amount,
                @currency,
                @provider_charge_id,
                @status)
            """ + (onConflictDoNothing
            ? " ON CONFLICT DO NOTHING"
            : string.Empty);

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", paymentId);
        command.Parameters.AddWithValue("run_id", runId);
        command.Parameters.AddWithValue("mode", mode.ToSlug());
        command.Parameters.AddWithValue("payment_intent_id", input.PaymentIntentId);
        command.Parameters.AddWithValue("amount", input.Amount);
        command.Parameters.AddWithValue("currency", input.Currency);
        command.Parameters.AddWithValue(
            "provider_charge_id",
            providerChargeId is null ? DBNull.Value : providerChargeId);
        command.Parameters.AddWithValue("status", status);

        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private async Task CompletePaymentAsync(
        Guid paymentId,
        string providerChargeId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE payments
            SET provider_charge_id = @provider_charge_id,
                status = 'succeeded'
            WHERE id = @id
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("id", paymentId);
        command.Parameters.AddWithValue("provider_charge_id", providerChargeId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<(Guid PaymentId, string? ProviderChargeId)> WaitForPaymentAsync(
        PaymentMode mode,
        string paymentIntentId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, provider_charge_id
            FROM payments
            WHERE mode = @mode
              AND payment_intent_id = @payment_intent_id
              AND status = 'succeeded'
            """;

        for (var attempt = 0; attempt < 60; attempt++)
        {
            await using var command = dataSource.CreateCommand(sql);
            command.Parameters.AddWithValue("mode", mode.ToSlug());
            command.Parameters.AddWithValue("payment_intent_id", paymentIntentId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                return (
                    reader.GetGuid(0),
                    reader.IsDBNull(1) ? null : reader.GetString(1));
            }

            await Task.Delay(50, cancellationToken);
        }

        throw new TimeoutException("The winning payment did not complete.");
    }

    private async Task<bool> TryClaimIdempotencyKeyAsync(
        string idempotencyKey,
        string requestHash,
        string requestId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO idempotency_records (
                idempotency_key,
                request_hash,
                owner_request_id,
                state)
            VALUES (
                @idempotency_key,
                @request_hash,
                @owner_request_id,
                'processing')
            ON CONFLICT DO NOTHING
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("idempotency_key", idempotencyKey);
        command.Parameters.AddWithValue("request_hash", requestHash);
        command.Parameters.AddWithValue("owner_request_id", requestId);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private async Task<StoredIdempotencyResponse> WaitForIdempotencyResponseAsync(
        string idempotencyKey,
        string requestHash,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT request_hash, response_json::text
            FROM idempotency_records
            WHERE idempotency_key = @idempotency_key
            """;

        for (var attempt = 0; attempt < 60; attempt++)
        {
            await using var command = dataSource.CreateCommand(sql);
            command.Parameters.AddWithValue("idempotency_key", idempotencyKey);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                var storedHash = reader.GetString(0);
                if (!CryptographicOperations.FixedTimeEquals(
                        Convert.FromHexString(storedHash),
                        Convert.FromHexString(requestHash)))
                {
                    throw new InvalidOperationException(
                        "The idempotency key was reused with a different request.");
                }

                if (!reader.IsDBNull(1))
                {
                    return JsonSerializer.Deserialize<StoredIdempotencyResponse>(
                               reader.GetString(1))
                           ?? throw new InvalidOperationException(
                               "The stored idempotency response is invalid.");
                }
            }

            await Task.Delay(50, cancellationToken);
        }

        throw new TimeoutException("The idempotent response was not completed.");
    }

    private async Task CompleteIdempotencyKeyAsync(
        string idempotencyKey,
        StoredIdempotencyResponse response,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE idempotency_records
            SET state = 'completed',
                response_json = @response_json::jsonb,
                completed_at = now()
            WHERE idempotency_key = @idempotency_key
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("idempotency_key", idempotencyKey);
        command.Parameters.AddWithValue(
            "response_json",
            JsonSerializer.Serialize(response));
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string CreateRequestHash(PaymentInput input)
    {
        var payload = $"{input.PaymentIntentId}|{input.Amount}|{input.Currency}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)));
    }

    private static string Short(Guid value) => value.ToString("N")[..8];

    private static string ShortKey(string value) =>
        value[^Math.Min(8, value.Length)..];
}
