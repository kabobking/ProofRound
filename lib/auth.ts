/**
 * Authentication utilities
 */

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  UserCredential,
  signInWithPopup,
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

function getUserProfileFromAuthUser(
  firebaseUser: FirebaseUser,
  role: 'founder' | 'investor' | 'admin' = 'investor',
  displayNameOverride?: string
): User {
  const now = new Date().toISOString();

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: displayNameOverride || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    photoUrl: firebaseUser.photoURL ?? undefined,
    role,
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
    emailVerified: firebaseUser.emailVerified,
  };
}

async function saveUserProfile(profile: User): Promise<User> {
  const firestore = getFirestoreInstance();
  await setDoc(doc(firestore, 'users', profile.id), profile, { merge: true });
  return profile;
}

async function createOrUpdateProfileFromAuthUser(
  firebaseUser: FirebaseUser,
  role: 'founder' | 'investor' | 'admin' = 'investor',
  displayNameOverride?: string
): Promise<User> {
  const firestore = getFirestoreInstance();
  const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));

  if (userDoc.exists()) {
    const existingProfile = userDoc.data() as User;
    return saveUserProfile({
      ...existingProfile,
      email: firebaseUser.email ?? existingProfile.email,
      displayName: displayNameOverride || firebaseUser.displayName || existingProfile.displayName,
      photoUrl: firebaseUser.photoURL ?? existingProfile.photoUrl,
      emailVerified: firebaseUser.emailVerified,
      updatedAt: new Date().toISOString(),
    });
  }

  return saveUserProfile(getUserProfileFromAuthUser(firebaseUser, role, displayNameOverride));
}

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

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return createOrUpdateProfileFromAuthUser(userCredential.user, role, displayName);
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
 * Sign in with Google and create/update a user profile if needed
 */
export async function signInWithGoogle(role: 'founder' | 'investor' = 'investor'): Promise<User> {
  const auth = getAuthInstance();

  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result: UserCredential = await signInWithPopup(auth, provider);
  return createOrUpdateProfileFromAuthUser(result.user, role);
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
