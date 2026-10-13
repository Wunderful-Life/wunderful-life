import { NextResponse } from "next/server";
import {
  createSignedMediaUpload,
  hasMediaConfig,
} from "@/lib/storage/media-host";
import { isMediaUploadDir } from "@/lib/storage/media-upload";
import { StorageError } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    if (!hasMediaConfig()) {
      return NextResponse.json(
        { error: "Media storage is not configured." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      dir?: unknown;
      filename?: unknown;
      contentType?: unknown;
      byteLength?: unknown;
    };
    const dir = typeof body.dir === "string" ? body.dir : "";
    const filename = typeof body.filename === "string" ? body.filename.trim() : "";
    const contentType =
      typeof body.contentType === "string" ? body.contentType.trim() : undefined;
    const byteLength =
      typeof body.byteLength === "number" && Number.isInteger(body.byteLength)
        ? body.byteLength
        : undefined;

    if (!isMediaUploadDir(dir) || !filename) {
      return NextResponse.json(
        { error: "A valid upload folder and filename are required." },
        { status: 400 },
      );
    }

    const upload = await createSignedMediaUpload(
      dir,
      filename,
      contentType,
      byteLength,
    );
    return NextResponse.json(upload);
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not start upload." },
      { status: 500 },
    );
  }
}
