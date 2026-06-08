import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { StoryChapterData } from '../data/storyData';

interface StoryChapterProps {
  chapter: StoryChapterData;
  index: number;
  isActive: boolean;
  canAnimate: boolean;
  onAnimationStart: () => void;
  onAnimationEnd: () => void;
  onVisible: (index: number, visible: boolean) => void;
  onLearnMore: (chapter: StoryChapterData) => void;
}

const StoryChapter: React.FC<StoryChapterProps> = ({
  chapter,
  index,
  isActive,
  canAnimate,
  onAnimationStart,
  onAnimationEnd,
  onVisible,
  onLearnMore,
}) => {
  const chapterRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onVisible(index, true);
          if (entry.intersectionRatio >= 0.5 && !hasEntered && canAnimate) {
            setHasEntered(true);
            onAnimationStart();
            if (animationTimeoutRef.current) {
              clearTimeout(animationTimeoutRef.current);
            }
            animationTimeoutRef.current = setTimeout(() => {
              onAnimationEnd();
            }, chapter.animationDuration * 1000 + 500);
          }
          if (!imageLoaded) {
            const img = new Image();
            img.src = chapter.backgroundImage;
            img.onload = () => {
              setImageLoaded(true);
            };
          }
        } else {
          onVisible(index, false);
        }
      });
    },
    [index, hasEntered, canAnimate, chapter.animationDuration, chapter.backgroundImage, onVisible, onAnimationStart, onAnimationEnd, imageLoaded]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: [0, 0.5, 1],
      rootMargin: '0px',
    });
    observerRef.current = observer;

    if (chapterRef.current) {
      observer.observe(chapterRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [handleIntersection]);

  const animationClass = hasEntered ? 'chapter--entered' : '';
  const activeClass = isActive ? 'chapter--active' : 'chapter--inactive';
  const transitionClass = index % 2 === 0 ? 'chapter--diagonal-left' : 'chapter--diagonal-right';

  return (
    <section
      ref={chapterRef}
      className={`story-chapter ${animationClass} ${activeClass} ${transitionClass}`}
      data-index={index}
    >
      <div
        className={`chapter-bg ${imageLoaded ? 'chapter-bg--loaded' : ''}`}
        style={imageLoaded ? { backgroundImage: `url(${chapter.backgroundImage})` } : undefined}
        aria-hidden="true"
      />
      <div className="chapter-overlay" aria-hidden="true" />

      <div className="chapter-content">
        <h2 className="chapter-title">{chapter.title}</h2>
        <div className="chapter-description-wrapper">
          <p className="chapter-description">{chapter.description}</p>
        </div>
        <button
          className="chapter-button"
          onClick={() => onLearnMore(chapter)}
        >
          了解更多
        </button>
      </div>

      <div className="chapter-divider" aria-hidden="true" />
    </section>
  );
};

export default StoryChapter;
