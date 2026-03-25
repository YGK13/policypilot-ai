"use client";

import { useState, useCallback, useRef } from "react";
import { useApp } from "../AppShell";
import { DEMO_DOCS } from "@/lib/data/demo-data";
import SearchBar from "@/components/ui/SearchBar";

// ============================================================================
// DOCUMENTS PAGE — Upload zone, document library table with filtering
// Now actually adds uploaded files to the visible list + hidden file input.
// ============================================================================

// -- Type icon mapping --
const TYPE_ICONS = { pdf: "\u{1F4D5}", docx: "\u{1F4D8}", gdoc: "\u{1F4D7}", xlsx: "\u{1F4D7}" };

// -- Infer type from file extension --
function inferType(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  return "pdf"; // default
}

function DocumentsContent() {
  const { addAudit, mode } = useApp();
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // -- All docs in one state: starts with demo docs, uploads get appended --
  const [docs, setDocs] = useState(() => [...DEMO_DOCS]);
  const fileInputRef = useRef(null);

  const allDocs = docs;

  // -- Filter by search --
  const filtered = allDocs.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.jurisdictions.some((j) => j.toLowerCase().includes(q))
    );
  });

  // -- Process uploaded files: add them to the visible document list --
  const processFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const newDocs = files.map((f, i) => ({
        id: `upload-${Date.now()}-${i}`,
        name: f.name,
        type: inferType(f.name),
        category: "Uploaded",
        jurisdictions: ["All"],
        version: "1.0",
        pages: "—",
        status: "Draft",
        uploaded: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }));

      setDocs((prev) => [...prev, ...newDocs]);
      addAudit(
        "DOCUMENT_UPLOAD",
        `Uploaded ${files.length} file(s): ${files.map((f) => f.name).join(", ")}`,
        "info"
      );
    },
    [addAudit]
  );

  // -- Drag-and-drop handlers --
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  // -- Hidden file input change handler --
  const handleFileSelect = useCallback(
    (e) => {
      processFiles(e.target.files);
      e.target.value = ""; // reset so same file can be re-selected
    },
    [processFiles]
  );

  // -- Delete any document (admin only) --
  const handleDelete = useCallback(
    (docId, docName) => {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      addAudit("DOCUMENT_DELETE", `Deleted document: ${docName}`, "warning");
    },
    [addAudit]
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Upload Zone (admin only in employee mode, but always visible for demo) ============ */}
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
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-4xl mb-2">{"\u{1F4C4}"}</div>
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Drag &amp; drop policy documents here
        </p>
        <p className="text-xs text-gray-400">
          Supports PDF, DOCX, XLSX, CSV. Max 25MB per file.
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-3 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors cursor-pointer"
        >
          Browse Files
        </button>
      </div>

      {/* ============ Search + Count ============ */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1 max-w-sm">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search documents..."
          />
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          {docs.length > DEMO_DOCS.length && (
            <span className="text-brand-600 ml-1">({docs.length - DEMO_DOCS.length} uploaded)</span>
          )}
        </span>
      </div>

      {/* ============ Document Table ============ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">{"\u{1F4DA}"}</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">No documents found</h3>
            <p className="text-xs">Try a different search term or upload a document</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["", "Name", "Category", "Jurisdictions", "Version", "Pages", "Status", "Uploaded", ...(mode === "admin" ? [""] : [])].map((h, i) => (
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
                      {TYPE_ICONS[doc.type] || "\u{1F4C4}"}
                    </td>
                    <td className="px-3.5 py-2.5 text-sm font-medium text-gray-900">
                      {doc.name}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className={`pill ${doc.category === "Uploaded" ? "pill-blue" : "pill-gray"}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {doc.jurisdictions.map((j) => (
                          <span key={j} className="pill pill-brand">{j}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-xs text-gray-500">
                      v{doc.version}
                    </td>
                    <td className="px-3.5 py-2.5 text-sm text-gray-500">
                      {doc.pages}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className={`pill ${doc.status === "Active" ? "pill-green" : "pill-amber"}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-400">
                      {doc.uploaded}
                    </td>
                    {/* Admin: delete button for ANY document */}
                    {mode === "admin" && (
                      <td className="px-3.5 py-2.5">
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
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
