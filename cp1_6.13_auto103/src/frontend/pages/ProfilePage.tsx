import React, { useMemo, useState } from 'react';
import StickerBadge from '../components/StickerBadge';
import StickerBadge from '../components/StickerBadge';
import { useApp } from '../App';
import { CURRENT_USER_ID, createTradePackage } from '../api';
import type { Sticker } from '../types';
import '../styles/profile.scss';

function ProfilePage(): JSX.Element {
  const { user, loading, refreshUser, triggerScoreDelta, showConfetti, updateScore, addStickers } = useApp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string>('');
  void updateScore;
  void addStickers;
  void triggerScoreDelta;

  const maxSelected = 3;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= maxSelected) return prev;
      return [...prev, id];
    });
  };

  const selectedStickers = useMemo(
    () =>
      selectedIds
        .map((id) => user?.unlockedStickers.find((s) => s.id === id)
        .filter((s): s is Sticker => !!s),
    [selectedIds, user?.unlockedStickers]
  );

  const handleCreatePackage = async () => {
    setShowCreator(true);
  };

  const handleConfirmCreate = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const r = await createTradePackage(CURRENT_USER_ID, selectedIds);
      void r;
      setShowConfetti();
      showToast('交换包已发布到市场 🎉');
      setSelectedIds([]);
      await refreshUser();
    } catch (e) {
      showToast('发布失败，请稍后再试');
      console.error(e);
    } finally {
      setSubmitting(false);
      setShowCreator(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreator(false);
    setSelectedIds([]);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const stickers = user?.unlockedStickers ?? [];

  return (
    <div className="profile-page">
      <header className="page-header fade-in-up">
        <div className="page-header__text">
          <p className="breadcrumb">
            首页 / <span>我的贴纸</span>
          </p>
          <h2 className="page-title">
            <span className="title-icon">🏷️</span>
            我的标签收藏
          </h2>
          <p className="page-subtitle">
            已解锁 <strong>{stickers.length}</strong> 张标签 · 可选择最多 <strong>3</strong> 张组成交换包
          </p>
        </div>
        <button
          type="button"
          className="btn-primary header-action"
          onClick={handleCreatePackage}
          disabled={loading || stickers.length === 0}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          创建交换包
        </button>
      </header>

      {selectedIds.length > 0 && (
        <div className="selection-bar fade-in-up" style={{ animationDelay: '0.05s' }}>
        <div className="selection-bar__info">
          已选择 {selectedIds.length} / {maxSelected} 张
          {selectedStickers.map((s) => (
            <span key={s.id} className="selection-bar__sticker">
              <StickerBadge sticker={s} size="sm" />
              <button
                type="button"
                className="chip-remove"
                onClick={() => handleToggleSelect(s.id)}
                aria-label="移除"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          className="btn-primary selection-bar__btn"
          onClick={() => setShowCreator(true)}
        >
          发布到市场
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setSelectedIds([])}
        >
          清空
        </button>
      </div>

      {loading ? (
        <div className="stickers-grid">
          {Array.from({ length: Math.min(8, 12) }).map((_, i) => (
            <div key={i} className="skeleton-sticker fade-in-up" style={{ animationDelay: `${0.04 * i}s` }} />
          ))}
        </div>
      ) : stickers.length === 0 ? (
        <div className="empty-state fade-in-up">
          <div className="empty-state__icon">🎵</div>
          <h3>还没有解锁任何标签</h3>
          <p>前往盲听大厅猜风格解锁专属标签</p>
        </div>
      ) : (
        <div className="stickers-grid">
          {stickers.map((s, i) => (
            <StickerBadge
              key={s.id}
              sticker={s}
              size="md"
              showTooltip
              selected={selectedIds.includes(s.id)}
              onClick={() => handleToggleSelect(s.id)}
              className={`fade-in-up`}
            />
          ))}
          <style>{`
            .stickers-grid > .fade-in-up {
              animation-delay: ${0.04 * 1 + `
            }
          `}</style>
        </div>
      )}

      {showCreator && (
        <div className="modal-backdrop" onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) setShowCreator(false);
        }}>
          <div className="creator-modal">
            <h3>创建交换包</h3>
            <p className="creator-modal__hint">
              已选择 <strong>{selectedIds.length}</strong> 张标签发布到交换市场</p>
            <div className="creator-modal__preview">
              {selectedStickers.length === 0 ? (
                <div className="creator-modal__empty">请在下方网格中选择标签</div>
              ) : (
                selectedStickers.map((s) => (
                  <StickerBadge key={s.id} sticker={s} size="md" />
                ))
              )}
            </div>
            <div className="creator-modal__footer">
              <button type="button" className="btn-ghost" onClick={handleCancelCreate} disabled={submitting}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmCreate}
                disabled={selectedIds.length === 0 || submitting}
              >
                {submitting ? '发布中…' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="app-toast">{toast}</div>}
    </div>
  );
}

export default ProfilePage;
