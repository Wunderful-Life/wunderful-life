import { NextResponse } from "next/server";
import { completeOriginChunkUpload } from "@/lib/storage/origin-upload";
import { StorageError } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const publicUrl = await completeOriginChunkUpload(token);
    return NextResponse.json({ publicUrl });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not finish the upload." }, { status: 500 });
  }
}
