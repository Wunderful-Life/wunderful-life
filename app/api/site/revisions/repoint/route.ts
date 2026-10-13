import { NextResponse } from "next/server";
import { repointRevisionMediaUrls } from "@/lib/storage/repoint-revisions";
import { StorageError } from "@/lib/storage/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await repointRevisionMediaUrls();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to repoint revision media URLs." },
      { status: 500 },
    );
  }
}
