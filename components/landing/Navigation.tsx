'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { FileText, HelpCircle, Home, ShieldCheck, Menu, Rocket, X } from 'lucide-react';
import { useScrollSpy } from './ScrollSpy';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const activeId = useScrollSpy(['packet-contents', 'how-it-works', 'security', 'faq']);

  const navItems = [
    { href: '#packet-contents', label: 'Product', icon: FileText, sectionId: 'packet-contents' },
    { href: '#how-it-works', label: 'How it Works', icon: Rocket, sectionId: 'how-it-works' },
    { href: '#security', label: 'Security', icon: ShieldCheck, sectionId: 'security' },
    { href: '#faq', label: 'FAQ', icon: HelpCircle, sectionId: 'faq' },
  ];

  const isActive = (href: string, sectionId?: string) => {
    if (href === '/') return pathname === '/';
    return sectionId ? activeId === sectionId : false;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-medium text-[var(--text)]">
            <Home className="h-5 w-5" />
            Proofround
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
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md transition-all"
              data-analytics="cta_get_started_nav"
            >
              <Rocket className="h-4 w-4" />
              Get started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-0 flex flex-col bg-[var(--surface)] text-[var(--text)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Menu</p>
                  <p className="mt-1 text-lg font-semibold">Proofround</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)]"
                  onClick={() => setMobileMenuOpen(false)}
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
                        onClick={() => setMobileMenuOpen(false)}
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
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-4 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:opacity-90"
                    onClick={() => setMobileMenuOpen(false)}
                    data-analytics="cta_get_started_nav"
                  >
                    <Rocket className="h-4 w-4" />
                    Get started
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

