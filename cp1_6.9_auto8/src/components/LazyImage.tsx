import { useLazyImage } from '../hooks/useLazyImage';

interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export default function LazyImage({ src, alt, className }: LazyImageProps) {
  const { ref, loaded, setLoaded } = useLazyImage(src);

  return (
    <div ref={ref} className={`lazy-image-wrapper ${className || ''}`}>
      {!loaded && <div className="image-placeholder">🍽️</div>}
      {loaded && src && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${loaded ? 'loaded' : ''}`}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
