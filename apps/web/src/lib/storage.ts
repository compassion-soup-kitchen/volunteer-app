/**
 * Object storage for everything staff upload - policies, agreement templates
 * and pānui attachments.
 *
 * Backed by Cloudflare R2, spoken to over its S3-compatible API. Nothing here
 * is R2-specific beyond the defaults below, so any S3-compatible bucket works
 * by changing env values alone. Run `pnpm run storage:check` after pointing it
 * somewhere new - it round-trips a real object rather than trusting the config.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

/** Every env var the S3 client needs before it can talk to the bucket. */
const REQUIRED_ENV = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET",
] as const;

/**
 * Whether storage is wired up. Uploads fail deep inside the AWS SDK when it
 * isn't — a connection refused or a signature error rather than anything a
 * coordinator could act on — so callers check this first and say plainly that
 * the server is misconfigured.
 */
export function isStorageConfigured(): boolean {
  return REQUIRED_ENV.every((key) => Boolean(process.env[key]));
}

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: process.env.S3_ENDPOINT!,
      // R2 has no regions but the SDK demands one, and "auto" is the value
      // Cloudflare asks for. Other backends pin their own via S3_REGION.
      region: process.env.S3_REGION || "auto",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      // Not merely a preference on R2: its account endpoint is covered by a
      // single-level wildcard certificate, so the virtual-hosted form
      // (bucket.<account>.r2.cloudflarestorage.com) fails the TLS handshake.
      forcePathStyle: true,
    });
  }
  return _client;
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  return bucket;
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 60 * 5
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn }
  );
}

export async function deleteFile(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  );
}
