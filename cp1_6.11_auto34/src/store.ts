import { useReducer, createContext, useContext, type Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Action, AppState, MindMapNode, MindMapEdge } from './types';

const initialState: AppState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  theme: 'minimal',
  remoteUsers: {},
  userId: uuidv4(),
  connected: false,
  collision: null,
};

function addNode(state: AppState, payload: Action extends { type: 'ADD_NODE' } ? Action['payload'] : never): AppState {
  const newNode: MindMapNode = {
    id: payload.id,
    text: payload.text,
    x: payload.x,
    y: payload.y,
    parentId: payload.parentId,
    fontSize: 14,
    color: state.theme === 'minimal' ? '#1a1a2e' : state.theme === 'cyber' ? '#e0f2fe' : '#dcfce7',
    shape: 'rounded',
    editingUserId: null,
    collapsed: false,
  };
  const newEdges: MindMapEdge[] = payload.parentId
    ? [{ id: `edge-${payload.parentId}-${payload.id}`, sourceId: payload.parentId, targetId: payload.id }]
    : [];
  return {
    ...state,
    nodes: [...state.nodes, newNode],
    edges: [...state.edges, ...newEdges],
  };
}

function moveNode(state: AppState, payload: Action extends { type: 'MOVE_NODE' } ? Action['payload'] : never): AppState {
  return {
    ...state,
    nodes: state.nodes.map((n) => (n.id === payload.id ? { ...n, x: payload.x, y: payload.y } : n)),
  };
}

function updateNodeText(state: AppState, payload: Action extends { type: 'UPDATE_NODE_TEXT' } ? Action['payload'] : never): AppState {
  const editingUser = state.remoteUsers[payload.userId];
  const currentNode = state.nodes.find((n) => n.id === payload.id);
  if (currentNode && currentNode.editingUserId && currentNode.editingUserId !== payload.userId && currentNode.editingUserId !== state.userId) {
    return {
      ...state,
      collision: { nodeId: payload.id, userId: payload.userId, userName: editingUser?.name || payload.userId.slice(0, 6) },
    };
  }
  return {
    ...state,
    nodes: state.nodes.map((n) => (n.id === payload.id ? { ...n, text: payload.text, editingUserId: payload.userId } : n)),
  };
}

function deleteNode(state: AppState, payload: Action extends { type: 'DELETE_NODE' } ? Action['payload'] : never): AppState {
  const idsToDelete = new Set<string>();
  const collectChildren = (parentId: string) => {
    idsToDelete.add(parentId);
    state.nodes.filter((n) => n.parentId === parentId).forEach((child) => collectChildren(child.id));
  };
  collectChildren(payload.id);
  return {
    ...state,
    nodes: state.nodes.filter((n) => !idsToDelete.has(n.id)),
    edges: state.edges.filter((e) => !idsToDelete.has(e.sourceId) && !idsToDelete.has(e.targetId)),
    selectedNodeId: state.selectedNodeId && idsToDelete.has(state.selectedNodeId) ? null : state.selectedNodeId,
  };
}

function updateNodeStyle(state: AppState, payload: Action extends { type: 'UPDATE_NODE_STYLE' } ? Action['payload'] : never): AppState {
  return {
    ...state,
    nodes: state.nodes.map((n) => {
      if (n.id !== payload.id) return n;
      return {
        ...n,
        ...(payload.fontSize !== undefined ? { fontSize: payload.fontSize } : {}),
        ...(payload.color !== undefined ? { color: payload.color } : {}),
        ...(payload.shape !== undefined ? { shape: payload.shape } : {}),
      };
    }),
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_NODE':
      return addNode(state, action.payload);
    case 'MOVE_NODE':
      return moveNode(state, action.payload);
    case 'UPDATE_NODE_TEXT':
      return updateNodeText(state, action.payload);
    case 'DELETE_NODE':
      return deleteNode(state, action.payload);
    case 'UPDATE_NODE_STYLE':
      return updateNodeStyle(state, action.payload);
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload.id };
    case 'SET_EDITING':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id ? { ...n, editingUserId: action.payload.userId } :
          n.editingUserId === action.payload.userId ? { ...n, editingUserId: null } : n
        ),
      };
    case 'TOGGLE_COLLAPSE':
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.payload.id ? { ...n, collapsed: !n.collapsed } : n)),
      };
    case 'SET_THEME':
      return { ...state, theme: action.payload.theme };
    case 'UPDATE_REMOTE_USER':
      return { ...state, remoteUsers: { ...state.remoteUsers, [action.payload.user.id]: action.payload.user } };
    case 'REMOVE_REMOTE_USER':
      const { [action.payload.userId]: _, ...rest } = state.remoteUsers;
      return { ...state, remoteUsers: rest };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload.connected };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload.userId };
    case 'COLLISION_ALERT':
      return { ...state, collision: action.payload };
    case 'DISMISS_COLLISION':
      return { ...state, collision: null };
    default:
      return state;
  }
}

function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppContextProvider');
  return ctx;
}

export { AppContextProvider, reducer, initialState };
