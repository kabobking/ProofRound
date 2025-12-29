'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, getMotionClasses } from './motion';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}

export default function AnimatedSection({ children, className = '', stagger = false }: AnimatedSectionProps) {
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
          observer.disconnect();
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

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`${motion.base} ${isInView ? motion.inView : ''} ${motion.transition} ${className}`}
    >
      {stagger && isInView ? (
        <div className="[&>*]:opacity-0 [&>*]:translate-y-2 [&>*]:transition-all [&>*]:duration-500 [&>*]:ease-out [&>*:nth-child(1)]:transition-delay-[0ms] [&>*:nth-child(2)]:transition-delay-[80ms] [&>*:nth-child(3)]:transition-delay-[160ms] [&>*:nth-child(4)]:transition-delay-[240ms] [&>*]:opacity-100 [&>*]:translate-y-0">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

