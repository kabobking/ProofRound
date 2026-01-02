'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, getMotionClasses } from './motion';

export default function Hero() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [headlineInView, setHeadlineInView] = useState(false);
  const [subheadlineInView, setSubheadlineInView] = useState(false);
  const [ctaInView, setCtaInView] = useState(false);
  const [cardInView, setCardInView] = useState(false);
  const reduced = prefersReducedMotion();
  const motion = getMotionClasses(reduced);

  useEffect(() => {
    const headlineEl = headlineRef.current;
    const subheadlineEl = subheadlineRef.current;
    const ctaEl = ctaRef.current;
    const cardEl = cardRef.current;
    if (!headlineEl || !subheadlineEl || !ctaEl || !cardEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === headlineEl && entry.isIntersecting) {
            setHeadlineInView(true);
          }
          if (entry.target === cardEl && entry.isIntersecting) {
            setCardInView(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    observer.observe(headlineEl);
    observer.observe(cardEl);

    return () => observer.disconnect();
  }, []);

  // Trigger subheadline and CTA when headline comes into view
  useEffect(() => {
    if (headlineInView) {
      const timer1 = setTimeout(() => setSubheadlineInView(true), 100);
      const timer2 = setTimeout(() => setCtaInView(true), 200);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [headlineInView]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:px-8 lg:pt-24 lg:pb-32">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/6 blur-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/30 via-transparent to-transparent"></div>
      </div>
      
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Text Content */}
          <div>
            <h1 
              ref={headlineRef}
              className={`text-4xl font-medium tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl leading-[1.1] ${motion.base} ${headlineInView ? motion.inView : ''} ${motion.transition}`}
              style={{ transitionDelay: headlineInView ? '0ms' : '0ms' }}
            >
              Replace revenue screenshots with a verified Stripe investor link.
            </h1>
            <p 
              ref={subheadlineRef}
              className={`mx-auto mt-6 max-w-xl text-lg leading-7 text-zinc-600 ${motion.base} ${subheadlineInView ? motion.inView : ''} ${motion.transition}`}
              style={{ transitionDelay: subheadlineInView ? '0ms' : '0ms' }}
            >
              Connect Stripe (read-only) to generate time-stamped, source-verified revenue metrics investors can trust.
            </p>
            <div 
              ref={ctaRef}
              className={`mt-10 flex flex-col gap-3 sm:flex-row sm:items-center ${motion.base} ${ctaInView ? motion.inView : ''} ${motion.transition}`}
              style={{ transitionDelay: ctaInView ? '0ms' : '0ms' }}
            >
              <Link
                href="/get-started"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                data-analytics="cta_get_started_hero"
              >
                Get started
              </Link>
              <span className="text-xs text-zinc-500">
                Connect Stripe (read-only). No charges. No changes.{' '}
                <Link
                  href="#security"
                  className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2 transition-colors"
                >
                  View security model
                </Link>
              </span>
            </div>
          </div>

          {/* Right: Verification Packet Preview */}
          <div 
            ref={cardRef}
            className={`${motion.base} ${cardInView ? motion.inView : ''} ${motion.transition}`}
            style={{ transitionDelay: cardInView ? '150ms' : '0ms' }}
          >
            <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
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
