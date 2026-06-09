import { useState, useEffect, useRef, TouchEvent } from 'react';
import type { Bottle } from '../App';

interface BottleCardProps {
  bottle: Bottle;
  onSeal?: (tags: string[]) => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  onClose?: () => void;
  isReadOnly?: boolean;
  isFading?: boolean;
}

const PRESET_TAGS = [
  '海盐', '檀木', '青梅', '雨林', '焦糖', '硝烟', '薄荷', '玫瑰',
  '雪松', '茉莉', '咖啡', '柠檬', '麝香', '琥珀', '薰衣草',
  '雨水', '海水', '香草', '竹子', '橘子'
];

function BottleCard({ bottle, onSeal, onSwipe, onClose, isReadOnly = false, isFading = false }: BottleCardProps) {
  const [isOpened, setIsOpened] = useState(isReadOnly);
  const [selectedTags, setSelectedTags] = useState<string[]>(bottle.userTags || []);
  const [isSealing, setIsSealing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    setIsOpened(isReadOnly);
    setSelectedTags(bottle.userTags || []);
  }, [bottle.id, isReadOnly, bottle.userTags]);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleOpen = () => {
    if (!isOpened) {
      setIsOpened(true);
    }
  };

  const toggleTag = (tag: string) => {
    if (isReadOnly || isSealing) return;
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, tag];
    });
  };

  const handleSeal = () => {
    if (isReadOnly || isSealing) return;
    setIsSealing(true);
    setTimeout(() => {
      onSeal?.(selectedTags);
    }, 100);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (isReadOnly) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (isReadOnly || !onSwipe) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      onSwipe(deltaX > 0 ? 'right' : 'left');
    }
  };

  const allTags = [...new Set([...PRESET_TAGS, ...bottle.tags])];

  return (
    <div
      ref={cardRef}
      className={`bottle-card-wrapper ${isFading ? 'fading-out' : ''} ${isSealing ? 'sealing' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`bottle-card ${isOpened ? 'opened' : ''}`}>
        <div className="bottle-front">
          <div className="bottle-shape">
            <div className="wax-seal" aria-hidden="true">
              <svg viewBox="0 0 100 100" width="80" height="80">
                <circle cx="50" cy="50" r="42" fill="#8B2500" />
                <circle cx="50" cy="50" r="38" fill="#A52A2A" />
                <circle cx="50" cy="50" r="34" fill="#CD5C5C" opacity="0.3" />
                <text x="50" y="58" textAnchor="middle" fill="#FFE4B5" fontSize="24" fontWeight="bold">香</text>
              </svg>
            </div>
            <div className="bottle-origin-label">
              <span className="origin-text">{bottle.origin}</span>
            </div>
            <div className="bottle-neck" />
            <div className="bottle-body">
              <div className="ripple ripple1" />
              <div className="ripple ripple2" />
              <div className="ripple ripple3" />
            </div>
            <div className="bottle-tag-preview">
              {bottle.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="mini-tag">{tag}</span>
              ))}
            </div>
          </div>
          {!isReadOnly && (
            <button className="action-btn open-btn" onClick={handleOpen}>
              开启
            </button>
          )}
          {isReadOnly && onClose && (
            <button className="action-btn open-btn" onClick={onClose}>
              返回
            </button>
          )}
        </div>

        <div className="bottle-back">
          <div className="crack-top" />
          <div className="crack-bottom" />
          
          <div className="back-content">
            <div className="back-header">
              <div className="origin-badge">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#8B6914">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                </svg>
                <span>{bottle.origin}</span>
              </div>
              <div className="timestamp">{formatDate(bottle.timestamp)}</div>
            </div>

            <div className="story-content">
              <p className="story-text">{bottle.content}</p>
            </div>

            <div className="tags-section">
              <div className="original-tags">
                <span className="section-label">原瓶标签：</span>
                {bottle.tags.map((tag, i) => (
                  <span key={`orig-${i}`} className="scent-tag original">{tag}</span>
                ))}
              </div>
              {(isReadOnly || isOpened) && !isSealing && (
                <div className="user-tags-section">
                  <span className="section-label">
                    {isReadOnly ? '我的印记：' : `添加你的气味印记 (${selectedTags.length}/3)：`}
                  </span>
                  <div className="tag-selector">
                    {allTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const isOriginal = bottle.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          className={`scent-tag user ${isSelected ? 'selected' : ''} ${isOriginal ? 'is-original' : ''} ${isReadOnly ? 'readonly' : ''}`}
                          onClick={() => toggleTag(tag)}
                          disabled={isReadOnly || (!isSelected && selectedTags.length >= 3)}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {!isReadOnly && isOpened && !isSealing && (
              <button className="action-btn seal-btn" onClick={handleSeal}>
                封瓶
              </button>
            )}
            {isReadOnly && onClose && (
              <button className="action-btn seal-btn" onClick={onClose}>
                关闭
              </button>
            )}
          </div>

          {isSealing && (
            <div className="particles">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className={`particle particle-${i}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BottleCard;
