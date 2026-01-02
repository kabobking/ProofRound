'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
            ← Back to homepage
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-6">Terms of Service</h1>
          <div className="prose prose-sm max-w-none text-zinc-600 leading-relaxed">
            <p className="text-zinc-500">
              Terms of service content will be available shortly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
