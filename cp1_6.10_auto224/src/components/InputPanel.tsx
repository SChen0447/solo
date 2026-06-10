import React, { useState } from 'react';
import { InspirationCard } from '../types';
import { analyzeText } from '../utils/emotionAnalyzer';
import Card from './Card';

interface InputPanelProps {
  cards: InspirationCard[];
  onAddCards: (cards: InspirationCard[]) => void;
  onDeleteCard: (id: string) => void;
  onArchiveCard: (id: string) => void;
  onAddTag: (cardId: string, tag: string) => void;
  onDragStart: (e: React.DragEvent, card: InspirationCard) => void;
  onSelectCard: (cardId: string | null) => void;
  selectedCardId: string | null;
}

const InputPanel: React.FC<InputPanelProps> = ({
  cards,
  onAddCards,
  onDeleteCard,
  onArchiveCard,
  onAddTag,
  onDragStart,
  onSelectCard,
  selectedCardId,
}) => {
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const streamCards = cards.filter(c => !c.placedOnCanvas && !c.archived);

  const handleGenerate = () => {
    if (!inputText.trim()) return;
    const newCards = analyzeText(inputText);
    if (newCards.length > 0) {
      onAddCards(newCards);
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fffdf8',
        borderRight: '1px solid #e0d5c1',
      }}
    >
      <div style={{ padding: '24px 24px 16px' }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#4a3d2b',
            marginBottom: 16,
            letterSpacing: 0.5,
          }}
        >
          捕捉闪现
        </h2>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="写下你的灵感碎片..."
          style={{
            width: '100%',
            minHeight: 140,
            padding: 16,
            fontSize: 15,
            lineHeight: 1.7,
            color: '#4a3d2b',
            background: '#faf6ef',
            border: `2px solid ${isFocused ? '#c9a96e' : '#e0d5c1'}`,
            borderRadius: 12,
            outline: 'none',
            resize: 'vertical',
            transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
            boxShadow: isFocused ? '0 0 0 4px rgba(201,169,110,0.15)' : 'none',
            fontFamily: 'inherit',
          }}
          className="input-textarea"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 12, color: '#8a7a62' }}>
            {inputText.length > 0 ? `${inputText.length} 字` : 'Ctrl/Cmd + Enter 快速生成'}
          </span>
          <button
            onClick={handleGenerate}
            disabled={!inputText.trim()}
            style={buttonStyle(!inputText.trim())}
            onMouseEnter={(e) => {
              if (inputText.trim()) {
                (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(184,148,90,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(201,169,110,0.3)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            生成卡片
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 24px 24px',
          WebkitOverflowScrolling: 'touch',
        }}
        className="card-stream-container"
      >
        {streamCards.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignContent: 'flex-start',
            }}
            className="card-stream"
          >
            {streamCards.map((card, index) => (
              <div
                key={card.id}
                onClick={() => onSelectCard(card.id === selectedCardId ? null : card.id)}
                style={{ cursor: 'pointer' }}
              >
                <Card
                  card={card}
                  index={index}
                  onDelete={onDeleteCard}
                  onArchive={onArchiveCard}
                  onAddTag={onAddTag}
                  onDragStart={onDragStart}
                  isSelected={card.id === selectedCardId}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60%',
              color: '#b5a88f',
              textAlign: 'center',
              padding: 40,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.6 }}>
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              在这里写下你脑海中<br />闪过的每一个想法...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: disabled
      ? 'linear-gradient(135deg, #d4c8b0 0%, #c4b89e 100%)'
      : 'linear-gradient(135deg, #c9a96e 0%, #b8945a 100%)',
    border: 'none',
    borderRadius: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: disabled ? 'none' : '0 3px 10px rgba(201,169,110,0.3)',
    letterSpacing: 0.5,
  };
}

export default InputPanel;
