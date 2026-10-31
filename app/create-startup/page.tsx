'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppHeader from '@/components/AppHeader';
import StartupForm from '@/components/StartupForm';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function CreateStartupPage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AppHeader 
        title="Create startup profile" 
        subtitle="Build a founder-ready profile, connect Stripe read-only, and prepare your first investor packet."
        quickLinks={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Startups', href: '/startups' },
          { label: 'Investor Discovery', href: '/marketplace' },
        ]}
      />

      <main className="mx-auto max-w-[1040px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 shadow-[0_20px_60px_rgba(2,6,23,0.16)]">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Onboarding</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">Create your startup profile</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Add your company details, connect Stripe read-only, and generate your first investor-ready verification packet.</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <Badge variant="secondary">No charges</Badge>
            <Badge variant="secondary">No account changes</Badge>
            <Badge variant="secondary">Revoke anytime</Badge>
          </div>
        </div>

        <StartupForm
          founderId={userProfile.id}
          founderEmail={userProfile.email}
          onCancel={() => router.back()}
          onCreated={startup => {
            router.push(`/startup?startupId=${startup.id}&next=connect-stripe`);
          }}
        />

        <div className="mt-8 flex justify-center">
          <Link href="/security" className="text-sm text-[var(--muted)] hover:text-[var(--text)] hover:underline">
            Review the Security Model before connecting Stripe.
          </Link>
        </div>
      </main>
    </div>
  );
}
