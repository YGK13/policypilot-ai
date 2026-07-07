// ============================================================================
// RISK SCORER TESTS — this is the compliance-escalation logic that backs the
// product's core claim ("flags ADA/FMLA/harassment before they blow up").
// A regression here silently routes a legal landmine to the auto-answer bot,
// so these thresholds are load-bearing and must stay tested.
// ============================================================================

import { describe, it, expect } from "vitest";
import { calcRisk } from "@/lib/engine/risk-scorer";

const emp = { state: "California", department: "Eng", tenure: 2 };

describe("calcRisk — routing thresholds", () => {
  it("routes a benign PTO question to auto", () => {
    const r = calcRisk("how many vacation days do I get", emp, null);
    expect(r.routing).toBe("auto");
    expect(r.score).toBeLessThan(26);
  });

  it("escalates a lawsuit threat to legal (critical keyword)", () => {
    const r = calcRisk("I am going to sue the company for wrongful termination", emp, null);
    expect(r.routing).toBe("legal");
    expect(r.score).toBeGreaterThanOrEqual(76);
    expect(r.flags.join(" ")).toMatch(/CRITICAL/);
  });

  it("flags ADA / accommodation as elevated risk, not auto", () => {
    const r = calcRisk("I need an ADA accommodation for my disability", emp, null);
    expect(r.routing).not.toBe("auto");
    expect(r.flags.join(" ")).toMatch(/ada|accommodation|disability/i);
  });

  it("flags FMLA / pregnancy leave as elevated risk", () => {
    const r = calcRisk("I'm pregnant and need to understand my FMLA leave", emp, null);
    expect(r.score).toBeGreaterThanOrEqual(26);
    expect(r.flags.join(" ")).toMatch(/fmla|pregnan/i);
  });

  it("never routes a harassment report to the bare auto bot", () => {
    // A single HIGH keyword scores 20 (below the 26 auto_enhanced threshold),
    // but a harassment report must never be answered without escalation.
    // The sensitive-topic floor guarantees this.
    const r = calcRisk("I want to report harassment by my manager", emp, null);
    expect(r.routing).not.toBe("auto");
    expect(["auto_enhanced", "hr", "legal"]).toContain(r.routing);
    expect(r.flags.join(" ")).toMatch(/HIGH/);
  });

  it("floors any single high-severity keyword above bare auto", () => {
    for (const q of [
      "question about my ada situation",
      "something about fmla",
      "i was terminated last week",
      "concern about discrimination",
    ]) {
      const r = calcRisk(q, emp, null);
      expect(r.routing, `"${q}" should escalate`).not.toBe("auto");
    }
  });
});

describe("calcRisk — clamping and structure", () => {
  it("clamps the score at 100 even with many stacked keywords", () => {
    const r = calcRisk(
      "lawsuit discrimination eeoc harassment retaliation whistleblower attorney wrongful termination",
      emp,
      null
    );
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBe(100);
  });

  it("returns low confidence when no policy matched", () => {
    const r = calcRisk("random unrelated question", emp, null);
    expect(r.confidence).toBe(25);
  });

  it("raises confidence when a policy with keywords matched", () => {
    const policy = { category: "Benefits", keywords: ["a", "b", "c", "d", "e"] };
    const r = calcRisk("benefits question", emp, policy);
    expect(r.confidence).toBeGreaterThan(70);
  });
});

describe("calcRisk — policy-level escalation override", () => {
  it("forces legal routing when the matched policy demands it", () => {
    const policy = { category: "Benefits", keywords: ["x"], escalate: "legal" };
    const r = calcRisk("a totally calm benefits question", emp, policy);
    expect(r.routing).toBe("legal");
  });

  it("bumps an auto question to hr when the policy escalates to hr", () => {
    const policy = { category: "Benefits", keywords: ["x"], escalate: "hr" };
    const r = calcRisk("a calm benefits question", emp, policy);
    expect(r.routing).toBe("hr");
  });
});
