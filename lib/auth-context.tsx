/**
 * Auth context provider for managing auth state across the app
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, getCurrentUserProfile } from '@/lib/auth';
import { User } from '@/lib/models';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      try {
        setFirebaseUser(user);

        if (user) {
          const profile = await getCurrentUserProfile(user.uid);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { firebaseUser, loading } = useAuth();
  return !loading && firebaseUser !== null;
}

/**
 * Hook to check user role
 */
export function useUserRole(): 'founder' | 'investor' | 'admin' | null {
  const { userProfile, loading } = useAuth();
  return loading ? null : userProfile?.role ?? null;
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  const { userProfile, loading } = useAuth();
  return !loading && (userProfile?.isAdmin ?? false);
}
