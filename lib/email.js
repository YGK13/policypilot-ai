// ============================================================================
// lib/email.js — Transactional email via Resend (server-only)
//
// Extracted from the former PUBLIC /api/notify route. Escalation emails are now
// sent through a direct internal function call from /api/tickets, which removes
// the unauthenticated email-send surface (previously anyone could POST to
// /api/notify and send mail from our domain to any address). No-ops cleanly
// when RESEND_API_KEY is not configured.
// ============================================================================

// Build the escalation email HTML for a ticket.
function escalationHtml({ ticket, companyName, supportEmail }) {
  const isLegal = ticket.routing === "legal";
  const urgency = isLegal ? "🔴 LEGAL ESCALATION" : "🟡 HR ESCALATION";
  const bgColor = isLegal ? "#FEF2F2" : "#FFFBEB";
  const bdColor = isLegal ? "#FCA5A5" : "#FCD34D";
  const priority = ticket.priority?.toUpperCase() || "MEDIUM";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aihrpilot.com";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Inter,Arial,sans-serif;background:#F9FAFB;padding:32px;margin:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#1F2937;padding:24px 32px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;">⚡</span>
        <span style="color:#fff;font-size:18px;font-weight:700;">AI HR Pilot</span>
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:4px 0 0;">${companyName || "Your Company"} · Escalation Alert</p>
    </div>
    <div style="background:${bgColor};border-left:4px solid ${bdColor};padding:16px 32px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#1F2937;">${urgency}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">A ticket requires immediate human attention</p>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:8px 0;color:#6B7280;width:140px;">Ticket ID</td><td style="padding:8px 0;font-weight:600;color:#1F2937;font-family:monospace;">${ticket.id}</td></tr>
        <tr style="background:#F9FAFB;"><td style="padding:8px 6px;color:#6B7280;">Priority</td><td style="padding:8px 6px;font-weight:700;color:${isLegal ? "#DC2626" : "#D97706"};">${priority}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;">Employee</td><td style="padding:8px 0;color:#1F2937;">${ticket.employee || "Unknown"}</td></tr>
        <tr style="background:#F9FAFB;"><td style="padding:8px 6px;color:#6B7280;">Department</td><td style="padding:8px 6px;color:#1F2937;">${ticket.department || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;">State</td><td style="padding:8px 0;color:#1F2937;">${ticket.state || "—"}</td></tr>
        <tr style="background:#F9FAFB;"><td style="padding:8px 6px;color:#6B7280;">Risk Score</td><td style="padding:8px 6px;font-weight:700;color:#DC2626;">${ticket.riskScore ?? "—"} / 100</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;">Category</td><td style="padding:8px 0;color:#1F2937;">${ticket.category || "—"}</td></tr>
      </table>
      <div style="margin-top:20px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;">Employee Query</p>
        <p style="margin:0;font-size:14px;color:#1F2937;line-height:1.5;">${ticket.query}</p>
      </div>
      <div style="margin-top:24px;text-align:center;">
        <a href="${appUrl}/tickets" style="display:inline-block;background:#4F46E5;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">View Ticket in AI HR Pilot →</a>
      </div>
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9CA3AF;">Sent by AI HR Pilot · ${companyName || "Your Company"}${supportEmail ? ` · <a href="mailto:${supportEmail}" style="color:#6B7280;">${supportEmail}</a>` : ""}</p>
    </div>
  </div>
</body>
</html>`;
}

// Send an escalation email for a high-risk/escalated ticket. Best-effort:
// returns a result object and never throws, so callers can fire-and-forget.
export async function sendEscalationEmail({ ticket, toEmail, companyName, supportEmail }) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] RESEND_API_KEY not set — skipping escalation email for", ticket?.id);
    return { sent: false, demo: true };
  }
  if (!ticket || !toEmail) {
    return { sent: false, error: "Missing ticket or toEmail" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const isLegal = ticket.routing === "legal";
    const urgency = isLegal ? "🔴 LEGAL ESCALATION" : "🟡 HR ESCALATION";
    const priority = ticket.priority?.toUpperCase() || "MEDIUM";

    await resend.emails.send({
      from: `AI HR Pilot <notifications@${process.env.RESEND_DOMAIN || "aihrpilot.com"}>`,
      to: [toEmail],
      subject: `${urgency}: ${ticket.category || "HR Ticket"} — ${ticket.id} [${priority}]`,
      html: escalationHtml({ ticket, companyName, supportEmail }),
    });

    return { sent: true };
  } catch (err) {
    console.error("[Email] Resend error:", err.message);
    return { sent: false, error: err.message };
  }
}

// ============================================================================
// sendInviteEmail — team member invite notification via Resend
//
// IMPORTANT: We intentionally do NOT use Clerk's invitations API here.
// Clerk invitations link to the Clerk Account Portal (accounts.aihrpilot.com),
// which causes cross-app contamination if multiple apps share the same Clerk
// instance. This email sends a plain link to aihrpilot.com/sign-up so the
// invitee creates their account through the normal sign-up flow, and the
// bootstrap route assigns their role + org from publicMetadata set when they
// eventually sign up (via onboarding or future invite-token flow).
// ============================================================================
export async function sendInviteEmail({ toEmail, toName, role, orgSlug, invitedBy }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aihrpilot.com";
  const signUpUrl = `${appUrl}/sign-up`;
  const roleLabels = {
    hr_admin: "HR Administrator",
    hr_staff: "HR Staff",
    legal:    "Legal Counsel",
    employee: "Employee",
  };
  const roleLabel = roleLabels[role] || role;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] RESEND_API_KEY not set — invite email skipped for ${toEmail}`);
    return { sent: false, demo: true };
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Inter,Arial,sans-serif;background:#F9FAFB;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#1F2937;padding:24px 32px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:24px;">⚡</span>
      <span style="color:#fff;font-size:18px;font-weight:700;">AI HR Pilot</span>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1F2937;">You've been invited</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">
        You've been added to your organisation's AI HR Pilot workspace as <strong>${roleLabel}</strong>.
        Click below to create your account and get started.
      </p>
      <a href="${signUpUrl}"
         style="display:inline-block;background:#4F46E5;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
        Accept Invitation →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;">
        If you weren't expecting this invite, you can ignore this email safely.
      </p>
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9CA3AF;">Sent by AI HR Pilot</p>
    </div>
  </div>
</body></html>`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `AI HR Pilot <notifications@${process.env.RESEND_DOMAIN || "aihrpilot.com"}>`,
      to:   [toEmail],
      subject: `You've been invited to AI HR Pilot as ${roleLabel}`,
      html,
    });
    console.log(`[Email] Invite sent to ${toEmail} (role=${role})`);
    return { sent: true };
  } catch (err) {
    console.error("[Email] sendInviteEmail error:", err.message);
    return { sent: false, error: err.message };
  }
}
