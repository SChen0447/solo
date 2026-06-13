import { useEffect, useRef, useMemo } from 'react';
import { Photo } from './types';

interface TimelineViewProps {
  photos: Photo[];
  filteredPhotoIds: Set<string>;
  onCardClick: (photoId: string) => void;
}

const generateRiverPath = (width: number, height: number, points: number): string => {
  const segmentHeight = height / (points - 1);
  let path = `M ${width / 2} 0`;

  for (let i = 1; i < points; i++) {
    const y = i * segmentHeight;
    const wave = Math.sin(i * 0.8) * (width * 0.25);
    const x = width / 2 + wave;
    path += ` Q ${width / 2 + wave * 0.5} ${y - segmentHeight / 2}, ${x} ${y}`;
  }

  return path;
};

function TimelineView({ photos, filteredPhotoIds, onCardClick }: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);

  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [photos]);

  const hasActiveFilter = filteredPhotoIds.size > 0 && filteredPhotoIds.size < photos.length;

  const riverPath = useMemo(() => {
    const height = Math.max(1000, sortedPhotos.length * 250 + 200);
    return generateRiverPath(400, height, Math.max(10, sortedPhotos.length * 2));
  }, [sortedPhotos.length]);

  const riverHeight = useMemo(() => {
    return Math.max(1000, sortedPhotos.length * 250 + 200);
  }, [sortedPhotos.length]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    cardRefs.current.forEach((element) => {
      if (element && observerRef.current) {
        element.classList.remove('visible');
        observerRef.current.observe(element);
      }
    });
  }, [sortedPhotos]);

  const setCardRef = (photoId: string, element: HTMLDivElement | null) => {
    if (element) {
      cardRefs.current.set(photoId, element);
    } else {
      cardRefs.current.delete(photoId);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getCardPositionClass = (index: number): string => {
    return index % 2 === 0 ? 'left' : 'right';
  };

  const getFilterClass = (photoId: string): string => {
    if (!hasActiveFilter) return '';
    return filteredPhotoIds.has(photoId) ? 'card-matched' : 'card-unmatched';
  };

  const handleCardClick = (photoId: string) => {
    onCardClick(photoId);
  };

  return (
    <div className="timeline-container" ref={containerRef}>
      <svg
        ref={svgRef}
        className="river-svg"
        width="100%"
        height={riverHeight}
        viewBox={`0 0 400 ${riverHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="waterRipple">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01"
              numOctaves="2"
              result="noise"
              seed="1"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2"
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                values="0;2;0"
                dur="4s"
                repeatCount="indefinite"
              />
            </feDisplacementMap>
          </filter>
          <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(135, 206, 250, 0.3)" />
            <stop offset="50%" stopColor="rgba(135, 206, 250, 0.6)" />
            <stop offset="100%" stopColor="rgba(135, 206, 250, 0.3)" />
          </linearGradient>
        </defs>

        <path
          d={riverPath}
          fill="none"
          stroke="url(#riverGradient)"
          strokeWidth="3"
          filter="url(#waterRipple)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="timeline-cards">
        {sortedPhotos.map((photo, index) => (
          <div
            key={photo.id}
            ref={(el) => setCardRef(photo.id, el)}
            className={`timeline-card ${getCardPositionClass(index)} ${getFilterClass(photo.id)}`}
            style={{
              transitionDelay: `${index * 0.05}s`
            }}
            onClick={() => handleCardClick(photo.id)}
          >
            <img
              src={photo.url}
              alt={photo.diary || '旅行照片'}
              className="card-image"
              loading="lazy"
            />
            <div className="card-content">
              <div className="card-date">{formatDate(photo.date)}</div>
              <div className="card-diary">{photo.diary || '点击查看详情'}</div>
              {photo.tags.length > 0 && (
                <div className="card-tags">
                  {photo.tags.map((tag) => (
                    <span key={tag} className="card-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sortedPhotos.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text)',
              opacity: 0.6
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
            <div style={{ fontSize: '16px' }}>还没有旅行记忆</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              点击右上角"上传照片"开始记录你的旅程
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelineView;
