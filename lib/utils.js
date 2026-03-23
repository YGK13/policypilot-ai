// ============================================================================
// UTILITY HELPERS — ID generators, formatters
// ============================================================================

let ticketCounter = 1000;

export function genId() {
  return `HR-2026-${String(++ticketCounter).padStart(4, "0")}`;
}

export function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function nowFull() {
  return new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
