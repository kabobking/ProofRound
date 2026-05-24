'use client';

import { useEffect, useState } from 'react';

export function useScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observerOptions = {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0,
    };

    const observers: IntersectionObserver[] = [];
    const intersectingIds = new Set<string>();

    const updateActiveId = () => {
      for (const id of sectionIds) {
        if (intersectingIds.has(id)) {
          setActiveId(id);
          return;
        }
      }

      setActiveId('');
    };

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              intersectingIds.add(id);
            } else {
              intersectingIds.delete(id);
            }
          });

          updateActiveId();
        },
        observerOptions
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => {
        observer.disconnect();
      });
    };
  }, [sectionIds]);

  return activeId;
}

