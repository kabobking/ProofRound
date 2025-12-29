'use client';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getMotionClasses(reduced: boolean) {
  if (reduced) {
    return {
      base: 'opacity-0',
      inView: 'opacity-100',
      transition: 'transition-opacity duration-300',
    };
  }
  return {
    base: 'opacity-0 translate-y-2',
    inView: 'opacity-100 translate-y-0',
    transition: 'transition-all duration-500 ease-out',
  };
}

