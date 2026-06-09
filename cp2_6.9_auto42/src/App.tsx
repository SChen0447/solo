import React, { useState, useCallback } from 'react';
import CardEditor from './CardEditor';
import CardPreview from './CardPreview';
import { CardData, ExportProgress } from './types';
import { ICONS } from './icons';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';

const createDefaultCard = (index: number = 0): CardData => ({
  id: uuidv4(),
  name: '新卡牌',
  description: '在这里输入卡牌描述...',
  borderColor: '#000000',
  backgroundColor: '#FFFFFF',
  backgroundGradient: '#F5E6D3',
  gradientCenterX: 50,
  gradientCenterY: 50,
  useGradient: false,
  font: 'Roboto',
  iconId: null,
  iconColor: '#333333',
  iconSize: 32,
  cardNumber: index + 1
});

const App: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([createDefaultCard()]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    current: 0,
    total: 0,
    status: 'idle'
  });

  const currentCard = cards[currentCardIndex];

  const updateCard = useCallback((updates: Partial<CardData>) => {
    setCards(prev => {
      const next = [...prev];
      next[currentCardIndex] = { ...next[currentCardIndex], ...updates };
      return next;
    });
  }, [currentCardIndex]);

  const addNewCard = useCallback(() => {
    if (cards.length >= 12) return;
    setCards(prev => [...prev, createDefaultCard(prev.length)]);
    setCurrentCardIndex(cards.length);
  }, [cards.length]);

  const removeCard = useCallback((index: number) => {
    if (cards.length <= 1) return;
    setCards(prev => prev.filter((_, i) => i !== index));
    if (index <= currentCardIndex) {
      setCurrentCardIndex(prev => Math.max(0, prev - 1));
    }
  }, [cards.length, currentCardIndex]);

  const exportPNG = useCallback(async () => {
    const element = document.getElementById(`card-preview-${currentCard.id}`);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: null,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `card-${currentCard.cardNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  }, [currentCard]);

  const exportPDF = useCallback(async () => {
    setExportProgress({ current: 0, total: cards.length, status: 'processing' });
    try {
      const cardImages: string[] = [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const element = document.getElementById(`card-preview-${card.id}`);
        if (!element) continue;
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#FFFFFF',
          useCORS: true
        });
        cardImages.push(canvas.toDataURL('image/png'));
        setExportProgress({
          current: i + 1,
          total: cards.length,
          status: 'processing'
        });
      }
      const response = await fetch('http://localhost:3001/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardImages })
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.download = 'cards-printable.pdf';
      link.href = URL.createObjectURL(blob);
      link.click();
      setExportProgress({ current: cards.length, total: cards.length, status: 'completed' });
    } catch (err) {
      console.error('PDF export failed:', err);
      setExportProgress(prev => ({ ...prev, status: 'error' }));
    }
  }, [cards]);

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <h1 style={styles.title}>🎴 桌游卡牌设计工具</h1>
        <div style={styles.toolbarActions}>
          <button style={styles.toolbarBtn} onClick={exportPNG}>
            📥 导出PNG
          </button>
          <button style={styles.toolbarBtn} onClick={exportPDF}>
            📄 批量导出PDF
          </button>
        </div>
      </div>

      {exportProgress.status === 'processing' && (
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${(exportProgress.current / exportProgress.total) * 100}%`,
              background: `linear-gradient(90deg, #3B82F6 ${(exportProgress.current / exportProgress.total) * 50}%, #10B981 100%)`
            }}
          />
          <span style={styles.progressText}>
            生成中... {exportProgress.current}/{exportProgress.total}
          </span>
        </div>
      )}

      <div style={styles.cardTabs}>
        {cards.map((card, idx) => (
          <div
            key={card.id}
            style={{
              ...styles.tab,
              ...(idx === currentCardIndex ? styles.tabActive : {})
            }}
            onClick={() => setCurrentCardIndex(idx)}
          >
            <span>卡牌 {card.cardNumber}</span>
            {cards.length > 1 && (
              <button
                style={styles.tabClose}
                onClick={(e) => { e.stopPropagation(); removeCard(idx); }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {cards.length < 12 && (
          <button style={styles.addTabBtn} onClick={addNewCard}>+ 添加</button>
        )}
      </div>

      <div style={styles.mainContent}>
        <div style={styles.previewSection}>
          <CardPreview
            card={currentCard}
            showBack={showBack}
            onToggleBack={() => setShowBack(prev => !prev)}
          />
        </div>
        <div style={styles.editorSection}>
          <CardEditor card={currentCard} onChange={updateCard} />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1E1E2E',
    color: '#E0E0E0'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#2D2D44',
    borderBottom: '1px solid #4A4A6A'
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#FFF8E7'
  },
  toolbarActions: {
    display: 'flex',
    gap: 12
  },
  toolbarBtn: {
    padding: '8px 16px',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    backgroundColor: '#3D3D5C',
    color: '#E0E0E0',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s ease'
  },
  progressBar: {
    position: 'relative',
    height: 24,
    margin: '8px 24px',
    backgroundColor: '#2D2D44',
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid #4A4A6A'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 12,
    color: '#FFF',
    fontWeight: 600
  },
  cardTabs: {
    display: 'flex',
    gap: 8,
    padding: '8px 24px',
    backgroundColor: '#2D2D44',
    borderBottom: '1px solid #4A4A6A',
    overflowX: 'auto'
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    backgroundColor: '#1E1E2E',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    whiteSpace: 'nowrap'
  },
  tabActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED'
  },
  tabClose: {
    width: 18,
    height: 18,
    border: 'none',
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#E0E0E0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    lineHeight: 1,
    padding: 0
  },
  addTabBtn: {
    padding: '6px 12px',
    border: '1px dashed #4A4A6A',
    borderRadius: 6,
    backgroundColor: 'transparent',
    color: '#888',
    cursor: 'pointer',
    fontSize: 13,
    whiteSpace: 'nowrap'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    gap: 0,
    overflow: 'hidden'
  },
  previewSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'auto',
    backgroundColor: '#1E1E2E',
    minHeight: 300
  },
  editorSection: {
    width: 420,
    backgroundColor: '#2D2D44',
    borderLeft: '1px solid #4A4A6A',
    overflowY: 'auto'
  }
};

const responsiveStyle = document.createElement('style');
responsiveStyle.textContent = `
  @media (max-width: 768px) {
    #root > div > div:nth-child(3) {
      flex-direction: column !important;
    }
    #root > div > div:nth-child(3) > div:nth-child(1) {
      min-height: 350px !important;
    }
    #root > div > div:nth-child(3) > div:nth-child(2) {
      width: 100% !important;
      border-left: none !important;
      border-top: 1px solid #4A4A6A !important;
    }
  }
  button:hover {
    background-color: #7C3AED !important;
    transform: translateY(-2px) !important;
    transition: all 0.2s ease !important;
    border-color: #7C3AED !important;
  }
  button:active {
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(responsiveStyle);

export default App;
