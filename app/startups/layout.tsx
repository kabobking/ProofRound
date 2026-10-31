'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function StartupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/auth/login');
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  return <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">{children}</div>;
}