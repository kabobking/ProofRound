'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp, signInWithGoogle } from '@/lib/auth';
import { analyticsEvents } from '@/lib/analytics';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'founder' | 'investor'>('founder');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, displayName, role);
      analyticsEvents.signup(role);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle(role);
      analyticsEvents.signup(role);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-12 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="w-full max-w-md opacity-0 translate-y-2 transition-all duration-500 ease-out" style={{ animation: 'fadeInUp 0.6s ease-out forwards' }}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl">Create account</CardTitle>
            <CardDescription>Join the ProofRound marketplace</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoogleSignUp}
              disabled={loading || googleLoading}
              className="w-full gap-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.35 11.1H12v3.9h5.35c-.6 3.1-3.25 4.55-5.35 4.55-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.95 1.5l2.7-2.6C17.05 4.85 14.85 4 12 4 6.5 4 2 8.5 2 14s4.5 10 10 10c5.75 0 9.55-4.05 9.55-9.75 0-.65-.05-1.15-.2-1.65Z" />
              </svg>
              {googleLoading ? 'Connecting...' : 'Sign up with Google'}
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
                <Label htmlFor="displayName">Full name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>

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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">I am a...</Label>
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'founder' | 'investor')}
                >
                  <option value="founder">Founder / Entrepreneur</option>
                  <option value="investor">Investor / Advisor</option>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-[var(--border)] pt-4 text-center">
            <p className="text-sm text-[var(--muted)]">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-[var(--accent)] hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
