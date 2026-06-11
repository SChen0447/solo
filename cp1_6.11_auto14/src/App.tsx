import { useState, useCallback } from 'react';
import WordCard from './WordCard';
import ProgressBar from './ProgressBar';

export interface WordData {
  id: number;
  word: string;
  meaning: string;
  example: string;
  isFlipped: boolean;
  isFlyingOut: boolean;
}

const initialWords: Omit<WordData, 'id' | 'isFlipped' | 'isFlyingOut'>[] = [
  { word: 'Ephemeral', meaning: '短暂的，瞬息的', example: 'The ephemeral beauty of cherry blossoms reminds us to cherish the moment.' },
  { word: 'Ubiquitous', meaning: '无处不在的，普遍存在的', example: 'Smartphones have become ubiquitous in modern society.' },
  { word: 'Serendipity', meaning: '意外发现美好事物的能力', example: 'Finding that rare book was pure serendipity.' },
  { word: 'Mellifluous', meaning: '（声音）甜美流畅的', example: 'Her mellifluous voice captivated the entire audience.' },
  { word: 'Eloquent', meaning: '雄辩的，有口才的', example: 'The lawyer gave an eloquent speech in defense of his client.' },
  { word: 'Resilient', meaning: '有韧性的，能迅速恢复的', example: 'Children are often more resilient than adults give them credit for.' },
  { word: 'Pragmatic', meaning: '务实的，实用主义的', example: 'We need a pragmatic approach to solve this problem.' },
  { word: 'Ambiguous', meaning: '模棱两可的，含糊不清的', example: 'The contract language was deliberately ambiguous.' },
  { word: 'Tenacious', meaning: '坚韧不拔的，顽强的', example: 'Her tenacious spirit helped her overcome countless obstacles.' },
  { word: 'Nostalgia', meaning: '怀旧，乡愁', example: 'The old photograph filled him with deep nostalgia for his childhood.' },
  { word: 'Candid', meaning: '坦率的，直言不讳的', example: 'I appreciate your candid feedback on my work.' },
  { word: 'Luminous', meaning: '发光的，明亮的', example: 'The luminous stars lit up the night sky.' }
];

let nextId = initialWords.length + 1;

const App = () => {
  const [pendingList, setPendingList] = useState<WordData[]>(
    initialWords.map((w, i) => ({
      id: i + 1,
      ...w,
      isFlipped: false,
      isFlyingOut: false
    }))
  );
  const [masteredList, setMasteredList] = useState<WordData[]>([]);
  const [reviewList, setReviewList] = useState<WordData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');

  const currentCard = pendingList[0];
  const totalCount = pendingList.length + masteredList.length + reviewList.length;
  const learnedCount = masteredList.length + reviewList.length;

  const handleFlip = useCallback((id: number) => {
    setPendingList(prev =>
      prev.map(card =>
        card.id === id ? { ...card, isFlipped: !card.isFlipped } : card
      )
    );
  }, []);

  const handleMastered = useCallback(() => {
    if (!currentCard) return;
    setPendingList(prev =>
      prev.map(card =>
        card.id === currentCard.id ? { ...card, isFlyingOut: true } : card
      )
    );
    setTimeout(() => {
      setPendingList(prev => {
        const card = prev.find(c => c.id === currentCard.id);
        if (card && !masteredList.some(m => m.word === card.word)) {
          setMasteredList(mPrev => [...mPrev, { ...card, isFlyingOut: false, isFlipped: false }]);
        }
        return prev.filter(c => c.id !== currentCard.id);
      });
    }, 300);
  }, [currentCard, masteredList]);

  const handleReview = useCallback(() => {
    if (!currentCard) return;
    setPendingList(prev =>
      prev.map(card =>
        card.id === currentCard.id ? { ...card, isFlyingOut: true } : card
      )
    );
    setTimeout(() => {
      setPendingList(prev => {
        const card = prev.find(c => c.id === currentCard.id);
        if (card) {
          const resetCard = { ...card, isFlyingOut: false, isFlipped: false };
          const rest = prev.filter(c => c.id !== currentCard.id);
          setReviewList(rPrev => {
            const existing = rPrev.find(r => r.word === card.word);
            if (!existing) {
              return [...rPrev, resetCard];
            }
            return rPrev;
          });
          return [...rest, resetCard];
        }
        return prev.filter(c => c.id !== currentCard.id);
      });
    }, 300);
  }, [currentCard]);

  const handleAddCard = useCallback(() => {
    if (!newWord.trim() || !newMeaning.trim()) return;
    const card: WordData = {
      id: nextId++,
      word: newWord.trim(),
      meaning: newMeaning.trim(),
      example: newExample.trim() || '(暂无例句)',
      isFlipped: false,
      isFlyingOut: false
    };
    setPendingList(prev => {
      if (prev.length === 0) return [card];
      return [card, ...prev];
    });
    setNewWord('');
    setNewMeaning('');
    setNewExample('');
    setShowForm(false);
  }, [newWord, newMeaning, newExample]);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setNewWord('');
    setNewMeaning('');
    setNewExample('');
  }, []);

  return (
    <div className="app-container">
      <h1 className="app-title">语言学习记忆卡</h1>

      <div className="stats-bar">
        <span className="stat mastered">✓ 已掌握: {masteredList.length}</span>
        <span className="stat review">↻ 需复习: {reviewList.length}</span>
        <span className="stat pending">📚 待学习: {pendingList.length}</span>
      </div>

      <ProgressBar
        currentIndex={learnedCount}
        total={totalCount}
      />

      <div className="progress-text">
        {pendingList.length > 0
          ? `第 ${learnedCount + 1} 张 / 共 ${totalCount} 张`
          : `已完成全部 ${totalCount} 张卡片！`}
      </div>

      <div className="card-area">
        {currentCard ? (
          <WordCard
            card={currentCard}
            onFlip={() => handleFlip(currentCard.id)}
            onMastered={handleMastered}
            onReview={handleReview}
          />
        ) : (
          <div className="empty-state">
            <p className="empty-title">🎉 太棒了！</p>
            <p className="empty-subtitle">所有卡片都已学习完毕</p>
            <p className="empty-tip">点击下方按钮添加新单词继续学习</p>
          </div>
        )}
      </div>

      <button
        className="add-btn"
        onClick={() => setShowForm(true)}
      >
        + 添加自定义单词
      </button>

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">添加新单词</h2>
            <div className="form-group">
              <label>英文单词 *</label>
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="例如：Serendipity"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>中文释义 *</label>
              <input
                type="text"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="例如：意外发现美好事物的能力"
              />
            </div>
            <div className="form-group">
              <label>例句</label>
              <textarea
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder="例如：Finding that rare book was pure serendipity."
                rows={3}
              />
            </div>
            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={handleCloseForm}
              >
                取消
              </button>
              <button
                className="confirm-btn"
                onClick={handleAddCard}
                disabled={!newWord.trim() || !newMeaning.trim()}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
