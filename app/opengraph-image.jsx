import { ImageResponse } from "next/og";

// ============================================================================
// OG IMAGE — 1200x630, generated at request time from the "Signal" palette.
// Public in proxy.ts (/opengraph-image). Used by every marketing route.
// ============================================================================

export const alt = "AI HR Pilot — AI HR policy and compliance copilot for HR teams of 50 to 2,000";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          background: "#f7f7f5", color: "#0a0b0d", padding: "64px 72px", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, letterSpacing: 4, color: "#4a4b4e" }}>AI HR</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>pilot</div>
              <div style={{ width: 118, height: 8, background: "#c6ff3d", borderRadius: 4, marginTop: 6 }} />
            </div>
          </div>
          <div style={{ fontSize: 20, color: "#4a4b4e", letterSpacing: 2 }}>AIHRPILOT.COM</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 66, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.05, maxWidth: 1000 }}>
            Your handbook, answering. Your compliance risk, caught early.
          </div>
          <div style={{ fontSize: 26, color: "#4a4b4e", marginTop: 26, maxWidth: 980, lineHeight: 1.35 }}>
            AI HR policy and compliance copilot for HR teams of 50 to 2,000. Cited answers, risk triage, audit trail, federal + 11-state coverage.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid #e8e8e5", paddingTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, color: "#4a4b4e" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#c6ff3d" }} />
            Built by a 3x CHRO with a JD
          </div>
          <div style={{ fontSize: 20, color: "#4a4b4e" }}>A PortLev build</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
