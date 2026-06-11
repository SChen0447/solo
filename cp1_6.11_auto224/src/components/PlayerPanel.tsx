import React from 'react';
import { Player } from '../types';
import { EnergyBar } from './EnergyBar';
import { CardComponent } from './Card';

interface PlayerPanelProps {
  player: Player;
  isCurrentPlayer: boolean;
  isLeftSide: boolean;
  selectedCardIndex: number | null;
  onCardSelect: (index: number) => void;
  isBurstMode?: boolean;
  isSmall?: boolean;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrentPlayer,
  isLeftSide,
  selectedCardIndex,
  onCardSelect,
  isBurstMode = false,
  isSmall = false,
}) => {
  const panelStyle: React.CSSProperties = {
    width: '30%',
    minWidth: isSmall ? '200px' : '280px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: isCurrentPlayer
      ? 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.1) 0%, transparent 70%)'
      : 'transparent',
    borderRadius: '12px',
    border: isCurrentPlayer ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
    transition: 'all 0.3s ease',
  };

  const infoStyle: React.CSSProperties = {
    textAlign: 'center',
    color: isCurrentPlayer ? '#ffd700' : '#a8a0c0',
    fontFamily: 'Georgia, serif',
  };

  const handContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isLeftSide ? 'row' : 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px',
    minHeight: isSmall ? '90px' : '110px',
    padding: '8px',
    background: 'rgba(30, 25, 60, 0.5)',
    borderRadius: '8px',
    width: '100%',
  };

  return (
    <div style={panelStyle}>
      <div style={infoStyle}>
        <h3 style={{ fontSize: isSmall ? '16px' : '20px', marginBottom: '4px' }}>
          {player.name}
        </h3>
        <div style={{ fontSize: '12px', color: '#8880a0' }}>
          星盘能量: <span style={{ color: '#d4af37' }}>{player.boardEnergy}</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '240px' }}>
        <EnergyBar
          currentEnergy={player.energy}
          maxEnergy={50}
          isFull={player.isBurstReady}
          playerId={player.id}
          label="能量槽"
        />
      </div>

      {player.isBurstReady && (
        <div
          style={{
            padding: '4px 12px',
            background: 'linear-gradient(90deg, #ffd700, #ffec8b, #ffd700)',
            backgroundSize: '200% 100%',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#1a1530',
            fontFamily: 'Georgia, serif',
            animation: 'shimmer 2s linear infinite',
          }}
        >
          ⚡ 占星爆发就绪
        </div>
      )}

      <div style={{ width: '100%' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#8880a0',
            textAlign: 'center',
            marginBottom: '6px',
            fontFamily: 'Georgia, serif',
          }}
        >
          手牌 ({player.hand.length}/7)
        </div>
        <div style={handContainerStyle}>
          {player.hand.map((card, index) => (
            <CardComponent
              key={card.id}
              card={card}
              isSelected={selectedCardIndex === index}
              isSmall={isSmall}
              onClick={() => {
                if (isCurrentPlayer) {
                  if (isBurstMode && card.arcanaType !== 'major') {
                    return;
                  }
                  onCardSelect(index);
                }
              }}
            />
          ))}
          {player.hand.length === 0 && (
            <div
              style={{
                color: '#555070',
                fontSize: '12px',
                fontStyle: 'italic',
                padding: '20px',
              }}
            >
              无手牌
            </div>
          )}
        </div>
      </div>

      {isBurstMode && isCurrentPlayer && (
        <div
          style={{
            padding: '8px',
            background: 'rgba(255, 215, 0, 0.1)',
            border: '1px solid #ffd700',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#ffd700',
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
          }}
        >
          选择一张大阿卡那牌作为爆发技能
        </div>
      )}
    </div>
  );
};

export default PlayerPanel;
