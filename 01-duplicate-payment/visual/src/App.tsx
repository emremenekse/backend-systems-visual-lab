import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Database,
  FileKey2,
  Landmark,
  MousePointerClick,
  Play,
  ReceiptText,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
  Video,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { runLab } from "./api";
import {
  createStorySteps,
  interviewQuestions,
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
  { value: "one", label: "1 kez", note: "İsteklerden biri engellenir" },
  { value: "two", label: "2 kez", note: "İki istek de charge üretir" },
  { value: "unsure", label: "Emin değilim", note: "Deneyerek görelim" },
] as const;

type Prediction = (typeof predictions)[number]["value"];

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
      aria-label={`${laneLabels[event.lane]}, ${event.offsetMs} milisaniye: ${event.label}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="event-kind">{event.kind}</span>
        <span className="font-mono text-[11px] text-slate-500">
          +{event.offsetMs.toFixed(1)}ms
        </span>
      </div>
      <h4 className="mt-2 text-sm font-semibold text-slate-100">
        {event.label}
      </h4>
      <p className="mt-1 text-xs leading-5 text-slate-400">{event.detail}</p>
    </article>
  );
}

function DesktopTimeline({ events }: { events: TraceEvent[] }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <div className="min-w-[980px]">
        <div className="timeline-grid border-b border-slate-800 pb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-600">
            Sıra
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

function FlowArrow() {
  return (
    <div className="flow-arrow" aria-hidden="true">
      <ArrowRight className="h-4 w-4" />
    </div>
  );
}

interface SystemNodeProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  detail: string;
  tone: "neutral" | "danger" | "success";
}

function SystemNode({
  active,
  icon,
  label,
  detail,
  tone,
}: SystemNodeProps) {
  return (
    <div
      className="system-node"
      data-active={active}
      data-tone={tone}
    >
      <span className="system-node-icon">{icon}</span>
      <span className="system-node-label">{label}</span>
      <span className="system-node-detail">{detail}</span>
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
  const steps = createStorySteps(result);
  const step = steps[activeStep];
  const tone = step?.tone ?? "neutral";
  const charges = result.summary.providerCharges;
  const revealSideEffect = activeStep >= 2;

  return (
    <div className="system-map-wrap" aria-label="Ödeme akışının görsel özeti">
      <div className="system-map">
        <SystemNode
          active={step?.focus === "customer"}
          detail="499,90 TL"
          icon={<UserRound className="h-5 w-5" />}
          label="Müşteri"
          tone={tone}
        />
        <FlowArrow />
        <div
          className="request-pair"
          data-active={step?.focus === "customer" || step?.focus === "api"}
          data-tone={tone}
        >
          <span>Request A</span>
          <span>Request B</span>
          <small>Aynı payment intent</small>
        </div>
        <FlowArrow />
        <SystemNode
          active={step?.focus === "api"}
          detail={lessonModes[result.mode].mechanism}
          icon={<Server className="h-5 w-5" />}
          label="Payment API"
          tone={tone}
        />
        <FlowArrow />
        <SystemNode
          active={step?.focus === "database"}
          detail={
            result.mode === "unprotected"
              ? "Guard yok"
              : result.mode === "database-constraint"
                ? "Unique index"
                : "Idempotency record"
          }
          icon={<Database className="h-5 w-5" />}
          label="PostgreSQL"
          tone={tone}
        />
        <FlowArrow />
        <SystemNode
          active={step?.focus === "provider"}
          detail={
            revealSideEffect
              ? `${result.summary.providerAttempts} çağrı`
              : "Sonuç bekleniyor"
          }
          icon={<Landmark className="h-5 w-5" />}
          label="Provider"
          tone={tone}
        />
        <FlowArrow />
        <div
          className="statement-card"
          data-active={step?.focus === "result"}
          data-tone={tone}
        >
          <span className="system-node-icon">
            <ReceiptText className="h-5 w-5" />
          </span>
          <span className="system-node-label">Hesap hareketi</span>
          <div className="statement-lines">
            {revealSideEffect ? (
              Array.from({ length: charges }).map((_, index) => (
                <span key={index}>
                  <span>PAYMENT</span>
                  <strong>−499,90 TL</strong>
                </span>
              ))
            ) : (
              <small className="statement-placeholder">Henüz hareket yok</small>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonProgress() {
  const items = [
    ["01", "Tahmin et"],
    ["02", "Gerçek sistemi çalıştır"],
    ["03", "Nedenini açıkla"],
    ["04", "Mülakatta anlat"],
  ];

  return (
    <ol className="learning-path" aria-label="Ders akışı">
      {items.map(([number, label]) => (
        <li key={number}>
          <span>{number}</span>
          <p>{label}</p>
        </li>
      ))}
    </ol>
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
          .getElementById("deney-sonucu")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") {
        return;
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : "Deney çalıştırılamadı.",
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
    <div className="min-h-screen text-slate-100">
      <a className="skip-link" href="#main-content">
        Derse geç
      </a>

      <header className="site-header">
        <div className="page-shell header-inner">
          <a className="brand" href="#main-content">
            <span className="logo-mark" aria-hidden="true">
              <Activity className="h-4 w-4" />
            </span>
            <span>
              <strong>Backend Interview Lab</strong>
              <small>01 · Duplicate Payment</small>
            </span>
          </a>
          <nav aria-label="Ders bölümleri">
            <a href="#senaryo">Senaryo</a>
            <a href="#deney">Deney</a>
            <a href="#mulakat">Mülakat</a>
            <a href="#video">Video</a>
          </nav>
          <span className="live-badge">
            <span className="live-dot" />
            gerçek backend
          </span>
        </div>
      </header>

      <main id="main-content">
        <section className="lesson-hero">
          <div className="page-shell">
            <div className="hero-copy">
              <div className="course-meta">
                <span>Senior backend</span>
                <span>15 dakika</span>
                <span>Canlı deney</span>
              </div>
              <p className="eyebrow">Önce problemi anlayalım</p>
              <h1>
                Aynı ödeme isteği
                <span> iki kez gelirse </span>
                ne olur?
              </h1>
              <p className="hero-lead">
                Bu derste idempotency ezberlemeyeceğiz. Önce çift ödemeyi
                üretecek, sonra üç çözümün hangi garantiyi verdiğini gerçek kod
                ve PostgreSQL üzerinde göreceğiz.
              </p>
              <div className="invariant-card">
                <span>Business invariant</span>
                <strong>
                  Bir payment intent, en fazla bir provider charge üretmeli.
                </strong>
              </div>
            </div>
            <LessonProgress />
          </div>
        </section>

        <section className="page-shell lesson-section" id="senaryo">
          <div className="section-heading">
            <span className="section-number">01</span>
            <div>
              <p className="eyebrow">Senaryo</p>
              <h2>Önce sonucu tahmin et</h2>
              <p>
                Production bug'larını anlamanın en hızlı yolu, sistemin hangi
                varsayımı bozacağını önceden söylemeye çalışmaktır.
              </p>
            </div>
          </div>

          <div className="scenario-grid">
            <article className="checkout-card">
              <div className="checkout-topbar">
                <span>checkout.example</span>
                <span>Güvenli ödeme</span>
              </div>
              <div className="order-row">
                <div className="product-mark">01</div>
                <div>
                  <p>Backend Systems Course</p>
                  <span>Sipariş #ORD-1042</span>
                </div>
                <strong>499,90 TL</strong>
              </div>
              <div className="fake-pay-button" aria-hidden="true">
                <MousePointerClick aria-hidden="true" className="h-4 w-4" />
                Ödemeyi tamamla
              </div>
              <div className="double-click-note">
                <span>CLICK 1</span>
                <span>+12ms</span>
                <span>CLICK 2</span>
              </div>
            </article>

            <fieldset className="prediction-card">
              <legend>İki request aynı anda API'ye ulaşırsa kaç charge oluşur?</legend>
              <div className="prediction-options">
                {predictions.map((item) => (
                  <button
                    aria-pressed={prediction === item.value}
                    className="prediction-option"
                    data-selected={prediction === item.value}
                    key={item.value}
                    onClick={() => setPrediction(item.value)}
                    type="button"
                  >
                    <span className="prediction-check">
                      {prediction === item.value ? (
                        <Check aria-hidden="true" className="h-4 w-4" />
                      ) : null}
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.note}</small>
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="primary-button"
                disabled={!prediction || isRunning}
                onClick={() => runScenario("unprotected")}
                type="button"
              >
                {isRunning && mode === "unprotected" ? (
                  <RefreshCw
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Play aria-hidden="true" className="h-4 w-4 fill-current" />
                )}
                {isRunning && mode === "unprotected"
                  ? "İki istek gönderiliyor…"
                  : "Korumasız deneyi çalıştır"}
              </button>
              {!prediction ? (
                <p className="prediction-hint">Deneyden önce bir tahmin seç.</p>
              ) : null}
            </fieldset>
          </div>
        </section>

        <section className="experiment-band" id="deney">
          <div className="page-shell lesson-section">
            <div className="section-heading">
              <span className="section-number">02</span>
              <div>
                <p className="eyebrow">Canlı deney</p>
                <h2>Aynı yarışı üç farklı guard ile çalıştır</h2>
                <p>
                  Her seçenek gerçek API'ye iki eşzamanlı istek gönderir. Sonuç
                  animasyon değil, backend trace'inden gelir.
                </p>
              </div>
            </div>

            <div className="mode-grid" role="group" aria-label="Koruma modu">
              {modes.map((item, index) => {
                const lesson = lessonModes[item];
                const selected = item === mode;

                return (
                  <button
                    aria-pressed={selected}
                    className="mode-card"
                    data-selected={selected}
                    key={item}
                    onClick={() => selectMode(item)}
                    type="button"
                  >
                    <span className="mode-index">0{index + 1}</span>
                    <span className="mode-copy">
                      <strong>{lesson.title}</strong>
                      <small>{lesson.mechanism}</small>
                      <em>{lesson.promise}</em>
                    </span>
                    <span className="mode-radio">
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="run-row">
              <div>
                <span>Seçili deney</span>
                <strong>{selectedLesson.title}</strong>
              </div>
              <button
                className="primary-button"
                disabled={isRunning}
                onClick={() => runScenario()}
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
                {isRunning ? "Race condition oluşturuluyor…" : "Deneyi çalıştır"}
              </button>
            </div>

            <div aria-live="assertive">
              {error ? (
                <div className="error-panel" role="alert">
                  <TriangleAlert aria-hidden="true" className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Deney çalıştırılamadı</p>
                    <p className="mt-1 break-all text-sm text-rose-200/75">
                      {error}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="result-anchor" id="deney-sonucu">
              {result ? (
                <div className="guided-result">
                  <div className="result-toolbar">
                    <div>
                      <span>
                        Gerçek çalışma · {shortId(result.runId)}
                      </span>
                      <strong>
                        Adım {storyStep + 1}/{storySteps.length}
                      </strong>
                    </div>
                    <div className="step-dots" aria-label="Anlatım adımları">
                      {storySteps.map((step, index) => (
                        <button
                          aria-label={`${index + 1}. adıma git: ${step.title}`}
                          aria-pressed={index === storyStep}
                          data-current={index === storyStep}
                          key={step.label}
                          onClick={() => setStoryStep(index)}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>

                  <SystemMap activeStep={storyStep} result={result} />

                  {currentStory ? (
                    <div
                      aria-live="polite"
                      className="story-explanation"
                      data-tone={currentStory.tone}
                    >
                      <span>{currentStory.label}</span>
                      <div>
                        <h3>{currentStory.title}</h3>
                        <p>{currentStory.explanation}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="story-controls">
                    <button
                      className="secondary-button"
                      disabled={storyStep === 0}
                      onClick={() =>
                        setStoryStep((current) => Math.max(0, current - 1))
                      }
                      type="button"
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      Önceki
                    </button>
                    <span>
                      Her adımda yalnızca bir karar veya side effect gösterilir.
                    </span>
                    <button
                      className="primary-button"
                      disabled={isFinalStep}
                      onClick={() =>
                        setStoryStep((current) =>
                          Math.min(storySteps.length - 1, current + 1),
                        )
                      }
                      type="button"
                    >
                      Sonraki adım
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>

                  {isFinalStep ? (
                    <div className="result-summary">
                      <article>
                        <CircleDollarSign className="h-5 w-5" />
                        <span>Provider charge</span>
                        <strong>{result.summary.providerCharges}</strong>
                      </article>
                      <article>
                        <Landmark className="h-5 w-5" />
                        <span>Provider çağrısı</span>
                        <strong>{result.summary.providerAttempts}</strong>
                      </article>
                      <article>
                        <ShieldCheck className="h-5 w-5" />
                        <span>Replay edilen cevap</span>
                        <strong>{result.summary.replayedResponses}</strong>
                      </article>
                      <div
                        className="prediction-result"
                        data-correct={predictionWasCorrect}
                      >
                        {result.mode === "unprotected" && prediction ? (
                          <>
                            {predictionWasCorrect ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Sparkles className="h-5 w-5" />
                            )}
                            <span>
                              {predictionWasCorrect
                                ? "Tahminin doğruydu."
                                : "İlk tahmin farklıydı; artık iki charge'ın nedenini görebiliyorsun."}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5" />
                            <span>{selectedLesson.promise}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="experiment-empty">
                  <BookOpenCheck aria-hidden="true" className="h-7 w-7" />
                  <div>
                    <strong>Bir modu seç ve gerçek sistemi çalıştır.</strong>
                    <p>
                      Sonucu ham log yerine dört kontrollü adımda okuyacaksın.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="page-shell lesson-section" id="aciklama">
          <div className="section-heading">
            <span className="section-number">03</span>
            <div>
              <p className="eyebrow">Mekanizmayı açıkla</p>
              <h2>Çalışması yetmez; neden çalıştığını söyle</h2>
              <p>
                Mülakatta araç adı değil, garanti sınırı ve failure mode
                konuşulur.
              </p>
            </div>
          </div>

          <div className="explanation-grid">
            <article className="explanation-card">
              <div className="explanation-icon">
                {mode === "idempotent-api" ? (
                  <FileKey2 className="h-5 w-5" />
                ) : mode === "database-constraint" ? (
                  <Database className="h-5 w-5" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </div>
              <p className="eyebrow">Ne değişti?</p>
              <h3>{selectedLesson.title}</h3>
              <p>{selectedLesson.explanation}</p>
            </article>
            <article className="explanation-card warning-card">
              <TriangleAlert className="h-5 w-5" />
              <p className="eyebrow">Neyi çözmez?</p>
              <h3>Garanti sınırı</h3>
              <p>{selectedLesson.limitation}</p>
            </article>
            <article className="explanation-card answer-card">
              <ShieldCheck className="h-5 w-5" />
              <p className="eyebrow">Mülakat cümlesi</p>
              <blockquote>“{selectedLesson.interviewLine}”</blockquote>
            </article>
          </div>

          <details className="code-disclosure">
            <summary>
              <span>
                <Code2 aria-hidden="true" className="h-5 w-5" />
                Bu mekanizmanın kodunu gör
              </span>
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </summary>
            <div>
              <span className="code-language">
                {selectedLesson.codeLanguage}
              </span>
              <pre>
                <code>{selectedLesson.code}</code>
              </pre>
            </div>
          </details>
        </section>

        <section className="interview-band" id="mulakat">
          <div className="page-shell lesson-section">
            <div className="section-heading">
              <span className="section-number">04</span>
              <div>
                <p className="eyebrow">Mülakat hazırlığı</p>
                <h2>Konuyu 60 saniyede anlatabiliyor musun?</h2>
                <p>
                  Aşağıdaki cevap araç listesi değil; invariant, mekanizma ve
                  failure recovery sırasını izler.
                </p>
              </div>
            </div>

            <article className="sixty-second-answer">
              <div>
                <span className="answer-time">60 sn</span>
                <span className="eyebrow">Örnek senior cevap</span>
              </div>
              <blockquote>“{sixtySecondAnswer}”</blockquote>
            </article>

            <div className="question-list">
              {interviewQuestions.map((item, index) => (
                <details key={item.question}>
                  <summary>
                    <span>0{index + 1}</span>
                    <strong>{item.question}</strong>
                    <ChevronDown aria-hidden="true" className="h-4 w-4" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="page-shell lesson-section" id="video">
          <div className="section-heading">
            <span className="section-number">05</span>
            <div>
              <p className="eyebrow">Görsel tekrar</p>
              <h2>Akışı videoda yeniden izle</h2>
              <p>
                Bu Remotion çıktısı repoda üretiliyor ve artık dersin içinden
                doğrudan izlenebiliyor.
              </p>
            </div>
          </div>

          <div className="video-grid">
            <div className="video-frame">
              <video
                controls
                playsInline
                poster="/duplicate-payment-explainer.png"
                preload="metadata"
              >
                <source
                  src="/duplicate-payment-explainer.mp4"
                  type="video/mp4"
                />
                Tarayıcın MP4 video oynatmayı desteklemiyor.
              </video>
            </div>
            <aside className="video-notes">
              <Video aria-hidden="true" className="h-6 w-6" />
              <p className="eyebrow">İzlerken üç şeyi takip et</p>
              <ol>
                <li>
                  <span>1</span>
                  İki request aynı business operation mı?
                </li>
                <li>
                  <span>2</span>
                  Hangi katman execution owner'ını seçiyor?
                </li>
                <li>
                  <span>3</span>
                  İkinci request yeni side effect mi, replay mi alıyor?
                </li>
              </ol>
              <a href="/duplicate-payment-explainer.mp4" download>
                MP4 olarak indir
                <ArrowRight className="h-4 w-4" />
              </a>
            </aside>
          </div>
        </section>

        <section className="page-shell pb-20">
          <details className="technical-trace">
            <summary>
              <span>
                <Activity aria-hidden="true" className="h-5 w-5" />
                Teknik derinlik: ham runtime trace
              </span>
              <span>
                {result ? `${result.trace.length} event` : "Önce deneyi çalıştır"}
                <ChevronDown aria-hidden="true" className="h-4 w-4" />
              </span>
            </summary>
            <div className="technical-trace-content">
              {result ? (
                <>
                  <p>
                    Bu bölüm canlı backend tarafından üretildi. Yukarıdaki
                    eğitim akışının altında yatan tüm olaylar burada.
                  </p>
                  <DesktopTimeline events={result.trace} />
                  <MobileTimeline events={result.trace} />
                </>
              ) : (
                <p>
                  Bir deney çalıştırdığında request, database ve provider
                  event'leri burada açılacak.
                </p>
              )}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
