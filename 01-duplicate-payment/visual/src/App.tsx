import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Play,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { runLab } from "./api";
import {
  createStorySteps,
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

interface SystemNodeProps {
  active: boolean;
  label: string;
  detail: string;
  tone: "neutral" | "danger" | "success";
}

function SystemNode({
  active,
  label,
  detail,
  tone,
}: SystemNodeProps) {
  return (
    <div className="system-node" data-active={active} data-tone={tone}>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
  );
}

function SystemMap({
  result,
  activeStep,
}: {
  result: LabRunResult;
  activeStep: number;
}) {
  const step = createStorySteps(result)[activeStep];
  const tone = step?.tone ?? "neutral";
  const revealSideEffect = activeStep >= 2;

  return (
    <figure className="system-figure">
      <div
        className="system-map"
        aria-label="Payment flow"
        role="img"
      >
        <SystemNode
          active={step?.focus === "customer"}
          detail="$499.90"
          label="Customer"
          tone={tone}
        />
        <span className="flow-arrow" aria-hidden="true">→</span>
        <div
          className="request-pair"
          data-active={step?.focus === "customer" || step?.focus === "api"}
          data-tone={tone}
        >
          <span>HTTP A</span>
          <span>HTTP B</span>
          <small>same payment_intent_id</small>
        </div>
        <span className="flow-arrow" aria-hidden="true">→</span>
        <SystemNode
          active={step?.focus === "api"}
          detail={lessonModes[result.mode].mechanism}
          label="Payment API"
          tone={tone}
        />
        <span className="flow-arrow" aria-hidden="true">→</span>
        <SystemNode
          active={step?.focus === "database"}
          detail={
            result.mode === "unprotected"
              ? "no guard"
              : result.mode === "database-constraint"
                ? "unique index"
                : "key record"
          }
          label="PostgreSQL"
          tone={tone}
        />
        <span className="flow-arrow" aria-hidden="true">→</span>
        <SystemNode
          active={step?.focus === "provider"}
          detail={
            revealSideEffect
              ? `${result.summary.providerAttempts} outbound call${
                  result.summary.providerAttempts === 1 ? "" : "s"
                }`
              : "not revealed yet"
          }
          label="Provider"
          tone={tone}
        />
        <span className="flow-arrow" aria-hidden="true">→</span>
        <div
          className="ledger-node"
          data-active={step?.focus === "result"}
          data-tone={tone}
        >
          <span>Ledger</span>
          <div>
            {revealSideEffect ? (
              Array.from({ length: result.summary.providerCharges }).map(
                (_, index) => <code key={index}>− $499.90</code>,
              )
            ) : (
              <small>no entries shown</small>
            )}
          </div>
        </div>
      </div>
      <figcaption>
        The result is derived from the backend trace, not simulated in the
        browser.
      </figcaption>
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
  const [storyStep, setStoryStep] = useState(0);
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
    setStoryStep(0);
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
      setStoryStep(0);

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
  const storySteps = result ? createStorySteps(result) : [];
  const currentStory = storySteps[storyStep];
  const isFinalStep = storyStep === storySteps.length - 1;
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
            <a href="#scenario">Race</a>
            <a href="#experiment">Ownership</a>
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

        <section className="page-shell lesson-section" id="scenario">
          <SectionHeading number="01" title="See the race">
            Two HTTP requests carry the same business identity. Predict whether
            the API treats them as one operation or two.
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
              <p>Both requests carry the same business intent.</p>
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
              <button
                className="action-button"
                disabled={!prediction || isRunning}
                onClick={() => runScenario("unprotected")}
                type="button"
              >
                {isRunning && mode === "unprotected" ? (
                  <RefreshCw
                    aria-hidden="true"
                    className="spin"
                    size={15}
                  />
                ) : (
                  <Play aria-hidden="true" fill="currentColor" size={14} />
                )}
                {isRunning && mode === "unprotected"
                  ? "Sending both requests"
                  : "Run without protection"}
              </button>
              {!prediction ? <small>Choose an answer first.</small> : null}
            </fieldset>
          </div>
        </section>

        <section className="experiment-section" id="experiment">
          <div className="page-shell lesson-section">
            <SectionHeading number="02" title="Choose who owns the operation">
              The fix is an ownership decision. One request executes; the
              duplicate is rejected or receives the stored result.
            </SectionHeading>

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
                    <div>
                      <span>RUN {shortId(result.runId)}</span>
                      <strong>
                        {String(storyStep + 1).padStart(2, "0")} /{" "}
                        {String(storySteps.length).padStart(2, "0")}
                      </strong>
                    </div>
                    <div className="step-selector" aria-label="Explanation steps">
                      {storySteps.map((step, index) => (
                        <button
                          aria-label={`Go to step ${index + 1}: ${step.title}`}
                          aria-pressed={index === storyStep}
                          data-current={index === storyStep}
                          key={step.label}
                          onClick={() => setStoryStep(index)}
                          type="button"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </header>

                  <SystemMap activeStep={storyStep} result={result} />

                  {currentStory ? (
                    <div
                      aria-live="polite"
                      className="story"
                      data-tone={currentStory.tone}
                    >
                      <span>{currentStory.label}</span>
                      <div>
                        <h3>{currentStory.title}</h3>
                        <p>{currentStory.explanation}</p>
                      </div>
                    </div>
                  ) : null}

                  <footer className="story-footer">
                    <button
                      disabled={storyStep === 0}
                      onClick={() =>
                        setStoryStep((current) => Math.max(0, current - 1))
                      }
                      type="button"
                    >
                      <ArrowLeft aria-hidden="true" size={15} />
                      Previous
                    </button>
                    <p>One decision or side effect per step.</p>
                    <button
                      disabled={isFinalStep}
                      onClick={() =>
                        setStoryStep((current) =>
                          Math.min(storySteps.length - 1, current + 1),
                        )
                      }
                      type="button"
                    >
                      Next
                      <ArrowRight aria-hidden="true" size={15} />
                    </button>
                  </footer>

                  {isFinalStep ? (
                    <div className="result-stats">
                      <div><span>Provider calls</span><strong>{result.summary.providerAttempts}</strong></div>
                      <div><span>Charges</span><strong>{result.summary.providerCharges}</strong></div>
                      <div><span>Replayed responses</span><strong>{result.summary.replayedResponses}</strong></div>
                      <p data-correct={predictionWasCorrect}>
                        {result.mode === "unprotected" && prediction
                          ? predictionWasCorrect
                            ? "Your prediction matched the trace."
                            : "The trace shows why the first prediction was wrong."
                          : selectedLesson.guarantee}
                      </p>
                    </div>
                  ) : null}
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
          <SectionHeading number="03" title="Explain the design">
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
