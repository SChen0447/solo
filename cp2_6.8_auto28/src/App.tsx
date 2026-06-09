import React, { useReducer, useEffect, useCallback } from 'react';
import { AppState, AppAction, CardDeck, Card, ReviewRecord, ReviewGrade } from './types';
import { generateId, loadAppState, saveDecks, saveCards, saveReviewRecords } from './dataStore';
import { createNewCard } from './srsEngine';
import CardDeckList from './components/cardDeckList';
import ReviewScreen from './components/reviewScreen';
import StatsDashboard from './components/statsDashboard';
import './App.css';

const initialState: AppState = {
  decks: [],
  cards: {},
  selectedDeckId: null,
  currentView: 'list',
  reviewRecords: []
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;
    case 'ADD_DECK': {
      const newDecks = [...state.decks, action.payload];
      return { ...state, decks: newDecks };
    }
    case 'DELETE_DECK': {
      const newDecks = state.decks.filter(d => d.id !== action.payload);
      const newCards = { ...state.cards };
      delete newCards[action.payload];
      return {
        ...state,
        decks: newDecks,
        cards: newCards,
        selectedDeckId: state.selectedDeckId === action.payload ? null : state.selectedDeckId
      };
    }
    case 'UPDATE_DECK': {
      const newDecks = state.decks.map(d =>
        d.id === action.payload.id ? action.payload : d
      );
      return { ...state, decks: newDecks };
    }
    case 'ADD_CARD': {
      const deckCards = state.cards[action.payload.deckId] || [];
      const newCards = {
        ...state.cards,
        [action.payload.deckId]: [...deckCards, action.payload.card]
      };
      return { ...state, cards: newCards };
    }
    case 'UPDATE_CARD': {
      const deckCards = state.cards[action.payload.deckId] || [];
      const updatedCards = deckCards.map(c =>
        c.id === action.payload.card.id ? action.payload.card : c
      );
      const newCards = {
        ...state.cards,
        [action.payload.deckId]: updatedCards
      };
      return { ...state, cards: newCards };
    }
    case 'DELETE_CARD': {
      const deckCards = state.cards[action.payload.deckId] || [];
      const filteredCards = deckCards.filter(c => c.id !== action.payload.cardId);
      const newCards = {
        ...state.cards,
        [action.payload.deckId]: filteredCards
      };
      return { ...state, cards: newCards };
    }
    case 'SET_SELECTED_DECK':
      return { ...state, selectedDeckId: action.payload };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'ADD_REVIEW_RECORD': {
      const newRecords = [...state.reviewRecords, action.payload];
      return { ...state, reviewRecords: newRecords };
    }
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const savedState = loadAppState();
    dispatch({ type: 'LOAD_STATE', payload: { ...savedState, currentView: 'list', selectedDeckId: null } });
  }, []);

  useEffect(() => {
    if (state.decks.length > 0) {
      saveDecks(state.decks);
    }
  }, [state.decks]);

  useEffect(() => {
    Object.entries(state.cards).forEach(([deckId, cards]) => {
      saveCards(deckId, cards);
    });
  }, [state.cards]);

  useEffect(() => {
    if (state.reviewRecords.length > 0) {
      saveReviewRecords(state.reviewRecords);
    }
  }, [state.reviewRecords]);

  const handleAddDeck = useCallback((title: string, description: string) => {
    const newDeck: CardDeck = {
      id: generateId(),
      title,
      description,
      createdAt: new Date().toISOString().split('T')[0]
    };
    dispatch({ type: 'ADD_DECK', payload: newDeck });
  }, []);

  const handleDeleteDeck = useCallback((deckId: string) => {
    dispatch({ type: 'DELETE_DECK', payload: deckId });
  }, []);

  const handleAddCard = useCallback((deckId: string, front: string, back: string) => {
    const cardId = generateId();
    const newCard = createNewCard(cardId, front, back);
    dispatch({ type: 'ADD_CARD', payload: { deckId, card: newCard } });
  }, []);

  const handleSelectDeck = useCallback((deckId: string) => {
    dispatch({ type: 'SET_SELECTED_DECK', payload: deckId });
    dispatch({ type: 'SET_VIEW', payload: 'review' });
  }, []);

  const handleBackToList = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_DECK', payload: null });
    dispatch({ type: 'SET_VIEW', payload: 'list' });
  }, []);

  const handleGradeCard = useCallback((updatedCard: Card, grade: ReviewGrade) => {
    if (!state.selectedDeckId) return;
    
    dispatch({ type: 'UPDATE_CARD', payload: { deckId: state.selectedDeckId, card: updatedCard } });
    
    const record: ReviewRecord = {
      date: new Date().toISOString().split('T')[0],
      cardId: updatedCard.id,
      deckId: state.selectedDeckId,
      grade
    };
    dispatch({ type: 'ADD_REVIEW_RECORD', payload: record });
  }, [state.selectedDeckId]);

  const selectedDeck = state.decks.find(d => d.id === state.selectedDeckId) || null;
  const selectedDeckCards = state.selectedDeckId ? (state.cards[state.selectedDeckId] || []) : [];

  const renderMainContent = () => {
    if (state.currentView === 'review' && selectedDeck) {
      return (
        <ReviewScreen
          deck={selectedDeck}
          cards={selectedDeckCards}
          onGradeCard={handleGradeCard}
          onBack={handleBackToList}
        />
      );
    }
    return (
      <StatsDashboard
        decks={state.decks}
        cards={state.cards}
        reviewRecords={state.reviewRecords}
      />
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 知识闪卡</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${state.currentView === 'list' ? 'active' : ''}`}
            onClick={handleBackToList}
          >
            卡包
          </button>
          <button
            className={`nav-btn ${state.currentView === 'stats' ? 'active' : ''}`}
            onClick={() => {
              dispatch({ type: 'SET_VIEW', payload: 'stats' });
              dispatch({ type: 'SET_SELECTED_DECK', payload: null });
            }}
          >
            统计
          </button>
        </nav>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <CardDeckList
            decks={state.decks}
            cards={state.cards}
            onSelectDeck={handleSelectDeck}
            onAddDeck={handleAddDeck}
            onAddCard={handleAddCard}
            onDeleteDeck={handleDeleteDeck}
          />
        </aside>

        <main className="main-content">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
