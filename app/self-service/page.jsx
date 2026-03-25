"use client";

import { useState, useCallback } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import { genId } from "@/lib/utils";

// ============================================================================
// EMPLOYEE SELF-SERVICE PAGE — Actionable forms that DO things:
// - Submit PTO Request
// - Update Personal Info
// - Request Leave of Absence
// - View/Download Pay Stubs
// This closes the "resolution loop" — employees don't just get answers,
// they can take action directly within AI HR Pilot.
// ============================================================================

// -- Self-service action cards --
const ACTIONS = [
  { id: "pto", icon: "🏖️", title: "Request Time Off", desc: "Submit PTO, vacation, or personal day requests" },
  { id: "info", icon: "📝", title: "Update Personal Info", desc: "Change address, phone, emergency contacts" },
  { id: "leave", icon: "🏥", title: "Request Leave of Absence", desc: "FMLA, medical, parental, or personal leave" },
  { id: "paystub", icon: "💰", title: "Pay Stubs & Tax Forms", desc: "View recent pay stubs and download W-2/1099" },
];

function SelfServiceContent() {
  const { employee, addAudit, addNotification, setTickets, mode } = useApp();
  const { addToast } = useToast();
  const [activeAction, setActiveAction] = useState(null);

  // ============ PTO REQUEST FORM ============
  const [ptoForm, setPtoForm] = useState({
    type: "vacation",
    startDate: "",
    endDate: "",
    notes: "",
  });

  const submitPTO = useCallback(() => {
    if (!ptoForm.startDate || !ptoForm.endDate) {
      addToast("error", "Missing Fields", "Please select start and end dates");
      return;
    }
    const ticketId = genId();
    setTickets((prev) => [{
      id: ticketId,
      query: `PTO Request: ${ptoForm.type} from ${ptoForm.startDate} to ${ptoForm.endDate}`,
      category: "Leave & Time Off",
      riskScore: 5,
      routing: "auto",
      status: "pending",
      priority: "low",
      employee: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.id,
      department: employee.department,
      state: employee.state,
      created: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      flags: [],
      assignee: "Manager Approval",
      satisfaction: null,
      resolution: "Awaiting manager approval",
    }, ...prev]);
    addAudit("PTO_REQUEST", `${ptoForm.type}: ${ptoForm.startDate} to ${ptoForm.endDate}`, "info");
    addNotification("PTO Request Submitted", `${employee.firstName}: ${ptoForm.type} ${ptoForm.startDate} - ${ptoForm.endDate}`, "info");
    addToast("success", "PTO Request Submitted", `Request ${ticketId} sent to your manager for approval`);
    setPtoForm({ type: "vacation", startDate: "", endDate: "", notes: "" });
    setActiveAction(null);
  }, [ptoForm, employee, setTickets, addAudit, addNotification, addToast]);

  // ============ PERSONAL INFO FORM ============
  const [infoForm, setInfoForm] = useState({
    address: "",
    phone: "",
    emergencyName: "",
    emergencyPhone: "",
  });

  const submitInfo = useCallback(() => {
    const changes = Object.entries(infoForm).filter(([, v]) => v.trim()).map(([k]) => k);
    if (changes.length === 0) {
      addToast("error", "No Changes", "Please fill in at least one field to update");
      return;
    }
    addAudit("INFO_UPDATE", `Updated: ${changes.join(", ")}`, "info");
    addToast("success", "Info Updated", `${changes.length} field(s) updated successfully`);
    setInfoForm({ address: "", phone: "", emergencyName: "", emergencyPhone: "" });
    setActiveAction(null);
  }, [infoForm, addAudit, addToast]);

  // ============ LEAVE OF ABSENCE FORM ============
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "fmla",
    startDate: "",
    estimatedReturn: "",
    reason: "",
  });

  const submitLeave = useCallback(() => {
    if (!leaveForm.startDate) {
      addToast("error", "Missing Fields", "Please select a start date");
      return;
    }
    const ticketId = genId();
    setTickets((prev) => [{
      id: ticketId,
      query: `Leave of Absence: ${leaveForm.leaveType.toUpperCase()} starting ${leaveForm.startDate}`,
      category: "Leave & Time Off",
      riskScore: 35,
      routing: "hr",
      status: "pending",
      priority: "medium",
      employee: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.id,
      department: employee.department,
      state: employee.state,
      created: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      flags: ["LEAVE_REQUEST"],
      assignee: "HR Business Partner",
      satisfaction: null,
      resolution: "Pending HR review",
    }, ...prev]);
    addAudit("LEAVE_REQUEST", `${leaveForm.leaveType.toUpperCase()} from ${leaveForm.startDate}`, "warning");
    addNotification("Leave of Absence Request", `${employee.firstName}: ${leaveForm.leaveType.toUpperCase()} starting ${leaveForm.startDate}`, "warning");
    addToast("success", "Leave Request Submitted", `Request ${ticketId} sent to HR for review`);
    setLeaveForm({ leaveType: "fmla", startDate: "", estimatedReturn: "", reason: "" });
    setActiveAction(null);
  }, [leaveForm, employee, setTickets, addAudit, addNotification, addToast]);

  // ============ RENDER ============
  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1";
  const btnPrimary = "px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors cursor-pointer";
  const btnSecondary = "px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer";

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Employee Self-Service</h2>
        <p className="text-xs text-gray-500 mt-1">
          Take action directly — submit requests, update your info, access pay stubs.
        </p>
      </div>

      {/* ============ Action Cards Grid ============ */}
      {!activeAction && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveAction(a.id)}
              className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-brand-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="text-3xl mb-3">{a.icon}</div>
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{a.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* ============ PTO Request Form ============ */}
      {activeAction === "pto" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🏖️ Request Time Off</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Type of Leave</label>
              <select value={ptoForm.type} onChange={(e) => setPtoForm({ ...ptoForm, type: e.target.value })} className={inputCls}>
                <option value="vacation">Vacation / PTO</option>
                <option value="personal">Personal Day</option>
                <option value="sick">Sick Day</option>
                <option value="bereavement">Bereavement</option>
                <option value="jury_duty">Jury Duty</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" value={ptoForm.startDate} onChange={(e) => setPtoForm({ ...ptoForm, startDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" value={ptoForm.endDate} onChange={(e) => setPtoForm({ ...ptoForm, endDate: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes (optional)</label>
              <textarea value={ptoForm.notes} onChange={(e) => setPtoForm({ ...ptoForm, notes: e.target.value })} className={inputCls} rows={3} placeholder="Any additional context for your manager..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={submitPTO} className={btnPrimary}>Submit Request</button>
              <button onClick={() => setActiveAction(null)} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Update Personal Info Form ============ */}
      {activeAction === "info" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📝 Update Personal Information</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Home Address</label>
              <input type="text" value={infoForm.address} onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })} className={inputCls} placeholder="123 Main St, City, State ZIP" />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input type="tel" value={infoForm.phone} onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })} className={inputCls} placeholder="(555) 123-4567" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Emergency Contact Name</label>
                <input type="text" value={infoForm.emergencyName} onChange={(e) => setInfoForm({ ...infoForm, emergencyName: e.target.value })} className={inputCls} placeholder="Full name" />
              </div>
              <div>
                <label className={labelCls}>Emergency Contact Phone</label>
                <input type="tel" value={infoForm.emergencyPhone} onChange={(e) => setInfoForm({ ...infoForm, emergencyPhone: e.target.value })} className={inputCls} placeholder="(555) 987-6543" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={submitInfo} className={btnPrimary}>Save Changes</button>
              <button onClick={() => setActiveAction(null)} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Leave of Absence Form ============ */}
      {activeAction === "leave" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🏥 Request Leave of Absence</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Leave Type</label>
              <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} className={inputCls}>
                <option value="fmla">FMLA (Family & Medical Leave)</option>
                <option value="medical">Medical Leave</option>
                <option value="parental">Parental Leave</option>
                <option value="personal">Personal Leave (Unpaid)</option>
                <option value="military">Military Leave (USERRA)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Estimated Return Date</label>
                <input type="date" value={leaveForm.estimatedReturn} onChange={(e) => setLeaveForm({ ...leaveForm, estimatedReturn: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Reason / Additional Context</label>
              <textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} className={inputCls} rows={3} placeholder="Provide context for HR review (medical details are optional and confidential)..." />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Note:</strong> Leave of absence requests are reviewed by HR within 2 business days. FMLA eligibility requires 12+ months of employment and 1,250+ hours worked.
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={submitLeave} className={btnPrimary}>Submit Request</button>
              <button onClick={() => setActiveAction(null)} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Pay Stubs & Tax Forms ============ */}
      {activeAction === "paystub" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">💰 Pay Stubs & Tax Forms</h3>
          <div className="space-y-3">
            {[
              { period: "Mar 1–15, 2026", gross: "$4,583.33", net: "$3,312.50", date: "Mar 20, 2026" },
              { period: "Feb 16–28, 2026", gross: "$4,583.33", net: "$3,298.17", date: "Mar 5, 2026" },
              { period: "Feb 1–15, 2026", gross: "$4,583.33", net: "$3,312.50", date: "Feb 20, 2026" },
              { period: "Jan 16–31, 2026", gross: "$4,583.33", net: "$3,285.00", date: "Feb 5, 2026" },
              { period: "Jan 1–15, 2026", gross: "$4,583.33", net: "$3,312.50", date: "Jan 20, 2026" },
            ].map((stub, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{stub.period}</p>
                  <p className="text-xs text-gray-500">Gross: {stub.gross} · Net: {stub.net}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{stub.date}</span>
                  <button
                    onClick={() => {
                      addToast("info", "Download", `Pay stub for ${stub.period} downloaded`);
                      addAudit("PAYSTUB_DOWNLOAD", `Downloaded pay stub: ${stub.period}`, "info");
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 rounded-md hover:bg-brand-100 cursor-pointer"
                  >
                    📥 Download
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Tax Documents</h4>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  addToast("info", "Download", "W-2 for 2025 downloaded");
                  addAudit("TAX_DOWNLOAD", "Downloaded W-2 (2025)", "info");
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                📄 W-2 (2025)
              </button>
              <button
                onClick={() => {
                  addToast("info", "Download", "W-4 form downloaded");
                  addAudit("TAX_DOWNLOAD", "Downloaded W-4 form", "info");
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                📄 W-4 (Current)
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setActiveAction(null)} className={btnSecondary}>← Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SelfServicePage() {
  return <SelfServiceContent />;
}
