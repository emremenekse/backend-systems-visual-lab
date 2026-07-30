import {
  Activity,
  CheckCircle2,
  CircleDollarSign,
  Database,
  GitCompareArrows,
  Play,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { runLab } from "./api";
import { laneLabels, laneOrder, modeCopy, shortId } from "./trace";
import type {
  LabRunResult,
  PaymentMode,
  TraceEvent,
  TraceLane,
} from "./types";

const modes: PaymentMode[] = [
  "unprotected",
  "database-constraint",
  "idempotent-api",
];

const laneStyles: Record<TraceLane, string> = {
  lab: "border-violet-400/35 bg-violet-400/10",
  "request-a": "border-cyan-400/35 bg-cyan-400/10",
  "request-b": "border-sky-400/35 bg-sky-400/10",
  database: "border-amber-400/35 bg-amber-400/10",
  provider: "border-emerald-400/35 bg-emerald-400/10",
};

function TraceCard({ event }: { event: TraceEvent }) {
  return (
    <article
      className={`trace-card ${laneStyles[event.lane]}`}
      aria-label={`${laneLabels[event.lane]} at ${event.offsetMs} milliseconds: ${event.label}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="event-kind">{event.kind}</span>
        <span className="font-mono text-[11px] text-slate-500">
          +{event.offsetMs.toFixed(1)}ms
        </span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-slate-100">
        {event.label}
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">{event.detail}</p>
    </article>
  );
}

function EmptyTimeline() {
  return (
    <div className="empty-state">
      <GitCompareArrows aria-hidden="true" className="h-7 w-7" />
      <div>
        <p className="font-medium text-slate-200">No runtime trace yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Select a protection mode and run two concurrent requests.
        </p>
      </div>
    </div>
  );
}

function DesktopTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <div className="min-w-[980px]">
        <div className="timeline-grid border-b border-slate-800 pb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-600">
            Seq
          </span>
          {laneOrder.map((lane) => (
            <span
              className="text-center text-xs font-medium text-slate-400"
              key={lane}
            >
              {laneLabels[lane]}
            </span>
          ))}
        </div>

        <ol className="mt-3 space-y-2">
          {events.map((event) => (
            <li className="timeline-grid items-start" key={event.sequence}>
              <span className="pt-3 font-mono text-[11px] text-slate-600">
                {String(event.sequence).padStart(2, "0")}
              </span>
              {laneOrder.map((lane) => (
                <div key={lane}>
                  {event.lane === lane ? <TraceCard event={event} /> : null}
                </div>
              ))}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function MobileTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <ol className="space-y-3 lg:hidden">
      {events.map((event) => (
        <li key={event.sequence}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="lane-badge">{laneLabels[event.lane]}</span>
            <span className="font-mono text-[11px] text-slate-600">
              #{event.sequence}
            </span>
          </div>
          <TraceCard event={event} />
        </li>
      ))}
    </ol>
  );
}

export function App() {
  const [mode, setMode] = useState<PaymentMode>("unprotected");
  const [result, setResult] = useState<LabRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const runScenario = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsRunning(true);
    setError(null);

    try {
      const nextResult = await runLab(mode, controller.signal);
      setResult(nextResult);
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") {
        return;
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : "The lab could not be executed.",
      );
    } finally {
      if (controllerRef.current === controller) {
        setIsRunning(false);
      }
    }
  };

  const selectedCopy = modeCopy[mode];
  const hasFailure = result?.summary.providerCharges === 2;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a className="skip-link" href="#main-content">
        Skip to lab controls
      </a>

      <header className="border-b border-slate-800/80">
        <div className="page-shell flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="logo-mark" aria-hidden="true">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Backend Systems Visual Lab
              </p>
              <p className="text-xs text-slate-500">01 / Duplicate payment</p>
            </div>
          </div>
          <span className="live-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            live backend
          </span>
        </div>
      </header>

      <main className="page-shell py-8 md:py-12" id="main-content">
        <section className="max-w-3xl">
          <p className="eyebrow">Concurrency experiment</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
            What happens when
            <span className="text-cyan-300"> Pay </span>
            is clicked twice?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            Two requests cross the same critical section. Change the protection
            mode and inspect the real API, PostgreSQL, and provider events.
          </p>
        </section>

        <section className="mt-9" aria-labelledby="mode-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow" id="mode-heading">
                Protection mode
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {selectedCopy.risk}
              </p>
            </div>
            <button
              className="run-button"
              disabled={isRunning}
              onClick={runScenario}
              type="button"
            >
              {isRunning ? (
                <RefreshCw
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Play aria-hidden="true" className="h-4 w-4 fill-current" />
              )}
              {isRunning ? "Running requests…" : "Run two requests"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {modes.map((item, index) => {
              const copy = modeCopy[item];
              const isSelected = item === mode;

              return (
                <button
                  aria-pressed={isSelected}
                  className="mode-button"
                  data-selected={isSelected}
                  key={item}
                  onClick={() => setMode(item)}
                  type="button"
                >
                  <span className="mode-number">0{index + 1}</span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">
                      {copy.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {copy.mechanism}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div aria-live="assertive">
          {error ? (
            <div className="error-panel" role="alert">
              <TriangleAlert aria-hidden="true" className="h-5 w-5" />
              <div>
                <p className="font-medium">Scenario failed</p>
                <p className="mt-1 break-all text-sm text-rose-200/75">
                  {error}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {result ? (
          <section className="mt-8" aria-labelledby="result-heading">
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="metric-card">
                <CircleDollarSign
                  aria-hidden="true"
                  className="h-5 w-5 text-emerald-300"
                />
                <div>
                  <p className="metric-value">
                    {result.summary.providerCharges}
                  </p>
                  <p className="metric-label">Provider charges</p>
                </div>
              </article>
              <article className="metric-card">
                <Database
                  aria-hidden="true"
                  className="h-5 w-5 text-amber-300"
                />
                <div>
                  <p className="metric-value">
                    {result.summary.providerAttempts}
                  </p>
                  <p className="metric-label">Provider attempts</p>
                </div>
              </article>
              <article className="metric-card">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-5 w-5 text-cyan-300"
                />
                <div>
                  <p className="metric-value">
                    {result.summary.replayedResponses}
                  </p>
                  <p className="metric-label">Response replays</p>
                </div>
              </article>
            </div>

            <div
              className={hasFailure ? "verdict verdict-failed" : "verdict"}
              id="result-heading"
            >
              {hasFailure ? (
                <TriangleAlert aria-hidden="true" className="h-5 w-5" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {hasFailure ? "Invariant failed" : "Invariant preserved"}
                </p>
                <p className="mt-1 text-sm opacity-75">
                  {result.summary.verdict}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.results.map((item) => (
                <article className="request-result" key={item.requestId}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs uppercase text-slate-500">
                      {item.requestId}
                    </span>
                    <span
                      className={
                        item.replayed
                          ? "outcome-badge outcome-replayed"
                          : "outcome-badge"
                      }
                    >
                      {item.outcome}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-600">Payment</dt>
                      <dd className="mt-1 font-mono text-slate-400">
                        {shortId(item.paymentId)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-600">Provider charge</dt>
                      <dd className="mt-1 font-mono text-slate-400">
                        {shortId(item.providerChargeId)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="timeline-heading">
          <div className="section-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 md:px-6">
              <div>
                <p className="eyebrow" id="timeline-heading">
                  Runtime event trace
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Generated by the running backend, not a scripted animation.
                </p>
              </div>
              {result ? (
                <span className="font-mono text-[11px] text-slate-600">
                  run {shortId(result.runId)}
                </span>
              ) : null}
            </div>

            <div className="p-5 md:p-6">
              {result ? (
                <>
                  <DesktopTimeline events={result.trace} />
                  <MobileTimeline events={result.trace} />
                </>
              ) : (
                <EmptyTimeline />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
