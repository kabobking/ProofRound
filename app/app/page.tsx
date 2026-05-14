import Link from 'next/link';

export default function AppPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-md text-center px-4">
        <h1 className="text-3xl font-medium tracking-tight text-[var(--text)] mb-4">
          Dashboard coming soon
        </h1>
        <p className="text-[var(--muted)] mb-8 leading-relaxed">
          The Proofround dashboard is under development. Check back soon to connect your Stripe account and generate verification packets.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-[var(--accent)] px-6 py-3 text-base font-medium text-[var(--accent-foreground)] hover:opacity-90 transition-colors"
        >
          Return to homepage
        </Link>
      </div>
    </div>
  );
}

