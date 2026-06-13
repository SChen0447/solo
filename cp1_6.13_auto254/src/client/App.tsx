import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import type { DiaryEntry, EmotionType } from '@/shared/types';
import { EMOTION_MAP } from '@/shared/types';
import { diaryApi } from './services/api';

const Editor = lazy(() => import('./components/Editor'));
const DiaryCard = lazy(() => import('./components/DiaryCard'));

type ToastType = 'success' | 'error';

interface ToastData {
  message: string;
  type: ToastType;
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

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (y === now.getFullYear()) return `${m}-${d}`;
  return `${y}-${m}-${d}`;
}

function getShareUrl(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/share/${id}`;
}

const App: React.FC = () => {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [viewingDiary, setViewingDiary] = useState<DiaryEntry | null>(null);
  const [shareDiary, setShareDiary] = useState<DiaryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2400);
  }, []);

  const loadDiaries = useCallback(async () => {
    const data = await diaryApi.getAll();
    setDiaries(data);
    setLoading(false);
  }, []);

  const handleShareRoute = useCallback(async () => {
    const hash = window.location.hash;
    const match = hash.match(/^#\/share\/(.+)$/);
    if (match) {
      const id = match[1];
      const diary = await diaryApi.getById(id);
      if (diary) {
        setViewingDiary(diary);
      } else {
        showToast('分享的日记不存在', 'error');
      }
    }
  }, [showToast]);

  useEffect(() => {
    loadDiaries();
    handleShareRoute();
    window.addEventListener('hashchange', handleShareRoute);
    return () => window.removeEventListener('hashchange', handleShareRoute);
  }, [loadDiaries, handleShareRoute]);

  const handleCreate = async (content: string, emotion: EmotionType) => {
    const result = await diaryApi.create({ content, emotion });
    if (result) {
      setDiaries((prev) => [result, ...prev]);
      setNewIds((prev) => new Set([...prev, result.id]));
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
      }, 700);
      setShowEditor(false);
      showToast('日记已保存 ✨');
    } else {
      showToast('保存失败，请重试', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const success = await diaryApi.remove(id);
    if (success) {
      setDiaries((prev) => prev.filter((d) => d.id !== id));
      setDeleteConfirm(null);
      if (viewingDiary?.id === id) setViewingDiary(null);
      if (shareDiary?.id === id) setShareDiary(null);
      showToast('日记已删除');
    } else {
      showToast('删除失败', 'error');
    }
  };

  const handleCopyUrl = async (id: string) => {
    const url = getShareUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      showToast('链接已复制到剪贴板 🔗');
    } catch {
      showToast('复制失败', 'error');
    }
  };

  return (
    <div className="app-container">
      <div className="app-bg-particles" />

      <header className="app-header">
        <div>
          <div className="app-header-title">
            <span className="app-header-title-icon">📖</span>
            <div>
              <div>织言·光影日记</div>
              <div className="app-header-subtitle">WEAVE LIGHT DIARY</div>
            </div>
          </div>
        </div>
        <button className="btn-create" onClick={() => setShowEditor(true)}>
          <span>✦</span>
          <span>新建日记</span>
        </button>
      </header>

      <main className="app-main">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✨</div>
            <div>正在加载日记...</div>
          </div>
        ) : diaries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">还没有日记</div>
            <div className="empty-state-desc">点击右上角按钮，创建你的第一篇光影日记</div>
            <button className="btn-create" style={{ margin: '0 auto', display: 'inline-flex' }} onClick={() => setShowEditor(true)}>
              <span>✦</span>
              <span>开始创作</span>
            </button>
          </div>
        ) : (
          <div className="waterfall-container">
            <Suspense fallback={null}>
              {diaries.map((diary) => (
                <DiaryCard
                  key={diary.id}
                  diary={diary}
                  isNew={newIds.has(diary.id)}
                  onView={(d) => setViewingDiary(d)}
                  onShare={(d) => setShareDiary(d)}
                  onDeleteRequest={(id) => setDeleteConfirm({ id })}
                />
              ))}
            </Suspense>
          </div>
        )}
      </main>

      {showEditor && (
        <Suspense fallback={null}>
          <Editor onSave={handleCreate} onClose={() => setShowEditor(false)} />
        </Suspense>
      )}

      {viewingDiary && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewingDiary(null)}>
          <div className="modal-content">
            <div
              className="modal-bg"
              style={{
                background: `linear-gradient(135deg, ${EMOTION_MAP[viewingDiary.emotion].gradient[0]}, ${EMOTION_MAP[viewingDiary.emotion].gradient[1]})`,
              }}
            />
            <button className="modal-close" onClick={() => setViewingDiary(null)} aria-label="关闭">
              ✕
            </button>
            <div className="modal-inner">
              <div className="modal-header">
                <div className="modal-emotion">
                  <span className="modal-emotion-emoji">{EMOTION_MAP[viewingDiary.emotion].emoji}</span>
                  <span className="modal-emotion-name">{EMOTION_MAP[viewingDiary.emotion].name}</span>
                </div>
                <div className="modal-date">{formatDate(viewingDiary.createdAt)}</div>
              </div>
              <div
                className="modal-text"
                style={{ textShadow: EMOTION_MAP[viewingDiary.emotion].textShadow }}
              >
                {viewingDiary.content}
              </div>
              <div className="modal-actions">
                <button className="modal-action-btn" onClick={() => { setViewingDiary(null); setShareDiary(viewingDiary); }}>
                  <span>✈</span>
                  <span>分享</span>
                </button>
                <button
                  className="modal-action-btn"
                  onClick={() => { setViewingDiary(null); setDeleteConfirm({ id: viewingDiary.id }); }}
                  style={{ color: 'rgba(185, 28, 28, 0.7)' }}
                >
                  <span>🗑</span>
                  <span>删除</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {shareDiary && (
        <div className="share-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShareDiary(null)}>
          <div className="share-modal">
            <h3 className="share-title">分享日记</h3>
            <p className="share-desc">复制链接分享给朋友，或保存预览图</p>

            <div className="share-preview">
              <div
                className="share-preview-bg"
                style={{
                  background: `linear-gradient(135deg, ${EMOTION_MAP[shareDiary.emotion].gradient[0]}, ${EMOTION_MAP[shareDiary.emotion].gradient[1]})`,
                }}
              />
              <div className="share-preview-inner">
                <div className="share-preview-emotion">{EMOTION_MAP[shareDiary.emotion].emoji}</div>
                <div className="share-preview-text">{shareDiary.content}</div>
                <div className="share-preview-footer">
                  <span>织言·光影日记</span>
                  <span>{formatDate(shareDiary.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="share-url">
              <input className="share-url-input" readOnly value={getShareUrl(shareDiary.id)} />
              <button className="share-url-btn" onClick={() => handleCopyUrl(shareDiary.id)}>
                复制链接
              </button>
            </div>

            <div className="share-actions">
              <button className="share-close-btn" onClick={() => setShareDiary(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="delete-confirm-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="delete-confirm-box">
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗑️</div>
            <div className="delete-confirm-title">确认删除这篇日记？</div>
            <div className="delete-confirm-desc">删除后将无法恢复，请谨慎操作</div>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-btn cancel" onClick={() => setDeleteConfirm(null)}>
                取消
              </button>
              <button className="delete-confirm-btn confirm" onClick={() => handleDelete(deleteConfirm.id)}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default App;
