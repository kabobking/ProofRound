'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useScrollSpy } from './ScrollSpy';
import LockIcon from './LockIcon';
import { signOut, useSession } from 'next-auth/react';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeId = useScrollSpy(['packet-contents', 'how-it-works', 'security', 'faq']);
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const primaryCtaHref = isAuthenticated ? '/dashboard' : '/get-started';
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isOnLogin = pathname === '/login';
  const isOnGetStarted = pathname === '/get-started' || pathname === '/signup';
  const isOnDashboard = pathname?.startsWith('/dashboard');

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-medium text-zinc-900">
            Proofround
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-7 md:flex">
            <Link
              href="/#packet-contents"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                isHome && activeId === 'packet-contents'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              Product
            </Link>
            <Link
              href="/#how-it-works"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                isHome && activeId === 'how-it-works'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              How it Works
            </Link>
            <Link
              href="/#security"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                isHome && activeId === 'security'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              Security
            </Link>
            <Link
              href="/#faq"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                isHome && activeId === 'faq'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              FAQ
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    isOnDashboard ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                  }`}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`text-sm font-medium transition-colors ${
                    isOnLogin ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                  }`}
                >
                  Sign in
                </Link>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <LockIcon className="h-3.5 w-3.5" />
                  <span>Read-only</span>
                </div>
                <Link
                  href={primaryCtaHref}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:shadow-md transition-all ${
                    isOnGetStarted ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                  data-analytics="cta_get_started_nav"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-zinc-200 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <Link
                href="/#packet-contents"
                className={`text-sm font-medium ${
                  isHome && activeId === 'packet-contents' ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Product
              </Link>
              <Link
                href="/#how-it-works"
                className={`text-sm font-medium ${
                  isHome && activeId === 'how-it-works' ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                How it Works
              </Link>
              <Link
                href="/#security"
                className={`text-sm font-medium ${
                  isHome && activeId === 'security' ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Security
              </Link>
              <Link
                href="/#faq"
                className={`text-sm font-medium ${
                  isHome && activeId === 'faq' ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`text-sm font-medium ${
                      isOnDashboard ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors text-left"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`text-sm font-medium ${
                      isOnLogin ? 'text-indigo-600' : 'text-zinc-700 hover:text-indigo-600'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href={primaryCtaHref}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white text-center hover:-translate-y-0.5 hover:shadow-md transition-all ${
                      isOnGetStarted ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                    data-analytics="cta_get_started_nav"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
