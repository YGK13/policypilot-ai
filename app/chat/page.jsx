"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../AppShell";
import { generateResponse } from "@/lib/engine/response-gen";
import { genId } from "@/lib/utils";
import { useToast } from "@/components/layout/ToastProvider";

// ============================================================================
// CHAT PAGE — AI conversation with jurisdiction-aware responses
// Hybrid: calls /api/chat (LLM) when available, falls back to local engine.
// ============================================================================

function ChatContent() {
  const { employee, settings, tickets, setTickets, addAudit, addNotification } = useApp();
  const { addToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState([]);
  const [llmEnabled, setLlmEnabled] = useState(true); // try LLM first
  const chatEndRef = useRef(null);

  // -- Welcome message on employee change --
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        type: "bot",
        content: `Hi ${employee.firstName}! I'm HRPilot AI, your HR assistant.\n\nI can help with PTO, benefits, compensation, policies, compliance, and more.\n\nYou're based in <strong>${employee.location}</strong> — I'll provide ${employee.state}-specific answers when relevant.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        confidence: 100,
        source: "System",
      },
    ]);
    setContext([]);
  }, [employee]);

  // -- Auto-scroll --
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // -- Process a response (shared between LLM and local paths) --
  const processResponse = useCallback((resp, q) => {
    const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: "bot",
        content: resp.answer,
        source: resp.source,
        routing: resp.routing,
        riskScore: resp.riskScore,
        flags: resp.flags,
        disclaimer: resp.disclaimer,
        category: resp.category,
        time: botTime,
        confidence: resp.confidence,
        policyId: resp.policyId,
        llm: resp.llm || false,
      },
    ]);

    // -- Auto-create ticket --
    const nowFull = new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const ticket = {
      id: genId(),
      query: q,
      category: resp.category,
      riskScore: resp.riskScore,
      routing: resp.routing,
      status: resp.routing === "legal" ? "escalated" : resp.routing === "hr" ? "pending" : "resolved",
      priority: resp.riskScore >= 76 ? "critical" : resp.riskScore >= 51 ? "high" : resp.riskScore >= 26 ? "medium" : "low",
      employee: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.id,
      department: employee.department,
      state: employee.state,
      created: nowFull,
      flags: resp.flags,
      assignee: resp.routing === "legal" ? "Legal Team" : resp.routing === "hr" ? "HR Business Partner" : "Auto-resolved",
      satisfaction: null,
      resolution: resp.routing === "auto" ? "Resolved by AI" : "Pending human review",
    };
    setTickets((prev) => [ticket, ...prev]);

    addAudit(
      "RESPONSE_SENT",
      `Category: ${resp.category} | Risk: ${resp.riskScore} | Route: ${resp.routing}${resp.llm ? " | LLM" : ""}`,
      resp.riskScore >= 75 ? "critical" : resp.riskScore >= 50 ? "warning" : "info"
    );

    if (resp.routing === "legal" || resp.routing === "hr") {
      addToast("warning", "Ticket Escalated", `${ticket.id} routed to ${resp.routing === "legal" ? "Legal" : "HR"}`);
      addNotification(
        `Ticket Escalated → ${resp.routing === "legal" ? "Legal" : "HR"}`,
        `${employee.firstName} ${employee.lastName}: "${q.slice(0, 60)}${q.length > 60 ? '...' : ''}"`,
        resp.riskScore >= 75 ? "critical" : "warning"
      );
    }
  }, [employee, addAudit, setTickets, addToast, addNotification]);

  // -- Send message (accepts optional direct text to bypass stale state) --
  const sendMessage = useCallback(async (directText) => {
    const q = (typeof directText === "string" ? directText : input).trim();
    if (!q || isTyping) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: Date.now(), type: "user", content: q, time: timeStr }]);
    setInput("");
    setIsTyping(true);
    setContext((prev) => [...prev.slice(-4), { role: "user", text: q }]);
    addAudit("QUERY_RECEIVED", `"${q.substring(0, 80)}${q.length > 80 ? "..." : ""}"`, "info");

    // -- Try API route first (LLM-powered if ANTHROPIC_API_KEY is set on server) --
    if (llmEnabled) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            employee_id: employee.id,
            jurisdiction: employee.state,
          }),
        });

        if (res.ok) {
          const resp = await res.json();
          setIsTyping(false);
          processResponse(resp, q);
          return;
        }
      } catch {
        // API failed — fall back to local engine silently
      }
    }

    // -- Fallback: local policy engine (instant, no API call) --
    const resp = generateResponse(q, employee);
    resp.llm = false;
    setIsTyping(false);
    processResponse(resp, q);
  }, [input, isTyping, employee, addAudit, llmEnabled, processResponse]);

  const suggestions = [
    "What's my PTO balance?",
    "How does 401(k) matching work?",
    "I need to report harassment",
    "Health insurance options?",
    "Am I eligible for FMLA?",
    "Pay transparency law in my state?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-54px)]">
      {/* -- Chat header -- */}
      <div className="px-6 py-3 bg-white border-b border-gray-150 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm">
          ⚡
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">HRPilot AI</div>
          <div className="text-xs text-gray-400">
            Jurisdiction: {employee.state} | Confidence threshold: {settings.confidenceThreshold}%
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* -- LLM toggle -- */}
          <button
            onClick={() => setLlmEnabled(!llmEnabled)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition-colors cursor-pointer ${
              llmEnabled
                ? "bg-brand-50 border-brand-300 text-brand-700"
                : "bg-gray-50 border-gray-300 text-gray-500"
            }`}
            title={llmEnabled ? "Using LLM (Claude API)" : "Using local policy engine"}
          >
            {llmEnabled ? "🧠 LLM" : "📋 Local"}
          </button>
          <button
            onClick={() => { setMessages([]); setContext([]); }}
            className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            🗑 Clear
          </button>
          <button
            onClick={() => addToast("info", "Export", "Chat exported to CSV")}
            className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* -- Messages -- */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.map((m) => {
          const isBot = m.type === "bot";
          return (
            <div key={m.id} className={`flex gap-2.5 mb-4 msg-animate ${m.type === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${isBot ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white" : "bg-gray-200 text-gray-600"}`}>
                {isBot ? "⚡" : employee.firstName[0]}
              </div>
              <div className="max-w-[65%]">
                <div
                  className={`px-4 py-3 rounded-xl text-[13px] leading-[1.7] ${isBot ? "bg-white border border-gray-200 rounded-bl-sm" : "bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-br-sm"}`}
                  dangerouslySetInnerHTML={{ __html: m.content }}
                />
                <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 flex-wrap ${m.type === "user" ? "justify-end" : ""}`}>
                  <span>{m.time}</span>
                  {isBot && m.source && (
                    <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-1.5 rounded text-[10px] font-semibold">
                      📎 {m.source}
                    </span>
                  )}
                  {isBot && m.llm && (
                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 rounded text-[10px] font-semibold">
                      🧠 LLM
                    </span>
                  )}
                  {isBot && m.confidence && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                      {m.confidence}%
                      <span className="w-10 h-1 bg-gray-200 rounded-sm overflow-hidden">
                        <span
                          className="block h-full rounded-sm transition-all duration-500"
                          style={{
                            width: `${m.confidence}%`,
                            background: m.confidence >= 80 ? "#10b981" : m.confidence >= 50 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </span>
                    </span>
                  )}
                  {isBot && m.routing && m.routing !== "auto" && (
                    <span className={`route-tag ${m.routing === "legal" ? "legal" : "hr"}`}>
                      {m.routing === "legal" ? "🔴 Legal" : "⚠️ HR"}
                    </span>
                  )}
                  {isBot && m.riskScore > 0 && <span>Risk: {m.riskScore}</span>}
                </div>
                {isBot && m.disclaimer && settings.disclaimers && (
                  <div className={`mt-2 px-3 py-2 border-l-3 rounded-r-md text-[11px] text-gray-600 leading-relaxed ${m.routing === "legal" ? "border-l-danger-500 bg-danger-50" : "border-l-warning-500 bg-warning-50"}`}>
                    {m.disclaimer}
                  </div>
                )}
                {isBot && (
                  <div className="flex gap-1.5 mt-1.5">
                    <button onClick={() => addToast("success", "Thanks!", "Feedback recorded")} className="w-6 h-6 rounded flex items-center justify-center text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                      👍
                    </button>
                    <button onClick={() => addToast("info", "Noted", "We'll improve this")} className="w-6 h-6 rounded flex items-center justify-center text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                      👎
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex gap-2.5 mb-4 msg-animate">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm">⚡</div>
            <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* -- Input area -- */}
      <div className="px-6 py-3.5 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-end">
          <input
            className="flex-1 px-3.5 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none transition-colors"
            value={input}
            placeholder={`Ask about HR policies (${employee.state} jurisdiction)...`}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button onClick={sendMessage} className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg text-white flex items-center justify-center text-base hover:-translate-y-0.5 hover:shadow-lg transition-all shrink-0">
            ➤
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-600 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <ChatContent />;
}
