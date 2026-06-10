import { createSlice, PayloadAction, configureStore } from '@reduxjs/toolkit';
import {
  PoemLine,
  Version,
  createInitialVersion,
  createPoemLine,
  createVersionSnapshot,
  rebuildLinesFromVersion,
  MAX_LINES,
} from '../utils/versionManager';

interface PoemState {
  versions: Version[];
  currentVersionIndex: number;
  authors: string[];
}

const initialVersion = createInitialVersion();

const initialState: PoemState = {
  versions: [initialVersion],
  currentVersionIndex: 0,
  authors: ['李白', '杜甫', '苏轼'],
};

const poemSlice = createSlice({
  name: 'poem',
  initialState,
  reducers: {
    addLine: (
      state,
      action: PayloadAction<{ text: string; author: string }>
    ) => {
      const currentVersion = state.versions[state.currentVersionIndex];
      if (currentVersion.lines.length >= MAX_LINES) return;

      const newLine = createPoemLine(action.payload.text, action.payload.author);
      const newVersion = createVersionSnapshot(
        currentVersion.lines,
        newLine,
        currentVersion.versionNumber
      );

      state.versions = state.versions.slice(0, state.currentVersionIndex + 1);
      state.versions.push(newVersion);
      state.currentVersionIndex = state.versions.length - 1;

      if (!state.authors.includes(action.payload.author)) {
        state.authors.push(action.payload.author);
      }
    },
    goToVersion: (state, action: PayloadAction<number>) => {
      if (action.payload >= 0 && action.payload < state.versions.length) {
        state.currentVersionIndex = action.payload;
      }
    },
    undo: (state) => {
      if (state.currentVersionIndex > 0) {
        state.currentVersionIndex--;
      }
    },
    redo: (state) => {
      if (state.currentVersionIndex < state.versions.length - 1) {
        state.currentVersionIndex++;
      }
    },
    reset: (state) => {
      const newInitialVersion = createInitialVersion();
      state.versions = [newInitialVersion];
      state.currentVersionIndex = 0;
    },
  },
});

export const { addLine, goToVersion, undo, redo, reset } = poemSlice.actions;

export const selectCurrentLines = (state: { poem: PoemState }): PoemLine[] => {
  return state.poem.versions[state.poem.currentVersionIndex].lines;
};

export const selectCurrentVersion = (state: { poem: PoemState }): Version => {
  return state.poem.versions[state.poem.currentVersionIndex];
};

export const selectVersions = (state: { poem: PoemState }): Version[] => {
  return state.poem.versions;
};

export const selectCurrentVersionIndex = (state: { poem: PoemState }): number => {
  return state.poem.currentVersionIndex;
};

export const selectAuthors = (state: { poem: PoemState }): string[] => {
  return state.poem.authors;
};

export const store = configureStore({
  reducer: {
    poem: poemSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default poemSlice.reducer;
