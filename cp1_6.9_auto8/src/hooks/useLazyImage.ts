import { useEffect, useRef, useState } from 'react';

export function useLazyImage(src: string | undefined) {
  const [loaded, setLoaded] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observer.unobserve(element);
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, loaded: loaded || isIntersecting, setLoaded, src: isIntersecting ? src : undefined };
}
