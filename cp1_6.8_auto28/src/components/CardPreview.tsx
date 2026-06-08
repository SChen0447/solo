import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CardData } from '../types/card';
import { DecorationElement } from './DecorationElement';
import { playNoteSequence, resumeAudioContext } from '../utils/audio';
import confetti from 'canvas-confetti';

interface CardPreviewProps {
  cardData: CardData;
  autoPlay?: boolean;
  onAnimationComplete?: () => void;
}

type AnimationPhase = 'idle' | 'opening' | 'decorations' | 'music' | 'confetti' | 'complete';

export const CardPreview: React.FC<CardPreviewProps> = ({
  cardData,
  autoPlay = false,
  onAnimationComplete,
}) => {
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const [visibleDecorations, setVisibleDecorations] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const previewRef = useRef<HTMLDivElement>(null);

  const triggerConfetti = useCallback(() => {
    if (!previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();

    confetti({
      particleCount: 80,
      spread: 60,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#AA96DA', '#F38181'],
      ticks: 200,
      gravity: 0.8,
      scalar: 0.8,
    });

    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 80,
        angle: 60,
        origin: { x: 0, y: 0.5 },
        colors: ['#FF6B9D', '#FFD93D', '#6BCB77'],
        ticks: 150,
        gravity: 0.9,
      });
    }, 150);

    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 80,
        angle: 120,
        origin: { x: 1, y: 0.5 },
        colors: ['#4D96FF', '#AA96DA', '#F38181'],
        ticks: 150,
        gravity: 0.9,
      });
    }, 250);
  }, []);

  const playFullAnimation = useCallback(async () => {
    resumeAudioContext();

    setAnimationPhase('opening');
    setIsOpen(false);
    setVisibleDecorations(0);
    setCurrentBeat(-1);

    setTimeout(() => {
      setIsOpen(true);
    }, 100);

    await new Promise((resolve) => setTimeout(resolve, 800));
    setAnimationPhase('decorations');

    const decorationCount = cardData.decorations.length;
    for (let i = 0; i < decorationCount; i++) {
      setTimeout(() => {
        setVisibleDecorations(i + 1);
      }, i * 200);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(decorationCount * 200, 200))
    );

    setAnimationPhase('music');

    await playNoteSequence(cardData.noteSequence.notes, cardData.noteSequence.tempo, (beat) => {
      setCurrentBeat(beat);
    });

    setAnimationPhase('confetti');
    triggerConfetti();

    setTimeout(() => {
      setAnimationPhase('complete');
      onAnimationComplete?.();
    }, 1000);
  }, [cardData, triggerConfetti, onAnimationComplete]);

  const resetAnimation = useCallback(() => {
    setAnimationPhase('idle');
    setIsOpen(false);
    setVisibleDecorations(0);
    setCurrentBeat(-1);
  }, []);

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        playFullAnimation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, playFullAnimation]);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (cardData.backgroundGradient) {
      return {
        background: `linear-gradient(${cardData.backgroundGradient.direction}, ${cardData.backgroundGradient.start}, ${cardData.backgroundGradient.end})`,
      };
    }
    return { backgroundColor: cardData.backgroundColor };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>👁️ 预览</h4>
        <div style={styles.controls}>
          <button onClick={playFullAnimation} style={styles.playBtn}>
            ▶ 播放动画
          </button>
          <button onClick={resetAnimation} style={styles.resetBtn}>
            重置
          </button>
        </div>
      </div>

      <div ref={previewRef} style={styles.previewWrapper}>
        <div
          style={{
            ...styles.card,
            ...getBackgroundStyle(),
            transform: isOpen ? 'scaleX(1) scaleY(1)' : 'scaleX(0.3) scaleY(0.1)',
            opacity: isOpen ? 1 : 0.7,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
          }}
        >
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

          {cardData.textElements.map((text) => (
            <div
              key={text.id}
              style={{
                position: 'absolute',
                left: `${text.x}%`,
                top: `${text.y}%`,
                transform: 'translate(-50%, -50%)',
                opacity: isOpen ? 1 : 0,
                transition: 'opacity 0.5s ease 0.3s',
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
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {text.content}
              </span>
            </div>
          ))}

          {animationPhase === 'music' && currentBeat >= 0 && (
            <div style={styles.musicIndicator}>
              {['♪', '♫', '♬'][currentBeat % 3]}
            </div>
          )}
        </div>
      </div>

      <div style={styles.statusBar}>
        <span style={styles.statusText}>
          {animationPhase === 'idle' && '点击播放按钮预览动画效果'}
          {animationPhase === 'opening' && '🎁 正在打开贺卡...'}
          {animationPhase === 'decorations' && '✨ 装饰元素出现中...'}
          {animationPhase === 'music' && '🎵 正在播放音乐...'}
          {animationPhase === 'confetti' && '🎉 撒花庆祝！'}
          {animationPhase === 'complete' && '✅ 动画播放完成'}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  playBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#4ECDC4',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  resetBtn: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  previewWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: '12px',
    padding: '20px',
    minHeight: '300px',
  },
  card: {
    position: 'relative',
    width: '240px',
    height: '320px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    transformOrigin: 'center center',
  },
  musicIndicator: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    fontSize: '24px',
    animation: 'bounce 0.5s ease infinite alternate',
  },
  statusBar: {
    padding: '10px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statusText: {
    fontSize: '13px',
    color: '#666',
  },
};
