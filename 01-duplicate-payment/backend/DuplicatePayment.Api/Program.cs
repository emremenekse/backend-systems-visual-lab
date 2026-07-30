using DuplicatePayment.Api;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

builder.Services.AddSingleton(_ => NpgsqlDataSource.Create(connectionString));
builder.Services.AddSingleton<TraceStore>();
builder.Services.AddHostedService<DatabaseInitializer>();
builder.Services.AddScoped<PaymentProcessor>();
builder.Services.AddScoped<LabRunner>();
builder.Services.AddHttpClient<IPaymentProviderClient, PaymentProviderClient>(client =>
{
    var baseUrl = builder.Configuration["PaymentProvider:BaseUrl"] ?? "http://localhost:8081";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:4173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/lab/runs", async (
    RunLabRequest request,
    LabRunner runner,
    CancellationToken cancellationToken) =>
{
    if (!PaymentModeParser.TryParse(request.Mode, out var mode))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["mode"] = ["Use unprotected, database-constraint, or idempotent-api."]
        });
    }

    var result = await runner.RunAsync(mode, cancellationToken);
    return Results.Ok(result);
});

app.MapPost("/api/payments", async (
    DirectPaymentRequest request,
    PaymentProcessor processor,
    CancellationToken cancellationToken) =>
{
    if (!PaymentModeParser.TryParse(request.Mode, out var mode))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["mode"] = ["Use unprotected, database-constraint, or idempotent-api."]
        });
    }

    if (mode == PaymentMode.IdempotentApi && string.IsNullOrWhiteSpace(request.IdempotencyKey))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["idempotencyKey"] = ["An idempotency key is required in idempotent-api mode."]
        });
    }

    var runId = Guid.NewGuid();
    var result = await processor.ProcessAsync(
        mode,
        new PaymentInput(request.PaymentIntentId, request.Amount, request.Currency),
        runId,
        "request",
        request.IdempotencyKey,
        gate: null,
        cancellationToken);

    return Results.Ok(new DirectPaymentResponse(
        result,
        processor.GetTrace(runId)));
});

app.Run();

public sealed class ApiAssemblyMarker;
