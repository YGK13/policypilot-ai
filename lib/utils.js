// ============================================================================
// UTILITY HELPERS — ID generators, formatters
// ============================================================================

// -- Collision-safe ticket ID using crypto.randomUUID() --
// Previous approach used a module-level counter that reset on cold starts.
export function genId() {
  const short = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();
  return `HR-${short}`;
}

export function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function nowFull() {
  return new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ============================================================================
// DATA MASKING — protect sensitive HR data in the UI
// Used for SSNs, salary figures, account numbers, etc.
// ============================================================================

// Mask all but last 4 chars: "123-45-6789" → "***-**-6789"
export function maskSSN(ssn) {
  if (!ssn || ssn.length < 4) return "***";
  return "***-**-" + ssn.slice(-4);
}

// Mask email: "john.doe@company.com" → "j***e@company.com"
export function maskEmail(email) {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return local[0] + "***@" + domain;
  return local[0] + "***" + local.slice(-1) + "@" + domain;
}

// Mask salary: "$85,000" → "$8*,***"
export function maskSalary(amount) {
  if (!amount) return "$*****";
  const str = String(amount).replace(/[^0-9]/g, "");
  if (str.length <= 2) return "$***";
  return "$" + str[0] + "*".repeat(str.length - 1);
}

// Mask phone: "(555) 123-4567" → "(***) ***-4567"
export function maskPhone(phone) {
  if (!phone || phone.length < 4) return "***";
  return "(***) ***-" + phone.replace(/[^0-9]/g, "").slice(-4);
}
