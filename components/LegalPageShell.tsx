'use client';

import Link from 'next/link';

interface LegalPageShellProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalPageShell({ title, updatedAt, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <Link href="/" className="text-sm font-medium text-[var(--accent)] hover:underline">
            ← Back to Proofround
          </Link>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Updated {updatedAt}</p>
        </header>

        <main className="flex-1">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8 lg:p-10">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">{title}</h1>
            <div className="mt-8 space-y-8 text-sm leading-7 text-[var(--muted)] sm:text-base">
              {children}
            </div>
          </div>
        </main>

        <footer className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Proofround.</p>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className="hover:text-[var(--text)] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-[var(--text)] transition-colors">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}