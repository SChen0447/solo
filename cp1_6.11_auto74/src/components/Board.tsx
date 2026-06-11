import { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import { useBoardStore } from '../store/useBoardStore';
import Card from './Card';
import './Board.css';

export default function Board() {
  const {
    viewMode,
    getFilteredCards,
    cards,
    currentBoardId,
    openEditor,
    reorderCard,
  } = useBoardStore();

  const boardRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());

  const filteredCards = getFilteredCards();
  const allCardIds = cards
    .filter(c => c.boardId === currentBoardId)
    .map(c => c.id);

  useEffect(() => {
    if (!boardRef.current) return;

    sortableRef.current = Sortable.create(boardRef.current, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        if (evt.oldIndex === evt.newIndex) return;

        const cardId = evt.item.dataset.id;
        if (!cardId) return;

        await reorderCard(cardId, evt.newIndex);
      },
    });

    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
      }
    };
  }, [reorderCard, viewMode]);

  useEffect(() => {
    if (allCardIds.length > 0) {
      setAnimatingCards(new Set(allCardIds));
      const timer = setTimeout(() => {
        setAnimatingCards(new Set());
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [JSON.stringify(allCardIds)]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      openEditor();
    }
  };

  return (
    <div
      className={`board ${viewMode === 'grid' ? 'board-grid' : 'board-list'}`}
      onClick={handleCanvasClick}
    >
      <div
        ref={boardRef}
        className={`board-cards ${viewMode === 'grid' ? 'cards-grid' : 'cards-list'}`}
      >
        {filteredCards.map((card) => (
          <div
            key={card.id}
            data-id={card.id}
            className="card-wrapper"
          >
            <Card
              card={card}
              viewMode={viewMode}
              isNew={newCardId === card.id}
              isFiltered={animatingCards.has(card.id) && !filteredCards.some(c => c.id === card.id)}
            />
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="board-empty">
          <p>暂无卡片，点击空白处创建第一个灵感卡片</p>
        </div>
      )}
    </div>
  );
}
