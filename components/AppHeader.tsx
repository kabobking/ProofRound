'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/auth';
import { useState } from 'react';
import { analyticsEvents } from '@/lib/analytics';
import { BriefcaseBusiness, ChevronRight, House, LogOut, Menu, Plus, Rocket, X } from 'lucide-react';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  quickLinks?: Array<{ label: string; href: string }>;
}

export default function AppHeader({ title, subtitle, quickLinks }: AppHeaderProps) {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getLinkIcon = (href: string) => {
    if (href === '/dashboard') return House;
    if (href === '/startups') return BriefcaseBusiness;
    if (href === '/marketplace') return Rocket;
    if (href === '/create-startup') return Plus;
    return ChevronRight;
  };

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const defaultQuickLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Startups', href: '/startups' },
    { label: 'Marketplace', href: '/marketplace' },
    ...(userProfile?.role === 'founder' ? [{ label: 'Create startup', href: '/create-startup' }] : []),
  ];

  const links = [...defaultQuickLinks, ...(quickLinks || [])].filter((link, index, array) => array.findIndex(candidate => candidate.href === link.href) === index);

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

  const renderedLinks = links.map(link => {
    const Icon = getLinkIcon(link.href);
    const active = isActiveLink(link.href);

    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? 'page' : undefined}
        className={`inline-flex items-center gap-2 rounded-full border px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium min-h-[44px] transition-all ${
          active
            ? 'border-[var(--accent)] bg-[var(--accentTint)] text-[var(--accent)] shadow-sm'
            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className="h-4 w-4" />
        <span>{link.label}</span>
      </Link>
    );
  });

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm lg:text-base leading-5 sm:leading-6 text-[var(--muted)]">{subtitle}</p>}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {renderedLinks}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Header Top - Title and Menu Button */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="mt-3 text-2xl font-semibold tracking-tight break-words">{title}</h1>
              {subtitle && <p className="mt-2 text-xs leading-4 text-[var(--muted)] line-clamp-3">{subtitle}</p>}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] hover:bg-[var(--surface2)] transition-colors min-h-[44px] min-w-[44px]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <span className="sr-only">Menu</span>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-[var(--bg)]">
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute inset-0 flex flex-col bg-[var(--bg)] text-[var(--text)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Menu</p>
                    <p className="mt-1 text-lg font-semibold">Navigation</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto px-4 py-6">
                  <div className="space-y-3">
                    {renderedLinks}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" />
                      {loggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
