// ============================================================================
// API: /api/documents/upload — File upload + handbook indexing
//
// POST: Validate → enforce plan document limit → upload to Vercel Blob →
//       create Neon record → extract/chunk/embed the text so chat answers
//       actually come from this document (lib/rag.js).
//
// orgId is ALWAYS derived from the authenticated session, never the client.
// ============================================================================

import { NextResponse } from "next/server";
import { createDocument, isDbAvailable } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { checkDocumentLimit } from "@/lib/auth/plan";
import { indexDocument } from "@/lib/rag";

// -- Derive document type from file extension --
function inferType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  if (ext === "txt" || ext === "md") return "txt";
  return "pdf";
}

export async function POST(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  const formData = await request.formData();
  const file = formData.get("file");
  // -- Session-derived tenant. "default" only exists in Clerk-less demo mode. --
  const orgId = guard.session.orgId || "default";
  const uploadedBy = guard.session.user?.id || null;

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
    "text/markdown",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.type}. Accepted: PDF, DOCX, XLSX, CSV, TXT, MD` },
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

  // -- Plan enforcement: document count per tier --
  if (isDbAvailable() && !guard.session.demo) {
    try {
      const gate = await checkDocumentLimit(orgId);
      if (!gate.ok) {
        return NextResponse.json(
          {
            error: `Document limit reached: your ${gate.plan} plan includes ${gate.limit} documents (${gate.current} used). Upgrade in Billing to add more.`,
            code: "plan_limit",
          },
          { status: 402 }
        );
      }
    } catch (err) {
      console.warn("[API] plan check failed (allowing upload):", err.message);
    }
  }

  // -- Read the file once; the same buffer feeds Blob storage and indexing --
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let blobUrl = null;

  // -- Upload to Vercel Blob if configured --
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(file.name, buffer, {
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
        status: "active",
        blobUrl,
        blobSize: file.size,
        uploadedBy,
      });
    } catch (dbErr) {
      // Non-fatal: still return the Blob URL so the frontend shows the doc
      console.warn("[API] Failed to save document to DB:", dbErr.message);
    }
  }

  // -- Index for retrieval: extract → chunk → embed → store.
  //    This is what makes chat answer from THIS document. --
  let indexResult = { indexed: false, chunks: 0, reason: "not_attempted" };
  if (dbDoc?.id) {
    try {
      indexResult = await indexDocument({
        orgId,
        documentId: dbDoc.id,
        documentName: file.name,
        buffer,
        filename: file.name,
      });
    } catch (err) {
      console.error("[API] Document indexing failed:", err);
      indexResult = { indexed: false, chunks: 0, reason: err.message };
    }
  }

  return NextResponse.json({
    url: blobUrl,
    dbId: dbDoc?.id || null,
    name: file.name,
    type: inferType(file.name),
    size: file.size,
    indexed: indexResult.indexed,
    chunks: indexResult.chunks,
    indexReason: indexResult.reason,
    demo: !process.env.BLOB_READ_WRITE_TOKEN,
  });
}
