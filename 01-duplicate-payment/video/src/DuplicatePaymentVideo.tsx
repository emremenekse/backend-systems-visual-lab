import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LabRunResult } from "./types";

const ink = "#171717";
const paper = "#f3f1eb";
const muted = "#73716b";
const rule = "#b8b5ad";
const blue = "#1849a9";
const red = "#a32921";
const green = "#176b46";

const mono: CSSProperties = {
  fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const modeLabels: Record<LabRunResult["mode"], string> = {
  unprotected: "NO PROTECTION",
  "database-constraint": "UNIQUE CONSTRAINT",
  "idempotent-api": "IDEMPOTENCY KEY",
};

function sceneOpacity(
  frame: number,
  start: number,
  end: number,
  keepVisible = false,
) {
  const input = keepVisible
    ? [start, start + 12, end]
    : [start, start + 12, end - 12, end];
  const output = keepVisible ? [0, 1, 1] : [0, 1, 1, 0];

  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function Scene({
  children,
  end,
  frame,
  keepVisible,
  start,
}: {
  children: ReactNode;
  end: number;
  frame: number;
  keepVisible?: boolean;
  start: number;
}) {
  const opacity = sceneOpacity(frame, start, end, keepVisible);
  const translateY = interpolate(opacity, [0, 1], [20, 0]);

  return (
    <div
      style={{
        position: "absolute",
        inset: "180px 100px 90px",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children, color = blue }: { children: ReactNode; color?: string }) {
  return (
    <div
      style={{
        ...mono,
        color,
        fontSize: 17,
        fontWeight: 700,
        letterSpacing: 2.4,
      }}
    >
      {children}
    </div>
  );
}

function RequestLine({
  label,
  target,
  tone = blue,
}: {
  label: string;
  target: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "230px 1fr 330px",
        alignItems: "center",
        gap: 26,
        borderTop: `1px solid ${rule}`,
        padding: "28px 0",
      }}
    >
      <span
        style={{
          ...mono,
          color: tone,
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <div style={{ height: 2, background: tone }} />
      <strong style={{ color: tone, fontSize: 26 }}>{target}</strong>
    </div>
  );
}

export function DuplicatePaymentVideo(props: LabRunResult) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 115 },
  });
  const failed = props.summary.providerCharges > 1;

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background: paper,
        color: ink,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          backgroundImage:
            "linear-gradient(#d8d5cd 1px, transparent 1px), linear-gradient(90deg, #d8d5cd 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header
        style={{
          position: "absolute",
          zIndex: 10,
          top: 54,
          left: 100,
          right: 100,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderBottom: `2px solid ${ink}`,
          paddingBottom: 20,
          opacity: intro,
        }}
      >
        <div>
          <strong style={{ fontSize: 24 }}>Backend Systems Lab</strong>
          <div
            style={{
              ...mono,
              marginTop: 7,
              color: muted,
              fontSize: 14,
              letterSpacing: 1.8,
            }}
          >
            01 / DUPLICATE PAYMENT
          </div>
        </div>
        <div
          style={{
            ...mono,
            color: muted,
            fontSize: 14,
            letterSpacing: 1.4,
          }}
        >
          {modeLabels[props.mode]} / {props.trace.length} EVENTS
        </div>
      </header>

      <Scene end={105} frame={frame} start={0}>
        <div
          style={{
            display: "grid",
            height: "100%",
            gridTemplateColumns: "1.15fr .85fr",
            gap: 100,
            alignItems: "center",
          }}
        >
          <div>
            <Label>THE INVARIANT</Label>
            <h1
              style={{
                maxWidth: 920,
                margin: "26px 0 0",
                fontSize: 94,
                fontWeight: 600,
                lineHeight: 0.96,
                letterSpacing: -6,
              }}
            >
              One payment intent.
              <br />
              <span style={{ color: blue }}>At most one charge.</span>
            </h1>
          </div>
          <div style={{ borderTop: `4px solid ${ink}`, paddingTop: 28 }}>
            <Label color={muted}>BUSINESS IDENTITY</Label>
            <code
              style={{
                ...mono,
                display: "block",
                marginTop: 26,
                color: ink,
                fontSize: 31,
              }}
            >
              payment_intent_id
              <br />
              = pi_ord_1042
            </code>
            <p
              style={{
                margin: "32px 0 0",
                color: muted,
                fontSize: 24,
                lineHeight: 1.5,
              }}
            >
              Transport retries do not create a new business operation.
            </p>
          </div>
        </div>
      </Scene>

      <Scene end={220} frame={frame} start={90}>
        <div>
          <Label color={failed ? red : blue}>THE RACE</Label>
          <h2
            style={{
              margin: "22px 0 58px",
              fontSize: 68,
              fontWeight: 600,
              letterSpacing: -4,
            }}
          >
            Two requests arrive. Who owns execution?
          </h2>
          <RequestLine label="REQUEST A / 0ms" target="provider charge #1" tone={red} />
          <RequestLine label="REQUEST B / +12ms" target="provider charge #2" tone={red} />
          <div
            style={{
              display: "flex",
              marginTop: 32,
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `4px solid ${red}`,
              paddingTop: 24,
            }}
          >
            <span style={{ color: muted, fontSize: 23 }}>
              No shared operation identity. Both requests execute.
            </span>
            <strong style={{ color: red, fontSize: 30 }}>
              INVARIANT BROKEN
            </strong>
          </div>
        </div>
      </Scene>

      <Scene end={345} frame={frame} start={205}>
        <div>
          <Label color={green}>OWNERSHIP</Label>
          <h2
            style={{
              margin: "22px 0 55px",
              fontSize: 68,
              fontWeight: 600,
              letterSpacing: -4,
            }}
          >
            One operation. One execution owner.
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 1.25fr 70px 1fr",
              alignItems: "stretch",
            }}
          >
            <div style={{ borderTop: `3px solid ${blue}`, paddingTop: 24 }}>
              <Label>CALLERS</Label>
              <p style={{ margin: "22px 0 0", fontSize: 30, lineHeight: 1.5 }}>
                Request A
                <br />
                Request B
              </p>
              <code style={{ ...mono, color: muted, fontSize: 17 }}>
                same key + payload
              </code>
            </div>
            <div
              style={{
                display: "grid",
                placeItems: "center",
                color: muted,
                fontSize: 34,
              }}
            >
              →
            </div>
            <div style={{ borderTop: `3px solid ${ink}`, paddingTop: 24 }}>
              <Label color={ink}>DURABLE KEY RECORD</Label>
              <p
                style={{
                  margin: "22px 0 0",
                  fontSize: 29,
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                processing → completed
              </p>
              <p style={{ margin: "15px 0 0", color: muted, fontSize: 20 }}>
                request hash + stored response
              </p>
            </div>
            <div
              style={{
                display: "grid",
                placeItems: "center",
                color: muted,
                fontSize: 34,
              }}
            >
              →
            </div>
            <div style={{ borderTop: `3px solid ${green}`, paddingTop: 24 }}>
              <Label color={green}>OUTCOME</Label>
              <p
                style={{
                  margin: "22px 0 0",
                  color: green,
                  fontSize: 30,
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                1 provider call
                <br />
                1 stored replay
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: 58,
              borderTop: `1px solid ${rule}`,
              paddingTop: 25,
              color: muted,
              fontSize: 23,
            }}
          >
            The idempotency key identifies the operation. The record selects its
            owner and preserves its result.
          </div>
        </div>
      </Scene>

      <Scene end={450} frame={frame} keepVisible start={330}>
        <div
          style={{
            display: "grid",
            height: "100%",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <Label>INTERVIEW ANSWER</Label>
            <h2
              style={{
                maxWidth: 1450,
                margin: "38px auto 0",
                fontSize: 88,
                fontWeight: 600,
                lineHeight: 1.03,
                letterSpacing: -5,
              }}
            >
              Same operation.
              <br />
              <span style={{ color: blue }}>One side effect.</span>
              <br />
              <span style={{ color: green }}>Same response.</span>
            </h2>
            <p
              style={{
                maxWidth: 1260,
                margin: "45px auto 0",
                color: muted,
                fontSize: 26,
                lineHeight: 1.55,
              }}
            >
              Durable idempotency state produces an effectively-once side effect
              under at-least-once delivery. It is not a blanket exactly-once
              guarantee.
            </p>
          </div>
        </div>
      </Scene>

      <footer
        style={{
          position: "absolute",
          right: 100,
          bottom: 45,
          left: 100,
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${rule}`,
          paddingTop: 14,
          color: muted,
          ...mono,
          fontSize: 13,
          letterSpacing: 1.3,
        }}
      >
        <span>backend-systems-visual-lab / 01</span>
        <span>{props.summary.providerCharges} CHARGE / {props.summary.replayedResponses} REPLAY</span>
      </footer>
    </AbsoluteFill>
  );
}
