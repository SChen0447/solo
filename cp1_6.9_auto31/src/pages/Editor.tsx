import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PaperCanvas, { PaperCanvasHandle } from '../components/PaperCanvas';
import StickerPanel from '../components/StickerPanel';
import { Stroke, Sticker, JournalData } from '../types';
import { displayDate, addDays, formatDate } from '../utils/helpers';
import { useAuth, getAuthHeaders } from '../context/AuthContext';
import { useAppToast } from '../App';

const Editor: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const canvasRef = useRef<PaperCanvasHandle>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [readonly, setReadonly] = useState(true);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 900 });

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 60, 900);
      setCanvasSize({ width: w, height: Math.round(w * 1.2) });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const loadJournal = useCallback(async () => {
    if (!date || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/${date}`, {
        headers: getAuthHeaders(user)
      });
      const data: JournalData = await res.json();
      setStrokes(data.strokes || []);
      setStickers(data.stickers || []);
      setReadonly((data.strokes && data.strokes.length > 0) || (data.stickers && data.stickers.length > 0));
    } catch {
      setStrokes([]);
      setStickers([]);
      setReadonly(false);
    }
    setLoading(false);
  }, [date, user]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  useEffect(() => {
    if (!date) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        navigate(`/edit/${addDays(date, -1)}`);
      } else if (e.key === 'ArrowRight') {
        navigate(`/edit/${addDays(date, 1)}`);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [date, navigate]);

  const handleSave = async () => {
    if (!date || !user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/journal/${date}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(user)
        },
        body: JSON.stringify({ strokes, stickers })
      });
      const data = await res.json();
      if (data.success) {
        showToast('保存成功！', 'success');
      } else {
        showToast('保存失败', 'error');
      }
    } catch {
      showToast('保存失败', 'error');
    }
    setSaving(false);
  };

  const handleStickerSelect = (category: string, type: string) => {
    const newSticker: Sticker = {
      id: `sticker-${Date.now()}-${Math.random()}`,
      type,
      category,
      x: canvasSize.width / 2 + (Math.random() - 0.5) * 100,
      y: canvasSize.height / 2 + (Math.random() - 0.5) * 100,
      rotation: (Math.random() - 0.5) * 30,
      scale: 1
    };
    setStickers([...stickers, newSticker]);
    setShowStickerPanel(false);
  };

  if (!date) {
    return <div className="editor-page">无效的日期</div>;
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="nav-btn"
            onClick={() => navigate('/dashboard')}
            title="返回日历"
          >
            ←
          </button>
          <div className="editor-date">
            {displayDate(date)}
          </div>
        </div>
        <div className="editor-actions">
          {readonly ? (
            <button className="btn btn-secondary" onClick={() => setReadonly(false)}>
              ✏️ 切换至编辑
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => canvasRef.current?.undo()} disabled={strokes.length === 0}>
                ↶ 撤销
              </button>
              <button className="btn btn-secondary" onClick={() => {
                if (confirm('确定清空当前页吗？')) {
                  setStrokes([]);
                  setStickers([]);
                  canvasRef.current?.clear();
                }
              }}>
                🗑️ 清空
              </button>
              <button className="btn" onClick={() => setShowStickerPanel(!showStickerPanel)}>
                🏷️ 贴纸
              </button>
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '💾 保存'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 80, color: '#5a4a3a' }}>加载中...</div>
        ) : (
          <div style={{ position: 'relative' }}>
            <PaperCanvas
              ref={canvasRef}
              strokes={strokes}
              stickers={stickers}
              readonly={readonly}
              onStrokesChange={setStrokes}
              onStickersChange={setStickers}
              width={canvasSize.width}
              height={canvasSize.height}
            />
            {showStickerPanel && !readonly && (
              <StickerPanel
                onSelect={handleStickerSelect}
                onClose={() => setShowStickerPanel(false)}
              />
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20, color: '#5a4a3a', opacity: 0.6, fontSize: 13 }}>
        💡 使用键盘 ← → 快速切换前后日期
      </div>
    </div>
  );
};

export default Editor;
