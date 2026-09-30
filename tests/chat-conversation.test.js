// ============================================================================
// lib/chat/conversation — multi-turn context, follow-up retrieval, citations.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  toPlainText,
  buildConversationMessages,
  buildRetrievalQuery,
  collectSources,
  encodeSourcesHeader,
  decodeSourcesHeader,
} from "@/lib/chat/conversation";
import { LEGAL_DISCLAIMER_HTML, DRAFT_DISCLAIMER_HTML } from "@/lib/law/chat-prompt";

describe("toPlainText", () => {
  it("strips HTML and the server-appended disclaimers", () => {
    expect(toPlainText("<strong>15 days</strong> PTO.<br>Accrues monthly." + LEGAL_DISCLAIMER_HTML))
      .toBe("15 days PTO.\nAccrues monthly.");
    expect(toPlainText("Draft body" + DRAFT_DISCLAIMER_HTML)).toBe("Draft body");
  });

  it("decodes common entities", () => {
    expect(toPlainText("Q&amp;A &lt;tag&gt;")).toBe("Q&A <tag>");
  });
});

describe("buildConversationMessages", () => {
  const rows = [
    { role: "user", content: "How much PTO do I get?" },
    { role: "assistant", content: "<strong>15 days</strong> per year." + LEGAL_DISCLAIMER_HTML },
  ];

  it("sends earlier turns then the new question", () => {
    const msgs = buildConversationMessages(rows, "What about part-time staff?");
    expect(msgs).toEqual([
      { role: "user", content: "How much PTO do I get?" },
      { role: "assistant", content: "15 days per year." },
      { role: "user", content: "What about part-time staff?" },
    ]);
  });

  it("is single-turn with no history", () => {
    expect(buildConversationMessages([], "Hi")).toEqual([{ role: "user", content: "Hi" }]);
    expect(buildConversationMessages(undefined, "Hi")).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("opens with a user turn and merges consecutive same-role rows", () => {
    const msgs = buildConversationMessages([
      { role: "assistant", content: "orphan answer" },
      { role: "user", content: "first" },
      { role: "user", content: "second" },
    ], "third");
    expect(msgs).toEqual([{ role: "user", content: "first\n\nsecond\n\nthird" }]);
  });

  it("does not repeat the current question when it was already saved", () => {
    const msgs = buildConversationMessages([...rows, { role: "user", content: "And in NY?" }], "And in NY?");
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(msgs[2].content).toBe("And in NY?");
  });

  it("caps history length and per-message size", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: `m${i} ` + "x".repeat(5000),
    }));
    const msgs = buildConversationMessages(many, "q", { maxMessages: 4, maxChars: 100 });
    expect(msgs.length).toBe(5);
    expect(msgs[0].content.startsWith("m16")).toBe(true);
    expect(msgs[0].content.length).toBeLessThan(110);
  });
});

describe("buildRetrievalQuery", () => {
  const rows = [
    { role: "user", content: "What is our parental leave policy?" },
    { role: "assistant", content: "12 weeks." },
  ];

  it("prefixes the previous question for short follow-ups", () => {
    expect(buildRetrievalQuery("And for part-time staff?", rows))
      .toBe("What is our parental leave policy?\nAnd for part-time staff?");
  });

  it("leaves long, self-contained questions alone", () => {
    const q = "Can you explain how the company handles overtime pay for hourly employees working weekends in California";
    expect(buildRetrievalQuery(q, rows)).toBe(q);
  });

  it("leaves the query alone with no prior question", () => {
    expect(buildRetrievalQuery("PTO?", [])).toBe("PTO?");
  });
});

describe("collectSources", () => {
  it("dedupes document+section in rank order", () => {
    const sources = collectSources([
      { document_name: "Handbook.pdf", section: "4.2 PTO", content: "a" },
      { document_name: "Handbook.pdf", section: "4.2 PTO", content: "b" },
      { document_name: "Handbook.pdf", section: null, content: "c" },
      { document_name: "Benefits.docx", section: "Dental", content: "d" },
      { content: "no doc" },
    ]);
    expect(sources).toEqual([
      { document: "Handbook.pdf", section: "4.2 PTO" },
      { document: "Handbook.pdf", section: null },
      { document: "Benefits.docx", section: "Dental" },
    ]);
  });

  it("round-trips through a header-safe encoding, including UTF-8 names", () => {
    const sources = [{ document: "Manuel de l’employé.pdf", section: "Congés § 3" }];
    const header = encodeSourcesHeader(sources);
    expect(/^[\x20-\x7e]*$/.test(header)).toBe(true);
    expect(decodeSourcesHeader(header)).toEqual(sources);
    expect(decodeSourcesHeader("%%%bad")).toEqual([]);
    expect(decodeSourcesHeader(null)).toEqual([]);
  });
});
