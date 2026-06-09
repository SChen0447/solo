import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BoardCard, CardType, ContextMenuState } from './types';
import Board from './components/Board';
import PropertyPanel from './components/PropertyPanel';
import AddCardModal from './components/AddCardModal';
import ContextMenu from './components/ContextMenu';

const STORAGE_KEY = 'moodboard_cards';
const MAX_CARDS = 20;

const getDefaultCards = (): BoardCard[] => [
  {
    id: uuidv4(),
    type: 'image',
    content: 'https://picsum.photos/150/120?random=1',
    x: 60,
    y: 80,
    width: 150,
    height: 120,
    zIndex: 1,
  },
  {
    id: uuidv4(),
    type: 'color',
    content: '#FF6B6B',
    x: 280,
    y: 80,
    width: 150,
    height: 120,
    zIndex: 1,
  },
  {
    id: uuidv4(),
    type: 'text',
    content: '双击编辑',
    x: 500,
    y: 80,
    width: 150,
    height: 120,
    zIndex: 1,
  },
];

function App() {
  const [cards, setCards] = useState<BoardCard[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('读取 localStorage 失败，使用默认数据');
    }
    return getDefaultCards();
  });

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.warn('保存到 localStorage 失败');
    }
  }, [cards]);

  const handleSelectCard = useCallback((id: string | null) => {
    setSelectedCardId(id);
    setContextMenu(null);
  }, []);

  const handleUpdateCard = useCallback((id: string, updates: Partial<BoardCard>) => {
    setCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
    );
  }, []);

  const handleDeleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
    if (selectedCardId === id) {
      setSelectedCardId(null);
    }
    setContextMenu(null);
  }, [selectedCardId]);

  const handleDuplicateCard = useCallback((id: string) => {
    if (cards.length >= MAX_CARDS) {
      alert(`最多只能创建 ${MAX_CARDS} 张卡片`);
      return;
    }
    setCards((prev) => {
      const original = prev.find((c) => c.id === id);
      if (!original) return prev;
      const newCard: BoardCard = {
        ...original,
        id: uuidv4(),
        x: Math.min(original.x + 30, 1000 - original.width),
        y: Math.min(original.y + 30, 700 - original.height),
        zIndex: Math.max(...prev.map((c) => c.zIndex), 0) + 1,
      };
      return [...prev, newCard];
    });
  }, [cards.length]);

  const handleChangeType = useCallback((id: string, type: CardType) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== id) return card;
        let content = card.content;
        if (type === 'text' && card.type !== 'text') {
          content = '双击编辑';
        } else if (type === 'color' && card.type !== 'color') {
          content = '#4A90D9';
        } else if (type === 'image' && card.type !== 'image') {
          content = `https://picsum.photos/150/120?random=${Date.now()}`;
        }
        return { ...card, type, content };
      })
    );
  }, []);

  const handleCardDoubleClick = useCallback((id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    if (card.type === 'text') {
      const newText = prompt('编辑文字内容：', card.content);
      if (newText !== null) {
        handleUpdateCard(id, { content: newText || '双击编辑' });
      }
    } else if (card.type === 'image') {
      const newUrl = prompt('输入图片URL：', card.content);
      if (newUrl !== null && newUrl.trim()) {
        handleUpdateCard(id, { content: newUrl.trim() });
      }
    } else if (card.type === 'color') {
      const input = document.createElement('input');
      input.type = 'color';
      input.value = card.content;
      input.addEventListener('input', (e) => {
        handleUpdateCard(id, { content: (e.target as HTMLInputElement).value });
      });
      input.addEventListener('change', () => {
        document.body.removeChild(input);
      });
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.click();
    }
  }, [cards, handleUpdateCard]);

  const handleCardContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setSelectedCardId(id);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      cardId: id,
    });
  }, []);

  const handleBoardClick = useCallback(() => {
    setSelectedCardId(null);
    setContextMenu(null);
  }, []);

  const handleAddCard = useCallback((type: CardType, content: string) => {
    if (cards.length >= MAX_CARDS) {
      alert(`最多只能创建 ${MAX_CARDS} 张卡片`);
      return;
    }

    const occupiedPositions = cards.map((c) => `${c.x},${c.y}`);
    let newX = 100;
    let newY = 100;
    let attempts = 0;
    while (occupiedPositions.includes(`${newX},${newY}`) && attempts < 50) {
      newX = Math.floor(Math.random() * 15) * 20 + 40;
      newY = Math.floor(Math.random() * 20) * 20 + 40;
      attempts++;
    }

    const maxZ = cards.length > 0 ? Math.max(...cards.map((c) => c.zIndex)) : 0;

    const newCard: BoardCard = {
      id: uuidv4(),
      type,
      content,
      x: newX,
      y: newY,
      width: 150,
      height: 120,
      zIndex: maxZ + 1,
    };

    setCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
  }, [cards]);

  const selectedCard = cards.find((c) => c.id === selectedCardId) || null;

  return (
    <div className="app-container">
      <Board
        cards={cards}
        selectedCardId={selectedCardId}
        contextMenu={contextMenu}
        onSelectCard={handleSelectCard}
        onUpdateCard={handleUpdateCard}
        onCardDoubleClick={handleCardDoubleClick}
        onCardContextMenu={handleCardContextMenu}
        onAddClick={() => setIsModalOpen(true)}
        onBoardClick={handleBoardClick}
      />

      <PropertyPanel
        card={selectedCard}
        allCards={cards}
        onUpdateCard={handleUpdateCard}
      />

      {isModalOpen && (
        <AddCardModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddCard}
        />
      )}

      {contextMenu && contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          cardId={contextMenu.cardId}
          onDelete={handleDeleteCard}
          onDuplicate={handleDuplicateCard}
          onChangeType={handleChangeType}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default App;
