import React, { useState } from 'react';
import { CardDeck, Card } from '../types';
import { isDueToday } from '../srsEngine';

interface CardDeckListProps {
  decks: CardDeck[];
  cards: Record<string, Card[]>;
  onSelectDeck: (deckId: string) => void;
  onAddDeck: (title: string, description: string) => void;
  onAddCard: (deckId: string, front: string, back: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

const CardDeckList: React.FC<CardDeckListProps> = ({
  decks,
  cards,
  onSelectDeck,
  onAddDeck,
  onAddCard,
  onDeleteDeck
}) => {
  const [showAddDeckModal, setShowAddDeckModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [showAddCardDeckId, setShowAddCardDeckId] = useState<string | null>(null);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');

  const handleAddDeck = () => {
    if (newDeckTitle.trim()) {
      onAddDeck(newDeckTitle.trim(), newDeckDescription.trim());
      setNewDeckTitle('');
      setNewDeckDescription('');
      setShowAddDeckModal(false);
    }
  };

  const handleAddCard = (deckId: string) => {
    if (newCardFront.trim() && newCardBack.trim()) {
      onAddCard(deckId, newCardFront.trim(), newCardBack.trim());
      setNewCardFront('');
      setNewCardBack('');
      setShowAddCardDeckId(null);
    }
  };

  const getDueCount = (deckId: string): number => {
    const deckCards = cards[deckId] || [];
    return deckCards.filter(isDueToday).length;
  };

  return (
    <div className="deck-list-container">
      <div className="deck-list-header">
        <h2>卡包列表</h2>
        <button className="btn-add" onClick={() => setShowAddDeckModal(true)}>
          + 新建卡包
        </button>
      </div>

      <div className="deck-grid">
        {decks.length === 0 && (
          <div className="empty-state">
            <p>还没有卡包，点击"新建卡包"开始创建吧！</p>
          </div>
        )}
        {decks.map(deck => {
          const deckCards = cards[deck.id] || [];
          const dueCount = getDueCount(deck.id);
          return (
            <div
              key={deck.id}
              className="deck-card"
              onClick={() => onSelectDeck(deck.id)}
            >
              <div className="deck-card-header">
                <h3>{deck.title}</h3>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个卡包吗？')) {
                      onDeleteDeck(deck.id);
                    }
                  }}
                >
                  ×
                </button>
              </div>
              <p className="deck-description">{deck.description || '暂无描述'}</p>
              <div className="deck-stats">
                <span className="stat-item">共 {deckCards.length} 张</span>
                <span className={`stat-item due ${dueCount > 0 ? 'has-due' : ''}`}>
                  到期 {dueCount} 张
                </span>
              </div>
              <button
                className="btn-add-card"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddCardDeckId(deck.id);
                }}
              >
                + 添加卡片
              </button>
            </div>
          );
        })}
      </div>

      {showAddDeckModal && (
        <div className="modal-overlay" onClick={() => setShowAddDeckModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>新建卡包</h3>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                placeholder="输入卡包标题"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                placeholder="输入卡包描述（可选）"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddDeckModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={handleAddDeck}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCardDeckId && (
        <div className="modal-overlay" onClick={() => setShowAddCardDeckId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>添加卡片</h3>
            <div className="form-group">
              <label>正面（问题/术语）</label>
              <textarea
                value={newCardFront}
                onChange={(e) => setNewCardFront(e.target.value)}
                placeholder="输入卡片正面内容"
                rows={3}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>背面（答案/解释）</label>
              <textarea
                value={newCardBack}
                onChange={(e) => setNewCardBack(e.target.value)}
                placeholder="输入卡片背面内容"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddCardDeckId(null)}>
                取消
              </button>
              <button className="btn-confirm" onClick={() => handleAddCard(showAddCardDeckId)}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardDeckList;
