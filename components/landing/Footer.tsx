import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white/90">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-sm font-medium text-zinc-900">Proofround</p>
          <p className="mt-1 text-xs text-zinc-500">Source-linked Stripe metrics for fundraising.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
          <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-900 transition-colors">
            Terms
          </Link>
          <Link href="/#security" className="hover:text-zinc-900 transition-colors">
            Security
          </Link>
        </div>
        <p className="text-xs text-zinc-500">© {new Date().getFullYear()} Proofround</p>
      </div>
    </footer>
  );
}
