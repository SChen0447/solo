import React, { useReducer, useCallback } from 'react';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import Board from './components/Board';
import Sidebar from './components/Sidebar';
import { AppState, Action, CardData, Category } from './types';

const COLORS = [
  '#E8F5F9',
  '#FFF4E6',
  '#F0F4FF',
  '#FFE8E8',
  '#E8FFF0',
  '#F9F0FF',
];

const initialCategories: Category[] = [
  { id: 'all', name: '全部', color: '#6B7280' },
  { id: 'product', name: '产品设计', color: '#3B82F6' },
  { id: 'operation', name: '运营活动', color: '#10B981' },
  { id: 'tech', name: '技术方案', color: '#8B5CF6' },
];

const initialCards: CardData[] = [
  {
    id: uuidv4(),
    x: 100,
    y: 100,
    width: 240,
    height: 140,
    content: '双击画布创建新灵感卡片',
    color: COLORS[0],
    category: 'product',
    votes: 3,
    votedByUser: false,
    isPinned: false,
    isEditing: false,
    zIndex: 1,
  },
  {
    id: uuidv4(),
    x: 400,
    y: 150,
    width: 240,
    height: 140,
    content: '拖拽卡片到侧边栏可切换分类',
    color: COLORS[2],
    category: 'operation',
    votes: 5,
    votedByUser: true,
    isPinned: false,
    isEditing: false,
    zIndex: 2,
  },
  {
    id: uuidv4(),
    x: 200,
    y: 320,
    width: 240,
    height: 140,
    content: '点击小火箭为好想法投票',
    color: COLORS[4],
    category: 'tech',
    votes: 8,
    votedByUser: false,
    isPinned: false,
    isEditing: false,
    zIndex: 3,
  },
];

const initialState: AppState = {
  cards: initialCards,
  categories: initialCategories,
  activeCategory: null,
  maxZIndex: 3,
};

function reducer(state: AppState, action: Action): AppState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'ADD_CARD': {
        const { x, y, color, id } = action.payload;
        draft.cards.push({
          id,
          x,
          y,
          width: 240,
          height: 140,
          content: '',
          color,
          category: draft.activeCategory || 'product',
          votes: 0,
          votedByUser: false,
          isPinned: false,
          isEditing: true,
          zIndex: draft.maxZIndex + 1,
        });
        draft.maxZIndex += 1;
        break;
      }
      case 'UPDATE_CARD': {
        const { id, updates } = action.payload;
        const card = draft.cards.find((c) => c.id === id);
        if (card) {
          Object.assign(card, updates);
        }
        break;
      }
      case 'DELETE_CARD': {
        const { id } = action.payload;
        const index = draft.cards.findIndex((c) => c.id === id);
        if (index !== -1) {
          draft.cards.splice(index, 1);
        }
        break;
      }
      case 'MOVE_CARD': {
        const { id, x, y } = action.payload;
        const card = draft.cards.find((c) => c.id === id);
        if (card) {
          card.x = x;
          card.y = y;
        }
        break;
      }
      case 'SET_CATEGORY': {
        const { cardId, categoryId } = action.payload;
        const card = draft.cards.find((c) => c.id === cardId);
        if (card) {
          card.category = categoryId;
        }
        break;
      }
      case 'TOGGLE_VOTE': {
        const { cardId } = action.payload;
        const card = draft.cards.find((c) => c.id === cardId);
        if (card) {
          if (card.votedByUser) {
            card.votes -= 1;
            card.votedByUser = false;
          } else {
            card.votes += 1;
            card.votedByUser = true;
          }
        }
        break;
      }
      case 'SET_ACTIVE_CATEGORY': {
        draft.activeCategory = action.payload.categoryId;
        break;
      }
      case 'BRING_TO_FRONT': {
        const { id } = action.payload;
        const card = draft.cards.find((c) => c.id === id);
        if (card) {
          draft.maxZIndex += 1;
          card.zIndex = draft.maxZIndex;
        }
        break;
      }
    }
  });
}

export const COLOR_PALETTE = COLORS;

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const totalVotes = state.cards.reduce((sum, card) => sum + card.votes, 0);

  const getCategoryCount = useCallback(
    (categoryId: string) => {
      if (categoryId === 'all') return state.cards.length;
      return state.cards.filter((c) => c.category === categoryId).length;
    },
    [state.cards]
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
      }}
    >
      <Sidebar
        categories={state.categories}
        activeCategory={state.activeCategory}
        getCategoryCount={getCategoryCount}
        onSelectCategory={(categoryId) =>
          dispatch({
            type: 'SET_ACTIVE_CATEGORY',
            payload: { categoryId: categoryId === 'all' ? null : categoryId },
          })
        }
        onCardDrop={(cardId, categoryId) =>
          dispatch({ type: 'SET_CATEGORY', payload: { cardId, categoryId } })
        }
      />
      <Board
        cards={state.cards}
        activeCategory={state.activeCategory}
        colors={COLORS}
        dispatch={dispatch}
      />
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 24,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '12px 20px',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>🚀</span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#374151',
          }}
        >
          {totalVotes}
        </span>
        <span style={{ fontSize: 14, color: '#6B7280' }}>总投票</span>
      </div>
    </div>
  );
}
