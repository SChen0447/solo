import React, { useRef, useState, useCallback } from 'react';
import type { DiaryEntry } from '@/shared/types';
import { EMOTION_MAP } from '@/shared/types';

interface DiaryCardProps {
  diary: DiaryEntry;
  isNew: boolean;
  onView: (diary: DiaryEntry) => void;
  onShare: (diary: DiaryEntry) => void;
  onDeleteRequest: (id: string) => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

const PaperPlaneIcon: React.FC = () => (
  <svg
    className="share-icon"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const DiaryCard: React.FC<DiaryCardProps> = ({
  diary,
  isNew,
  onView,
  onShare,
  onDeleteRequest,
}) => {
  const config = EMOTION_MAP[diary.emotion];
  const [shaking, setShaking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const gradient = `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`;

  const handleLongPressStart = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setShaking(true);
      setTimeout(() => {
        setShaking(false);
        setDeleting(true);
        setTimeout(() => {
          setDeleting(false);
          onDeleteRequest(diary.id);
        }, 500);
      }, 300);
    }, 600);
  }, [diary.id, onDeleteRequest]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onView(diary);
  }, [diary, onView]);

  const classNames = ['diary-card'];
  if (shaking) classNames.push('shaking');
  if (deleting) classNames.push('deleting');
  if (isNew) classNames.push('card-new');

  return (
    <div
      className={classNames.join(' ')}
      onClick={handleClick}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPressStart();
        setTimeout(() => handleLongPressEnd(), 700);
      }}
    >
      <div className="diary-card-bg" style={{ background: gradient }} />
      <div className="diary-card-inner">
        <div className="diary-card-actions">
          <button
            className="diary-card-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onShare(diary);
            }}
            aria-label="分享"
            title="分享"
          >
            <PaperPlaneIcon />
          </button>
        </div>
        <div className="diary-card-header">
          <div className="diary-card-emotion">
            <span className="diary-card-emoji">{config.emoji}</span>
            <span className="diary-card-emotion-name">{config.name}</span>
          </div>
          <div className="diary-card-date">{formatDate(diary.createdAt)}</div>
        </div>
        <div
          className="diary-card-content"
          style={{ textShadow: config.textShadow }}
        >
          {diary.content}
        </div>
      </div>
    </div>
  );
};

export default DiaryCard;
