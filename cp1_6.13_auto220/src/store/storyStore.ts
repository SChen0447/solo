import { create } from 'zustand'
import {
  type StoryData,
  type StoryNode,
  type Achievement,
  type GameState,
  fetchStoryData,
  shuffleBranchNodes,
  loadGameState,
  saveGameState,
  clearGameState,
  createInitialState,
} from '@/services/storyService'

interface StoryStore {
  storyData: StoryData | null
  gameState: GameState | null
  appPhase: 'welcome' | 'story' | 'ending'
  isLoading: boolean

  loadStory: () => Promise<void>
  startJourney: () => void
  chooseOption: (nextNodeId: string) => void
  restart: () => void
  getCurrentNode: () => StoryNode | null
  getNodeById: (id: string) => StoryNode | undefined
  getVisitedCount: () => number
  getTotalNodes: () => number
  getAchievements: () => Achievement[]
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  storyData: null,
  gameState: null,
  appPhase: 'welcome',
  isLoading: false,

  loadStory: async () => {
    set({ isLoading: true })
    try {
      const data = await fetchStoryData()
      const savedState = loadGameState()

      if (savedState && data.nodes.some(n => n.id === savedState.currentNodeId)) {
        set({ storyData: data, gameState: savedState, appPhase: 'story', isLoading: false })
      } else {
        set({ storyData: data, isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  startJourney: () => {
    const { storyData } = get()
    if (!storyData) return

    const shuffledNodes = shuffleBranchNodes(storyData.nodes)
    const newData = { ...storyData, nodes: shuffledNodes }
    const state = createInitialState(newData.startNodeId)
    saveGameState(state)
    set({ storyData: newData, gameState: state, appPhase: 'story' })
  },

  chooseOption: (nextNodeId: string) => {
    const { storyData, gameState } = get()
    if (!storyData || !gameState) return

    const nextNode = storyData.nodes.find(n => n.id === nextNodeId)
    if (!nextNode) return

    const newAchievements = [...gameState.achievements]
    if (nextNode.achievement && !newAchievements.some(a => a.name === nextNode.achievement!.name)) {
      newAchievements.push(nextNode.achievement)
    }

    const newState: GameState = {
      currentNodeId: nextNodeId,
      visitedNodes: [...gameState.visitedNodes, nextNodeId],
      achievements: newAchievements,
    }
    saveGameState(newState)

    if (nextNode.isEnding) {
      set({ gameState: newState, appPhase: 'ending' })
    } else {
      set({ gameState: newState })
    }
  },

  restart: () => {
    clearGameState()
    const { storyData } = get()
    if (!storyData) {
      set({ gameState: null, appPhase: 'welcome' })
      return
    }
    const shuffledNodes = shuffleBranchNodes(storyData.nodes)
    const newData = { ...storyData, nodes: shuffledNodes }
    const state = createInitialState(newData.startNodeId)
    saveGameState(state)
    set({ storyData: newData, gameState: state, appPhase: 'story' })
  },

  getCurrentNode: () => {
    const { storyData, gameState } = get()
    if (!storyData || !gameState) return null
    return storyData.nodes.find(n => n.id === gameState.currentNodeId) || null
  },

  getNodeById: (id: string) => {
    return get().storyData?.nodes.find(n => n.id === id)
  },

  getVisitedCount: () => {
    return get().gameState?.visitedNodes.length || 0
  },

  getTotalNodes: () => {
    return get().storyData?.nodes.length || 0
  },

  getAchievements: () => {
    return get().gameState?.achievements || []
  },
}))
