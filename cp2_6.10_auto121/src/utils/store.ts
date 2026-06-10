import { useReducer, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash/cloneDeep';

export interface MindMapNode {
  id: string;
  title: string;
  x: number;
  y: number;
  color: string;
  note: string;
  width: number;
  height: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  nodes: MindMapNode[];
  connections: Connection[];
}

export interface MindMapState {
  nodes: MindMapNode[];
  connections: Connection[];
  history: Snapshot[];
  historyIndex: number;
}

export type MindMapAction =
  | { type: 'ADD_NODE'; node: MindMapNode }
  | { type: 'UPDATE_NODE'; node: MindMapNode }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'ADD_CONNECTION'; connection: Connection }
  | { type: 'DELETE_CONNECTION'; connectionId: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESTORE_SNAPSHOT'; snapshot: Snapshot }
  | { type: 'IMPORT_DATA'; nodes: MindMapNode[]; connections: Connection[] }
  | { type: 'CLEAR_ALL' };

function createSnapshot(nodes: MindMapNode[], connections: Connection[]): Snapshot {
  return {
    id: uuidv4(),
    timestamp: Date.now(),
    nodes: cloneDeep(nodes),
    connections: cloneDeep(connections)
  };
}

function addSnapshotToHistory(state: MindMapState, nodes: MindMapNode[], connections: Connection[]): MindMapState {
  const snapshot = createSnapshot(nodes, connections);
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(snapshot);
  return {
    ...state,
    nodes,
    connections,
    history: newHistory,
    historyIndex: newHistory.length - 1
  };
}

const initialNodes: MindMapNode[] = [
  {
    id: uuidv4(),
    title: '中心主题',
    x: 400,
    y: 300,
    color: '#f0f0f0',
    note: '',
    width: 120,
    height: 50
  }
];

const initialSnapshot = createSnapshot(initialNodes, []);

const initialState: MindMapState = {
  nodes: initialNodes,
  connections: [],
  history: [initialSnapshot],
  historyIndex: 0
};

function mindMapReducer(state: MindMapState, action: MindMapAction): MindMapState {
  switch (action.type) {
    case 'ADD_NODE': {
      const nodes = [...state.nodes, action.node];
      return addSnapshotToHistory(state, nodes, state.connections);
    }
    case 'UPDATE_NODE': {
      const nodes = state.nodes.map(n =>
        n.id === action.node.id ? action.node : n
      );
      return addSnapshotToHistory(state, nodes, state.connections);
    }
    case 'DELETE_NODE': {
      const nodes = state.nodes.filter(n => n.id !== action.nodeId);
      const connections = state.connections.filter(
        c => c.from !== action.nodeId && c.to !== action.nodeId
      );
      return addSnapshotToHistory(state, nodes, connections);
    }
    case 'ADD_CONNECTION': {
      const exists = state.connections.some(
        c => c.from === action.connection.from && c.to === action.connection.to
      );
      if (exists) return state;
      const connections = [...state.connections, action.connection];
      return addSnapshotToHistory(state, state.nodes, connections);
    }
    case 'DELETE_CONNECTION': {
      const connections = state.connections.filter(c => c.id !== action.connectionId);
      return addSnapshotToHistory(state, state.nodes, connections);
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      return {
        ...state,
        nodes: cloneDeep(snapshot.nodes),
        connections: cloneDeep(snapshot.connections),
        historyIndex: newIndex
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      return {
        ...state,
        nodes: cloneDeep(snapshot.nodes),
        connections: cloneDeep(snapshot.connections),
        historyIndex: newIndex
      };
    }
    case 'RESTORE_SNAPSHOT': {
      const snapshotIndex = state.history.findIndex(h => h.id === action.snapshot.id);
      if (snapshotIndex === -1) return state;
      return {
        ...state,
        nodes: cloneDeep(action.snapshot.nodes),
        connections: cloneDeep(action.snapshot.connections),
        historyIndex: snapshotIndex
      };
    }
    case 'IMPORT_DATA': {
      return addSnapshotToHistory(state, action.nodes, action.connections);
    }
    case 'CLEAR_ALL': {
      return addSnapshotToHistory(state, [], []);
    }
    default:
      return state;
  }
}

export function useMindMapStore() {
  const [state, dispatch] = useReducer(mindMapReducer, initialState);

  const createNode = useCallback((x: number, y: number, title = '新节点'): MindMapNode => {
    return {
      id: uuidv4(),
      title,
      x,
      y,
      color: '#f0f0f0',
      note: '',
      width: 120,
      height: 50
    };
  }, []);

  const createConnection = useCallback((from: string, to: string): Connection => {
    return {
      id: uuidv4(),
      from,
      to
    };
  }, []);

  const addNode = useCallback((node: MindMapNode) => {
    dispatch({ type: 'ADD_NODE', node });
  }, []);

  const updateNode = useCallback((node: MindMapNode) => {
    dispatch({ type: 'UPDATE_NODE', node });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    dispatch({ type: 'DELETE_NODE', nodeId });
  }, []);

  const addConnection = useCallback((connection: Connection) => {
    dispatch({ type: 'ADD_CONNECTION', connection });
  }, []);

  const deleteConnection = useCallback((connectionId: string) => {
    dispatch({ type: 'DELETE_CONNECTION', connectionId });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const restoreSnapshot = useCallback((snapshot: Snapshot) => {
    dispatch({ type: 'RESTORE_SNAPSHOT', snapshot });
  }, []);

  const importData = useCallback((nodes: MindMapNode[], connections: Connection[]) => {
    dispatch({ type: 'IMPORT_DATA', nodes, connections });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    state,
    createNode,
    createConnection,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    undo,
    redo,
    restoreSnapshot,
    importData,
    clearAll
  };
}

export type MindMapStore = ReturnType<typeof useMindMapStore>;
