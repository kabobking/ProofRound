import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function normalizeBucketName(raw: string) {
  const value = raw.trim();

  if (value.startsWith('gs://')) {
    return value.replace(/^gs:\/\//, '').replace(/\/$/, '');
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const parsed = new URL(value);
    const path = parsed.pathname.replace(/\/$/, '');

    // Firebase Storage REST URLs commonly include /v0/b/<bucket>/...
    const bucketFromApiPath = path.match(/\/b\/([^/]+)/)?.[1];
    if (bucketFromApiPath) {
      return decodeURIComponent(bucketFromApiPath);
    }

    // Fallback: use first non-empty path segment as a best-effort bucket name.
    const firstSegment = path.split('/').filter(Boolean)[0];
    if (firstSegment) {
      return decodeURIComponent(firstSegment);
    }
  }

  return value.replace(/\/$/, '');
}

function getServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required for the backend');
  }

  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
}

export function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(getServiceAccount()),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

export function getDb() {
  return getFirestore(getAdminApp());
}

export function getStorageBucket() {
  const rawBucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!rawBucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET is required for uploading files (example: your-project.firebasestorage.app)');
  }

  const bucketName = normalizeBucketName(rawBucketName);
  return getStorage(getAdminApp()).bucket(bucketName);
}