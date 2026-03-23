"use client";

import { useState, useCallback } from "react";
import { useApp } from "../AppShell";
import { DEMO_DOCS } from "@/lib/data/demo-data";
import SearchBar from "@/components/ui/SearchBar";

// ============================================================================
// DOCUMENTS PAGE — Upload zone, document library table with filtering
// ============================================================================

// -- Type icon mapping: pdf, docx, gdoc --
const TYPE_ICONS = { pdf: "\u{1F4D5}", docx: "\u{1F4D8}", gdoc: "\u{1F4D7}" };

function DocumentsContent() {
  const { addAudit } = useApp();
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // -- Filter documents by search term across name, category, jurisdictions --
  const filtered = DEMO_DOCS.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.jurisdictions.some((j) => j.toLowerCase().includes(q))
    );
  });

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
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addAudit(
          "DOCUMENT_UPLOAD",
          `Uploaded ${files.length} file(s): ${files.map((f) => f.name).join(", ")}`,
          "info"
        );
      }
    },
    [addAudit]
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
      >
        <div className="text-4xl mb-2">{"\u{1F4C4}"}</div>
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Drag &amp; drop policy documents here
        </p>
        <p className="text-xs text-gray-400">
          Supports PDF, DOCX, Google Docs links. Max 25MB per file.
        </p>
        <button className="mt-3 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors">
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
                  {["", "Name", "Category", "Jurisdictions", "Version", "Pages", "Status", "Uploaded"].map((h) => (
                    <th
                      key={h || "icon"}
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
                    {/* Type icon */}
                    <td className="px-3.5 py-2.5 text-lg w-8">
                      {TYPE_ICONS[doc.type] || "\u{1F4C4}"}
                    </td>

                    {/* Name */}
                    <td className="px-3.5 py-2.5 text-sm font-medium text-gray-900">
                      {doc.name}
                    </td>

                    {/* Category — gray pill */}
                    <td className="px-3.5 py-2.5">
                      <span className="pill pill-gray">{doc.category}</span>
                    </td>

                    {/* Jurisdictions — brand pill for each */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {doc.jurisdictions.map((j) => (
                          <span key={j} className="pill pill-brand">{j}</span>
                        ))}
                      </div>
                    </td>

                    {/* Version — monospace */}
                    <td className="px-3.5 py-2.5 font-mono text-xs text-gray-500">
                      v{doc.version}
                    </td>

                    {/* Pages */}
                    <td className="px-3.5 py-2.5 text-sm text-gray-500">
                      {doc.pages}
                    </td>

                    {/* Status — green for Active, amber for Draft */}
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`pill ${doc.status === "Active" ? "pill-green" : "pill-amber"}`}
                      >
                        {doc.status}
                      </span>
                    </td>

                    {/* Uploaded date */}
                    <td className="px-3.5 py-2.5 text-xs text-gray-400">
                      {doc.uploaded}
                    </td>
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
