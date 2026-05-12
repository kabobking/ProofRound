'use client';

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, getMotionClasses } from './motion';

interface SectionProps {
  children: ReactNode;
  id?: string;
  className?: string;
  background?: 'white' | 'tinted';
}

export default function Section({ children, id, className = '', background = 'white' }: SectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const reduced = prefersReducedMotion();
  const motion = getMotionClasses(reduced);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '-50px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const bgClass = background === 'tinted' ? 'bg-zinc-50/50' : 'bg-white';

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      className={`border-t border-zinc-200 ${bgClass} py-24 ${motion.base} ${isInView ? motion.inView : ''} ${motion.transition} ${className}`}
    >
      {children}
    </section>
  );
}

