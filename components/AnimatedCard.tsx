'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, getMotionClasses } from '@/components/landing/motion';

interface AnimatedCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  asLink?: boolean;
}

export default function AnimatedCard({
  children,
  delay = 0,
  className = '',
  asLink = false,
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
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
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${motion.base} ${isInView ? motion.inView : ''} ${motion.transition} ${className}`}
      style={{ transitionDelay: isInView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
