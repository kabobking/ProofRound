'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import PacketPreview from '@/components/PacketPreview';
import { prefersReducedMotion, getMotionClasses } from './motion';

export default function Hero() {
  const textRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [textInView, setTextInView] = useState(false);
  const [cardInView, setCardInView] = useState(false);
  const reduced = prefersReducedMotion();
  const motion = getMotionClasses(reduced);

  useEffect(() => {
    const textEl = textRef.current;
    const cardEl = cardRef.current;
    if (!textEl || !cardEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === textEl && entry.isIntersecting) {
            setTextInView(true);
          }
          if (entry.target === cardEl && entry.isIntersecting) {
            setCardInView(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    observer.observe(textEl);
    observer.observe(cardEl);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:px-8 lg:pt-24 lg:pb-32">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[color:var(--accent)]/6 blur-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--accentTint)]/30 via-transparent to-transparent"></div>
      </div>
      
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Text Content */}
          <div 
            ref={textRef}
            className={`${motion.base} ${textInView ? motion.inView : ''} ${motion.transition}`}
          >
            <div className="mb-5 inline-flex items-center rounded-full border border-[var(--accent)]/20 bg-[var(--accentTint)]/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
              Stripe-verified fundraising packets
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl lg:text-6xl leading-[1.08]">
              Replace revenue screenshots with a verified Stripe investor link.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Create time-stamped, read-only Stripe verification packets investors can trust — without exposing raw Stripe data.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-base font-medium text-[var(--accent-foreground)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                data-analytics="cta_get_started_hero"
              >
                Get started
              </Link>
              <Link
                href="#packet-contents"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-base font-medium text-[var(--text)] hover:-translate-y-0.5 hover:bg-[var(--surface2)] hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--text)] focus:ring-offset-2"
              >
                View sample packet
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Read-only Stripe access. No charges. No account changes. Revoke anytime.
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Learn more in the <Link href="/security" className="text-[var(--accent)] hover:underline">Security Model</Link>.
            </p>
          </div>

          {/* Right: Verification Packet Preview */}
          <div 
            ref={cardRef}
            className={`${motion.base} ${cardInView ? motion.inView : ''} ${motion.transition}`}
            style={{ transitionDelay: cardInView ? '150ms' : '0ms' }}
          >
            <PacketPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

