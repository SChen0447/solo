import React, { useState, useEffect, useRef, useCallback } from 'react';
import StoryChapter from './components/StoryChapter';
import Navigation from './components/Navigation';
import ProgressBar from './components/ProgressBar';
import Modal from './components/Modal';
import { storyChapters, type StoryChapterData } from './data/storyData';

const App: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalChapter, setModalChapter] = useState<StoryChapterData | null>(null);
  const [canAnimate, setCanAnimate] = useState(true);
  const [visibleChapters, setVisibleChapters] = useState<Set<number>>(new Set());

  const scrollRafRef = useRef<number | null>(null);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
      setScrollProgress(progress);
      lastScrollY.current = scrollTop;
      scrollRafRef.current = null;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [handleScroll]);

  const handleChapterVisible = useCallback((index: number, visible: boolean) => {
    setVisibleChapters((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (visibleChapters.size === 0) return;

    const visibleArray = Array.from(visibleChapters).sort((a, b) => a - b);
    let maxVisible = visibleArray[0];
    let maxRatio = 0;

    visibleArray.forEach((idx) => {
      const el = document.querySelector(`.story-chapter[data-index="${idx}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        const ratio = visibleHeight / rect.height;
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxVisible = idx;
        }
      }
    });

    if (maxRatio >= 0.3 && maxVisible !== activeIndex) {
      setActiveIndex(maxVisible);
    }
  }, [visibleChapters, activeIndex]);

  const handleAnimationStart = useCallback(() => {
    setCanAnimate(false);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    setCanAnimate(true);
  }, []);

  const handleNavigate = useCallback((index: number) => {
    const chapter = document.querySelector(`.story-chapter[data-index="${index}"]`);
    if (chapter) {
      chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleLearnMore = useCallback((chapter: StoryChapterData) => {
    setModalChapter(chapter);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const bgProgress = scrollProgress / 100;
  const bgColor1 = interpolateColor('#1a1a2e', '#2d1b4e', bgProgress);
  const bgColor2 = interpolateColor('#16213e', '#1a0a2e', bgProgress);

  return (
    <div
      className="app-container"
      style={{
        background: `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%)`,
      }}
    >
      <ProgressBar progress={scrollProgress} />
      <Navigation
        chaptersCount={storyChapters.length}
        activeIndex={activeIndex}
        onNavigate={handleNavigate}
      />

      <main className="story-main">
        {storyChapters.map((chapter, index) => (
          <StoryChapter
            key={chapter.id}
            chapter={chapter}
            index={index}
            isActive={index === activeIndex}
            canAnimate={canAnimate}
            onAnimationStart={handleAnimationStart}
            onAnimationEnd={handleAnimationEnd}
            onVisible={handleChapterVisible}
            onLearnMore={handleLearnMore}
          />
        ))}
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={modalChapter?.title || ''}
        content={modalChapter?.extendedContent || ''}
        image={modalChapter?.extendedImage || ''}
      />
    </div>
  );
};

function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex = (x: string) => parseInt(x, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default App;
