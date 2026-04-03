// ============================================================================
// API: /api/documents/upload — File upload via Vercel Blob + Neon record
//
// POST: Upload file to Vercel Blob, then create a document record in Neon.
// Falls back to demo mode when BLOB_READ_WRITE_TOKEN is not configured.
// orgId is passed as a form field alongside the file.
// ============================================================================

import { NextResponse } from "next/server";
import { createDocument, isDbAvailable } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// -- Derive document type from file extension --
function inferType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  return "pdf";
}

export async function POST(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  const formData = await request.formData();
  const file = formData.get("file");
  const orgId = formData.get("orgId") || "default";
  const uploadedBy = formData.get("uploadedBy") || null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // -- Validate file type --
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.type}. Accepted: PDF, DOCX, XLSX, CSV, TXT` },
      { status: 400 }
    );
  }

  // -- Validate file size (25MB max) --
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 25MB` },
      { status: 400 }
    );
  }

  let blobUrl = null;

  // -- Upload to Vercel Blob if configured --
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(file.name, file, {
        access: "public",
        addRandomSuffix: true,
      });
      blobUrl = blob.url;
    } catch (err) {
      console.error("[API] Blob upload error:", err);
      return NextResponse.json({ error: "Upload to storage failed" }, { status: 500 });
    }
  } else {
    // Demo mode: fake blob URL
    blobUrl = `https://demo.blob.vercel-storage.com/${encodeURIComponent(file.name)}`;
  }

  // -- Save document record to Neon (if DB is available) --
  let dbDoc = null;
  if (isDbAvailable()) {
    try {
      dbDoc = await createDocument(orgId, {
        name: file.name,
        type: inferType(file.name),
        category: "Uploaded",
        jurisdictions: ["All"],
        version: "1.0",
        pages: null,
        status: "draft",
        blobUrl,
        blobSize: file.size,
        uploadedBy,
      });
    } catch (dbErr) {
      // Non-fatal: still return the Blob URL so the frontend shows the doc
      console.warn("[API] Failed to save document to DB:", dbErr.message);
    }
  }

  return NextResponse.json({
    url: blobUrl,
    dbId: dbDoc?.id || null,
    name: file.name,
    type: inferType(file.name),
    size: file.size,
    demo: !process.env.BLOB_READ_WRITE_TOKEN,
  });
}
