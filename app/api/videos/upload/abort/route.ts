import { NextResponse } from "next/server";
import { abortOriginChunkUpload } from "@/lib/storage/origin-upload";
import { StorageError } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    await abortOriginChunkUpload(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not cancel the upload." }, { status: 500 });
  }
}
