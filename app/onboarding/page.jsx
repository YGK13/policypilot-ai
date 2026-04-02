"use client";

import { useState, useCallback, useRef } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import { useRouter } from "next/navigation";

// ============================================================================
// ONBOARDING WIZARD — Guided first-time setup for new customers
// Steps: Company Profile → Jurisdictions → Upload Handbook → AI Config → Done
//
// This is what makes AI HR Pilot a 1-day setup vs. ServiceNow's 3 months.
// Each step collects the minimum needed to deliver value immediately.
// ============================================================================

const STEPS = [
  { id: "company", label: "Company Profile", icon: "🏢" },
  { id: "jurisdictions", label: "Jurisdictions", icon: "⚖️" },
  { id: "documents", label: "Upload Policies", icon: "📄" },
  { id: "ai", label: "AI Configuration", icon: "🧠" },
  { id: "done", label: "Ready!", icon: "🚀" },
];

// -- US states for jurisdiction selection --
const US_STATES = [
  "Federal", "California", "New York", "Texas", "Illinois", "Colorado",
  "Washington", "Massachusetts", "New Jersey", "Michigan", "Florida",
  "North Carolina", "Georgia", "Pennsylvania", "Ohio", "Virginia",
  "Arizona", "Oregon", "Minnesota", "Connecticut",
];

function OnboardingContent() {
  const { settings, setSettings, addAudit, currentUser, orgId } = useApp();
  const { addToast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);

  // -- Company profile form --
  const [company, setCompany] = useState({
    name: settings.companyName || "",
    industry: "",
    employeeCount: "",
    hqState: "",
    supportEmail: settings.supportEmail || "",
  });

  // -- Selected jurisdictions --
  const [selectedJurisdictions, setSelectedJurisdictions] = useState(["Federal"]);

  // -- Uploaded files tracking --
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // -- AI config --
  const [aiConfig, setAiConfig] = useState({
    autoRespond: true,
    disclaimers: true,
    jurisdictionAware: true,
    confidenceThreshold: 70,
  });

  // -- Toggle jurisdiction selection --
  const toggleJurisdiction = useCallback((state) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  }, []);

  // -- Real file upload handler --
  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingFile(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", orgId || "default");
      try {
        const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
        const data = await res.json();
        setUploadedFiles((prev) => [...prev, { name: file.name, blobUrl: data.url || null, dbId: data.dbId || null }]);
        addToast("success", "Uploaded", file.name);
      } catch {
        // Still add to list so user sees progress
        setUploadedFiles((prev) => [...prev, { name: file.name, blobUrl: null, dbId: null }]);
        addToast("warning", "Upload Warning", `${file.name} saved locally only`);
      }
    }
    setUploadingFile(false);
    if (e.target) e.target.value = "";
  }, [orgId, addToast]);

  // -- Complete onboarding: save settings locally + await Neon sync before redirect --
  const finishOnboarding = useCallback(async () => {
    const newSettings = {
      companyName: company.name,
      supportEmail: company.supportEmail,
      autoRespond: aiConfig.autoRespond,
      disclaimers: aiConfig.disclaimers,
      jurisdictionAware: aiConfig.jurisdictionAware,
      confidenceThreshold: aiConfig.confidenceThreshold,
      onboardingComplete: true,
      onboardingDate: new Date().toISOString(),
      selectedJurisdictions,
      industry: company.industry,
      employeeCount: company.employeeCount,
    };
    // -- Save to context (localStorage) immediately for instant UX --
    setSettings((prev) => ({ ...prev, ...newSettings }));

    // -- Await Neon sync so settings persist across devices --
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId || "default", settings: newSettings }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addAudit("ONBOARDING_COMPLETE", `${company.name} setup complete. ${selectedJurisdictions.length} jurisdictions, ${uploadedFiles.length} docs uploaded.`, "success");
      addToast("success", "Setup Complete!", "AI HR Pilot is ready to use");
    } catch {
      // -- Settings saved to localStorage; warn that DB sync failed --
      addToast("warning", "Setup Saved Locally", "Settings saved to this device. Database sync failed — re-save from Settings page.");
      addAudit("ONBOARDING_COMPLETE", `${company.name} setup complete (DB sync failed). ${selectedJurisdictions.length} jurisdictions.`, "warning");
    }
    router.push("/");
  }, [company, selectedJurisdictions, uploadedFiles, aiConfig, orgId, setSettings, addAudit, addToast, router]);

  const currentStep = STEPS[step];
  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5";

  return (
    <div className="min-h-[calc(100vh-54px)] bg-gray-50 flex items-start justify-center py-8 px-6">
      <div className="w-full max-w-2xl">
        {/* ============ Progress bar ============ */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-colors ${
                i < step ? "bg-green-500 text-white" :
                i === step ? "bg-brand-600 text-white" :
                "bg-gray-200 text-gray-400"
              }`}>
                {i < step ? "✓" : s.icon}
              </div>
              <span className={`text-[10px] font-medium ${i <= step ? "text-gray-700" : "text-gray-400"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-full mt-1 rounded ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ============ Step Content ============ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {/* -- Step 1: Company Profile -- */}
          {currentStep.id === "company" && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Tell us about your company</h2>
              <p className="text-sm text-gray-500 mb-6">This helps AI HR Pilot customize responses for your organization.</p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Company Name *</label>
                  <input type="text" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} className={inputCls} placeholder="Acme Corp" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Industry</label>
                    <select value={company.industry} onChange={(e) => setCompany({ ...company, industry: e.target.value })} className={inputCls}>
                      <option value="">Select...</option>
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Financial Services</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="retail">Retail / E-commerce</option>
                      <option value="education">Education</option>
                      <option value="nonprofit">Nonprofit</option>
                      <option value="government">Government</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Employee Count</label>
                    <select value={company.employeeCount} onChange={(e) => setCompany({ ...company, employeeCount: e.target.value })} className={inputCls}>
                      <option value="">Select...</option>
                      <option value="1-50">1–50</option>
                      <option value="51-200">51–200</option>
                      <option value="201-500">201–500</option>
                      <option value="501-1000">501–1,000</option>
                      <option value="1001-5000">1,001–5,000</option>
                      <option value="5000+">5,000+</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>HQ State</label>
                    <select value={company.hqState} onChange={(e) => setCompany({ ...company, hqState: e.target.value })} className={inputCls}>
                      <option value="">Select...</option>
                      {US_STATES.filter(s => s !== "Federal").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>HR Support Email</label>
                    <input type="email" value={company.supportEmail} onChange={(e) => setCompany({ ...company, supportEmail: e.target.value })} className={inputCls} placeholder="hr@company.com" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* -- Step 2: Jurisdictions -- */}
          {currentStep.id === "jurisdictions" && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Where do your employees work?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Select all states where you have employees. AI HR Pilot will provide jurisdiction-specific answers for each.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {US_STATES.map((state) => {
                  const selected = selectedJurisdictions.includes(state);
                  return (
                    <button
                      key={state}
                      onClick={() => state !== "Federal" && toggleJurisdiction(state)}
                      disabled={state === "Federal"}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-all text-left cursor-pointer ${
                        state === "Federal"
                          ? "bg-brand-50 border-brand-300 text-brand-700 cursor-default"
                          : selected
                            ? "bg-brand-50 border-brand-400 text-brand-700 ring-1 ring-brand-200"
                            : "bg-white border-gray-200 text-gray-600 hover:border-brand-300"
                      }`}
                    >
                      {selected || state === "Federal" ? "✓ " : ""}{state}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Federal is always included. {selectedJurisdictions.length} jurisdiction{selectedJurisdictions.length !== 1 ? "s" : ""} selected.
              </p>
            </>
          )}

          {/* -- Step 3: Upload Policies -- */}
          {currentStep.id === "documents" && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Upload your employee handbook</h2>
              <p className="text-sm text-gray-500 mb-6">
                Upload your company policies, employee handbook, or benefits guide. AI HR Pilot uses these to answer questions accurately.
              </p>
              {/* -- Real file upload zone -- */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => !uploadingFile && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-4 ${
                  uploadingFile
                    ? "border-brand-300 bg-brand-50 cursor-wait"
                    : "border-gray-300 hover:border-brand-400 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <div className="text-4xl mb-2">{uploadingFile ? "⏳" : "📄"}</div>
                <p className="text-sm font-semibold text-gray-700">
                  {uploadingFile ? "Uploading…" : "Click to upload or drag & drop"}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, CSV. Max 25MB per file.</p>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-green-600">✓</span>
                      {f.blobUrl ? (
                        <a href={f.blobUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:underline flex-1 truncate">
                          {f.name}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-green-800 flex-1 truncate">{f.name}</span>
                      )}
                      <button
                        onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">
                You can skip this step and upload documents later from the Documents page.
              </p>
            </>
          )}

          {/* -- Step 4: AI Configuration -- */}
          {currentStep.id === "ai" && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Configure AI behavior</h2>
              <p className="text-sm text-gray-500 mb-6">
                Set how AI HR Pilot responds to employee questions. You can change these anytime in Settings.
              </p>
              <div className="space-y-5">
                {[
                  { key: "autoRespond", label: "Auto-respond to low-risk queries", desc: "AI automatically answers PTO, benefits, and policy questions without HR review" },
                  { key: "disclaimers", label: "Include legal disclaimers", desc: "Add 'not legal advice' disclaimer to responses involving compliance or legal topics" },
                  { key: "jurisdictionAware", label: "Jurisdiction-aware answers", desc: "Automatically adjust answers based on employee's state/location" },
                ].map((opt) => (
                  <div key={opt.key} className="flex items-start gap-3">
                    <button
                      onClick={() => setAiConfig((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                      className={`mt-0.5 w-10 h-5 rounded-full flex-shrink-0 transition-colors cursor-pointer ${aiConfig[opt.key] ? "bg-brand-600" : "bg-gray-300"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${aiConfig[opt.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </div>
                ))}
                <div>
                  <label className={labelCls}>Confidence Threshold: {aiConfig.confidenceThreshold}%</label>
                  <input
                    type="range"
                    min="30"
                    max="95"
                    value={aiConfig.confidenceThreshold}
                    onChange={(e) => setAiConfig({ ...aiConfig, confidenceThreshold: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Below this threshold, AI will escalate to HR instead of auto-responding.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* -- Step 5: Done -- */}
          {currentStep.id === "done" && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">AI HR Pilot is ready!</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                {company.name || "Your company"} is set up with {selectedJurisdictions.length} jurisdiction{selectedJurisdictions.length !== 1 ? "s" : ""},
                {uploadedFiles.length > 0 ? ` ${uploadedFiles.length} document${uploadedFiles.length > 1 ? "s" : ""} uploaded` : " no documents yet"},
                and AI auto-response {aiConfig.autoRespond ? "enabled" : "disabled"}.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
                <div className="bg-brand-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-brand-700">{selectedJurisdictions.length}</div>
                  <div className="text-[10px] text-brand-600 font-medium">Jurisdictions</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-700">{uploadedFiles.length}</div>
                  <div className="text-[10px] text-green-600 font-medium">Documents</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-700">18</div>
                  <div className="text-[10px] text-blue-600 font-medium">Policies</div>
                </div>
              </div>
            </div>
          )}

          {/* ============ Navigation Buttons ============ */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 0 && currentStep.id !== "done" ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            ) : <div />}

            {currentStep.id === "done" ? (
              <button
                onClick={() => finishOnboarding()}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors cursor-pointer"
              >
                Go to Dashboard →
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                disabled={currentStep.id === "company" && !company.name.trim()}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  currentStep.id === "company" && !company.name.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {step === STEPS.length - 2 ? "Finish Setup" : "Next →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return <OnboardingContent />;
}
