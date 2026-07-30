import {
  ArrowRight,
  ChevronDown,
  Play,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { runLab } from "./api";
import {
  lessonModes,
  sixtySecondAnswer,
} from "./lesson";
import { laneLabels, laneOrder, shortId } from "./trace";
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

const predictions = [
  { value: "one", label: "One charge", note: "One request is stopped" },
  { value: "two", label: "Two charges", note: "Both requests execute" },
  { value: "unsure", label: "Not sure", note: "Run the experiment" },
] as const;

type Prediction = (typeof predictions)[number]["value"];

const laneStyles: Record<TraceLane, string> = {
  lab: "border-slate-500/35 bg-slate-500/10",
  "request-a": "border-blue-400/35 bg-blue-400/10",
  "request-b": "border-cyan-400/35 bg-cyan-400/10",
  database: "border-amber-400/35 bg-amber-400/10",
  provider: "border-emerald-400/35 bg-emerald-400/10",
};

function TraceCard({ event }: { event: TraceEvent }) {
  return (
    <article
      className={`trace-card ${laneStyles[event.lane]}`}
      aria-label={`${laneLabels[event.lane]}, ${event.offsetMs} milliseconds: ${event.label}`}
    >
      <div>
        <span className="event-kind">{event.kind}</span>
        <span>+{event.offsetMs.toFixed(1)}ms</span>
      </div>
      <h4>{event.label}</h4>
      <p>{event.detail}</p>
    </article>
  );
}

function DesktopTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <div className="desktop-timeline">
      <div className="timeline-inner">
        <div className="timeline-grid timeline-head">
          <span>SEQ</span>
          {laneOrder.map((lane) => (
            <span key={lane}>{laneLabels[lane]}</span>
          ))}
        </div>
        <ol>
          {events.map((event) => (
            <li className="timeline-grid" key={event.sequence}>
              <span>{String(event.sequence).padStart(2, "0")}</span>
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
    <ol className="mobile-timeline">
      {events.map((event) => (
        <li key={event.sequence}>
          <div>
            <span>{String(event.sequence).padStart(2, "0")}</span>
            <span>{laneLabels[event.lane]}</span>
          </div>
          <TraceCard event={event} />
        </li>
      ))}
    </ol>
  );
}

function MovingToken({
  begin,
  color,
  label,
  path,
}: {
  begin: string;
  color: string;
  label: string;
  path: string;
}) {
  return (
    <g className="moving-token">
      <circle cx="0" cy="0" fill={color} r="13" />
      <text
        dominantBaseline="middle"
        fill="#111"
        textAnchor="middle"
        x="0"
        y="1"
      >
        {label}
      </text>
      <animateMotion
        begin={begin}
        dur="2.4s"
        fill="freeze"
        path={path}
      />
    </g>
  );
}

function ExecutionDiagram({ result }: { result: LabRunResult }) {
  const unprotected = result.mode === "unprotected";
  const databaseGuard = result.mode === "database-constraint";
  const idempotent = result.mode === "idempotent-api";
  const ownerLabel = unprotected
    ? "NO OWNER"
    : databaseGuard
      ? "UNIQUE(payment_intent_id)"
      : "KEY(pay-1042)";
  const caption = unprotected
    ? "A and B both cross the provider boundary, so the ledger receives two charges."
    : databaseGuard
      ? "PostgreSQL gives A ownership. B conflicts before it can call the provider."
      : "A owns the key and calls the provider. B waits, then receives A's stored response.";

  const pathA = "M 92 116 H 286 H 496 H 640";
  const pathB = unprotected
    ? "M 92 226 H 286 H 496 H 640"
    : "M 92 226 H 286";

  return (
    <figure className="execution-figure" key={result.runId}>
      <svg
        aria-labelledby={`execution-title-${result.runId} execution-desc-${result.runId}`}
        className="execution-svg"
        role="img"
        viewBox="0 0 720 350"
      >
        <title id={`execution-title-${result.runId}`}>
          Two concurrent requests for one payment operation
        </title>
        <desc id={`execution-desc-${result.runId}`}>{caption}</desc>
        <defs>
          <marker
            id={`arrow-${result.runId}`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="5"
            refY="3.5"
          >
            <path d="M0,0 L0,7 L6,3.5 z" fill="currentColor" />
          </marker>
        </defs>

        <g className="phase-labels">
          <text x="92" y="24">SAME OPERATION</text>
          <text x="286" y="24">OWNERSHIP</text>
          <text x="496" y="24">SIDE EFFECT</text>
          <text x="640" y="24">LEDGER</text>
        </g>

        <g className="phase-rules">
          <line x1="248" x2="248" y1="42" y2="322" />
          <line x1="450" x2="450" y1="42" y2="322" />
          <line x1="602" x2="602" y1="42" y2="322" />
        </g>

        <g className="lane-labels">
          <text x="12" y="121">REQUEST A</text>
          <text x="12" y="231">REQUEST B</text>
        </g>

        <g className="flow-paths">
          <path
            className={unprotected ? "danger-path" : "success-path"}
            d={pathA}
            markerEnd={`url(#arrow-${result.runId})`}
          />
          <path
            className={unprotected ? "danger-path" : "muted-path"}
            d={pathB}
            markerEnd={`url(#arrow-${result.runId})`}
          />
        </g>

        <g className="api-gate">
          <line x1="202" x2="202" y1="78" y2="264" />
          <text x="202" y="62" textAnchor="middle">API</text>
        </g>

        <g className="owner-node">
          <rect
            className={unprotected ? "danger-node" : "success-node"}
            height="72"
            width="146"
            x="266"
            y="135"
          />
          <text x="339" y="165" textAnchor="middle">{ownerLabel}</text>
          <text className="node-detail" x="339" y="187" textAnchor="middle">
            {unprotected
              ? "A executes · B executes"
              : databaseGuard
                ? "A = owner · B = conflict"
                : "A = owner · B = waits"}
          </text>
        </g>

        <g className="provider-node">
          <circle
            className={unprotected ? "danger-node" : "success-node"}
            cx="514"
            cy="171"
            r="45"
          />
          <text x="514" y="166" textAnchor="middle">PROVIDER</text>
          <text className="node-detail" x="514" y="188" textAnchor="middle">
            {result.summary.providerAttempts} call
            {result.summary.providerAttempts === 1 ? "" : "s"}
          </text>
        </g>

        <g className="ledger-entries">
          <rect
            className={unprotected ? "danger-node" : "success-node"}
            height="46"
            width="68"
            x="634"
            y={unprotected ? "93" : "148"}
          />
          <text
            x="668"
            y={unprotected ? "121" : "176"}
            textAnchor="middle"
          >
            −$499
          </text>
          {unprotected ? (
            <>
              <rect
                className="danger-node"
                height="46"
                width="68"
                x="634"
                y="203"
              />
              <text x="668" y="231" textAnchor="middle">−$499</text>
            </>
          ) : null}
        </g>

        {databaseGuard ? (
          <g className="stopped-request">
            <line x1="301" x2="321" y1="216" y2="236" />
            <line x1="321" x2="301" y1="216" y2="236" />
            <text x="332" y="231">CONFLICT</text>
          </g>
        ) : null}

        {idempotent ? (
          <g className="replay-path">
            <path
              d="M 360 208 C 360 302 132 302 92 240"
              markerEnd={`url(#arrow-${result.runId})`}
            />
            <text x="225" y="317" textAnchor="middle">
              STORED 200 RESPONSE REPLAYED TO B
            </text>
          </g>
        ) : null}

        <MovingToken begin="0.1s" color="#8fb4ff" label="A" path={pathA} />
        <MovingToken begin="0.35s" color="#67e8f9" label="B" path={pathB} />

        {idempotent ? (
          <g className="replay-token">
            <rect fill="#86efac" height="18" rx="2" width="18" x="-9" y="-9" />
            <animateMotion
              begin="2.7s"
              dur="1.4s"
              fill="freeze"
              path="M 360 208 C 360 302 132 302 92 240"
            />
          </g>
        ) : null}
      </svg>

      <div className="execution-reading" data-tone={unprotected ? "danger" : "success"}>
        <span>{unprotected ? "INVARIANT BROKEN" : "INVARIANT PRESERVED"}</span>
        <strong>{caption}</strong>
      </div>
    </figure>
  );
}

function SectionHeading({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: string;
}) {
  return (
    <header className="section-heading">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </header>
  );
}

export function App() {
  const [mode, setMode] = useState<PaymentMode>("unprotected");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [result, setResult] = useState<LabRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const selectMode = (nextMode: PaymentMode) => {
    controllerRef.current?.abort();
    setMode(nextMode);
    setResult(null);
    setError(null);
  };

  const runScenario = async (requestedMode: PaymentMode = mode) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setMode(requestedMode);
    setIsRunning(true);
    setError(null);

    try {
      const nextResult = await runLab(requestedMode, controller.signal);
      setResult(nextResult);

      window.setTimeout(() => {
        document
          .getElementById("experiment-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") {
        return;
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : "The experiment could not be run.",
      );
    } finally {
      if (controllerRef.current === controller) {
        setIsRunning(false);
      }
    }
  };

  const selectedLesson = lessonModes[mode];
  const predictionWasCorrect =
    prediction === "two" && result?.mode === "unprotected";

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to lesson
      </a>

      <header className="site-header">
        <div className="page-shell header-inner">
          <a className="brand" href="#main-content">
            <strong>Backend Systems Lab</strong>
            <span>01 / Duplicate payment</span>
          </a>
          <nav aria-label="Lesson sections">
            <a href="#experiment">Experiment</a>
            <a href="#explanation">Answer</a>
          </nav>
          <code>API: connected</code>
        </div>
      </header>

      <main id="main-content">
        <section className="intro">
          <div className="page-shell intro-grid">
            <div>
              <p className="kicker">Failure study 01</p>
              <h1>Two requests.<br />One payment.</h1>
              <p className="intro-copy">
                The transport delivered the request twice. The business
                operation must still happen once.
              </p>
            </div>
            <aside className="invariant">
              <span>Business invariant</span>
              <p>
                A payment intent must create no more than one provider charge.
              </p>
              <small>
                This is the entire problem. Everything below exists to enforce
                this sentence.
              </small>
            </aside>
          </div>
        </section>

        <section className="experiment-section" id="experiment">
          <div className="page-shell lesson-section">
            <SectionHeading number="01" title="Run one race three ways">
              The requests never change. Choose the ownership rule, run the
              race, and watch where the duplicate is stopped or replayed.
            </SectionHeading>

            <div className="scenario-layout">
              <div className="request-fixture">
                <div>
                  <span>payment_intent_id</span>
                  <code>pi_ord_1042</code>
                </div>
                <div>
                  <span>amount</span>
                  <code>499.90 USD</code>
                </div>
                <div>
                  <span>arrival</span>
                  <code>request A at 0ms</code>
                  <code>request B at +12ms</code>
                </div>
                <p>Same business intent. Two concurrent HTTP requests.</p>
              </div>

              <fieldset className="prediction">
                <legend>
                  With no duplicate protection, how many provider charges are
                  created?
                </legend>
                <div>
                  {predictions.map((item) => (
                    <button
                      aria-pressed={prediction === item.value}
                      data-selected={prediction === item.value}
                      key={item.value}
                      onClick={() => setPrediction(item.value)}
                      type="button"
                    >
                      <span>{prediction === item.value ? "●" : "○"}</span>
                      <strong>{item.label}</strong>
                      <small>{item.note}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div
              className="mode-selector"
              role="group"
              aria-label="Duplicate protection mode"
            >
              <div className="mode-head" aria-hidden="true">
                <span>MODE</span>
                <span>MECHANISM</span>
                <span>GUARANTEE</span>
              </div>
              {modes.map((item, index) => {
                const lesson = lessonModes[item];
                return (
                  <button
                    aria-pressed={item === mode}
                    data-selected={item === mode}
                    key={item}
                    onClick={() => selectMode(item)}
                    type="button"
                  >
                    <span>0{index + 1} / {lesson.title}</span>
                    <span>{lesson.mechanism}</span>
                    <span>{lesson.guarantee}</span>
                  </button>
                );
              })}
            </div>

            <div className="run-bar">
              <p>
                Selected: <strong>{selectedLesson.title}</strong>
              </p>
              <button
                className="action-button"
                disabled={isRunning}
                onClick={() => runScenario()}
                type="button"
              >
                {isRunning ? (
                  <RefreshCw aria-hidden="true" className="spin" size={15} />
                ) : (
                  <Play aria-hidden="true" fill="currentColor" size={14} />
                )}
                {isRunning ? "Running race" : "Run experiment"}
              </button>
            </div>

            <div aria-live="assertive">
              {error ? (
                <div className="error-panel" role="alert">
                  <strong>Experiment failed.</strong>
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            <div id="experiment-result">
              {result ? (
                <article className="guided-result">
                  <header className="result-header">
                    <span>RUN {shortId(result.runId)}</span>
                    <strong>{lessonModes[result.mode].title}</strong>
                  </header>

                  <ExecutionDiagram result={result} />

                  <div className="result-stats">
                    <div><span>Provider calls</span><strong>{result.summary.providerAttempts}</strong></div>
                    <div><span>Charges</span><strong>{result.summary.providerCharges}</strong></div>
                    <div><span>Replayed responses</span><strong>{result.summary.replayedResponses}</strong></div>
                    <p data-correct={predictionWasCorrect}>
                      {result.mode === "unprotected" && prediction
                        ? predictionWasCorrect
                          ? "Your prediction matched the live trace."
                          : "The live trace shows why the first prediction was wrong."
                        : selectedLesson.guarantee}
                    </p>
                  </div>
                </article>
              ) : (
                <div className="result-empty">
                  <span>NO RUN YET</span>
                  <p>Select a mode and run the experiment.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="page-shell lesson-section" id="explanation">
          <SectionHeading number="02" title="Explain the design">
            A complete answer names the operation identity, the execution owner,
            the stored result, and the failure boundary.
          </SectionHeading>

          <dl className="mechanism-notes">
            <div>
              <dt>Mechanism</dt>
              <dd>
                <strong>{selectedLesson.title}</strong>
                <p>{selectedLesson.explanation}</p>
              </dd>
            </div>
            <div>
              <dt>Guarantee</dt>
              <dd>{selectedLesson.guarantee}</dd>
            </div>
            <div>
              <dt>Boundary</dt>
              <dd>{selectedLesson.limitation}</dd>
            </div>
            <div>
              <dt>Say this</dt>
              <dd>“{selectedLesson.interviewLine}”</dd>
            </div>
          </dl>

          <details className="code-disclosure">
            <summary>
              <span>Implementation sketch</span>
              <span>
                {selectedLesson.codeLanguage}
                <ChevronDown aria-hidden="true" size={15} />
              </span>
            </summary>
            <pre><code>{selectedLesson.code}</code></pre>
          </details>

          <article className="model-answer">
            <header>
              <span>60-SECOND ANSWER</span>
              <span>INVARIANT → OWNER → REPLAY → RECOVERY</span>
            </header>
            <blockquote>{sixtySecondAnswer}</blockquote>
          </article>

          <details className="recap-video" id="video">
            <summary>
              <span>15-second visual recap</span>
              <span>
                optional
                <ChevronDown aria-hidden="true" size={15} />
              </span>
            </summary>
            <figure className="video-figure">
              <video
                controls
                playsInline
                poster="/duplicate-payment-explainer.png"
                preload="metadata"
              >
                <source src="/duplicate-payment-explainer.mp4" type="video/mp4" />
                Your browser does not support MP4 video.
              </video>
              <figcaption>
                <p>
                  Watch for the operation identity, the owner, and the replay.
                </p>
                <a href="/duplicate-payment-explainer.mp4" download>
                  Download MP4
                  <ArrowRight aria-hidden="true" size={15} />
                </a>
              </figcaption>
            </figure>
          </details>
        </section>

        <section className="page-shell trace-section">
          <details className="technical-trace">
            <summary>
              <span>Raw runtime trace</span>
              <span>
                {result ? `${result.trace.length} events` : "run required"}
                <ChevronDown aria-hidden="true" size={15} />
              </span>
            </summary>
            <div>
              {result ? (
                <>
                  <p>
                    These events were emitted by the API, database, and provider
                    during the selected run.
                  </p>
                  <DesktopTimeline events={result.trace} />
                  <MobileTimeline events={result.trace} />
                </>
              ) : (
                <p>Run an experiment to populate the trace.</p>
              )}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
