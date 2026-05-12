import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required for the backend');
  }

  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
}

function getAdminApp() {
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