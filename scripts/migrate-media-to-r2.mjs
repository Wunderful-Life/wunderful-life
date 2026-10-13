/**
 * Copy the verified local media backup into Cloudflare R2, confirm every byte
 * arrived, then emit the SQL that repoints live content at the new URLs.
 *
 * Nothing is deleted. Supabase Storage keeps every original, so the revision
 * history stays restorable and the migration can be rolled back by running the
 * generated rollback SQL.
 *
 * Usage:
 *   node scripts/migrate-media-to-r2.mjs backups/<date>            # dry run
 *   node scripts/migrate-media-to-r2.mjs backups/<date> --apply    # upload
 *
 * Required env (scripts/.env.r2.local, .env.local, or the shell):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
 *   R2_PUBLIC_BASE_URL
 * Optional: SUPABASE_MEDIA_PREFIX, the public Storage prefix stored in the
 * live rows. Defaults to the original project.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const backupDir = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");

if (!backupDir) {
  throw new Error(
    "Usage: node scripts/migrate-media-to-r2.mjs backups/<date> [--apply]",
  );
}

for (const envFile of ["scripts/.env.r2.local", ".env.local", ".env"]) {
  if (!existsSync(envFile)) continue;
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

const REQUIRED = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
];

const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(`Missing required env: ${missing.join(", ")}`);
}

const BUCKET = process.env.R2_BUCKET.trim();
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL.trim().replace(/\/+$/, "");
const SUPABASE_PREFIX = (
  process.env.SUPABASE_MEDIA_PREFIX?.trim() ||
  "https://ltrldffckmplvmyonhwc.supabase.co/storage/v1/object/public/site-media/"
).replace(/\/+$/, "/");
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONTENT_TYPES = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function contentTypeFor(name, recorded) {
  if (recorded && recorded.includes("/")) return recorded;
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function publicUrl(key) {
  return `${PUBLIC_BASE}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

const dump = JSON.parse(readFileSync(join(backupDir, "database.json"), "utf8"));
const objects = dump.storage_objects;
const mediaDir = join(backupDir, "media");

// Refuse to run against an incomplete backup: a missing local file would
// otherwise become a missing image on the live site.
const localSizes = new Map();
const problems = [];
for (const object of objects) {
  const localPath = join(mediaDir, object.name);
  try {
    const size = statSync(localPath).size;
    localSizes.set(object.name, size);
    if (size !== Number(object.size)) {
      problems.push(`${object.name}: local ${size} != recorded ${object.size}`);
    }
  } catch {
    problems.push(`${object.name}: missing from ${mediaDir}`);
  }
}

if (problems.length > 0) {
  throw new Error(
    `Backup is incomplete; run scripts/backup-media.mjs first.\n${problems.join("\n")}`,
  );
}

console.log(
  `Backup verified: ${objects.length} files, ${(
    [...localSizes.values()].reduce((sum, size) => sum + size, 0) / 1048576
  ).toFixed(1)} MB`,
);

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
});

async function uploadAndVerify(object) {
  const key = object.name;
  const expected = localSizes.get(key);

  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    if (head.ContentLength === expected) {
      return { key, status: "already-in-r2" };
    }
  } catch {
    // Not uploaded yet.
  }

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: readFileSync(join(mediaDir, key)),
      ContentType: contentTypeFor(key, object.mimetype),
      CacheControl: CACHE_CONTROL,
    }),
  );

  const head = await client.send(
    new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  if (head.ContentLength !== expected) {
    throw new Error(
      `${key}: uploaded ${head.ContentLength} bytes, expected ${expected}`,
    );
  }

  return { key, status: "uploaded" };
}

if (!apply) {
  console.log(
    `\nDry run. Would copy ${objects.length} files to bucket "${BUCKET}" and serve them from ${PUBLIC_BASE}.`,
  );
  console.log("Re-run with --apply to upload. Supabase files are never touched.");
  process.exit(0);
}

const results = [];
const queue = [...objects];

async function worker() {
  for (let next = queue.shift(); next; next = queue.shift()) {
    results.push(await uploadAndVerify(next));
    if (results.length % 10 === 0) {
      console.log(`  ${results.length}/${objects.length}`);
    }
  }
}

await Promise.all(Array.from({ length: 4 }, worker));

console.log(`\nCopied and verified ${results.length}/${objects.length} files.`);

// Confirm each object is actually reachable over the public URL before any
// content is repointed at it.
async function headPublic(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const unreachable = [];
for (const object of objects) {
  const response = await headPublic(publicUrl(object.name));
  const length = Number(response.headers.get("content-length"));
  if (!response.ok || length !== localSizes.get(object.name)) {
    unreachable.push(`${object.name}: http ${response.status}, length ${length}`);
  }
}

if (unreachable.length > 0) {
  throw new Error(
    `R2 public access is not serving these files, so nothing was repointed.\n` +
      `Check that the bucket has public access enabled at ${PUBLIC_BASE}.\n${unreachable.join("\n")}`,
  );
}

console.log("All files are publicly reachable from R2.");

const urlMap = objects.map((object) => ({
  from: `${SUPABASE_PREFIX}${object.name}`,
  to: publicUrl(object.name),
}));

writeFileSync(
  join(backupDir, "r2-url-map.json"),
  `${JSON.stringify(urlMap, null, 2)}\n`,
);

function sqlLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Rewrites only live content. Revision history keeps its Supabase URLs, which
 *  still work, so restoring an earlier save is unaffected. */
function repointSql(from, to) {
  return [
    `update site_content set content = replace(content::text, ${sqlLiteral(from)}, ${sqlLiteral(to)})::jsonb where content::text like '%' || ${sqlLiteral(from)} || '%';`,
    `update portfolio_library set videos = replace(videos::text, ${sqlLiteral(from)}, ${sqlLiteral(to)})::jsonb where videos::text like '%' || ${sqlLiteral(from)} || '%';`,
  ].join("\n");
}

function wrappedSql(comment, statements) {
  return [
    comment,
    "begin;",
    "alter table site_content disable trigger user;",
    "alter table portfolio_library disable trigger user;",
    statements,
    "alter table site_content enable trigger user;",
    "alter table portfolio_library enable trigger user;",
    "commit;",
    "",
  ].join("\n");
}

writeFileSync(
  join(backupDir, "r2-repoint.sql"),
  wrappedSql(
    "-- Repoint live content from Supabase Storage to R2. Revision rows are left unchanged.",
    urlMap.map(({ from, to }) => repointSql(from, to)).join("\n"),
  ),
);

writeFileSync(
  join(backupDir, "r2-rollback.sql"),
  wrappedSql(
    "-- Undo the repoint: send live content back to the new Supabase Storage host.",
    urlMap.map(({ from, to }) => repointSql(to, from)).join("\n"),
  ),
);

console.log(
  `\nWrote ${join(backupDir, "r2-repoint.sql")} and r2-rollback.sql.\n` +
    `Run the repoint SQL to switch the live site over. Supabase still holds every original.`,
);
