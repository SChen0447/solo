import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Star } from '../types';
import { formatTime } from '../utils/constants';
import { shareApi } from '../api';
import { useApp } from '../App';
import { playSaveSound } from '../utils/audio';

interface DiaryCardProps {
  star: Star;
  onClose: () => void;
  onSave: (id: string, data: Partial<Star>) => Promise<Star | null>;
  onDelete: (id: string) => Promise<boolean>;
}

const DiaryCard: React.FC<DiaryCardProps> = ({ star, onClose, onSave, onDelete }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(star.content);
  const [isClosing, setIsClosing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [cardPos, setCardPos] = useState({ x: 0, y: 0, side: 'right' as 'left' | 'right' });
  const { showToast } = useApp();

  useEffect(() => {
    const starEl = document.querySelector(`[data-star-id="${star.id}"]`);
    const starRect = {
      left: star.x + star.size / 2 + 20,
      right: window.innerWidth - star.x + star.size / 2 + 20,
      top: star.y - 100,
      bottom: window.innerHeight - star.y - 100,
    };

    const cardWidth = 380;
    const cardHeight = 400;
    const gap = 20;

    let side: 'left' | 'right' = 'right';
    let left = star.x + star.size / 2 + gap;
    let top = Math.max(20, Math.min(window.innerHeight - cardHeight - 20, star.y - cardHeight / 2));

    if (left + cardWidth > window.innerWidth - 20) {
      side = 'left';
      left = star.x - star.size / 2 - cardWidth - gap;
    }

    if (window.innerWidth <= 600) {
      left = 16;
      top = window.innerHeight - cardHeight - 16;
      side = 'right';
    }

    setCardPos({ x: left, y: top, side });
  }, [star]);

  useEffect(() => {
    if (editorRef.current && content) {
      editorRef.current.innerHTML = content;
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const handleSave = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    playSaveSound();
    const result = await onSave(star.id, { content: htmlContent });
    if (result) {
      showToast('保存成功');
    }
  };

  const handleDelete = async () => {
    setIsClosing(true);
    const success = await onDelete(star.id);
    if (success) {
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareApi.createShare(star.id);
      const shareUrl = `${window.location.origin}/share/${result.shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (e: any) {
      showToast(e.error || '分享失败');
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
  };

  const updateToolbarState = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
  };

  const handleBold = () => {
    execCommand('bold');
  };

  const handleItalic = () => {
    execCommand('italic');
  };

  const handleList = () => {
    execCommand('insertUnorderedList');
  };

  const handleContentChange = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    setContent(htmlContent);
  };

  return (
    <div
      className={`diary-card ${cardPos.side} ${isClosing ? 'closing' : ''}`}
      style={{
        left: cardPos.x,
        top: cardPos.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="card-header">
        <span className="card-time">{formatTime(star.createdAt)}</span>
        <button className="card-close" onClick={handleClose}>
          ×
        </button>
      </div>

      <div className="card-toolbar">
        <button
          className={`toolbar-btn ${isBold ? 'active' : ''}`}
          onClick={handleBold}
          title="加粗"
        >
          <strong>B</strong>
        </button>
        <button
          className={`toolbar-btn ${isItalic ? 'active' : ''}`}
          onClick={handleItalic}
          title="斜体"
        >
          <em>I</em>
        </button>
        <button
          className="toolbar-btn"
          onClick={handleList}
          title="列表"
        >
          • 列表
        </button>
      </div>

      <div
        ref={editorRef}
        className="card-editor"
        contentEditable
        data-placeholder="记录此刻的心情..."
        onInput={handleContentChange}
        onKeyUp={updateToolbarState}
        onMouseUp={updateToolbarState}
      />

      <div className="card-actions">
        <button className="card-btn save" onClick={handleSave}>
          保存
        </button>
        <button className="card-btn delete" onClick={handleDelete}>
          删除
        </button>
        <button className="card-btn share" onClick={handleShare}>
          {showCopied ? '已复制' : '分享'}
        </button>
      </div>
    </div>
  );
};

export default DiaryCard;
