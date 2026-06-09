import React from 'react';
import { BoardCard, ContextMenuState } from '../types';
import Card from './Card';

interface BoardProps {
  cards: BoardCard[];
  selectedCardId: string | null;
  contextMenu: ContextMenuState | null;
  onSelectCard: (id: string | null) => void;
  onUpdateCard: (id: string, updates: Partial<BoardCard>) => void;
  onCardDoubleClick: (id: string) => void;
  onCardContextMenu: (e: React.MouseEvent, id: string) => void;
  onAddClick: () => void;
  onBoardClick: () => void;
}

const Board: React.FC<BoardProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  onUpdateCard,
  onCardDoubleClick,
  onCardContextMenu,
  onAddClick,
  onBoardClick,
}) => {
  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const selectedIndex = selectedCardId ? cards.findIndex((c) => c.id === selectedCardId) + 1 : 0;

  const handleBoardClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onBoardClick();
    }
  };

  return (
    <div className="board-wrapper">
      <div className="board" onClick={handleBoardClick}>
        <div className="board-header">
          {selectedCard && (
            <div className="layer-info">
              选中：卡片{selectedIndex} [层级 {selectedCard.zIndex}]
            </div>
          )}
          <button className="add-btn" onClick={onAddClick}>
            + 添加卡片
          </button>
        </div>

        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            isSelected={card.id === selectedCardId}
            onSelect={() => onSelectCard(card.id)}
            onUpdate={(updates) => onUpdateCard(card.id, updates)}
            onDoubleClick={() => onCardDoubleClick(card.id)}
            onContextMenu={(e) => onCardContextMenu(e, card.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Board;
