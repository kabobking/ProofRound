'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, ShieldCheck, TrendingUp, Search, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      {/* Top Bar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="ProofRound Home" className="inline-flex items-center transition-opacity hover:opacity-90">
            <Image
              src="/logo.svg"
              alt="ProofRound"
              width={141}
              height={28}
              priority
              className="h-6 sm:h-7 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            ← Back to ProofRound
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl text-center">
          {/* Badge */}
          <Badge variant="secondary" className="gap-2 py-1.5 px-3.5">
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            404 Error • Page Not Found
          </Badge>

          {/* Heading */}
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--text)] sm:text-6xl">
            Lost in the round?
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">
            We couldn’t find the page you’re looking for. The link may be broken, or the page may have been moved.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button variant="default" className="gap-2">
                <Home className="h-4 w-4" />
                Return to Homepage
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>

          {/* Popular Destinations */}
          <div className="mt-14 border-t border-[var(--border)] pt-10 text-left">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] text-center sm:text-left">
              Popular Destinations
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link
                href="/startups"
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-xs"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accentTint)] text-[var(--accent)]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  Startups
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                  Browse vetted startups with verified financial metrics.
                </p>
              </Link>

              <Link
                href="/marketplace"
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-xs"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accentTint)] text-[var(--accent)]">
                  <Search className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  Marketplace
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                  Explore active investment opportunities and deal terms.
                </p>
              </Link>

              <Link
                href="/security"
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-xs"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accentTint)] text-[var(--accent)]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  Security
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                  Learn about our read-only Stripe Connect architecture.
                </p>
              </Link>
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>
              Need assistance? Contact us at{' '}
              <a
                href="mailto:rahul.menon85280@gmail.com"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                rahul.menon85280@gmail.com
              </a>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-[var(--muted)] sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} ProofRound. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="hover:text-[var(--text)] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-[var(--text)] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
