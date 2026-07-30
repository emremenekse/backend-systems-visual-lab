import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LabRunResult, TraceLane } from "./types";

const lanes: Array<{ id: TraceLane; label: string; color: string }> = [
  { id: "lab", label: "Lab", color: "#a78bfa" },
  { id: "request-a", label: "Request A", color: "#22d3ee" },
  { id: "request-b", label: "Request B", color: "#38bdf8" },
  { id: "database", label: "PostgreSQL", color: "#fbbf24" },
  { id: "provider", label: "Provider", color: "#34d399" },
];

const modeLabels: Record<LabRunResult["mode"], string> = {
  unprotected: "NO GUARD",
  "database-constraint": "UNIQUE INDEX",
  "idempotent-api": "KEY + RESPONSE REPLAY",
};

const mono: CSSProperties = {
  fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export function DuplicatePaymentVideo(props: LabRunResult) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 110 },
  });
  const traceStart = 58;
  const traceEnd = 270;
  const safeTrace = props.trace.length > 0 ? props.trace : [];
  const activeIndex =
    safeTrace.length === 0
      ? 0
      : Math.min(
          safeTrace.length - 1,
          Math.floor(
            interpolate(
              frame,
              [traceStart, traceEnd],
              [0, safeTrace.length],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            ),
          ),
        );
  const activeEvent = safeTrace[activeIndex];
  const summaryProgress = spring({
    frame: frame - 282,
    fps,
    config: { damping: 18, stiffness: 95 },
  });
  const traceOpacity = interpolate(frame, [42, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isFailure = props.summary.providerCharges > 1;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% -10%, rgba(34,211,238,.14), transparent 48%), #020617",
        color: "#f8fafc",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        padding: 92,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.24,
          backgroundImage:
            "linear-gradient(rgba(51,65,85,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,.22) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          opacity: intro,
          transform: `translateY(${interpolate(intro, [0, 1], [20, 0])}px)`,
        }}
      >
        <div>
          <div
            style={{
              ...mono,
              color: "#64748b",
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 4,
            }}
          >
            BACKEND SYSTEMS VISUAL LAB / 01
          </div>
          <h1
            style={{
              margin: "22px 0 0",
              fontSize: 70,
              lineHeight: 1.02,
              letterSpacing: -3.6,
              maxWidth: 1050,
            }}
          >
            Two requests.
            <br />
            <span style={{ color: "#67e8f9" }}>How many charges?</span>
          </h1>
        </div>

        <div
          style={{
            ...mono,
            border: "1px solid rgba(103,232,249,.34)",
            borderRadius: 999,
            background: "rgba(8,145,178,.1)",
            color: "#a5f3fc",
            padding: "14px 20px",
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          {modeLabels[props.mode]}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 94,
          opacity: traceOpacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 118,
            right: 118,
            top: 62,
            height: 2,
            background: "#1e293b",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${lanes.length}, 1fr)`,
            gap: 24,
          }}
        >
          {lanes.map((lane, index) => {
            const isActive = activeEvent?.lane === lane.id;
            const pulse = isActive
              ? spring({
                  frame: frame - traceStart - activeIndex * 8,
                  fps,
                  config: { damping: 14, stiffness: 130 },
                })
              : 0;

            return (
              <div
                key={lane.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "grid",
                    width: 124,
                    height: 124,
                    placeItems: "center",
                    border: `2px solid ${isActive ? lane.color : "#334155"}`,
                    borderRadius: 30,
                    background: isActive
                      ? `color-mix(in srgb, ${lane.color} 15%, #020617)`
                      : "#0f172a",
                    boxShadow: isActive
                      ? `0 0 ${36 + pulse * 20}px color-mix(in srgb, ${lane.color} 28%, transparent)`
                      : "none",
                    transform: `scale(${1 + pulse * 0.08})`,
                  }}
                >
                  <span
                    style={{
                      ...mono,
                      color: isActive ? lane.color : "#64748b",
                      fontSize: 30,
                      fontWeight: 700,
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <span
                  style={{
                    color: isActive ? "#f8fafc" : "#64748b",
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  {lane.label}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            gap: 30,
            minHeight: 176,
            marginTop: 58,
            border: "1px solid #1e293b",
            borderRadius: 26,
            background: "rgba(15,23,42,.72)",
            padding: "30px 34px",
          }}
        >
          <div>
            <div
              style={{
                ...mono,
                color: "#475569",
                fontSize: 18,
                letterSpacing: 2,
              }}
            >
              EVENT
            </div>
            <div
              style={{
                ...mono,
                marginTop: 14,
                color: "#cbd5e1",
                fontSize: 40,
              }}
            >
              {safeTrace.length === 0
                ? "—"
                : `${String(activeIndex + 1).padStart(2, "0")} / ${String(
                    safeTrace.length,
                  ).padStart(2, "0")}`}
            </div>
          </div>

          <div>
            <div
              style={{
                ...mono,
                color: activeEvent
                  ? lanes.find((lane) => lane.id === activeEvent.lane)?.color
                  : "#64748b",
                fontSize: 18,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {activeEvent
                ? `${activeEvent.lane} · ${activeEvent.kind} · +${activeEvent.offsetMs.toFixed(1)}ms`
                : "waiting for trace"}
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: -1,
              }}
            >
              {activeEvent?.label ?? "No events"}
            </div>
            <div
              style={{
                marginTop: 9,
                color: "#94a3b8",
                fontSize: 22,
                lineHeight: 1.45,
              }}
            >
              {activeEvent?.detail ?? "Capture a run from the live backend."}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
          opacity: summaryProgress,
          transform: `scale(${interpolate(summaryProgress, [0, 1], [0.96, 1])})`,
          background: "rgba(2,6,23,.94)",
        }}
      >
        <div style={{ width: 1320, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              border: `1px solid ${isFailure ? "rgba(251,113,133,.42)" : "rgba(52,211,153,.38)"}`,
              borderRadius: 999,
              background: isFailure
                ? "rgba(244,63,94,.1)"
                : "rgba(16,185,129,.1)",
              color: isFailure ? "#fecdd3" : "#a7f3d0",
              padding: "14px 24px",
              ...mono,
              fontSize: 20,
              letterSpacing: 2,
            }}
          >
            {isFailure ? "INVARIANT FAILED" : "INVARIANT PRESERVED"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 26,
              marginTop: 54,
            }}
          >
            <span
              style={{
                color: isFailure ? "#fb7185" : "#34d399",
                fontSize: 210,
                fontWeight: 750,
                letterSpacing: -12,
                lineHeight: 0.9,
              }}
            >
              {props.summary.providerCharges}
            </span>
            <span
              style={{
                color: "#cbd5e1",
                fontSize: 58,
                fontWeight: 650,
                letterSpacing: -2,
              }}
            >
              provider charge
              {props.summary.providerCharges === 1 ? "" : "s"}
            </span>
          </div>

          <p
            style={{
              margin: "58px auto 0",
              maxWidth: 1000,
              color: "#94a3b8",
              fontSize: 34,
              lineHeight: 1.45,
            }}
          >
            {props.summary.verdict}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
}
