"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import { DEMO_DOCS } from "@/lib/data/demo-data";
import SearchBar from "@/components/ui/SearchBar";

// ============================================================================
// DOCUMENTS PAGE — Upload zone + persistent document library.
// Loads from Neon DB on mount (when available), falls back to demo docs.
// Uploads go to Vercel Blob and are saved to Neon for persistence.
// ============================================================================

// -- Type icon mapping --
const TYPE_ICONS = { pdf: "📕", docx: "📘", gdoc: "📗", xlsx: "📗" };

// -- Infer type from file extension --
function inferType(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  return "pdf";
}

// -- Normalize a Neon DB row to UI shape --
function normalizeDbDoc(row) {
  return {
    id: `db-${row.id}`,
    dbId: row.id,
    name: row.name,
    type: row.type || inferType(row.name),
    category: row.category || "Uploaded",
    jurisdictions: row.jurisdictions || ["All"],
    version: row.version || "1.0",
    pages: row.pages || "—",
    status: row.status === "active" ? "Active" : (row.status || "Draft"),
    blobUrl: row.blob_url || null,
    size: row.blob_size || 0,
    uploaded: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    fromDb: true,
  };
}

function DocumentsContent() {
  const { addAudit, mode, orgId, currentUser } = useApp();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // -- Doc list: starts with demo docs, DB rows replace them when loaded --
  const [docs, setDocs] = useState(() => [...DEMO_DOCS]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // -- Load documents from Neon on mount --
  useEffect(() => {
    const load = async () => {
      try {
        const resolvedOrgId = orgId || "default";
        const res = await fetch(`/api/documents?orgId=${resolvedOrgId}`);
        const data = await res.json();
        if (!data.demo && Array.isArray(data.documents)) {
          if (data.documents.length > 0) {
            // Neon has real docs — show them instead of demo docs
            setDocs(data.documents.map(normalizeDbDoc));
          }
          // If Neon is empty, keep showing demo docs
        }
      } catch {
        // Non-fatal: fall back to demo docs
      } finally {
        setDbLoaded(true);
      }
    };
    load();
  }, [orgId]);

  // -- Filter by search --
  const filtered = docs.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      (d.jurisdictions || []).some((j) => j.toLowerCase().includes(q))
    );
  });

  const uploadedCount = docs.filter((d) => d.category === "Uploaded" || d.fromDb).length;
  const demoCount = docs.filter((d) => !d.fromDb).length;

  // -- Process uploaded files: POST to API, add to doc list --
  const processFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      setUploading(true);
      const uploaded = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("orgId", orgId || "default");
        if (currentUser?.id) formData.append("uploadedBy", currentUser.id);

        try {
          const res = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          uploaded.push({
            id: data.dbId ? `db-${data.dbId}` : `upload-${Date.now()}-${uploaded.length}`,
            dbId: data.dbId || null,
            name: file.name,
            type: inferType(file.name),
            category: "Uploaded",
            jurisdictions: ["All"],
            version: "1.0",
            pages: "—",
            status: "Draft",
            blobUrl: data.url || null,
            size: file.size,
            uploaded: new Date().toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            }),
            fromDb: !!data.dbId,
          });
        } catch {
          // -- Fallback: add without blob URL and warn user --
          addToast("warning", "Upload Incomplete", `${file.name} saved locally — could not persist to storage`);
          uploaded.push({
            id: `upload-${Date.now()}-${uploaded.length}`,
            dbId: null,
            name: file.name,
            type: inferType(file.name),
            category: "Uploaded",
            jurisdictions: ["All"],
            version: "1.0",
            pages: "—",
            status: "Draft",
            uploaded: new Date().toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            }),
          });
        }
      }

      setDocs((prev) => [...prev, ...uploaded]);
      setUploading(false);
      addAudit(
        "DOCUMENT_UPLOAD",
        `Uploaded ${files.length} file(s): ${files.map((f) => f.name).join(", ")}`,
        "info"
      );
    },
    [addAudit, addToast, orgId, currentUser]
  );

  // -- Drag-and-drop handlers --
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);
  const handleDrop = useCallback(
    (e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); },
    [processFiles]
  );
  const handleFileSelect = useCallback(
    (e) => { processFiles(e.target.files); e.target.value = ""; },
    [processFiles]
  );

  // -- Delete document (admin only): remove from UI + Neon + Blob --
  // Uses optimistic removal with error recovery: if DELETE fails, doc is
  // restored to state and a toast is shown.
  const handleDelete = useCallback(
    async (doc) => {
      // -- Optimistic UI removal --
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));

      // -- If it has a DB record, delete from Neon + Blob --
      if (doc.dbId) {
        try {
          const res = await fetch("/api/documents", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId: orgId || "default",
              docId: doc.dbId,
              blobUrl: doc.blobUrl || null,
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          // -- Audit only after confirmed delete --
          addAudit("DOCUMENT_DELETE", `Deleted document: ${doc.name}`, "warning");
        } catch (err) {
          // -- Restore doc to state on failure --
          setDocs((prev) => [doc, ...prev]);
          addToast("error", "Delete Failed", `Could not delete "${doc.name}". Please try again.`);
          console.warn("[Documents] DELETE failed:", err.message);
        }
      } else {
        // -- Local-only doc (no DB record): just confirm the removal --
        addAudit("DOCUMENT_DELETE", `Deleted local document: ${doc.name}`, "warning");
      }
    },
    [addAudit, addToast, orgId]
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Upload Zone ============ */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${dragOver
            ? "border-brand-500 bg-brand-50"
            : "border-gray-300 bg-white hover:border-brand-400 hover:bg-gray-50"
          }
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-4xl mb-2">
          {uploading ? "⏳" : "📄"}
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">
          {uploading ? "Uploading…" : "Drag & drop policy documents here"}
        </p>
        <p className="text-xs text-gray-400">
          Supports PDF, DOCX, XLSX, CSV. Max 25MB per file.
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          disabled={uploading}
          className="mt-3 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
        >
          Browse Files
        </button>
      </div>

      {/* ============ Search + Count ============ */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1 max-w-sm">
          <SearchBar value={search} onChange={setSearch} placeholder="Search documents…" />
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400 font-medium">
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </span>
          {dbLoaded && uploadedCount > 0 && (
            <span className="text-brand-600 ml-1 text-xs">
              ({uploadedCount} {uploadedCount === 1 ? "upload" : "uploads"})
            </span>
          )}
        </div>
      </div>

      {/* ============ Document Table ============ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">No documents found</h3>
            <p className="text-xs">Try a different search term or upload a document</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {[
                    "", "Name", "Category", "Jurisdictions", "Version",
                    "Pages", "Status", "Uploaded",
                    ...(mode === "admin" ? [""] : []),
                  ].map((h, i) => (
                    <th
                      key={h || `col-${i}`}
                      className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide px-3.5 py-2.5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3.5 py-2.5 text-lg w-8">
                      {TYPE_ICONS[doc.type] || "📄"}
                    </td>
                    <td className="px-3.5 py-2.5 text-sm font-medium text-gray-900">
                      {doc.blobUrl ? (
                        <a
                          href={doc.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {doc.name}
                        </a>
                      ) : (
                        doc.name
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className={`pill ${doc.category === "Uploaded" || doc.fromDb ? "pill-blue" : "pill-gray"}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(doc.jurisdictions || []).map((j) => (
                          <span key={j} className="pill pill-brand">{j}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-xs text-gray-500">
                      v{doc.version}
                    </td>
                    <td className="px-3.5 py-2.5 text-sm text-gray-500">{doc.pages}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`pill ${doc.status === "Active" || doc.status === "active" ? "pill-green" : "pill-amber"}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-400">{doc.uploaded}</td>
                    {mode === "admin" && (
                      <td className="px-3.5 py-2.5">
                        <button
                          onClick={() => handleDelete(doc)}
                          className="text-xs text-danger-600 hover:text-danger-700 cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return <DocumentsContent />;
}
