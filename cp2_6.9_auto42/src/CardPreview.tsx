import React, { useMemo } from 'react';
import { CardData } from './types';
import { ICONS } from './icons';

interface CardPreviewProps {
  card: CardData;
  showBack: boolean;
  onToggleBack: () => void;
}

const CARD_WIDTH = 350;
const CARD_HEIGHT = 250;

const CardPreview: React.FC<CardPreviewProps> = ({ card, showBack, onToggleBack }) => {
  const icon = useMemo(() => ICONS.find(i => i.id === card.iconId) || null, [card.iconId]);

  const getContrastColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1A1A2E' : '#FFFFFF';
  };

  const textColor = useMemo(() => {
    if (card.useGradient) {
      const r1 = parseInt(card.backgroundColor.slice(1, 3), 16);
      const g1 = parseInt(card.backgroundColor.slice(3, 5), 16);
      const b1 = parseInt(card.backgroundColor.slice(5, 7), 16);
      const r2 = parseInt(card.backgroundGradient.slice(1, 3), 16);
      const g2 = parseInt(card.backgroundGradient.slice(3, 5), 16);
      const b2 = parseInt(card.backgroundGradient.slice(5, 7), 16);
      const r = Math.round((r1 + r2) / 2);
      const g = Math.round((g1 + g2) / 2);
      const b = Math.round((b1 + b2) / 2);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#1A1A2E' : '#FFFFFF';
    }
    return getContrastColor(card.backgroundColor);
  }, [card.backgroundColor, card.backgroundGradient, card.useGradient]);

  const descriptionFontSize = useMemo(() => {
    const len = card.description.length;
    if (len <= 20) return 14;
    if (len <= 30) return 12;
    if (len <= 40) return 11;
    return 10;
  }, [card.description.length]);

  const backgroundStyle: React.CSSProperties = useMemo(() => {
    if (card.useGradient) {
      return {
        background: `radial-gradient(circle at ${card.gradientCenterX}% ${card.gradientCenterY}%, ${card.backgroundGradient} 0%, ${card.backgroundColor} 100%)`
      };
    }
    return { backgroundColor: card.backgroundColor };
  }, [card.backgroundColor, card.backgroundGradient, card.gradientCenterX, card.gradientCenterY, card.useGradient]);

  return (
    <div style={styles.container}>
      <div style={styles.glowWrapper}>
        <div style={styles.cardContainer} id={`card-preview-${card.id}`}>
          <div
            style={{
              ...styles.cardInner,
              transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            <div
              style={{
                ...styles.cardFace,
                ...styles.cardFront,
                ...backgroundStyle,
                borderColor: card.borderColor,
                fontFamily: card.font
              }}
            >
              <div
                style={{
                  ...styles.cardName,
                  color: textColor,
                  fontFamily: card.font
                }}
              >
                {card.name}
              </div>
              <div style={styles.iconContainer}>
                {icon && (
                  <svg
                    viewBox="0 0 24 24"
                    width={card.iconSize}
                    height={card.iconSize}
                    style={{ color: card.iconColor }}
                  >
                    <g dangerouslySetInnerHTML={{ __html: icon.svg }} />
                  </svg>
                )}
              </div>
              <div
                style={{
                  ...styles.cardDescription,
                  color: textColor,
                  fontFamily: card.font,
                  fontSize: descriptionFontSize
                }}
              >
                {card.description}
              </div>
            </div>
            <div
              style={{
                ...styles.cardFace,
                ...styles.cardBack,
                borderColor: card.borderColor,
                backgroundColor: '#3A3A5A'
              }}
            >
              <div style={styles.backPattern}>
                <div style={styles.backNumber}>#{card.cardNumber}</div>
                <div style={styles.backRule}>
                  桌游卡牌标准规则：
                  <br />
                  请按游戏说明使用此卡牌。
                  <br />
                  每张卡牌具有独特效果。
                  <br />
                  祝游戏愉快！
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button onClick={onToggleBack} style={styles.flipBtn}>
        {showBack ? '👁️ 查看正面' : '🔄 查看背面'}
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20
  },
  glowWrapper: {
    padding: 30,
    borderRadius: 20,
    boxShadow: '0 0 60px 10px rgba(255, 248, 231, 0.15), 0 0 100px 20px rgba(255, 248, 231, 0.08)',
    backgroundColor: 'rgba(255, 248, 231, 0.02)'
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    perspective: 1000
  },
  cardInner: {
    position: 'relative',
    width: '100%',
    height: '100%',
    transition: 'transform 0.6s ease-in-out',
    transformStyle: 'preserve-3d'
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderWidth: 4,
    borderStyle: 'solid',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    overflow: 'hidden'
  },
  cardFront: {
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  },
  cardBack: {
    transform: 'rotateY(180deg)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  },
  cardName: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  iconContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60
  },
  cardDescription: {
    textAlign: 'center',
    lineHeight: 1.4,
    marginTop: 8,
    padding: '0 8px',
    width: '100%',
    minHeight: 40,
    overflowWrap: 'break-word'
  },
  backPattern: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    color: '#B0B0C8'
  },
  backNumber: {
    fontSize: 32,
    fontWeight: 700,
    color: '#FFF8E7',
    fontFamily: 'Montserrat, sans-serif'
  },
  backRule: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 1.6,
    fontFamily: 'Roboto, sans-serif'
  },
  flipBtn: {
    padding: '10px 24px',
    backgroundColor: '#3D3D5C',
    border: '1px solid #4A4A6A',
    borderRadius: 6,
    color: '#E0E0E0',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s ease'
  }
};

const flipStyle = document.createElement('style');
flipStyle.textContent = `
  @keyframes flipShadowFront {
    0% { box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    50% { box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
    100% { box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  }
`;
document.head.appendChild(flipStyle);

export default CardPreview;
