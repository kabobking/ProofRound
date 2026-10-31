'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Home } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || undefined;
  const requestId = searchParams.get('requestId') || undefined;

  return (
    <Card className="text-center">
      <CardHeader className="items-center pb-2">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl sm:text-3xl">Request Received</CardTitle>
        <CardDescription className="text-base text-[var(--muted)]">
          We received your payment and verification request. We&apos;ll notify you by email as soon as the packet is ready.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-4 text-left">
        {requestId && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm text-[var(--muted)]">
            <span className="font-medium text-[var(--text)]">Request ID:</span>{' '}
            <code className="text-xs font-mono">{requestId}</code>
          </div>
        )}

        {sessionId && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3 text-sm text-[var(--muted)]">
            <span className="font-medium text-[var(--text)]">Checkout session:</span>{' '}
            <code className="rounded bg-[var(--surface)] px-2 py-0.5 text-xs font-mono border border-[var(--border)]">{sessionId}</code>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center border-t border-[var(--border)] pt-6">
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Return to ProofRound
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-16 text-[var(--text)] sm:px-6 lg:px-8">
      <div className="w-full max-w-xl">
        <Suspense
          fallback={
            <Card className="text-center p-12">
              <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-[var(--surface2)]" />
              <p className="mt-4 text-sm text-[var(--muted)]">Loading confirmation...</p>
            </Card>
          }
        >
          <ThankYouContent />
        </Suspense>
      </div>
    </div>
  );
}
