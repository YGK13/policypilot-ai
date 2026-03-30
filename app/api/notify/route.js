// ============================================================================
// API: /api/notify — Send email notifications for escalated tickets
//
// POST: Send an escalation email via Resend when a high-risk ticket is created.
// Requires RESEND_API_KEY env var (provision from Vercel Marketplace → Resend).
// Falls back silently when key is not configured (demo mode).
//
// Called fire-and-forget from /api/tickets POST when routing === 'hr' | 'legal'.
// ============================================================================

import { NextResponse } from "next/server";

const HAS_RESEND = !!process.env.RESEND_API_KEY;

// ============================================================================
// POST /api/notify
// Body: { ticket, toEmail, companyName, supportEmail }
// ============================================================================
export async function POST(request) {
  if (!HAS_RESEND) {
    // -- Demo mode: log but don't fail --
    const body = await request.json().catch(() => ({}));
    console.log("[Notify] RESEND_API_KEY not set — skipping email for ticket:", body?.ticket?.id);
    return NextResponse.json({ sent: false, demo: true });
  }

  try {
    const body = await request.json();
    const { ticket, toEmail, companyName, supportEmail } = body;

    if (!ticket || !toEmail) {
      return NextResponse.json({ error: "Missing ticket or toEmail" }, { status: 400 });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // -- Determine escalation type and urgency color --
    const isLegal  = ticket.routing === "legal";
    const urgency  = isLegal ? "🔴 LEGAL ESCALATION" : "🟡 HR ESCALATION";
    const bgColor  = isLegal ? "#FEF2F2" : "#FFFBEB";
    const bdColor  = isLegal ? "#FCA5A5" : "#FCD34D";
    const priority = ticket.priority?.toUpperCase() || "MEDIUM";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Inter,Arial,sans-serif;background:#F9FAFB;padding:32px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

    <!-- Header -->
    <div style="background:#1F2937;padding:24px 32px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;">⚡</span>
        <span style="color:#fff;font-size:18px;font-weight:700;">AI HR Pilot</span>
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0;">${companyName || "Your Company"} · Escalation Alert</p>
    </div>

    <!-- Urgency Banner -->
    <div style="background:${bgColor};border-left:4px solid ${bdColor};padding:16px 32px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#1F2937;">${urgency}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">A ticket requires immediate human attention</p>
    </div>

    <!-- Ticket Details -->
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:8px 0;color:#6B7280;width:140px;">Ticket ID</td>
          <td style="padding:8px 0;font-weight:600;color:#1F2937;font-family:monospace;">${ticket.id}</td>
        </tr>
        <tr style="background:#F9FAFB;">
          <td style="padding:8px 6px;color:#6B7280;">Priority</td>
          <td style="padding:8px 6px;font-weight:700;color:${isLegal ? "#DC2626" : "#D97706"};">${priority}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6B7280;">Employee</td>
          <td style="padding:8px 0;color:#1F2937;">${ticket.employee || "Unknown"}</td>
        </tr>
        <tr style="background:#F9FAFB;">
          <td style="padding:8px 6px;color:#6B7280;">Department</td>
          <td style="padding:8px 6px;color:#1F2937;">${ticket.department || "—"}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6B7280;">State</td>
          <td style="padding:8px 0;color:#1F2937;">${ticket.state || "—"}</td>
        </tr>
        <tr style="background:#F9FAFB;">
          <td style="padding:8px 6px;color:#6B7280;">Risk Score</td>
          <td style="padding:8px 6px;font-weight:700;color:#DC2626;">${ticket.riskScore ?? "—"} / 100</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6B7280;">Category</td>
          <td style="padding:8px 0;color:#1F2937;">${ticket.category || "—"}</td>
        </tr>
      </table>

      <!-- Query -->
      <div style="margin-top:20px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;">Employee Query</p>
        <p style="margin:0;font-size:14px;color:#1F2937;line-height:1.5;">${ticket.query}</p>
      </div>

      <!-- CTA -->
      <div style="margin-top:24px;text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://policypilot-ai.vercel.app"}/tickets"
           style="display:inline-block;background:#4F46E5;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
          View Ticket in AI HR Pilot →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9CA3AF;">
        Sent by AI HR Pilot · ${companyName || "Your Company"}
        ${supportEmail ? ` · <a href="mailto:${supportEmail}" style="color:#6B7280;">${supportEmail}</a>` : ""}
      </p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: `AI HR Pilot <notifications@${process.env.RESEND_DOMAIN || "aihrpilot.com"}>`,
      to: [toEmail],
      subject: `${urgency}: ${ticket.category || "HR Ticket"} — ${ticket.id} [${priority}]`,
      html,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[Notify] Resend error:", err);
    // -- Non-fatal: notification failures should not break ticket creation --
    return NextResponse.json({ sent: false, error: err.message }, { status: 500 });
  }
}
