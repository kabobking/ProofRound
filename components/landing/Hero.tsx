'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/6 blur-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/30 via-transparent to-transparent"></div>
      </div>
      
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Text Content */}
          <div 
            ref={textRef}
            className={`${motion.base} ${textInView ? motion.inView : ''} ${motion.transition}`}
          >
            <h1 className="text-4xl font-medium tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl leading-[1.1]">
              Replace revenue screenshots with a verified Stripe investor link.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-7 text-zinc-600">
              Connect Stripe (read-only) to generate time-stamped, source-verified revenue metrics investors can trust without follow-ups.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                data-analytics="cta_get_started_hero"
              >
                Get started
              </Link>
              <Link
                href="#security"
                className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
              >
                Read security
              </Link>
            </div>
            <p className="mt-8 text-sm text-zinc-500 tracking-wide">
              Read-only access • Time-stamped snapshots • Investor link (no account)
            </p>
          </div>

          {/* Right: Verification Packet Preview */}
          <div 
            ref={cardRef}
            className={`${motion.base} ${cardInView ? motion.inView : ''} ${motion.transition}`}
            style={{ transitionDelay: cardInView ? '150ms' : '0ms' }}
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="mb-6 rounded-t-lg bg-zinc-50/50 border-b border-zinc-200 pb-4 px-2 -mx-2 -mt-2 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-900">Verification Packet</h3>
                    <p className="mt-1 text-xs text-zinc-500">Snapshot — Last 12 months</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">Read-only</span>
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    Computed directly from Stripe events
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 hover:border-zinc-200 hover:bg-zinc-100 transition-all">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">MRR</div>
                  <div className="mt-2.5 text-lg font-medium text-zinc-900">—</div>
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 hover:border-zinc-200 hover:bg-zinc-100 transition-all">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Net Revenue</div>
                  <div className="mt-2.5 text-lg font-medium text-zinc-900">—</div>
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 hover:border-zinc-200 hover:bg-zinc-100 transition-all">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Refund Rate</div>
                  <div className="mt-2.5 text-lg font-medium text-zinc-900">—</div>
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 hover:border-zinc-200 hover:bg-zinc-100 transition-all">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Revenue Churn</div>
                  <div className="mt-2.5 text-lg font-medium text-zinc-900">—</div>
                </div>
              </div>
              <div className="mt-5 border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500"></div>
                  <span className="text-xs text-zinc-600">Audit indicators included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

