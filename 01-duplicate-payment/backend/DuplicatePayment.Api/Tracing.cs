using System.Collections.Concurrent;

namespace DuplicatePayment.Api;

public sealed class TraceStore
{
    private readonly ConcurrentDictionary<Guid, RunTrace> _runs = new();

    public void Add(
        Guid runId,
        string requestId,
        string lane,
        string kind,
        string label,
        string detail)
    {
        var run = _runs.GetOrAdd(runId, _ => new RunTrace());
        run.Add(requestId, lane, kind, label, detail);
    }

    public IReadOnlyList<TraceEvent> Snapshot(Guid runId)
    {
        return _runs.TryGetValue(runId, out var run)
            ? run.Snapshot()
            : [];
    }

    private sealed class RunTrace
    {
        private readonly object _sync = new();
        private readonly DateTimeOffset _startedAt = DateTimeOffset.UtcNow;
        private readonly List<TraceEvent> _events = [];
        private int _sequence;

        public void Add(
            string requestId,
            string lane,
            string kind,
            string label,
            string detail)
        {
            lock (_sync)
            {
                _events.Add(new TraceEvent(
                    ++_sequence,
                    Math.Round((DateTimeOffset.UtcNow - _startedAt).TotalMilliseconds, 1),
                    lane,
                    kind,
                    label,
                    detail,
                    requestId));
            }
        }

        public IReadOnlyList<TraceEvent> Snapshot()
        {
            lock (_sync)
            {
                return _events.OrderBy(item => item.Sequence).ToArray();
            }
        }
    }
}

public sealed class AsyncBarrier(int participants)
{
    private readonly TaskCompletionSource _ready =
        new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int _arrived;

    public async Task SignalAndWaitAsync(CancellationToken cancellationToken)
    {
        if (Interlocked.Increment(ref _arrived) == participants)
        {
            _ready.TrySetResult();
        }

        await _ready.Task.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken);
    }
}
