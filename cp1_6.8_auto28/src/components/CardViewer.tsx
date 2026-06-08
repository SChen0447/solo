import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CardData } from '../types/card';
import { DecorationElement } from './DecorationElement';
import { playNoteSequence, resumeAudioContext } from '../utils/audio';
import confetti from 'canvas-confetti';
import axios from 'axios';

interface CardViewerProps {
  cardId: string;
}

export const CardViewer: React.FC<CardViewerProps> = ({ cardId }) => {
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleDecorations, setVisibleDecorations] = useState<number>(0);
  const [showContent, setShowContent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#AA96DA', '#F38181'],
      ticks: 250,
      gravity: 0.6,
      scalar: 1,
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF6B9D', '#FFD93D', '#FF9800'],
      });
    }, 200);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#4D96FF', '#AA96DA', '#6BCB77'],
      });
    }, 400);
  }, []);

  const playAnimation = useCallback(async () => {
    if (!cardData) return;

    resumeAudioContext();

    setIsOpen(true);

    await new Promise((resolve) => setTimeout(resolve, 800));
    setShowContent(true);

    const decorationCount = cardData.decorations.length;
    for (let i = 0; i < decorationCount; i++) {
      setTimeout(() => {
        setVisibleDecorations(i + 1);
      }, i * 200);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(decorationCount * 200, 400))
    );

    await playNoteSequence(cardData.noteSequence.notes, cardData.noteSequence.tempo);

    setTimeout(() => {
      triggerConfetti();
    }, 200);
  }, [cardData, triggerConfetti]);

  useEffect(() => {
    const loadCard = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/cards/${cardId}`);
        setCardData(response.data);
        setError(null);
      } catch (err) {
        setError('贺卡不存在或已过期');
      } finally {
        setLoading(false);
      }
    };

    loadCard();
  }, [cardId]);

  useEffect(() => {
    if (cardData && !loading) {
      const timer = setTimeout(() => {
        playAnimation();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cardData, loading, playAnimation]);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (!cardData) return {};
    if (cardData.backgroundGradient) {
      return {
        background: `linear-gradient(${cardData.backgroundGradient.direction}, ${cardData.backgroundGradient.start}, ${cardData.backgroundGradient.end})`,
      };
    }
    return { backgroundColor: cardData.backgroundColor };
  };

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.loadingText}>🎁 正在打开贺卡...</div>
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.errorCard}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😢</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#333' }}>{error || '贺卡不存在'}</h2>
          <p style={{ color: '#666', margin: 0 }}>请检查链接是否正确</p>
          <button
            onClick={() => (window.location.href = '/')}
            style={styles.backBtn}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={styles.pageContainer}>
      <div
        style={{
          ...styles.card,
          ...getBackgroundStyle(),
          transform: isOpen ? 'scale(1)' : 'scale(0.1)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {showContent && (
          <>
            {cardData.decorations.map((decoration, index) => (
              <div
                key={decoration.id}
                style={{
                  opacity: index < visibleDecorations ? 1 : 0,
                  transform: index < visibleDecorations ? 'scale(1)' : 'scale(0)',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <DecorationElement decoration={decoration} />
              </div>
            ))}

            {cardData.textElements.map((text, index) => (
              <div
                key={text.id}
                style={{
                  position: 'absolute',
                  left: `${text.x}%`,
                  top: `${text.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: index < visibleDecorations ? 1 : 0,
                  transition: `opacity 0.5s ease ${index * 0.2}s`,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: `${text.fontSize}px`,
                    fontFamily: text.fontFamily,
                    color: text.color,
                    fontWeight: text.bold ? 'bold' : 'normal',
                    fontStyle: text.italic ? 'italic' : 'normal',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {text.content}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>来自贺卡工坊的祝福 💝</p>
        <button
          onClick={() => {
            setIsOpen(false);
            setVisibleDecorations(0);
            setShowContent(false);
            setTimeout(() => playAnimation(), 500);
          }}
          style={styles.replayBtn}
        >
          🔄 再看一次
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #FFE4EC 0%, #E8DAEF 50%, #D4E6F1 100%)',
    padding: '20px',
  },
  card: {
    position: 'relative',
    width: '320px',
    height: '420px',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  loadingText: {
    fontSize: '18px',
    color: '#666',
  },
  errorCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  backBtn: {
    marginTop: '20px',
    padding: '12px 32px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#FF6B9D',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footer: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  footerText: {
    margin: 0,
    fontSize: '14px',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  replayBtn: {
    padding: '10px 24px',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
  },
};
