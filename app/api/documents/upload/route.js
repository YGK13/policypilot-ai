// ============================================================================
// API: /api/documents/upload — File upload via Vercel Blob
// POST: Upload a file, store in Blob, return metadata
// Falls back to demo mode when BLOB_READ_WRITE_TOKEN is not set.
// ============================================================================

import { NextResponse } from "next/server";

export async function POST(request) {
  // -- Check if Vercel Blob is configured --
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Demo mode: return a fake blob URL so the frontend still works
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    return NextResponse.json({
      demo: true,
      url: `https://demo.blob.vercel-storage.com/${file.name}`,
      pathname: file.name,
      contentType: file.type,
      size: file.size,
    });
  }

  // -- Production: use Vercel Blob --
  try {
    const { put } = await import("@vercel/blob");
    const formData = await request.formData();
    const file = formData.get("file");

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

    // -- Upload to Vercel Blob --
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
    });
  } catch (err) {
    console.error("[API] document upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
