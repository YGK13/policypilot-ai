// ============================================================================
// API: /api/documents — Document library CRUD
// GET:    List all documents for an org (from Neon DB)
// DELETE: Remove a document record (and optionally from Vercel Blob)
// ============================================================================

import { NextResponse } from "next/server";
import { getDocuments, deleteDocument, isDbAvailable } from "@/lib/db";

export async function GET(request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ documents: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  try {
    const docs = await getDocuments(orgId);
    return NextResponse.json({ documents: docs });
  } catch (err) {
    console.error("[API] getDocuments error:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const { orgId, docId, blobUrl } = await request.json();
    if (!orgId || !docId) {
      return NextResponse.json({ error: "Missing orgId or docId" }, { status: 400 });
    }

    // -- Delete from Neon --
    await deleteDocument(orgId, docId);

    // -- Optionally delete from Vercel Blob --
    if (blobUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { del } = await import("@vercel/blob");
        await del(blobUrl);
      } catch (blobErr) {
        // Non-fatal: Blob deletion failure shouldn't fail the whole request
        console.warn("[API] Blob deletion failed:", blobErr.message);
      }
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[API] deleteDocument error:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
