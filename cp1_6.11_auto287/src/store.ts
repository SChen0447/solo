import { create } from 'zustand'
import type { LoomState, HistoryEntry, FillMode } from './types'
import { DEFAULT_WARP_COLOR, DEFAULT_WEFT_COLOR } from './colors'

const DEFAULT_GRID_SIZE = 12
const MAX_HISTORY = 30

function createEmptyGrid(size: number, defaultColor: string): string[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => defaultColor)
  )
}

function createInitialState(): LoomState {
  const gridSize = DEFAULT_GRID_SIZE
  return {
    gridSize,
    warpColors: Array.from({ length: gridSize }, () => DEFAULT_WARP_COLOR),
    weftColors: Array.from({ length: gridSize }, () => DEFAULT_WEFT_COLOR),
    tension: 5,
    intersectionColors: createEmptyGrid(gridSize, ''),
    selectedColor: '#c62828',
    fillMode: 'point' as FillMode,
  }
}

interface LoomStore {
  loomState: LoomState
  historyStack: HistoryEntry[]
  historyIndex: number
  setSelectedColor: (color: string) => void
  setFillMode: (mode: FillMode) => void
  setTension: (tension: number) => void
  setGridSize: (size: number) => void
  fillIntersection: (row: number, col: number) => void
  fillWarpLine: (col: number) => void
  fillWeftLine: (row: number) => void
  fillDragArea: (startRow: number, startCol: number, endRow: number, endCol: number) => void
  undo: () => void
  redo: () => void
  resetGrid: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

function pushHistory(state: LoomStore, entry: HistoryEntry): Partial<LoomStore> {
  const newStack = state.historyStack.slice(0, state.historyIndex + 1)
  newStack.push(entry)
  if (newStack.length > MAX_HISTORY) {
    newStack.shift()
  }
  return {
    historyStack: newStack,
    historyIndex: newStack.length - 1,
  }
}

export const useLoomStore = create<LoomStore>((set, get) => ({
  loomState: createInitialState(),
  historyStack: [],
  historyIndex: -1,

  setSelectedColor: (color) =>
    set((state) => ({
      loomState: { ...state.loomState, selectedColor: color },
    })),

  setFillMode: (mode) =>
    set((state) => ({
      loomState: { ...state.loomState, fillMode: mode },
    })),

  setTension: (tension) =>
    set((state) => ({
      loomState: { ...state.loomState, tension },
    })),

  setGridSize: (size) =>
    set((state) => {
      const newWarpColors = Array.from({ length: size }, (_, i) =>
        i < state.loomState.warpColors.length
          ? state.loomState.warpColors[i]
          : DEFAULT_WARP_COLOR
      )
      const newWeftColors = Array.from({ length: size }, (_, i) =>
        i < state.loomState.weftColors.length
          ? state.loomState.weftColors[i]
          : DEFAULT_WEFT_COLOR
      )
      const newIntersectionColors = Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) =>
          row < state.loomState.intersectionColors.length &&
          col < state.loomState.intersectionColors[0]?.length
            ? state.loomState.intersectionColors[row][col]
            : ''
        )
      )
      return {
        loomState: {
          ...state.loomState,
          gridSize: size,
          warpColors: newWarpColors,
          weftColors: newWeftColors,
          intersectionColors: newIntersectionColors,
        },
      }
    }),

  fillIntersection: (row, col) =>
    set((state) => {
      const historyEntry: HistoryEntry = {
        intersectionColors: state.loomState.intersectionColors.map((r) => [...r]),
        warpColors: [...state.loomState.warpColors],
        weftColors: [...state.loomState.weftColors],
      }
      const newColors = state.loomState.intersectionColors.map((r) => [...r])
      newColors[row][col] = state.loomState.selectedColor
      return {
        ...pushHistory(state, historyEntry),
        loomState: { ...state.loomState, intersectionColors: newColors },
      }
    }),

  fillWarpLine: (col) =>
    set((state) => {
      const historyEntry: HistoryEntry = {
        intersectionColors: state.loomState.intersectionColors.map((r) => [...r]),
        warpColors: [...state.loomState.warpColors],
        weftColors: [...state.loomState.weftColors],
      }
      const newColors = state.loomState.intersectionColors.map((r) => [...r])
      const newWarpColors = [...state.loomState.warpColors]
      newWarpColors[col] = state.loomState.selectedColor
      for (let row = 0; row < state.loomState.gridSize; row++) {
        newColors[row][col] = state.loomState.selectedColor
      }
      return {
        ...pushHistory(state, historyEntry),
        loomState: {
          ...state.loomState,
          intersectionColors: newColors,
          warpColors: newWarpColors,
        },
      }
    }),

  fillWeftLine: (row) =>
    set((state) => {
      const historyEntry: HistoryEntry = {
        intersectionColors: state.loomState.intersectionColors.map((r) => [...r]),
        warpColors: [...state.loomState.warpColors],
        weftColors: [...state.loomState.weftColors],
      }
      const newColors = state.loomState.intersectionColors.map((r) => [...r])
      const newWeftColors = [...state.loomState.weftColors]
      newWeftColors[row] = state.loomState.selectedColor
      for (let col = 0; col < state.loomState.gridSize; col++) {
        newColors[row][col] = state.loomState.selectedColor
      }
      return {
        ...pushHistory(state, historyEntry),
        loomState: {
          ...state.loomState,
          intersectionColors: newColors,
          weftColors: newWeftColors,
        },
      }
    }),

  fillDragArea: (startRow, startCol, endRow, endCol) =>
    set((state) => {
      const historyEntry: HistoryEntry = {
        intersectionColors: state.loomState.intersectionColors.map((r) => [...r]),
        warpColors: [...state.loomState.warpColors],
        weftColors: [...state.loomState.weftColors],
      }
      const newColors = state.loomState.intersectionColors.map((r) => [...r])
      const minRow = Math.min(startRow, endRow)
      const maxRow = Math.max(startRow, endRow)
      const minCol = Math.min(startCol, endCol)
      const maxCol = Math.max(startCol, endCol)
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newColors[r][c] = state.loomState.selectedColor
        }
      }
      return {
        ...pushHistory(state, historyEntry),
        loomState: { ...state.loomState, intersectionColors: newColors },
      }
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex < 0) return state
      const entry = state.historyStack[state.historyIndex]
      return {
        loomState: {
          ...state.loomState,
          intersectionColors: entry.intersectionColors,
          warpColors: entry.warpColors,
          weftColors: entry.weftColors,
        },
        historyIndex: state.historyIndex - 1,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.historyStack.length - 1) return state
      const newIndex = state.historyIndex + 1
      const entry = state.historyStack[newIndex]
      return {
        loomState: {
          ...state.loomState,
          intersectionColors: entry.intersectionColors,
          warpColors: entry.warpColors,
          weftColors: entry.weftColors,
        },
        historyIndex: newIndex,
      }
    }),

  resetGrid: () =>
    set((state) => {
      const historyEntry: HistoryEntry = {
        intersectionColors: state.loomState.intersectionColors.map((r) => [...r]),
        warpColors: [...state.loomState.warpColors],
        weftColors: [...state.loomState.weftColors],
      }
      return {
        ...pushHistory(state, historyEntry),
        loomState: {
          ...state.loomState,
          intersectionColors: createEmptyGrid(state.loomState.gridSize, ''),
          warpColors: Array.from({ length: state.loomState.gridSize }, () => DEFAULT_WARP_COLOR),
          weftColors: Array.from({ length: state.loomState.gridSize }, () => DEFAULT_WEFT_COLOR),
        },
      }
    }),

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().historyStack.length - 1,
}))
