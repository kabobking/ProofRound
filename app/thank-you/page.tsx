import React from 'react';
import Link from 'next/link';

export default function ThankYouPage({ searchParams }: { searchParams?: { [key: string]: string | string[] } }) {
  const sessionId = typeof searchParams?.session_id === 'string' ? searchParams.session_id : undefined;
  const requestId = typeof searchParams?.requestId === 'string' ? searchParams.requestId : undefined;

  return (
    <main className="py-20 px-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Thanks — request received</h1>
      <p className="mt-4 text-slate-600">We received your payment and request. We&apos;ll email you when the packet is ready.</p>

      {requestId && (
        <p className="mt-3 text-sm text-slate-500">Request ID: <strong>{requestId}</strong></p>
      )}

      {sessionId && (
        <p className="mt-2 text-sm text-slate-500">Checkout session: <code className="bg-slate-100 px-2 py-1 rounded">{sessionId}</code></p>
      )}

      <div className="mt-6">
        <Link href="/" className="text-indigo-600 underline">Return to ProofRound</Link>
      </div>
    </main>
  );
}
