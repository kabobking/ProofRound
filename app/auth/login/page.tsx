'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signInWithGoogle } from '@/lib/auth';
import { analyticsEvents } from '@/lib/analytics';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-12 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="w-full max-w-md opacity-0 translate-y-2 transition-all duration-500 ease-out" style={{ animation: 'fadeInUp 0.6s ease-out forwards' }}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl">Sign in</CardTitle>
            <CardDescription>Access the ProofRound marketplace</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full gap-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.35 11.1H12v3.9h5.35c-.6 3.1-3.25 4.55-5.35 4.55-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.95 1.5l2.7-2.6C17.05 4.85 14.85 4 12 4 6.5 4 2 8.5 2 14s4.5 10 10 10c5.75 0 9.55-4.05 9.55-9.75 0-.65-.05-1.15-.2-1.65Z" />
              </svg>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </Button>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/auth/reset-password" className="text-xs text-[var(--accent)] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-[var(--border)] pt-4 text-center">
            <p className="text-sm text-[var(--muted)]">
              Do not have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-[var(--accent)] hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
