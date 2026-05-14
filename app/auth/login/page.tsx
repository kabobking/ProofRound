'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signInWithGoogle } from '@/lib/auth';
import { analyticsEvents } from '@/lib/analytics';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      analyticsEvents.login();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle('investor');
      analyticsEvents.login();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md opacity-0 translate-y-2 transition-all duration-500 ease-out" style={{ animation: 'fadeInUp 0.6s ease-out forwards' }}>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] shadow-md p-8">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Sign in</h1>
          <p className="text-[var(--muted)] mb-6">Access the ProofRound marketplace</p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.35 11.1H12v3.9h5.35c-.6 3.1-3.25 4.55-5.35 4.55-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.95 1.5l2.7-2.6C17.05 4.85 14.85 4 12 4 6.5 4 2 8.5 2 14s4.5 10 10 10c5.75 0 9.55-4.05 9.55-9.75 0-.65-.05-1.15-.2-1.65Z" />
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>or</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text)] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[var(--accent)] text-[var(--accent-foreground)] font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted)]">
              Do not have an account?{' '}
              <Link href="/auth/signup" className="text-[var(--accent)] font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <p className="mt-4 text-sm text-center text-[var(--muted)]">
            <Link href="/auth/reset-password" className="text-[var(--accent)] hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
