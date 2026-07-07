// ============================================================================
// RAG TESTS — chunking and plain-text extraction are pure and must stay
// deterministic: they decide what handbook text the model can actually cite.
// (Embedding + retrieval require the DB/gateway and are exercised via the
// build + a manual prod E2E, not unit-tested here.)
// ============================================================================

import { describe, it, expect } from "vitest";
import { chunkText, extractText } from "@/lib/rag";

describe("chunkText", () => {
  it("returns an empty array for trivially short input", () => {
    expect(chunkText("hi")).toEqual([]);
  });

  it("produces at least one chunk from real prose", () => {
    const text = "Employees accrue paid time off monthly. ".repeat(20);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].content.length).toBeGreaterThan(40);
  });

  it("splits long documents into multiple chunks", () => {
    const text = "The quick brown fox jumps over the lazy dog. ".repeat(300);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("captures the nearest heading as the section for citations", () => {
    const text =
      "# Paid Time Off\n" +
      "Full-time employees accrue 15 days of PTO per year. ".repeat(40);
    const chunks = chunkText(text);
    expect(chunks.some((c) => /Paid Time Off/.test(c.section || ""))).toBe(true);
  });

  it("recognizes numbered-section headings", () => {
    const text =
      "4.2 Remote Work\n" +
      "Employees may work remotely up to three days per week. ".repeat(40);
    const chunks = chunkText(text);
    expect(chunks.some((c) => /Remote Work/.test(c.section || ""))).toBe(true);
  });
});

describe("extractText", () => {
  it("returns UTF-8 content for a plain text buffer", async () => {
    const buf = Buffer.from("Vacation policy: 15 days per year.", "utf-8");
    const text = await extractText(buf, "handbook.txt");
    expect(text).toContain("Vacation policy");
  });

  it("reads markdown as text", async () => {
    const buf = Buffer.from("# Benefits\n- Health\n- Dental", "utf-8");
    const text = await extractText(buf, "benefits.md");
    expect(text).toContain("Benefits");
  });

  it("returns null for unsupported binary types (e.g. legacy .doc)", async () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const text = await extractText(buf, "old.doc");
    expect(text).toBeNull();
  });
});
