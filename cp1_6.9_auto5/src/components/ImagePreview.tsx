import { useState, useEffect, useRef } from 'react';
import type { BakeResult } from '../types';

interface PhotoMeta {
  url: string;
  date: string;
  result: BakeResult;
}

interface Props {
  images: PhotoMeta[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const resultColors: Record<BakeResult, string> = {
  成功: '#6BBF59',
  一般: '#F0C75E',
  失败: '#E07050',
};

export default function ImagePreview({ images, initialIndex, onClose, onIndexChange }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, time: 0 });

  const current = images[currentIndex];

  useEffect(() => {
    setLoading(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    onIndexChange(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1)
        setCurrentIndex(currentIndex + 1);
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [currentIndex, images.length]);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(1, Math.min(3, s + delta)));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale === 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }

  function handleMouseUp() {
    isDragging.current = false;
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, time: Date.now() };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaTime = Date.now() - touchStart.current.time;

    if (Math.abs(deltaX) > 50 && deltaTime < 300) {
      if (deltaX < 0 && currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (deltaX > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  }

  const date = new Date(current.date);

  return (
    <div
      className="preview-overlay"
      onClick={onClose}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button className="preview-close" onClick={onClose}>
        ×
      </button>

      {images.length > 1 && (
        <>
          <button
            className={`preview-nav preview-prev ${currentIndex === 0 ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
            }}
          >
            ‹
          </button>
          <button
            className={`preview-nav preview-next ${currentIndex === images.length - 1 ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
            }}
          >
            ›
          </button>
        </>
      )}

      <div
        className="preview-content"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        {loading && <div className="preview-spinner">加载中...</div>}
        <img
          src={current.url}
          alt="烘焙成品"
          className="preview-image"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            opacity: loading ? 0 : 1,
            cursor: scale > 1 ? 'grab' : 'default',
          }}
          onLoad={() => setLoading(false)}
          draggable={false}
        />
      </div>

      <div className="preview-info">
        <span className="preview-counter">
          {currentIndex + 1} / {images.length}
        </span>
        <span
          className="preview-result"
          style={{
            backgroundColor: resultColors[current.result],
            color: 'white',
          }}
        >
          {current.result}
        </span>
        <span className="preview-date">
          {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日
        </span>
      </div>

      <div className="preview-hint">
        滚轮缩放 · 拖拽移动 · ← → 切换 · ESC 关闭
      </div>
    </div>
  );
}
