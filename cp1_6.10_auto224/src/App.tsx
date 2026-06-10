import React, { useReducer, useEffect, useState, useCallback } from 'react';
import { InspirationCard, AppAction } from './types';
import { reducer, initialState, saveToStorage, loadFromStorage } from './store';
import InputPanel from './components/InputPanel';
import CanvasBoard from './components/CanvasBoard';

type ModalType = 'export' | 'reset' | 'help' | null;

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draggingCard, setDraggingCard] = useState<InspirationCard | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      dispatch({ type: 'HYDRATE', payload: saved });
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      saveToStorage(state);
    }
  }, [state, isHydrated]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleAddCards = useCallback((cards: InspirationCard[]) => {
    dispatch({ type: 'ADD_CARDS', payload: cards });
  }, []);

  const handleDeleteCard = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CARD', payload: id });
  }, []);

  const handleArchiveCard = useCallback((id: string) => {
    dispatch({ type: 'ARCHIVE_CARD', payload: id });
  }, []);

  const handleAddTag = useCallback((cardId: string, tag: string) => {
    dispatch({ type: 'ADD_TAG', payload: { cardId, tag } });
  }, []);

  const handleSelectCard = useCallback((cardId: string | null) => {
    dispatch({ type: 'SELECT_CARD', payload: cardId });
  }, []);

  const handlePlaceOnCanvas = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'PLACE_ON_CANVAS', payload: { id, x, y } });
  }, []);

  const handleUpdateCanvasPosition = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'UPDATE_CANVAS_POSITION', payload: { id, x, y } });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, card: InspirationCard) => {
    setDraggingCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setActiveModal(null);
  }, []);

  const exportToMarkdown = useCallback(() => {
    const nonArchivedCards = state.cards.filter(c => !c.archived);
    const canvasCards = nonArchivedCards.filter(c => c.placedOnCanvas);
    const streamCards = nonArchivedCards.filter(c => !c.placedOnCanvas);

    let md = '# 灵感速写\n\n';
    md += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

    if (canvasCards.length > 0) {
      md += '## 画布大纲\n\n';
      canvasCards
        .sort((a, b) => (a.y || 0) - (b.y || 0))
        .forEach(card => {
          md += `### ${card.keyword}\n\n`;
          md += `> _${card.phrase}_\n\n`;
          if (card.tags.length > 0) {
            md += `**标签**: ${card.tags.map(t => `\`${t}\``).join(' ')}\n\n`;
          }
        });
    }

    if (streamCards.length > 0) {
      md += '## 待整理卡片\n\n';
      streamCards.forEach(card => {
        md += `- **${card.keyword}**: _${card.phrase}_`;
        if (card.tags.length > 0) {
          md += ` ${card.tags.map(t => `\`${t}\``).join(' ')}`;
        }
        md += '\n';
      });
    }

    downloadFile(md, '灵感速写.md', 'text/markdown');
    setActiveModal(null);
  }, [state.cards]);

  const exportToJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      cards: state.cards.filter(c => !c.archived).map(c => ({
        keyword: c.keyword,
        phrase: c.phrase,
        emotion: c.emotion,
        tags: c.tags,
        position: c.placedOnCanvas ? { x: c.x, y: c.y } : null,
        rotation: c.rotation,
        createdAt: new Date(c.createdAt).toISOString(),
      })),
    };
    downloadFile(JSON.stringify(data, null, 2), '灵感速写.json', 'application/json');
    setActiveModal(null);
  }, [state.cards]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <nav
        style={{
          height: 56,
          minHeight: 56,
          background: '#2e2b26',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e0d5c1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0d5c1', letterSpacing: 1 }}>
            灵感速写
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {state.deleteCount > 0 && (
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" opacity={0.7}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#c0392b',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {state.deleteCount}
              </span>
            </div>
          )}

          <button onClick={() => setActiveModal('export')} style={navButtonStyle()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {!isMobile && <span>导出</span>}
          </button>

          <button onClick={() => setActiveModal('reset')} style={navButtonStyle()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {!isMobile && <span>重置</span>}
          </button>

          <button onClick={() => setActiveModal('help')} style={navButtonStyle()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {!isMobile && <span>帮助</span>}
          </button>
        </div>
      </nav>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: isMobile ? '100%' : '40%',
            height: isMobile ? '45%' : '100%',
            minWidth: isMobile ? 'auto' : 320,
            minHeight: isMobile ? 300 : 'auto',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <InputPanel
            cards={state.cards}
            onAddCards={handleAddCards}
            onDeleteCard={handleDeleteCard}
            onArchiveCard={handleArchiveCard}
            onAddTag={handleAddTag}
            onDragStart={handleDragStart}
            onSelectCard={handleSelectCard}
            selectedCardId={state.selectedCardId}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <CanvasBoard
            cards={state.cards}
            onDeleteCard={handleDeleteCard}
            onArchiveCard={handleArchiveCard}
            onAddTag={handleAddTag}
            onPlaceOnCanvas={handlePlaceOnCanvas}
            onUpdateCanvasPosition={handleUpdateCanvasPosition}
            selectedCardId={state.selectedCardId}
            onSelectCard={handleSelectCard}
            draggingCardFromPanel={draggingCard}
          />
        </div>
      </div>

      {activeModal && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          {activeModal === 'export' && (
            <ExportModal onClose={() => setActiveModal(null)} onMarkdown={exportToMarkdown} onJSON={exportToJSON} />
          )}
          {activeModal === 'reset' && (
            <ResetConfirmModal onClose={() => setActiveModal(null)} onConfirm={handleReset} />
          )}
          {activeModal === 'help' && (
            <HelpModal onClose={() => setActiveModal(null)} />
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

function navButtonStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#e0d5c1',
    background: 'transparent',
    border: '1px solid rgba(224,213,193,0.2)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  };
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

const ModalOverlay: React.FC<ModalOverlayProps> = ({ children, onClose }) => {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(46,43,38,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'modalFadeIn 0.2s ease',
        padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

interface ExportModalProps {
  onClose: () => void;
  onMarkdown: () => void;
  onJSON: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onMarkdown, onJSON }) => {
  return (
    <div
      style={{
        background: '#f9f6ee',
        borderRadius: 16,
        padding: 28,
        minWidth: 320,
        maxWidth: '90vw',
        animation: 'modalFadeIn 0.25s ease',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4a3d2b', marginBottom: 8 }}>导出灵感</h3>
      <p style={{ fontSize: 13, color: '#8a7a62', marginBottom: 20 }}>选择你要导出的格式</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={onMarkdown} style={exportButtonStyle('#4a3d2b', '#f5a623')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="13" y2="17" />
          </svg>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Markdown</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>适合笔记、文档整理</div>
          </div>
        </button>
        <button onClick={onJSON} style={exportButtonStyle('#4a3d2b', '#7ec8e3')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>JSON</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>适合数据备份、二次开发</div>
          </div>
        </button>
      </div>
    </div>
  );
};

function exportButtonStyle(color: string, accent: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    background: '#fffdf8',
    border: `2px solid ${accent}40`,
    borderRadius: 12,
    cursor: 'pointer',
    color,
    transition: 'all 0.25s ease',
    fontFamily: 'inherit',
    textAlign: 'left',
  };
}

interface ResetConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ onClose, onConfirm }) => {
  return (
    <div
      style={{
        background: '#f9f6ee',
        borderRadius: 16,
        padding: 28,
        minWidth: 320,
        maxWidth: '90vw',
        animation: 'modalFadeIn 0.25s ease',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 20,
          background: '#c0392b20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4a3d2b' }}>确认清空？</h3>
      </div>
      <p style={{ fontSize: 13, color: '#8a7a62', marginBottom: 24, lineHeight: 1.6 }}>
        此操作将删除所有灵感卡片，包括画布上的内容，且无法撤销。
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 500,
          color: '#8a7a62',
          background: 'transparent',
          border: '1px solid #e0d5c1',
          borderRadius: 10,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
        }}>
          取消
        </button>
        <button onClick={onConfirm} style={{
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: '#c0392b',
          border: 'none',
          borderRadius: 10,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
        }}>
          确认清空
        </button>
      </div>
    </div>
  );
};

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = () => {
  return (
    <div
      style={{
        background: '#f9f6ee',
        borderRadius: 16,
        padding: 28,
        maxWidth: 420,
        width: '90vw',
        animation: 'modalFadeIn 0.25s ease',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4a3d2b', marginBottom: 16 }}>使用说明</h3>
      <div style={{ fontSize: 13, color: '#4a3d2b', lineHeight: 1.8 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <span style={{ color: '#c9a96e', fontWeight: 700, minWidth: 20 }}>1</span>
          <span>在左侧输入框写下你的灵感碎片，可以是词语、句子或段落。</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <span style={{ color: '#c9a96e', fontWeight: 700, minWidth: 20 }}>2</span>
          <span>点击「生成卡片」或按 <code style={{ background: '#e0d5c1', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>Ctrl+Enter</code> 自动提取灵感卡片。</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <span style={{ color: '#c9a96e', fontWeight: 700, minWidth: 20 }}>3</span>
          <span>将卡片从左侧拖拽到右侧画布进行排列，在画布上可自由调整位置。</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <span style={{ color: '#c9a96e', fontWeight: 700, minWidth: 20 }}>4</span>
          <span>卡片底部图标：<strong style={{ color: '#8a7a62' }}>标签</strong>、<strong style={{ color: '#8a7a62' }}>归档</strong>、<strong style={{ color: '#a06358' }}>删除</strong>。</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: '#c9a96e', fontWeight: 700, minWidth: 20 }}>5</span>
          <span>完成后点击顶部「导出」可保存为 Markdown 或 JSON 格式。</span>
        </div>
      </div>
      <div style={{ marginTop: 20, padding: '12px 14px', background: '#fffdf8', borderRadius: 10, fontSize: 12, color: '#8a7a62', lineHeight: 1.6 }}>
        💡 <strong>色块含义</strong>：
        <span style={{ color: '#f5a623', fontWeight: 600 }}>橙色</span>积极 ·
        <span style={{ color: '#7ec8e3', fontWeight: 600 }}>蓝色</span>中性 ·
        <span style={{ color: '#d0021b', fontWeight: 600 }}>红色</span>消极
      </div>
    </div>
  );
};

export default App;
