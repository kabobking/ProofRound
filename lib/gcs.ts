import { Storage } from "@google-cloud/storage";

function getBucketName() {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) throw new Error("GCS_BUCKET is not configured");
  return bucket;
}

function parseServiceAccount() {
  const raw = process.env.GCS_SERVICE_ACCOUNT_KEY;
  if (!raw) return undefined;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function getStorageClient() {
  const credentials = parseServiceAccount();

  return new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials,
  });
}

const storage = getStorageClient();

function normalizePath(path: string) {
  return path.replace(/^gs:\/\//, "").replace(/^[^/]+\//, "");
}

export async function uploadReportPdf(buffer: Buffer, reportId: string) {
  const bucketName = getBucketName();
  const destination = `reports/${reportId}.pdf`;
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  await file.save(buffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
    },
  });

  return destination;
}

export async function getSignedReportUrl(
  pdfPath: string,
  expiresInSeconds = 900
): Promise<string> {
  const bucketName = getBucketName();
  const bucket = storage.bucket(bucketName);
  const destination = normalizePath(pdfPath);
  const file = bucket.file(destination);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInSeconds * 1000,
    version: "v4",
  });

  return url;
}
