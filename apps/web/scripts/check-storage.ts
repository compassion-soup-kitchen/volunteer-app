/**
 * Round-trips a real object through the configured bucket - upload, signed
 * download, delete - so a storage misconfiguration surfaces here rather than
 * the first time a coordinator tries to upload a policy.
 *
 * Usage (from apps/web, or inside the production container):
 *   pnpm run storage:check
 *
 * Exits non-zero on the first failure, with the credentials never printed.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import {
  deleteFile,
  getSignedDownloadUrl,
  isStorageConfigured,
  uploadFile,
} from "../src/lib/storage";

const REQUIRED_ENV = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET",
];

/**
 * Prints what we're pointed at, and catches the slip that costs the most time:
 * requests are path-style, so any path on the endpoint is prepended to every
 * key. Cloudflare's dashboard shows a per-bucket S3 URL right next to the
 * account one, and pasting that gives `/documents/documents/…` - which fails
 * as a 404 on download long after the upload looked fine.
 */
function reportTarget(endpoint: string): void {
  console.log(`▶ Endpoint: ${endpoint}`);
  console.log(`  Bucket:   ${process.env.S3_BUCKET}`);
  console.log(`  Region:   ${process.env.S3_REGION || "auto (default)"}`);

  let path: string;
  try {
    path = new URL(endpoint).pathname.replace(/\/+$/, "");
  } catch {
    console.error(`\n✗ S3_ENDPOINT isn't a valid URL: ${endpoint}`);
    process.exit(1);
  }

  if (path) {
    console.warn(
      `\n⚠ S3_ENDPOINT carries the path "${path}". It should be the ` +
        "bucket-less account endpoint - for R2 that's " +
        "https://<ACCOUNT_ID>.r2.cloudflarestorage.com, with the bucket " +
        "named separately in S3_BUCKET."
    );
  }
}

async function main() {
  if (!isStorageConfigured()) {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
    console.error(`✗ Storage isn't configured - missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  reportTarget(process.env.S3_ENDPOINT!);

  const key = `_healthcheck/${Date.now()}-${randomUUID()}.txt`;
  const body = Buffer.from(
    `volunteer-app storage check ${new Date().toISOString()}\n`
  );

  console.log(`\n▶ Uploading ${key}…`);
  await uploadFile(key, body, "text/plain");
  console.log("  ✓ accepted");

  console.log("▶ Signing a download URL…");
  const url = await getSignedDownloadUrl(key, 60);
  console.log("  ✓ signed");

  console.log("▶ Fetching it back…");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Signed download returned ${res.status} ${res.statusText}. ` +
        "Check the bucket name and that the token can read as well as write."
    );
  }
  const downloaded = Buffer.from(await res.arrayBuffer());
  if (!downloaded.equals(body)) {
    throw new Error("The bytes that came back didn't match the ones sent.");
  }
  console.log(`  ✓ ${downloaded.length} bytes matched`);

  console.log("▶ Deleting it…");
  await deleteFile(key);
  console.log("  ✓ deleted");

  console.log(
    "\n✅ Storage is working - uploads, signed downloads and deletes all round-tripped."
  );
}

main().catch((err) => {
  console.error("\n✗ Storage check failed:");
  console.error(err);
  process.exit(1);
});
