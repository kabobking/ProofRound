'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FileText, HelpCircle, ShieldCheck, Menu, Rocket, X } from 'lucide-react';
import { useScrollSpy } from './ScrollSpy';
import { Button } from '@/components/ui/button';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuRendered, setMobileMenuRendered] = useState(false);
  const pathname = usePathname();
  const activeId = useScrollSpy(['packet-contents', 'how-it-works', 'security', 'faq']);
  const mobileMenuCloseTimerRef = useRef<number | null>(null);

  const openMobileMenu = () => {
    if (mobileMenuCloseTimerRef.current) {
      window.clearTimeout(mobileMenuCloseTimerRef.current);
      mobileMenuCloseTimerRef.current = null;
    }

    setMobileMenuRendered(true);
    setMobileMenuOpen(true);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);

    if (mobileMenuCloseTimerRef.current) {
      window.clearTimeout(mobileMenuCloseTimerRef.current);
    }

    mobileMenuCloseTimerRef.current = window.setTimeout(() => {
      setMobileMenuRendered(false);
      mobileMenuCloseTimerRef.current = null;
    }, 300);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => () => {
    if (mobileMenuCloseTimerRef.current) {
      window.clearTimeout(mobileMenuCloseTimerRef.current);
      mobileMenuCloseTimerRef.current = null;
    }
  }, []);

  const navItems = [
    { href: '/#packet-contents', label: 'Product', icon: FileText, sectionId: 'packet-contents' },
    { href: '/#security', label: 'Security', icon: ShieldCheck, sectionId: 'security' },
    { href: '/#faq', label: 'FAQ', icon: HelpCircle, sectionId: 'faq' },
  ];

  const isActive = (href: string, sectionId?: string) => {
    if (href === '/') return pathname === '/';
    if (!sectionId) return false;

    return activeId === sectionId;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="ProofRound Home" className="inline-flex items-center transition-opacity hover:opacity-90">
            <Image
              src="/logo.svg"
              alt="ProofRound"
              width={141}
              height={28}
              priority
              className="h-6 sm:h-7 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-7 md:flex">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href, item.sectionId);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 border-b px-1 pb-0.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/dashboard"
              data-analytics="cta_get_started_nav"
            >
              <Button size="sm" className="gap-2">
                <Rocket className="h-4 w-4" />
                Get started
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] md:hidden"
            onClick={mobileMenuOpen ? closeMobileMenu : openMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuRendered && (
          <div className={`fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div
              className={`absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className={`absolute inset-0 flex h-full flex-col bg-[var(--surface)] text-[var(--text)] transform-gpu transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Menu</p>
                  <Image
                    src="/logo.svg"
                    alt="ProofRound"
                    width={121}
                    height={24}
                    className="mt-1 h-6 w-auto"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)]"
                  onClick={closeMobileMenu}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto px-4 py-6">
                <div className="space-y-3">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.sectionId);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-medium transition-colors ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accentTint)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}

                  <Link
                    href="/dashboard"
                    onClick={closeMobileMenu}
                    data-analytics="cta_get_started_nav"
                  >
                    <Button className="w-full gap-2 py-4 rounded-2xl">
                      <Rocket className="h-4 w-4" />
                      Get started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

