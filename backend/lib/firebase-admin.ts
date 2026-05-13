import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

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
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET is required for uploading files');
  }

  return getStorage(getAdminApp()).bucket(bucketName);
}