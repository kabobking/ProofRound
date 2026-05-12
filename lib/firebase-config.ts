/**
 * Firebase configuration
 * 
 * IMPORTANT: Replace these values with your Firebase credentials
 * Get these from Firebase Console > Project Settings > General
 */

const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyBCfPhTmBootcnfVdaHvXs8bA9FLzKhah8',
  authDomain: 'proofround.firebaseapp.com',
  projectId: 'proofround',
  storageBucket: 'proofround.firebasestorage.app',
  messagingSenderId: '847272395699',
  appId: '1:847272395699:web:8b45309a61e537179fc1c6',
  measurementId: 'G-4Q4CMZ2EWG',
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackFirebaseConfig.measurementId,
};

export default firebaseConfig;
