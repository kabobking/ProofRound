/**
 * Authentication utilities
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { getAuthInstance, getFirestoreInstance } from './firebase-client';
import { User } from './models';

/**
 * Create a new user account and profile
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: 'founder' | 'investor'
): Promise<User> {
  const auth = getAuthInstance();
  const firestore = getFirestoreInstance();

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Create user profile in Firestore
  const userProfile: User = {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    displayName,
    role,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emailVerified: firebaseUser.emailVerified,
  };

  await setDoc(doc(firestore, 'users', firebaseUser.uid), userProfile);

  return userProfile;
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const auth = getAuthInstance();

  // Enable persistence
  await setPersistence(auth, browserLocalPersistence);

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Get current user profile from Firestore
 */
export async function getCurrentUserProfile(uid: string): Promise<User | null> {
  const firestore = getFirestoreInstance();

  try {
    const userDoc = await getDoc(doc(firestore, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<User>
): Promise<void> {
  const firestore = getFirestoreInstance();

  await setDoc(
    doc(firestore, 'users', uid),
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  const auth = getAuthInstance();
  await signOut(auth);
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  const auth = getAuthInstance();
  await sendPasswordResetEmail(auth, email);
}

/**
 * Get current Firebase user
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  const auth = getAuthInstance();
  return auth.currentUser;
}
