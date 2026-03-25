"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import { genId } from "@/lib/utils";

// ============================================================================
// SENSITIVE CASE MANAGEMENT — Private case files for high-risk HR issues
// Separate from the regular ticket queue. Handles:
// - Harassment & discrimination reports
// - Accommodation requests (ADA)
// - Workplace investigations
// - Termination/separation cases
// - Whistleblower reports
// - Grievance/complaint filings
//
// Each case has: private notes timeline, document attachments,
// resolution tracking, assigned investigator, and confidentiality level.
// ============================================================================

const CASE_TYPES = [
  { id: "harassment", label: "Harassment / Discrimination", icon: "🚨", risk: "critical" },
  { id: "accommodation", label: "ADA Accommodation Request", icon: "♿", risk: "high" },
  { id: "investigation", label: "Workplace Investigation", icon: "🔍", risk: "critical" },
  { id: "termination", label: "Termination / Separation", icon: "📋", risk: "high" },
  { id: "whistleblower", label: "Whistleblower Report", icon: "🔔", risk: "critical" },
  { id: "grievance", label: "Grievance / Complaint", icon: "📝", risk: "medium" },
];

const CONFIDENTIALITY = [
  { id: "standard", label: "Standard — HR Team", color: "pill-blue" },
  { id: "restricted", label: "Restricted — HR Director Only", color: "pill-amber" },
  { id: "legal_hold", label: "Legal Hold — HR + Legal", color: "pill-red" },
];

const STATUS_COLORS = {
  open: "pill-blue",
  investigating: "pill-amber",
  pending_resolution: "pill-amber",
  resolved: "pill-green",
  closed: "pill-gray",
};

function CasesContent() {
  const { employee, mode, currentUser, addAudit, addNotification } = useApp();
  const { addToast } = useToast();

  const [cases, setCases] = useState([]);
  const [showNewCase, setShowNewCase] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [newNote, setNewNote] = useState("");

  // -- Audit: log access to sensitive case management page --
  const hasLoggedAccess = useRef(false);
  useEffect(() => {
    if (mode !== "employee" && !hasLoggedAccess.current) {
      hasLoggedAccess.current = true;
      addAudit("CASE_PAGE_ACCESS", `${currentUser?.name} accessed Case Management`, "info");
    }
  }, [mode, currentUser, addAudit]);

  // -- New case form state --
  const [newCase, setNewCase] = useState({
    type: "harassment",
    confidentiality: "standard",
    subject: "",
    description: "",
    reportedBy: "",
    accusedParty: "",
  });

  // -- Create a new case --
  const createCase = useCallback(() => {
    if (!newCase.subject.trim()) {
      addToast("error", "Missing Field", "Case subject is required");
      return;
    }
    const caseObj = {
      id: `CASE-${genId().split("-").pop()}`,
      ...newCase,
      typeLabel: CASE_TYPES.find((t) => t.id === newCase.type)?.label || newCase.type,
      typeIcon: CASE_TYPES.find((t) => t.id === newCase.type)?.icon || "📋",
      risk: CASE_TYPES.find((t) => t.id === newCase.type)?.risk || "medium",
      status: "open",
      assignee: newCase.confidentiality === "legal_hold" ? "Legal Counsel" : "HR Director",
      createdAt: new Date().toISOString(),
      createdBy: `${employee.firstName} ${employee.lastName}`,
      notes: [
        {
          id: `NOTE-${Date.now()}`,
          text: "Case opened. Initial report filed.",
          author: `${employee.firstName} ${employee.lastName}`,
          timestamp: new Date().toISOString(),
          type: "system",
        },
      ],
      documents: [],
    };
    setCases((prev) => [caseObj, ...prev]);
    addAudit("CASE_OPENED", `${caseObj.id}: ${caseObj.typeLabel} — "${caseObj.subject}"`, "critical");
    addNotification(
      `New Case: ${caseObj.typeLabel}`,
      `${caseObj.createdBy} opened ${caseObj.id}`,
      "critical"
    );
    addToast("success", "Case Created", `${caseObj.id} assigned to ${caseObj.assignee}`);
    setNewCase({ type: "harassment", confidentiality: "standard", subject: "", description: "", reportedBy: "", accusedParty: "" });
    setShowNewCase(false);
  }, [newCase, employee, addAudit, addNotification, addToast]);

  // -- Add note to a case --
  const addCaseNote = useCallback(() => {
    if (!newNote.trim() || !selectedCase) return;
    setCases((prev) =>
      prev.map((c) =>
        c.id === selectedCase.id
          ? {
              ...c,
              notes: [
                ...c.notes,
                {
                  id: `NOTE-${Date.now()}`,
                  text: newNote,
                  author: `${employee.firstName} ${employee.lastName}`,
                  timestamp: new Date().toISOString(),
                  type: "note",
                },
              ],
            }
          : c
      )
    );
    addAudit("CASE_NOTE", `Note added to ${selectedCase.id}`, "info");
    setNewNote("");
    // Refresh selectedCase reference
    setSelectedCase((prev) => {
      const updated = cases.find((c) => c.id === prev?.id);
      return updated ? { ...updated, notes: [...updated.notes, { id: `NOTE-${Date.now()}`, text: newNote, author: `${employee.firstName} ${employee.lastName}`, timestamp: new Date().toISOString(), type: "note" }] } : prev;
    });
  }, [newNote, selectedCase, employee, addAudit, cases]);

  // -- Update case status --
  const updateStatus = useCallback((caseId, newStatus) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: newStatus,
              notes: [
                ...c.notes,
                {
                  id: `NOTE-${Date.now()}`,
                  text: `Status changed to: ${newStatus.replace(/_/g, " ")}`,
                  author: `${employee.firstName} ${employee.lastName}`,
                  timestamp: new Date().toISOString(),
                  type: "system",
                },
              ],
            }
          : c
      )
    );
    addAudit("CASE_STATUS", `${caseId} → ${newStatus}`, newStatus === "resolved" ? "success" : "warning");
  }, [employee, addAudit]);

  // -- Admin-only page --
  if (mode === "employee") {
    return (
      <div className="p-6 max-w-[600px] mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Restricted Access</h2>
        <p className="text-sm text-gray-500">
          Case management is restricted to HR administrators. If you need to report an issue, use the AI Chat or contact HR directly.
        </p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sensitive Case Management</h2>
          <p className="text-xs text-gray-500 mt-1">
            Confidential case files for harassment, investigations, accommodations, and terminations.
          </p>
        </div>
        <button
          onClick={() => { setShowNewCase(!showNewCase); setSelectedCase(null); }}
          className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 cursor-pointer"
        >
          + New Case
        </button>
      </div>

      {/* ============ New Case Form ============ */}
      {showNewCase && (
        <div className="bg-white rounded-xl border border-red-200 shadow-xs p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🚨 Open New Case</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Case Type</label>
              <select value={newCase.type} onChange={(e) => setNewCase({ ...newCase, type: e.target.value })} className={inputCls}>
                {CASE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Confidentiality Level</label>
              <select value={newCase.confidentiality} onChange={(e) => setNewCase({ ...newCase, confidentiality: e.target.value })} className={inputCls}>
                {CONFIDENTIALITY.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Subject</label>
              <input type="text" value={newCase.subject} onChange={(e) => setNewCase({ ...newCase, subject: e.target.value })} className={inputCls} placeholder="Brief case title" />
            </div>
            <div>
              <label className={labelCls}>Reported By</label>
              <input type="text" value={newCase.reportedBy} onChange={(e) => setNewCase({ ...newCase, reportedBy: e.target.value })} className={inputCls} placeholder="Employee name" />
            </div>
            <div>
              <label className={labelCls}>Accused / Subject Party (if applicable)</label>
              <input type="text" value={newCase.accusedParty} onChange={(e) => setNewCase({ ...newCase, accusedParty: e.target.value })} className={inputCls} placeholder="Name or N/A" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={newCase.description} onChange={(e) => setNewCase({ ...newCase, description: e.target.value })} className={inputCls} rows={4} placeholder="Detailed description of the incident or request..." />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createCase} className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 cursor-pointer">
              Open Case
            </button>
            <button onClick={() => setShowNewCase(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* ============ Case List ============ */}
        <div className={`${selectedCase ? "w-1/3" : "w-full"} space-y-3 transition-all`}>
          {cases.length === 0 && !showNewCase ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-sm font-semibold text-gray-600">No Open Cases</h3>
              <p className="text-xs mt-1">Click &quot;+ New Case&quot; to open a confidential case file.</p>
            </div>
          ) : (
            cases.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCase(c); setShowNewCase(false); }}
                className={`w-full text-left bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer ${
                  selectedCase?.id === c.id ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{c.typeIcon}</span>
                  <span className="text-xs font-bold text-gray-900">{c.id}</span>
                  <span className={`pill ${STATUS_COLORS[c.status] || "pill-gray"}`}>
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{c.subject}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                  <span>{c.typeLabel}</span>
                  <span>·</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{c.assignee}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ============ Case Detail Panel ============ */}
        {selectedCase && (
          <div className="w-2/3 bg-white rounded-xl border border-gray-200 shadow-xs p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{selectedCase.typeIcon}</span>
                  <span className="text-sm font-bold text-gray-900">{selectedCase.id}</span>
                  <span className={`pill ${STATUS_COLORS[selectedCase.status]}`}>
                    {selectedCase.status.replace(/_/g, " ")}
                  </span>
                  <span className={`pill ${CONFIDENTIALITY.find((c) => c.id === selectedCase.confidentiality)?.color || "pill-gray"}`}>
                    {CONFIDENTIALITY.find((c) => c.id === selectedCase.confidentiality)?.label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900">{selectedCase.subject}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Opened by {selectedCase.createdBy} · {new Date(selectedCase.createdAt).toLocaleString()} · Assigned to {selectedCase.assignee}
                </p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">×</button>
            </div>

            {/* Description */}
            {selectedCase.description && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 leading-relaxed">
                {selectedCase.description}
              </div>
            )}

            {/* Status update buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {["open", "investigating", "pending_resolution", "resolved", "closed"].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(selectedCase.id, s)}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-full border cursor-pointer transition-colors ${
                    selectedCase.status === s
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {/* Notes timeline */}
            <h4 className="text-xs font-bold text-gray-700 mb-2">Case Notes</h4>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {selectedCase.notes.map((note) => (
                <div key={note.id} className={`p-3 rounded-lg text-xs ${
                  note.type === "system" ? "bg-blue-50 text-blue-800" : "bg-gray-50 text-gray-700"
                }`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{note.author}</span>
                    <span className="text-gray-400">{new Date(note.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p>{note.text}</p>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCaseNote()}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button onClick={addCaseNote} className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 cursor-pointer">
                Add Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CasesPage() {
  return <CasesContent />;
}
