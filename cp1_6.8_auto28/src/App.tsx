import React, { useState, useCallback, useEffect } from 'react';
import type { CardData, CardTemplate } from './types/card';
import { templates, getTemplateById } from './data/templates';
import { TemplateLibrary } from './components/TemplateLibrary';
import { CardEditor } from './components/CardEditor';
import { CardPreview } from './components/CardPreview';
import { CardViewer } from './components/CardViewer';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'editor' | 'viewer'>('editor');
  const [viewCardId, setViewCardId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id || null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/card/')) {
      const cardId = path.replace('/card/', '');
      if (cardId) {
        setCurrentView('viewer');
        setViewCardId(cardId);
        return;
      }
    }

    if (templates.length > 0) {
      initTemplate(templates[0]);
    }
  }, []);

  const initTemplate = (template: CardTemplate) => {
    const card: CardData = {
      templateId: template.id,
      backgroundColor: template.backgroundColor,
      backgroundGradient: template.backgroundGradient,
      decorations: cloneDeep(template.decorations).map((d) => ({ ...d, id: uuidv4() })),
      textElements: cloneDeep(template.textElements).map((t) => ({ ...t, id: uuidv4() })),
      noteSequence: cloneDeep(template.noteSequence),
    };
    setCardData(card);
    setSelectedTemplateId(template.id);
    setShareUrl(null);
  };

  const handleSelectTemplate = useCallback((template: CardTemplate) => {
    initTemplate(template);
  }, []);

  const handleCardChange = useCallback((data: CardData) => {
    setCardData(data);
    setShareUrl(null);
  }, []);

  const handleSave = async () => {
    if (!cardData) return;

    try {
      setSaving(true);
      const response = await axios.post('/api/cards', cardData);
      const shareUrl = `${window.location.origin}/card/${response.data.id}`;
      setShareUrl(shareUrl);
      setShowShareModal(true);
    } catch (error) {
      console.error('Failed to save card:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('链接已复制到剪贴板！');
      } catch {
        alert('复制失败，请手动复制');
      }
    }
  };

  if (currentView === 'viewer' && viewCardId) {
    return <CardViewer cardId={viewCardId} />;
  }

  if (!cardData) {
    return (
      <div style={styles.loading}>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
      <div style={styles.logo}>
        <span style={styles.logoIcon}>💌</span>
        <h1 style={styles.logoText}>贺卡工坊</h1>
      </div>
      <div style={styles.headerActions}>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? '保存中...' : '💾 保存贺卡'}
        </button>
      </div>
    </header>

    <main style={styles.main}>
      <aside style={styles.sidebarLeft}>
        <div style={styles.glassCard}>
          <TemplateLibrary
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleSelectTemplate}
          />
        </div>
      </aside>

      <section style={styles.editorSection}>
        <CardEditor cardData={cardData} onChange={handleCardChange} />
      </section>

      <aside style={styles.sidebarRight}>
        <div style={styles.glassCard}>
          <CardPreview cardData={cardData} />
        </div>
      </aside>
    </main>

    {showShareModal && (
      <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.modalTitle}>🎉 贺卡保存成功！</h3>
          <p style={styles.modalText}>
            复制下方链接分享给你的朋友吧~
          </p>
          <div style={styles.shareUrlContainer}>
            <input
              type="text"
              value={shareUrl || ''}
              readOnly
              style={styles.shareUrlInput}
            />
            <button onClick={copyShareLink} style={styles.copyBtn}>
              📋 复制
            </button>
          </div>
          <div style={styles.modalActions}>
            <button
              onClick={() => setShowShareModal(false)}
              style={styles.closeBtn}
            >
              继续编辑
            </button>
            <button
              onClick={() => {
                if (shareUrl) {
                  window.open(shareUrl, '_blank');
                }
              }}
              style={styles.previewBtn}
            >
              👁️ 预览贺卡
            </button>
          </div>
        </div>
      </div>
    )}

    <footer style={styles.footer}>
      <p style={styles.footerText}>用 ❤️ 制作 · 贺卡工坊</p>
    </footer>
  </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #FFE4EC 0%, #F8E1EC 50%, #E8DAEF 100%)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 600,
    color: '#333',
    fontFamily: 'serif',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  saveBtn: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#FF6B9D',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(255, 107, 157, 0.3)',
  },
  main: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '240px 1fr 300px',
    gap: '20px',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  sidebarLeft: {
    minHeight: 0,
  },
  sidebarRight: {
    minHeight: 0,
  },
  editorSection: {
    minHeight: 0,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    padding: '16px',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #FFE4EC, #E8DAEF)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  modalTitle: {
    margin: '0 0 12px 0',
    fontSize: '22px',
    color: '#333',
    textAlign: 'center',
  },
  modalText: {
    margin: '0 0 20px 0',
    color: '#666',
    textAlign: 'center',
    fontSize: '14px',
  },
  shareUrlContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  shareUrlInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '12px',
    backgroundColor: '#f9f9f9',
    color: '#555',
  },
  copyBtn: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#4ECDC4',
    color: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  previewBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#FF6B9D',
    color: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footer: {
    padding: '16px',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  footerText: {
    margin: 0,
    fontSize: '12px',
    color: 'rgba(0, 0, 0, 0.5)',
  },
};

export default App;
