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
const cyan = "#0e7490";
const red = "#a32921";
const green = "#176b46";

const mono: CSSProperties = {
  fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

function clamp(
  frame: number,
  input: number[],
  output: number[],
) {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function sceneOpacity(
  frame: number,
  start: number,
  end: number,
  keepVisible = false,
) {
  return keepVisible
    ? clamp(frame, [start, start + 12, end], [0, 1, 1])
    : clamp(frame, [start, start + 12, end - 12, end], [0, 1, 1, 0]);
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
  return (
    <div
      style={{
        position: "absolute",
        inset: "165px 100px 90px",
        opacity: sceneOpacity(frame, start, end, keepVisible),
      }}
    >
      {children}
    </div>
  );
}

function Token({
  color,
  label,
  opacity = 1,
  x,
  y,
}: {
  color: string;
  label: string;
  opacity?: number;
  x: number;
  y: number;
}) {
  return (
    <g opacity={opacity} transform={`translate(${x} ${y})`}>
      <circle fill={color} r="22" />
      <text
        dominantBaseline="middle"
        fill={paper}
        fontFamily={mono.fontFamily}
        fontSize="15"
        fontWeight="800"
        textAnchor="middle"
        y="1"
      >
        {label}
      </text>
    </g>
  );
}

function PhaseLabel({ children, x }: { children: ReactNode; x: number }) {
  return (
    <text
      fill={muted}
      fontFamily={mono.fontFamily}
      fontSize="13"
      fontWeight="700"
      letterSpacing="2"
      x={x}
      y="105"
    >
      {children}
    </text>
  );
}

export function DuplicatePaymentVideo(props: LabRunResult) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerIn = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 115 },
  });

  const failureA = clamp(frame, [18, 72, 118, 155], [130, 520, 1030, 1510]);
  const failureB = clamp(frame, [30, 84, 130, 167], [130, 520, 1030, 1510]);
  const firstChargeOpacity = clamp(frame, [105, 116], [0, 1]);
  const secondChargeOpacity = clamp(frame, [118, 132], [0, 1]);
  const failureVerdictOpacity = clamp(frame, [146, 160], [0, 1]);

  const claimA = clamp(frame, [205, 250], [130, 650]);
  const claimB = clamp(frame, [218, 262], [130, 650]);
  const ownerA = clamp(frame, [263, 320, 355], [650, 1110, 1510]);
  const ownerB = 555;
  const ownerLabelOpacity = clamp(frame, [258, 270], [0, 1]);
  const processingProgress = clamp(frame, [264, 345], [0, 1]);
  const completedOpacity = clamp(frame, [338, 350], [0, 1]);
  const replayX = clamp(frame, [352, 405], [650, 130]);
  const replayOpacity = clamp(frame, [346, 357], [0, 1]);
  const successVerdictOpacity = clamp(frame, [397, 415], [0, 1]);

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
          opacity: 0.42,
          backgroundImage:
            "linear-gradient(#d8d5cd 1px, transparent 1px), linear-gradient(90deg, #d8d5cd 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <header
        style={{
          position: "absolute",
          zIndex: 10,
          top: 52,
          left: 100,
          right: 100,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderBottom: `2px solid ${ink}`,
          paddingBottom: 18,
          opacity: headerIn,
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
          SAME payment_intent_id / TWO HTTP REQUESTS
        </div>
      </header>

      <Scene end={195} frame={frame} start={0}>
        <div
          style={{
            color: red,
            ...mono,
            fontSize: 16,
            fontWeight: 750,
            letterSpacing: 2.4,
          }}
        >
          WITHOUT OPERATION OWNERSHIP
        </div>

        <svg
          style={{ display: "block", marginTop: 28 }}
          viewBox="0 0 1720 660"
        >
          <defs>
            <marker
              id="failure-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="6"
              refY="4"
            >
              <path d="M0,0 L0,8 L7,4 z" fill={red} />
            </marker>
          </defs>

          <PhaseLabel x={80}>CALLERS</PhaseLabel>
          <PhaseLabel x={500}>PAYMENT API</PhaseLabel>
          <PhaseLabel x={1000}>PROVIDER</PhaseLabel>
          <PhaseLabel x={1460}>LEDGER</PhaseLabel>

          <line stroke={rule} x1="450" x2="450" y1="75" y2="520" />
          <line stroke={rule} x1="930" x2="930" y1="75" y2="520" />
          <line stroke={rule} x1="1400" x2="1400" y1="75" y2="520" />

          <text
            fill={muted}
            fontFamily={mono.fontFamily}
            fontSize="16"
            x="80"
            y="185"
          >
            REQUEST A
          </text>
          <text
            fill={muted}
            fontFamily={mono.fontFamily}
            fontSize="16"
            x="80"
            y="385"
          >
            REQUEST B
          </text>

          <path
            d="M130 220 H1510"
            fill="none"
            markerEnd="url(#failure-arrow)"
            stroke={red}
            strokeWidth="3"
          />
          <path
            d="M130 420 H1510"
            fill="none"
            markerEnd="url(#failure-arrow)"
            stroke={red}
            strokeWidth="3"
          />

          <line stroke={blue} strokeWidth="8" x1="540" x2="540" y1="155" y2="485" />
          <text
            fill={blue}
            fontFamily={mono.fontFamily}
            fontSize="15"
            fontWeight="700"
            textAnchor="middle"
            x="540"
            y="525"
          >
            NO SHARED KEY OR CLAIM
          </text>

          <circle cx="1060" cy="220" fill={paper} r="55" stroke={red} strokeWidth="3" />
          <circle cx="1060" cy="420" fill={paper} r="55" stroke={red} strokeWidth="3" />
          <text fill={red} fontSize="28" fontWeight="800" textAnchor="middle" x="1060" y="228">
            CHARGE
          </text>
          <text fill={red} fontSize="28" fontWeight="800" textAnchor="middle" x="1060" y="428">
            CHARGE
          </text>

          <Token color={blue} label="A" x={failureA} y={220} />
          <Token color={cyan} label="B" x={failureB} y={420} />

          <g opacity={firstChargeOpacity}>
            <rect fill="#f5e5e2" height="70" stroke={red} strokeWidth="2" width="170" x="1480" y="185" />
            <text fill={red} fontFamily={mono.fontFamily} fontSize="22" fontWeight="700" textAnchor="middle" x="1565" y="228">
              − $499.90
            </text>
          </g>
          <g opacity={secondChargeOpacity}>
            <rect fill="#f5e5e2" height="70" stroke={red} strokeWidth="2" width="170" x="1480" y="385" />
            <text fill={red} fontFamily={mono.fontFamily} fontSize="22" fontWeight="700" textAnchor="middle" x="1565" y="428">
              − $499.90
            </text>
          </g>

          <g opacity={failureVerdictOpacity}>
            <line stroke={red} strokeWidth="4" x1="80" x2="1640" y1="585" y2="585" />
            <text fill={red} fontSize="27" fontWeight="800" x="80" y="630">
              1 BUSINESS OPERATION → 2 FINANCIAL SIDE EFFECTS
            </text>
          </g>
        </svg>
      </Scene>

      <Scene end={450} frame={frame} keepVisible start={180}>
        <div
          style={{
            color: green,
            ...mono,
            fontSize: 16,
            fontWeight: 750,
            letterSpacing: 2.4,
          }}
        >
          UNIQUE CONSTRAINT + STORED RESPONSE = IDEMPOTENCY
        </div>

        <svg
          style={{ display: "block", marginTop: 28 }}
          viewBox="0 0 1720 660"
        >
          <defs>
            <marker
              id="success-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="6"
              refY="4"
            >
              <path d="M0,0 L0,8 L7,4 z" fill={green} />
            </marker>
          </defs>

          <PhaseLabel x={80}>CALLERS</PhaseLabel>
          <PhaseLabel x={560}>UNIQUE KEY RECORD</PhaseLabel>
          <PhaseLabel x={1070}>PROVIDER</PhaseLabel>
          <PhaseLabel x={1460}>LEDGER</PhaseLabel>

          <line stroke={rule} x1="450" x2="450" y1="75" y2="520" />
          <line stroke={rule} x1="950" x2="950" y1="75" y2="520" />
          <line stroke={rule} x1="1400" x2="1400" y1="75" y2="520" />

          <path d="M130 220 H650 H1510" fill="none" markerEnd="url(#success-arrow)" stroke={green} strokeWidth="3" />
          <path d="M130 420 H590" fill="none" stroke={muted} strokeWidth="3" />

          <text fill={muted} fontFamily={mono.fontFamily} fontSize="16" x="80" y="185">
            REQUEST A
          </text>
          <text fill={muted} fontFamily={mono.fontFamily} fontSize="16" x="80" y="385">
            REQUEST B
          </text>

          <rect fill={paper} height="270" stroke={ink} strokeWidth="3" width="310" x="590" y="170" />
          <text fill={ink} fontFamily={mono.fontFamily} fontSize="18" fontWeight="800" textAnchor="middle" x="745" y="215">
            PRIMARY KEY: pay-1042
          </text>
          <text fill={green} fontSize="23" fontWeight="800" textAnchor="middle" x="745" y="275">
            A INSERTS → OWNER
          </text>
          <text fill={muted} fontSize="23" fontWeight="700" textAnchor="middle" x="745" y="325">
            B CONFLICTS → WAITS
          </text>
          <line stroke={rule} x1="630" x2="860" y1="355" y2="355" />
          <line stroke={green} strokeWidth="6" x1="630" x2={630 + 230 * processingProgress} y1="355" y2="355" />
          <text fill={muted} fontFamily={mono.fontFamily} fontSize="15" textAnchor="middle" x="745" y="395">
            processing
          </text>
          <text fill={green} fontFamily={mono.fontFamily} fontSize="15" opacity={completedOpacity} textAnchor="middle" x="745" y="422">
            completed · response stored
          </text>

          <circle cx="1120" cy="220" fill={paper} r="60" stroke={green} strokeWidth="3" />
          <text fill={green} fontSize="27" fontWeight="800" textAnchor="middle" x="1120" y="215">
            ONE
          </text>
          <text fill={green} fontSize="20" fontWeight="700" textAnchor="middle" x="1120" y="243">
            CHARGE
          </text>

          <Token color={blue} label="A" x={frame < 263 ? claimA : ownerA} y={220} />
          <Token color={cyan} label="B" x={claimB < ownerB ? claimB : ownerB} y={420} />

          <g opacity={ownerLabelOpacity}>
            <text fill={green} fontFamily={mono.fontFamily} fontSize="15" fontWeight="800" textAnchor="middle" x="650" y="152">
              INSERT SUCCEEDS
            </text>
            <text fill={muted} fontFamily={mono.fontFamily} fontSize="15" fontWeight="700" textAnchor="middle" x="555" y="480">
              UNIQUE CONFLICT
            </text>
          </g>

          <g opacity={completedOpacity}>
            <rect fill="#e2eee7" height="70" stroke={green} strokeWidth="2" width="170" x="1480" y="185" />
            <text fill={green} fontFamily={mono.fontFamily} fontSize="22" fontWeight="700" textAnchor="middle" x="1565" y="228">
              − $499.90
            </text>
          </g>

          <g opacity={replayOpacity}>
            <path
              d="M 650 420 C 650 530 260 530 130 450"
              fill="none"
              markerEnd="url(#success-arrow)"
              stroke={green}
              strokeDasharray="10 8"
              strokeWidth="3"
            />
            <rect fill={green} height="26" transform={`translate(${replayX - 13} 502)`} width="26" />
            <text fill={green} fontFamily={mono.fontFamily} fontSize="16" fontWeight="800" textAnchor="middle" x="440" y="570">
              STORED 200 RESPONSE REPLAYED TO REQUEST B
            </text>
          </g>

          <g opacity={successVerdictOpacity}>
            <line stroke={green} strokeWidth="4" x1="80" x2="1640" y1="610" y2="610" />
            <text fill={green} fontSize="27" fontWeight="800" x="80" y="652">
              UNIQUE CLAIM → 1 CHARGE → SAME RESPONSE
            </text>
          </g>
        </svg>
      </Scene>

      <footer
        style={{
          position: "absolute",
          right: 100,
          bottom: 42,
          left: 100,
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${rule}`,
          paddingTop: 13,
          color: muted,
          ...mono,
          fontSize: 13,
          letterSpacing: 1.3,
        }}
      >
        <span>backend-systems-visual-lab / 01</span>
        <span>
          {frame < 190
            ? "BASELINE: 2 CHARGES"
            : `FULL IDEMPOTENCY: ${props.summary.providerCharges} CHARGE / ${props.summary.replayedResponses} REPLAY`}
        </span>
      </footer>
    </AbsoluteFill>
  );
}
