// ============================================================================
// GET /api/payroll/oauth/[provider]
//
// TWO purposes on the same URL:
//
// 1. INITIATE (no ?code): the browser hits this route after the admin clicks
//    "Connect Gusto" in /integrations. We verify the caller is an hr_admin,
//    build the provider's authorize URL with a signed `state` that binds the
//    consent to this org, and 302 the browser to the provider.
//
// 2. CALLBACK (?code=... &state=...): the provider redirects the admin's
//    browser back here after consent. We verify the state signature (proves
//    the flow originated in this app, not an attacker-forged link), exchange
//    the code for tokens, persist them encrypted, then redirect to
//    /integrations with a success flag.
//
// Public route per proxy.ts — Clerk sessions do not survive a cross-site
// redirect through the provider anyway. Instead we bind the org to the flow
// via a signed, short-lived state cookie set at initiate time and verified
// at callback time.
// ============================================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { requireRole } from "@/lib/auth/rbac";
import { isKnownProvider, loadProvider, encrypt } from "@/lib/payroll";
import { upsertPayrollConnection } from "@/lib/db";

const STATE_COOKIE = "pyr_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// -- Signed state: base64url({orgId, userId, provider, iat}) . base64url(HMAC).
//    Key: SETUP_SECRET (already required in prod). Rotating SETUP_SECRET
//    invalidates all in-flight OAuth flows, which is acceptable. --
function stateKey() {
  const s = process.env.SETUP_SECRET || process.env.CLERK_SECRET_KEY;
  if (!s) throw new Error("payroll oauth: no secret available for state signing");
  return crypto.createHash("sha256").update(String(s)).digest();
}
function b64u(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64uDecode(str) {
  return Buffer.from(String(str).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}
function signState(payload) {
  const body = b64u(JSON.stringify(payload));
  const mac  = b64u(crypto.createHmac("sha256", stateKey()).update(body).digest());
  return `${body}.${mac}`;
}
function verifyState(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const expected = b64u(crypto.createHmac("sha256", stateKey()).update(body).digest());
  const a = Buffer.from(mac, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64uDecode(body));
    if (Date.now() - Number(payload.iat) > STATE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request, { params }) {
  const providerName = String((await params).provider || "").toLowerCase();
  if (!isKnownProvider(providerName)) {
    return NextResponse.json({ error: `Unknown provider: ${providerName}` }, { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  // -------- Callback path (provider is redirecting back to us) --------
  if (code) {
    if (!stateParam) return NextResponse.json({ error: "missing state" }, { status: 400 });

    // -- Two-layer state check: signature validity (proves we minted it) AND
    //    equality with the state cookie we set on initiate (proves same
    //    browser session started the flow, defeats cross-site CSRF-y edge
    //    cases). --
    const claim = verifyState(stateParam);
    if (!claim || claim.provider !== providerName) {
      return NextResponse.json({ error: "invalid or expired state" }, { status: 400 });
    }
    const jar = await cookies();
    const cookieState = jar.get(STATE_COOKIE)?.value;
    if (cookieState !== stateParam) {
      return NextResponse.json({ error: "state cookie mismatch" }, { status: 400 });
    }

    try {
      const provider = await loadProvider(providerName);
      const tokens = await provider.exchangeCode(code);
      await upsertPayrollConnection(claim.orgId, providerName, {
        accessTokenEnc:    encrypt(tokens.accessToken),
        refreshTokenEnc:   tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt:    tokens.expiresAt,
        scope:             tokens.scope,
        status:            "active",
        connectedByUserId: claim.userId || null,
      });
    } catch (err) {
      console.error(`[payroll/oauth/${providerName}] callback error:`, err);
      const back = new URL("/integrations", url.origin);
      back.searchParams.set("payroll", "error");
      back.searchParams.set("provider", providerName);
      back.searchParams.set("reason", err.message.slice(0, 200));
      const res = NextResponse.redirect(back);
      res.cookies.delete(STATE_COOKIE);
      return res;
    }

    const back = new URL("/integrations", url.origin);
    back.searchParams.set("payroll", "connected");
    back.searchParams.set("provider", providerName);
    const res = NextResponse.redirect(back);
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  // -------- Initiate path (browser is starting the flow from /integrations) --------
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  try {
    const provider = await loadProvider(providerName);
    if (!provider.isConfigured()) {
      return NextResponse.json({
        error: `${providerName} is not configured on the server`,
        missing: provider.configStatus().missing,
      }, { status: 503 });
    }

    const state = signState({
      orgId:    guard.session.orgId,
      userId:   guard.session.user?.id || null,
      provider: providerName,
      iat:      Date.now(),
    });

    const authorizeUrl = provider.buildAuthorizeUrl({ state });
    const res = NextResponse.redirect(authorizeUrl);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   STATE_TTL_MS / 1000,
      path:     "/",
    });
    return res;
  } catch (err) {
    console.error(`[payroll/oauth/${providerName}] initiate error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
