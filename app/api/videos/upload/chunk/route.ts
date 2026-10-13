import { NextResponse } from "next/server";
import { storeOriginChunk } from "@/lib/storage/origin-upload";
import { StorageError } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-upload-token") ?? "";
    const rawIndex = request.headers.get("x-chunk-index");
    if (rawIndex === null || !/^\d+$/.test(rawIndex)) {
      return NextResponse.json({ error: "That upload part is out of range." }, { status: 400 });
    }

    const body = new Uint8Array(await request.arrayBuffer());
    await storeOriginChunk(token, Number(rawIndex), body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return uploadError(error);
  }
}

function uploadError(error: unknown) {
  if (error instanceof StorageError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Could not upload media." }, { status: 500 });
}
