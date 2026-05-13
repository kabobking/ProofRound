'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/auth';
import { useState } from 'react';
import { analyticsEvents } from '@/lib/analytics';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  quickLinks?: Array<{ label: string; href: string }>;
}

export default function AppHeader({ title, subtitle, quickLinks }: AppHeaderProps) {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const defaultQuickLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Startups', href: '/startups' },
    { label: 'Marketplace', href: '/marketplace' },
    ...(userProfile?.role === 'founder' ? [{ label: 'Create startup', href: '/create-startup' }] : []),
  ];

  const links = quickLinks || defaultQuickLinks;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      analyticsEvents.logout();
      await signOutUser();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="border-b border-white/10 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-300">
              ProofRound workspace
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm lg:text-base leading-5 sm:leading-6 text-slate-300">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-white/10 active:bg-white/20 min-h-[44px]"
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-white/10 active:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Header Top - Title and Menu Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
                ProofRound workspace
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight break-words">{title}</h1>
              {subtitle && <p className="mt-2 text-xs leading-4 text-slate-300 line-clamp-3">{subtitle}</p>}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <span className="sr-only">Menu</span>
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute top-0 left-0 right-0 bg-slate-950 text-white p-6 pt-24 space-y-4 max-h-full overflow-auto">
                {links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block w-full rounded-lg border border-white/15 bg-white/5 bg-opacity-5 px-4 py-3 text-sm font-medium text-white text-left transition-colors hover:bg-white/10 active:bg-white/20 min-h-[44px] flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="w-full rounded-lg border border-white/15 bg-white/5 bg-opacity-5 px-4 py-3 text-sm font-medium text-white text-left transition-colors hover:bg-white/10 active:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] flex items-center"
                >
                  {loggingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
