import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArticleData, TextBlock, ImageBlock, CaptionBlock } from '../types';

interface PreviewProps {
  data: ArticleData;
}

interface ChapterInfo {
  id: string;
  content: string;
}

const Preview: React.FC<PreviewProps> = ({ data }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const rafRef = useRef<number | null>(null);

  const chapters: ChapterInfo[] = data.blocks
    .filter((b) => b.type === 'text' && (b as TextBlock).isChapter)
    .map((b) => ({ id: b.id, content: (b as TextBlock).content }));

  const updateProgress = useCallback(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    const pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
    setProgress(pct);
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      updateProgress();
      rafRef.current = null;
    });
  }, [updateProgress]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    updateProgress();
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll, updateProgress, data.blocks.length]);

  const scrollToChapter = (chapterId: string) => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const target = contentEl.querySelector(`[data-block-id="${chapterId}"]`) as HTMLElement | null;
    if (!target) return;

    const targetTop = target.offsetTop - 20;
    const startTop = contentEl.scrollTop;
    const distance = targetTop - startTop;
    const duration = 400;
    const startTime = performance.now();

    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      contentEl.scrollTop = startTop + distance * easeInOut(progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    setShowNavPanel(false);
  };

  const toggleNavPanel = () => {
    setShowNavPanel((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.chapter-nav-btn') &&
        !target.closest('.chapter-nav-panel')
      ) {
        setShowNavPanel(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const renderBlock = (block: TextBlock | ImageBlock | CaptionBlock) => {
    if (block.type === 'text') {
      return (
        <div
          key={block.id}
          data-block-id={block.id}
          className={`preview-text ${block.isChapter ? 'chapter' : ''}`}
        >
          {block.content}
        </div>
      );
    }
    if (block.type === 'image') {
      if (!block.src) return null;
      return (
        <img
          key={block.id}
          data-block-id={block.id}
          src={block.src}
          alt={block.alt}
          className="preview-image"
        />
      );
    }
    if (block.type === 'caption') {
      return (
        <div
          key={block.id}
          data-block-id={block.id}
          className="preview-caption"
        >
          {block.content}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="preview-panel">
      <div className="phone-mockup">
        <div className="phone-header">
          <h2>{data.title || '无标题文章'}</h2>
        </div>

        <button
          className="chapter-nav-btn"
          onClick={toggleNavPanel}
          title="章节导航"
        >
          ☰
        </button>

        {showNavPanel && (
          <div className="chapter-nav-panel">
            {chapters.length > 0 ? (
              chapters.map((ch) => (
                <button
                  key={ch.id}
                  className="chapter-nav-item"
                  onClick={() => scrollToChapter(ch.id)}
                >
                  {ch.content.slice(0, 30)}{ch.content.length > 30 ? '...' : ''}
                </button>
              ))
            ) : (
              <div className="no-chapters">暂无章节</div>
            )}
          </div>
        )}

        <div className="phone-content" ref={contentRef}>
          {data.blocks.map((block) => renderBlock(block as any))}
          {data.blocks.length === 0 && (
            <div style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
              在左侧添加内容开始编辑
            </div>
          )}
        </div>

        <div className="phone-progress-bar">
          <div className="phone-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default Preview;
