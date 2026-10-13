import { r2PublicBaseUrl } from "./r2-media";
import { createSupabaseAdminClient } from "./supabase-admin";
import { StorageError } from "./types";

const SUPABASE_PUBLIC_MEDIA =
  /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/site-media\//g;

type RevisionUpdate = {
  scanned: number;
  updated: number;
  stillSupabase: number;
};

export type RevisionRepointResult = {
  publicBase: string;
  site: RevisionUpdate;
  videos: RevisionUpdate;
  publishedSiteHasSupabase: boolean;
  publishedVideosHaveSupabase: boolean;
};

function repointJson(value: unknown, publicBase: string): {
  next: unknown;
  changed: boolean;
} {
  const text = JSON.stringify(value);
  if (!text.includes(".supabase.co/storage/v1/object/public/site-media/")) {
    return { next: value, changed: false };
  }
  const replaced = text.replace(SUPABASE_PUBLIC_MEDIA, `${publicBase}/`);
  return { next: JSON.parse(replaced) as unknown, changed: replaced !== text };
}

function containsSupabaseMedia(value: unknown): boolean {
  return JSON.stringify(value).includes(
    ".supabase.co/storage/v1/object/public/site-media/",
  );
}

async function repointRows(
  table: "site_content_revisions" | "portfolio_library_revisions",
  idColumn: "site_id" | "library_id",
  jsonColumn: "content" | "videos",
  publicBase: string,
): Promise<RevisionUpdate> {
  const database = createSupabaseAdminClient();
  const rows: Array<{ version: number } & Record<string, unknown>> = [];
  const pageSize = 200;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await database
      .from(table)
      .select(`version, ${jsonColumn}`)
      .eq(idColumn, "singleton")
      .order("version", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new StorageError(`Could not read ${table}.`, 500);
    }

    const page = (data ?? []) as Array<
      { version: number } & Record<string, unknown>
    >;
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  let updated = 0;
  let stillSupabase = 0;

  for (const row of rows) {
    const current = row[jsonColumn];
    const { next, changed } = repointJson(current, publicBase);
    if (!changed) {
      if (containsSupabaseMedia(current)) stillSupabase += 1;
      continue;
    }

    const { error: updateError } = await database
      .from(table)
      .update({ [jsonColumn]: next })
      .eq(idColumn, "singleton")
      .eq("version", row.version);

    if (updateError) {
      throw new StorageError(`Could not update ${table} version ${row.version}.`, 500);
    }
    updated += 1;
    if (containsSupabaseMedia(next)) stillSupabase += 1;
  }

  return { scanned: rows.length, updated, stillSupabase };
}

/**
 * Rewrite historical Supabase Storage URLs to the public R2 host.
 * The published site and video rows are read only.
 */
export async function repointRevisionMediaUrls(): Promise<RevisionRepointResult> {
  const publicBase = r2PublicBaseUrl();
  const database = createSupabaseAdminClient();

  const [siteRow, videoRow] = await Promise.all([
    database.from("site_content").select("content").eq("id", "singleton").maybeSingle(),
    database
      .from("portfolio_library")
      .select("videos")
      .eq("id", "singleton")
      .maybeSingle(),
  ]);

  if (siteRow.error || videoRow.error) {
    throw new StorageError("Could not read the published content.", 500);
  }

  const [site, videos] = await Promise.all([
    repointRows("site_content_revisions", "site_id", "content", publicBase),
    repointRows(
      "portfolio_library_revisions",
      "library_id",
      "videos",
      publicBase,
    ),
  ]);

  return {
    publicBase,
    site,
    videos,
    publishedSiteHasSupabase: containsSupabaseMedia(siteRow.data?.content),
    publishedVideosHaveSupabase: containsSupabaseMedia(videoRow.data?.videos),
  };
}
