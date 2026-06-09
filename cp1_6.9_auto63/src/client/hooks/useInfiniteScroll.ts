import { useEffect, useRef, useState } from 'react';

interface Options {
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll(
  loadMore: () => Promise<void> | void,
  hasMore: boolean,
  options: Options = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const { threshold = 0.1, rootMargin = '100px' } = options;

    observerRef.current = new IntersectionObserver(
      async (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          setIsLoading(true);
          try {
            await loadMore();
          } finally {
            setIsLoading(false);
          }
        }
      },
      { threshold, rootMargin }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, options.threshold, options.rootMargin, isLoading]);

  return { sentinelRef, isLoading };
}
