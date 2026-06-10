import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Specimen } from '../types';
import { specimenAPI } from '../utils/api';

const CARD_HEIGHT = 380;
const CARD_WIDTH = 220;
const GAP = 20;

const SpecimenGallery: React.FC = () => {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailSpecimen, setDetailSpecimen] = useState<Specimen | null>(null);
  const [shareLink, setShareLink] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);

  const fetchSpecimens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await specimenAPI.list();
      setSpecimens(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecimens();
  }, [fetchSpecimens]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setViewportHeight(el.clientHeight);
      setContainerWidth(el.clientWidth);
      setScrollTop(el.scrollTop);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const columns = useMemo(() => {
    const cols = Math.max(1, Math.floor((containerWidth + GAP) / (CARD_WIDTH + GAP)));
    return cols;
  }, [containerWidth]);

  const visibleRange = useMemo(() => {
    const buffer = 2;
    const rowsPerCol = Math.ceil(specimens.length / columns);
    const startRow = Math.max(0, Math.floor(scrollTop / (CARD_HEIGHT + GAP)) - buffer);
    const endRow = Math.min(
      rowsPerCol,
      Math.ceil((scrollTop + viewportHeight) / (CARD_HEIGHT + GAP)) + buffer
    );
    return { startRow, endRow };
  }, [scrollTop, viewportHeight, columns, specimens.length]);

  const visibleItems = useMemo(() => {
    const items: { specimen: Specimen; index: number; row: number; col: number }[] = [];
    specimens.forEach((s, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      if (row >= visibleRange.startRow && row <= visibleRange.endRow) {
        items.push({ specimen: s, index, row, col });
      }
    });
    return items;
  }, [specimens, columns, visibleRange]);

  const totalHeight = Math.ceil(specimens.length / columns) * (CARD_HEIGHT + GAP);

  const handleToggleFavorite = useCallback(
    async (id: string, current: boolean) => {
      try {
        const updated = await specimenAPI.updateFavorite(id, !current);
        setSpecimens((prev) => prev.map((s) => (s._id === id ? updated : s)));
      } catch (err) {
        console.error(err);
      }
    },
    []
  );

  const handleShare = useCallback(async (id: string) => {
    try {
      const res = await specimenAPI.getShare(id);
      setShareLink({ id, url: res.shareUrl });
      setCopied(false);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [shareLink]);

  if (loading) {
    return (
      <div>
        <h2 className="section-title">📖 数字标本馆</h2>
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">📖 数字标本馆</h2>
      <p style={{ color: '#666', marginBottom: 24, marginTop: -8 }}>
        收藏你的花语记忆，与他人分享
      </p>

      {specimens.length === 0 ? (
        <div className="empty-state card-paper" style={{ padding: 60 }}>
          <div className="empty-icon">📭</div>
          <div className="empty-text">还没有标本，去花园解锁花朵并制作吧~</div>
        </div>
      ) : (
        <div className="gallery-container" ref={containerRef}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: totalHeight,
            }}
          >
            {visibleItems.map(({ specimen, row, col }) => (
              <div
                key={specimen._id}
                className="specimen-card"
                style={{
                  position: 'absolute',
                  left: col * (CARD_WIDTH + GAP),
                  top: row * (CARD_HEIGHT + GAP),
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  animationDelay: `${(row + col) * 0.05}s`,
                }}
                onClick={() => setDetailSpecimen(specimen)}
              >
                <img
                  src={specimen.imageBase64}
                  alt={specimen.flowerName}
                  className="specimen-img"
                  loading="lazy"
                />
                <div className="specimen-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`action-btn ${specimen.favorite ? 'fav-active' : ''}`}
                    onClick={() => handleToggleFavorite(specimen._id, specimen.favorite)}
                    title={specimen.favorite ? '取消收藏' : '收藏'}
                  >
                    {specimen.favorite ? '❤️' : '🤍'}
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleShare(specimen._id)}
                    title="分享"
                  >
                    🔗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailSpecimen && (
        <div className="specimen-detail" onClick={() => setDetailSpecimen(null)}>
          <img
            src={detailSpecimen.imageBase64}
            alt={detailSpecimen.flowerName}
            className="specimen-detail-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="modal-close"
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              width: 44,
              height: 44,
              fontSize: 22,
              background: 'rgba(255,255,255,0.9)',
            }}
            onClick={() => setDetailSpecimen(null)}
          >
            ✕
          </button>
        </div>
      )}

      {shareLink && (
        <div className="seed-selector" onClick={() => setShareLink(null)}>
          <div className="seed-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShareLink(null)}>
              ✕
            </button>
            <h2 style={{ fontFamily: 'Georgia, serif', marginBottom: 8, textAlign: 'center' }}>
              🔗 分享标本
            </h2>
            <p style={{ textAlign: 'center', color: '#666', fontSize: 14, marginBottom: 16 }}>
              复制链接分享给好友
            </p>
            <div className="share-link">
              <input className="share-input" readOnly value={shareLink.url} />
              <button className="btn btn-primary" onClick={handleCopy}>
                {copied ? '✓ 已复制' : '复制'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecimenGallery;
