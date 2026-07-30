import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LabRunResult } from "./types";

const mono: CSSProperties = {
  fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const modeLabels: Record<LabRunResult["mode"], string> = {
  unprotected: "KORUMASIZ",
  "database-constraint": "UNIQUE INDEX",
  "idempotent-api": "IDEMPOTENCY KEY + REPLAY",
};

function opacityFor(
  frame: number,
  start: number,
  end: number,
  fadeOut = true,
) {
  const inputRange = fadeOut
    ? [start, start + 12, end - 12, end]
    : [start, start + 12, end];
  const outputRange = fadeOut ? [0, 1, 1, 0] : [0, 1, 1];

  return interpolate(
    frame,
    inputRange,
    outputRange,
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
}

function Scene({
  children,
  end,
  fadeOut,
  frame,
  start,
}: {
  children: ReactNode;
  end: number;
  fadeOut?: boolean;
  frame: number;
  start: number;
}) {
  const opacity = opacityFor(frame, start, end, fadeOut);
  const translateY = interpolate(opacity, [0, 1], [24, 0]);

  return (
    <div
      style={{
        position: "absolute",
        inset: "185px 92px 70px",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#334155",
      }}
    >
      <div style={{ width: 80, height: 2, background: "#334155" }} />
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderLeft: "12px solid #334155",
        }}
      />
    </div>
  );
}

function Node({
  accent,
  eyebrow,
  title,
}: {
  accent: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: 260,
        height: 180,
        flexDirection: "column",
        justifyContent: "center",
        border: `2px solid ${accent}`,
        borderRadius: 28,
        background: `color-mix(in srgb, ${accent} 10%, #0f172a)`,
        boxShadow: `0 28px 80px color-mix(in srgb, ${accent} 13%, transparent)`,
        padding: 28,
      }}
    >
      <span
        style={{
          ...mono,
          color: accent,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        {eyebrow}
      </span>
      <strong
        style={{
          marginTop: 16,
          color: "#f8fafc",
          fontSize: 28,
          lineHeight: 1.2,
        }}
      >
        {title}
      </strong>
    </div>
  );
}

export function DuplicatePaymentVideo(props: LabRunResult) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 110 },
  });
  const isFailure = props.summary.providerCharges > 1;

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background:
          "radial-gradient(circle at 74% -10%, rgba(37,99,235,.22), transparent 48%), #070b16",
        color: "#f8fafc",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.23,
          backgroundImage:
            "linear-gradient(rgba(51,65,85,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,.22) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header
        style={{
          position: "absolute",
          zIndex: 10,
          top: 60,
          left: 92,
          right: 92,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: intro,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "grid",
              width: 52,
              height: 52,
              placeItems: "center",
              border: "1px solid #5eead4",
              borderRadius: 16,
              background: "rgba(94,234,212,.09)",
              color: "#5eead4",
              ...mono,
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            01
          </div>
          <div>
            <div
              style={{
                color: "#e2e8f0",
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              Backend Interview Lab
            </div>
            <div
              style={{
                ...mono,
                marginTop: 5,
                color: "#64748b",
                fontSize: 13,
                letterSpacing: 2,
              }}
            >
              DUPLICATE PAYMENT
            </div>
          </div>
        </div>
        <div
          style={{
            ...mono,
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "1px solid #334155",
            borderRadius: 999,
            background: "rgba(15,23,42,.72)",
            color: "#94a3b8",
            padding: "12px 18px",
            fontSize: 14,
            letterSpacing: 1.5,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#22c55e",
            }}
          />
          CANLI TRACE · {props.trace.length} EVENT
        </div>
      </header>

      <Scene end={105} frame={frame} start={0}>
        <div
          style={{
            display: "grid",
            height: "100%",
            gridTemplateColumns: "1.1fr .9fr",
            gap: 90,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                ...mono,
                color: "#ff8a5b",
                fontSize: 17,
                fontWeight: 750,
                letterSpacing: 3,
              }}
            >
              PROBLEM
            </div>
            <h1
              style={{
                maxWidth: 860,
                margin: "24px 0 0",
                fontSize: 92,
                lineHeight: 0.96,
                letterSpacing: -6,
              }}
            >
              Bir sipariş.
              <br />
              <span style={{ color: "#60a5fa" }}>İki tıklama.</span>
            </h1>
            <p
              style={{
                maxWidth: 760,
                margin: "38px 0 0",
                color: "#94a3b8",
                fontSize: 28,
                lineHeight: 1.55,
              }}
            >
              Kullanıcı aynı ödeme butonuna 12 milisaniye arayla iki kez bastı.
            </p>
          </div>

          <div
            style={{
              overflow: "hidden",
              border: "1px solid #334155",
              borderRadius: 34,
              background: "rgba(15,23,42,.85)",
              boxShadow: "0 36px 100px rgba(0,0,0,.32)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #263146",
                color: "#64748b",
                padding: "22px 28px",
                ...mono,
                fontSize: 14,
              }}
            >
              <span>SİPARİŞ #ORD-1042</span>
              <span>PAYMENT INTENT</span>
            </div>
            <div style={{ padding: 34 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <strong style={{ fontSize: 28 }}>Backend Systems Course</strong>
                <strong style={{ color: "#5eead4", fontSize: 38 }}>
                  499,90 TL
                </strong>
              </div>
              <div
                style={{
                  marginTop: 38,
                  borderRadius: 18,
                  background: "#2563eb",
                  padding: "22px 28px",
                  fontSize: 24,
                  fontWeight: 800,
                  textAlign: "center",
                }}
              >
                Ödemeyi tamamla
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  marginTop: 25,
                  ...mono,
                  color: "#ff8a5b",
                  fontSize: 15,
                  fontWeight: 750,
                  letterSpacing: 2,
                }}
              >
                <span>CLICK 1</span>
                <span style={{ color: "#475569" }}>+12MS</span>
                <span>CLICK 2</span>
              </div>
            </div>
          </div>
        </div>
      </Scene>

      <Scene end={220} frame={frame} start={90}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  ...mono,
                  color: "#60a5fa",
                  fontSize: 17,
                  fontWeight: 750,
                  letterSpacing: 3,
                }}
              >
                RACE CONDITION
              </div>
              <h2
                style={{
                  margin: "20px 0 0",
                  fontSize: 64,
                  lineHeight: 1,
                  letterSpacing: -3,
                }}
              >
                UI olayı değil.
                <span style={{ color: "#60a5fa" }}> İki HTTP request.</span>
              </h2>
            </div>
            <div
              style={{
                ...mono,
                color: "#94a3b8",
                fontSize: 15,
                letterSpacing: 2,
              }}
            >
              AYNI PAYMENT INTENT
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 105,
            }}
          >
            <Node accent="#60a5fa" eyebrow="REQUEST A" title="POST /payments" />
            <Arrow />
            <Node accent="#38bdf8" eyebrow="REQUEST B" title="POST /payments" />
            <Arrow />
            <Node accent="#a78bfa" eyebrow="PAYMENT API" title="Aynı anda çalışır" />
            <Arrow />
            <Node
              accent={isFailure ? "#fb7185" : "#5eead4"}
              eyebrow="BUSINESS EFFECT"
              title={`${props.summary.providerCharges} provider charge`}
            />
          </div>

          <div
            style={{
              margin: "70px auto 0",
              width: "fit-content",
              borderLeft: `4px solid ${isFailure ? "#fb7185" : "#5eead4"}`,
              background: "rgba(15,23,42,.7)",
              color: "#cbd5e1",
              padding: "20px 28px",
              fontSize: 24,
            }}
          >
            Request sayısı değil, <strong>business operation</strong>{" "}
            tekilleştirilir.
          </div>
        </div>
      </Scene>

      <Scene end={345} frame={frame} start={205}>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  ...mono,
                  color: "#5eead4",
                  fontSize: 17,
                  fontWeight: 750,
                  letterSpacing: 3,
                }}
              >
                ÇÖZÜM · {modeLabels[props.mode]}
              </div>
              <h2
                style={{
                  margin: "20px 0 0",
                  fontSize: 66,
                  lineHeight: 1,
                  letterSpacing: -3.5,
                }}
              >
                Bir owner.
                <span style={{ color: "#5eead4" }}> Bir side effect.</span>
              </h2>
            </div>
            <div
              style={{
                ...mono,
                color: "#64748b",
                fontSize: 15,
                letterSpacing: 2,
              }}
            >
              IDEMPOTENCY KEY: PAY-1042
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.15fr 1fr",
              gap: 28,
              marginTop: 72,
            }}
          >
            <div
              style={{
                border: "1px solid #2563eb",
                borderRadius: 28,
                background: "rgba(37,99,235,.08)",
                padding: 30,
              }}
            >
              <div style={{ ...mono, color: "#60a5fa", fontSize: 15 }}>
                REQUEST A · OWNER
              </div>
              <div style={{ marginTop: 22, fontSize: 30, fontWeight: 800 }}>
                Key'i claim eder
              </div>
              <div
                style={{
                  marginTop: 26,
                  borderRadius: 16,
                  background: "#2563eb",
                  padding: 18,
                  fontSize: 20,
                  fontWeight: 750,
                  textAlign: "center",
                }}
              >
                Provider çağrısı
              </div>
            </div>

            <div
              style={{
                display: "grid",
                placeItems: "center",
                border: "1px solid #334155",
                borderRadius: 28,
                background: "rgba(15,23,42,.72)",
                padding: 30,
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    ...mono,
                    color: "#fbbf24",
                    fontSize: 15,
                    letterSpacing: 2,
                  }}
                >
                  POSTGRESQL
                </div>
                <div
                  style={{
                    marginTop: 22,
                    color: "#f8fafc",
                    fontSize: 34,
                    fontWeight: 800,
                  }}
                >
                  processing → completed
                </div>
                <div
                  style={{
                    marginTop: 18,
                    color: "#94a3b8",
                    fontSize: 21,
                    lineHeight: 1.5,
                  }}
                >
                  Request hash ve başarılı response saklanır.
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #5eead4",
                borderRadius: 28,
                background: "rgba(20,184,166,.08)",
                padding: 30,
              }}
            >
              <div style={{ ...mono, color: "#5eead4", fontSize: 15 }}>
                REQUEST B · DUPLICATE
              </div>
              <div style={{ marginTop: 22, fontSize: 30, fontWeight: 800 }}>
                Sonucu bekler
              </div>
              <div
                style={{
                  marginTop: 26,
                  borderRadius: 16,
                  background: "rgba(94,234,212,.12)",
                  color: "#99f6e4",
                  padding: 18,
                  fontSize: 20,
                  fontWeight: 750,
                  textAlign: "center",
                }}
              >
                Stored response replay
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              marginTop: 48,
            }}
          >
            <strong style={{ color: "#5eead4", fontSize: 62 }}>
              {props.summary.providerCharges}
            </strong>
            <span style={{ color: "#94a3b8", fontSize: 26 }}>
              charge · {props.summary.replayedResponses} replay
            </span>
          </div>
        </div>
      </Scene>

      <Scene end={450} fadeOut={false} frame={frame} start={330}>
        <div
          style={{
            display: "grid",
            height: "100%",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                border: "1px solid #5eead4",
                borderRadius: 999,
                background: "rgba(20,184,166,.08)",
                color: "#99f6e4",
                padding: "13px 22px",
                ...mono,
                fontSize: 16,
                fontWeight: 750,
                letterSpacing: 2,
              }}
            >
              MÜLAKATTA BÖYLE TOPARLA
            </div>
            <h2
              style={{
                maxWidth: 1450,
                margin: "45px auto 0",
                fontSize: 82,
                lineHeight: 1.02,
                letterSpacing: -5,
              }}
            >
              Aynı operation.
              <br />
              <span style={{ color: "#60a5fa" }}>Tek side effect.</span>
              <br />
              <span style={{ color: "#5eead4" }}>Aynı response.</span>
            </h2>
            <p
              style={{
                maxWidth: 1270,
                margin: "50px auto 0",
                color: "#94a3b8",
                fontSize: 28,
                lineHeight: 1.55,
              }}
            >
              “Exactly-once demem. At-least-once delivery altında durable
              idempotency state ile effectively-once side effect üretirim.”
            </p>
          </div>
        </div>
      </Scene>

      <footer
        style={{
          position: "absolute",
          right: 92,
          bottom: 46,
          left: 92,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#475569",
          ...mono,
          fontSize: 13,
          letterSpacing: 1.5,
        }}
      >
        <span>backend-systems-visual-lab / 01</span>
        <span>{modeLabels[props.mode]}</span>
      </footer>
    </AbsoluteFill>
  );
}
