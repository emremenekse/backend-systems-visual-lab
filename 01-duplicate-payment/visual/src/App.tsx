import {
  ArrowRight,
  ChevronDown,
  Pause,
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

const modeRows: Record<
  PaymentMode,
  { requestB: string; customerResult: string }
> = {
  unprotected: {
    requestB: "Request B also calls the payment provider",
    customerResult: "The customer can be charged twice",
  },
  "database-constraint": {
    requestB: "Its INSERT hits the payment intent unique constraint",
    customerResult: "The customer is charged once; request B returns an error",
  },
  "idempotent-api": {
    requestB: "Its idempotency-key INSERT conflicts with A's processing row",
    customerResult: "The customer is charged once; both requests return success",
  },
};

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
      : "PK(idempotency_key)";
  const caption = unprotected
    ? "A and B both reach the provider, so the customer is charged twice."
    : databaseGuard
      ? "A's insert satisfies the unique constraint. B's insert conflicts, so only A calls the provider."
      : "An atomic unique insert selects A. Stored processing state and response data let B wait and replay the result.";

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
          <text x="286" y="24">ATOMIC CLAIM</text>
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
                ? "A insert wins · B conflicts"
                : "A insert wins · B waits"}
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

const recapDurationSeconds = 15;

function progressBetween(value: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

function formatRecapTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = String(wholeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function RecapToken({
  color,
  label,
  testId,
  x,
  y,
}: {
  color: "blue" | "cyan";
  label: string;
  testId: string;
  x: number;
  y: number;
}) {
  return (
    <g
      className={`recap-token recap-token-${color}`}
      data-testid={testId}
      transform={`translate(${x} ${y})`}
    >
      <circle r="17" />
      <text dominantBaseline="middle" textAnchor="middle" y="1">
        {label}
      </text>
    </g>
  );
}

function RecapAnimation() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const startedAt = performance.now() - currentTime * 1000;

    const tick = (now: number) => {
      const nextTime = Math.min(
        recapDurationSeconds,
        (now - startedAt) / 1000,
      );
      setCurrentTime(nextTime);

      if (nextTime >= recapDurationSeconds) {
        setIsPlaying(false);
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const hasEnded = currentTime >= recapDurationSeconds;
  const isFailure = currentTime < 6;
  const sceneTime = isFailure ? currentTime : currentTime - 6;
  const primaryLabel = hasEnded
    ? "Replay animation"
    : isPlaying
      ? "Pause animation"
      : "Play animation";

  const failureA = 120 + 720 * progressBetween(sceneTime, 0.4, 4);
  const failureB = 120 + 720 * progressBetween(sceneTime, 1.1, 4.7);
  const claimAProgress = progressBetween(sceneTime, 0.4, 2);
  const claimBProgress = progressBetween(sceneTime, 0.9, 2.5);
  const ownerProgress = progressBetween(sceneTime, 2.3, 6);
  const fixedA =
    sceneTime < 2 ? 120 + 310 * claimAProgress : 430 + 410 * ownerProgress;
  const fixedB = 120 + 310 * claimBProgress;
  const replayProgress = progressBetween(sceneTime, 6.1, 8.1);
  const replayX = 430 - 310 * replayProgress;

  const currentStatement = isFailure
    ? currentTime < 1.1
      ? "Two HTTP requests carry the same payment intent."
      : currentTime < 4.3
        ? "Without a shared claim, both requests reach the provider."
        : "One business operation created two charges."
    : sceneTime < 2.5
      ? "Both requests attempt the same unique-key insert."
      : sceneTime < 6.1
        ? "A owns the operation. B waits. Only A calls the provider."
        : sceneTime < 8.1
          ? "A stores the result; B receives the same response."
          : "Unique claim → one charge → same response.";

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (hasEnded) {
      setCurrentTime(0);
    }
    setIsPlaying(true);
  };

  return (
    <figure className="recap-figure">
      <div className="recap-animation">
        <div className="recap-animation-head">
          <span>{isFailure ? "01 / FAILURE" : "02 / FIX"}</span>
          <span>
            {isFailure
              ? "NO SHARED OPERATION CLAIM"
              : "UNIQUE CLAIM + STORED RESPONSE"}
          </span>
        </div>

        <svg
          aria-labelledby="recap-title recap-description"
          className="recap-svg"
          role="img"
          viewBox="0 0 960 500"
        >
          <title id="recap-title">Duplicate payment execution recap</title>
          <desc id="recap-description">{currentStatement}</desc>
          <defs>
            <marker
              id="recap-arrow-danger"
              markerHeight="7"
              markerWidth="7"
              orient="auto"
              refX="6"
              refY="3.5"
            >
              <path className="recap-arrow-danger" d="M0,0 L0,7 L7,3.5 z" />
            </marker>
            <marker
              id="recap-arrow-success"
              markerHeight="7"
              markerWidth="7"
              orient="auto"
              refX="6"
              refY="3.5"
            >
              <path className="recap-arrow-success" d="M0,0 L0,7 L7,3.5 z" />
            </marker>
          </defs>

          <g className="recap-phase-labels">
            <text x="120" y="50">CALLERS</text>
            <text x="430" y="50">{isFailure ? "PAYMENT API" : "UNIQUE CLAIM"}</text>
            <text x="680" y="50">PROVIDER</text>
            <text x="840" y="50">LEDGER</text>
          </g>
          <g className="recap-rules">
            <line x1="350" x2="350" y1="70" y2="400" />
            <line x1="600" x2="600" y1="70" y2="400" />
            <line x1="780" x2="780" y1="70" y2="400" />
          </g>
          <g className="recap-lane-labels">
            <text x="32" y="195">REQUEST A</text>
            <text x="32" y="335">REQUEST B</text>
          </g>

          {isFailure ? (
            <g data-scene="failure">
              <path
                className="recap-danger-path"
                d="M120 190 H860"
                markerEnd="url(#recap-arrow-danger)"
              />
              <path
                className="recap-danger-path"
                d="M120 330 H860"
                markerEnd="url(#recap-arrow-danger)"
              />
              <line
                className="recap-api-gate"
                x1="430"
                x2="430"
                y1="125"
                y2="375"
              />
              <circle className="recap-danger-node" cx="680" cy="190" r="42" />
              <circle className="recap-danger-node" cx="680" cy="330" r="42" />
              <text className="recap-node-label recap-danger-text" x="680" y="196">
                CHARGE
              </text>
              <text className="recap-node-label recap-danger-text" x="680" y="336">
                CHARGE
              </text>
              <g opacity={progressBetween(sceneTime, 3.3, 3.7)}>
                <rect className="recap-danger-ledger" height="48" width="96" x="812" y="166" />
                <text className="recap-ledger-text recap-danger-text" x="860" y="196">−$499</text>
              </g>
              <g opacity={progressBetween(sceneTime, 4, 4.4)}>
                <rect className="recap-danger-ledger" height="48" width="96" x="812" y="306" />
                <text className="recap-ledger-text recap-danger-text" x="860" y="336">−$499</text>
              </g>
              <RecapToken color="blue" label="A" testId="recap-token-a" x={failureA} y={190} />
              <RecapToken color="cyan" label="B" testId="recap-token-b" x={failureB} y={330} />
              <g opacity={progressBetween(sceneTime, 4.5, 5)}>
                <line className="recap-verdict-line recap-danger-path" x1="120" x2="860" y1="425" y2="425" />
                <text className="recap-verdict recap-danger-text" x="120" y="462">
                  1 BUSINESS OPERATION → 2 CHARGES
                </text>
              </g>
            </g>
          ) : (
            <g data-scene="fix">
              <path
                className="recap-success-path"
                d="M120 190 H860"
                markerEnd="url(#recap-arrow-success)"
              />
              <path className="recap-muted-path" d="M120 330 H430" />
              <rect className="recap-claim-node" height="250" width="170" x="390" y="120" />
              <text className="recap-claim-title" x="475" y="160">UNIQUE KEY</text>
              <text className="recap-claim-owner" x="475" y="215">
                A INSERTS
              </text>
              <text className="recap-claim-waiter" x="475" y="257">
                B CONFLICTS
              </text>
              <text className="recap-claim-state" x="475" y="305">
                {sceneTime < 6.1 ? "processing" : "response stored"}
              </text>
              <circle className="recap-success-node" cx="680" cy="190" r="46" />
              <text className="recap-node-label recap-success-text" x="680" y="185">
                ONE
              </text>
              <text className="recap-node-detail recap-success-text" x="680" y="208">
                CHARGE
              </text>
              <g opacity={progressBetween(sceneTime, 5, 5.5)}>
                <rect className="recap-success-ledger" height="48" width="96" x="812" y="166" />
                <text className="recap-ledger-text recap-success-text" x="860" y="196">−$499</text>
              </g>
              <RecapToken color="blue" label="A" testId="recap-token-a" x={fixedA} y={190} />
              <RecapToken color="cyan" label="B" testId="recap-token-b" x={fixedB} y={330} />
              <g opacity={progressBetween(sceneTime, 6.1, 6.5)}>
                <path
                  className="recap-replay-path"
                  d="M430 360 C430 415 190 415 120 360"
                  markerEnd="url(#recap-arrow-success)"
                />
                <rect
                  className="recap-response-token"
                  height="18"
                  width="18"
                  x={replayX - 9}
                  y="389"
                />
                <text className="recap-replay-label" x="275" y="442">
                  STORED 200 RESPONSE → REQUEST B
                </text>
              </g>
              <g opacity={progressBetween(sceneTime, 8, 8.5)}>
                <line className="recap-verdict-line recap-success-path" x1="120" x2="860" y1="462" y2="462" />
                <text className="recap-verdict recap-success-text" x="120" y="490">
                  UNIQUE CLAIM → 1 CHARGE → SAME RESPONSE
                </text>
              </g>
            </g>
          )}
        </svg>

        <p
          aria-live="polite"
          className="recap-statement"
          data-tone={isFailure ? "danger" : "success"}
        >
          {currentStatement}
        </p>

        <div className="recap-controls">
          <button
            aria-label={primaryLabel}
            onClick={togglePlayback}
            type="button"
          >
            {hasEnded ? (
              <RefreshCw aria-hidden="true" size={15} />
            ) : isPlaying ? (
              <Pause aria-hidden="true" fill="currentColor" size={15} />
            ) : (
              <Play aria-hidden="true" fill="currentColor" size={15} />
            )}
            <span>{primaryLabel}</span>
          </button>
          <input
            aria-label="Animation position"
            max={recapDurationSeconds}
            min="0"
            onChange={(event) => {
              const nextTime = Number(event.currentTarget.value);
              setIsPlaying(false);
              setCurrentTime(nextTime);
            }}
            step="0.01"
            type="range"
            value={currentTime}
          />
          <output aria-label="Animation time">
            {formatRecapTime(currentTime)} /{" "}
            {formatRecapTime(recapDurationSeconds)}
          </output>
        </div>
      </div>

      <figcaption>
        <p>
          First see the failure. Then watch one insert select the owner and
          replay the stored response to request B.
        </p>
        <a href="/duplicate-payment-explainer.mp4" download>
          Download MP4
          <ArrowRight aria-hidden="true" size={15} />
        </a>
      </figcaption>
    </figure>
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
                The customer must be charged no more than once for the same
                payment intent.
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
            <SectionHeading number="01" title="The same payment arrives twice">
              Choose what the API does with request B. Then run the scenario and
              watch which requests reach the payment provider.
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
            </div>

            <div
              className="mode-selector"
              role="group"
              aria-label="Duplicate protection mode"
            >
              <div className="mode-head" aria-hidden="true">
                <span>SCENARIO</span>
                <span>WHAT REQUEST B DOES</span>
                <span>CUSTOMER RESULT</span>
              </div>
              {modes.map((item, index) => {
                const lesson = lessonModes[item];
                const row = modeRows[item];
                return (
                  <button
                    aria-pressed={item === mode}
                    data-selected={item === mode}
                    key={item}
                    onClick={() => selectMode(item)}
                    type="button"
                  >
                    <span>0{index + 1} / {lesson.title}</span>
                    <span>{row.requestB}</span>
                    <span>{row.customerResult}</span>
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
                    <div><span>Customer charges</span><strong>{result.summary.providerCharges}</strong></div>
                    <div><span>Replayed responses</span><strong>{result.summary.replayedResponses}</strong></div>
                    <p>{modeRows[result.mode].customerResult}</p>
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
            A complete answer names the operation identity, the atomic unique
            claim, the stored result, and the failure boundary.
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

          <section
            aria-labelledby="recap-heading"
            className="recap-video"
            id="video"
          >
            <header className="recap-heading">
              <span id="recap-heading">15-second visual recap</span>
              <span>browser animation · no video player</span>
            </header>
            <RecapAnimation />
          </section>
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
