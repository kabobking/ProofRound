'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useScrollSpy } from './ScrollSpy';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeId = useScrollSpy(['packet-contents', 'how-it-works', 'security', 'faq']);

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
              href="#packet-contents"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                activeId === 'packet-contents'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              Product
            </Link>
            <Link
              href="#how-it-works"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                activeId === 'how-it-works'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              How it Works
            </Link>
            <Link
              href="#security"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                activeId === 'security'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              Security
            </Link>
            <Link
              href="#faq"
              className={`text-sm font-medium transition-colors border-b pb-0.5 ${
                activeId === 'faq'
                  ? 'text-indigo-600 border-indigo-600/50'
                  : 'text-zinc-700 border-transparent hover:text-indigo-600 hover:border-indigo-600/30'
              }`}
            >
              FAQ
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md transition-all"
              data-analytics="cta_get_started_nav"
            >
              Get started
            </Link>
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
                href="#packet-contents"
                className="text-sm font-medium text-zinc-700 hover:text-indigo-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Product
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-zinc-700 hover:text-indigo-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it Works
              </Link>
              <Link
                href="#security"
                className="text-sm font-medium text-zinc-700 hover:text-indigo-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Security
              </Link>
              <Link
                href="#faq"
                className="text-sm font-medium text-zinc-700 hover:text-indigo-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/app"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 text-center"
                onClick={() => setMobileMenuOpen(false)}
                data-analytics="cta_get_started_nav"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

