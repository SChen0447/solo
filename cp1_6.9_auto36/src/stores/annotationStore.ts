import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

export type LabelType = 'speakerA' | 'speakerB' | 'noise' | 'silence' | 'other';

export interface Annotation {
  id: string;
  startTime: number;
  endTime: number;
  label: LabelType;
  createdAt: number;
}

export interface AudioFile {
  id: string;
  name: string;
  url: string;
  duration: number;
  sampleRate: number;
}

export const LABEL_COLORS: Record<LabelType, string> = {
  speakerA: '#73c2ef',
  speakerB: '#f5a9b8',
  noise: '#ff7b54',
  silence: '#8b949e',
  other: '#b39ddb'
};

export const LABEL_NAMES: Record<LabelType, string> = {
  speakerA: '说话人A',
  speakerB: '说话人B',
  noise: '噪音',
  silence: '沉默',
  other: '其他'
};

export const LABEL_LIST: LabelType[] = ['speakerA', 'speakerB', 'noise', 'silence', 'other'];

interface AppState {
  audioFile: AudioFile | null;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
}

type Action =
  | { type: 'SET_AUDIO'; payload: AudioFile | null }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'UPDATE_ANNOTATION'; payload: Annotation }
  | { type: 'REORDER_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'LOAD_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'SELECT_ANNOTATION'; payload: string | null };

const initialState: AppState = {
  audioFile: null,
  annotations: [],
  selectedAnnotationId: null
};

const DB_NAME = 'AudioAnnotationDB';
const DB_VERSION = 1;
const STORE_ANNOTATIONS = 'annotations';
const STORE_AUDIOS = 'audios';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ANNOTATIONS)) {
        const store = db.createObjectStore(STORE_ANNOTATIONS, { keyPath: 'id' });
        store.createIndex('audioId', 'audioId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIOS)) {
        db.createObjectStore(STORE_AUDIOS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll(store: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUDIO':
      return { ...state, audioFile: action.payload, annotations: [], selectedAnnotationId: null };
    case 'ADD_ANNOTATION': {
      const list = [...state.annotations, action.payload].sort((a, b) => a.startTime - b.startTime);
      dbPut(STORE_ANNOTATIONS, { ...action.payload, audioId: state.audioFile?.id });
      return { ...state, annotations: list };
    }
    case 'DELETE_ANNOTATION': {
      dbDelete(STORE_ANNOTATIONS, action.payload);
      return { ...state, annotations: state.annotations.filter(a => a.id !== action.payload) };
    }
    case 'UPDATE_ANNOTATION': {
      dbPut(STORE_ANNOTATIONS, { ...action.payload, audioId: state.audioFile?.id });
      const list = state.annotations.map(a => a.id === action.payload.id ? action.payload : a)
        .sort((a, b) => a.startTime - b.startTime);
      return { ...state, annotations: list };
    }
    case 'REORDER_ANNOTATIONS':
      return { ...state, annotations: action.payload };
    case 'LOAD_ANNOTATIONS':
      return { ...state, annotations: action.payload.sort((a, b) => a.startTime - b.startTime) };
    case 'SELECT_ANNOTATION':
      return { ...state, selectedAnnotationId: action.payload };
    default:
      return state;
  }
}

interface AnnotationContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  exportJSON: () => void;
  loadAnnotations: (audioId: string) => Promise<void>;
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAnnotations = async (audioId: string) => {
    const all = await dbGetAll(STORE_ANNOTATIONS);
    const filtered = all.filter((a: any) => a.audioId === audioId).map(({ audioId, ...rest }) => rest);
    dispatch({ type: 'LOAD_ANNOTATIONS', payload: filtered });
  };

  const exportJSON = () => {
    if (!state.audioFile) return;
    const data = {
      filename: state.audioFile.name,
      sampleRate: state.audioFile.sampleRate,
      duration: state.audioFile.duration,
      annotations: state.annotations.map(a => ({
        startTime: a.startTime,
        endTime: a.endTime,
        label: LABEL_NAMES[a.label],
        labelKey: a.label
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.audioFile.name.replace(/\.[^.]+$/, '')}_annotations.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnnotationContext.Provider value={{ state, dispatch, exportJSON, loadAnnotations }}>
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotationStore() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error('useAnnotationStore must be used within AnnotationProvider');
  return ctx;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
