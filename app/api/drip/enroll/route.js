import { NextResponse } from "next/server";
import { enrollSubscriber } from "@/lib/drip-client";

// POST /api/drip/enroll
// Body: { dripId, email, domain?, firstName?, source?, utm?, meta? }
// Defaults: domain = "aihrpilot.com".
//
// PUBLIC endpoint (proxy.ts exempts /api/drip). Guarded by a per-instance
// sliding-window rate limit so it cannot be used for enrollment spam. Not a
// perfect defense on serverless (per-instance memory), but it stops naive
// abuse at zero infrastructure cost.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // ip -> [timestamps]

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // bound memory
  return arr.length > MAX_PER_WINDOW;
}

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const { dripId, email } = body || {};
  if (!dripId || !email) {
    return NextResponse.json({ ok: false, error: "missing dripId or email" }, { status: 400 });
  }
  // -- Basic email sanity check before forwarding to the drip engine --
  if (typeof email !== "string" || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const result = await enrollSubscriber({
    dripId,
    email,
    domain: body.domain || "aihrpilot.com",
    firstName: body.firstName,
    source: body.source || "aihrpilot-app",
    utm: body.utm,
    meta: body.meta,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 502 });
  }
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    engineConfigured: Boolean(process.env.DRIP_ENGINE_URL && process.env.DRIP_INGEST_SECRET),
  });
}
