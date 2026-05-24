'use client';

import Link from 'next/link';
import Navigation from '@/components/landing/Navigation';
import SecurityCards from '@/components/SecurityCards';

export default function SecurityModelPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Security model</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">Read-only Stripe access, no account changes.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">
            Proofround is designed to make a founder revenue packet credible without expanding access beyond what is needed to verify Stripe-backed metrics.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md">Get started</Link>
            <Link href="/" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-[var(--text)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface2)] hover:shadow-sm">Back to home</Link>
          </div>
        </div>

        <div className="mt-16">
          <SecurityCards />
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">What this means in practice</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Access</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">We only request read-only Stripe permissions needed to compute verification metrics and generate packets.</p>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Storage</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Raw Stripe data is not stored as a user-facing asset. Packets present aggregated metrics and founder-controlled access links.</p>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Sharing</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Packet links can expire or be revoked, giving founders control over who can view their information.</p>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Investors</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Investors see the packet in a read-only view with no account creation required.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}