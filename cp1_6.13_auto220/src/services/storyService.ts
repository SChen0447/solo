export interface StoryNode {
  id: string
  text: string
  options: StoryOption[]
  atmosphere: 'tense' | 'calm' | 'mysterious' | 'triumphant'
  isEnding: boolean
  endingTitle?: string
  achievement?: Achievement
}

export interface StoryOption {
  text: string
  nextNodeId: string
  isBranch?: boolean
}

export interface Achievement {
  name: string
  description: string
  color: string
}

export interface AudioConfig {
  atmosphere: 'tense' | 'calm' | 'mysterious' | 'triumphant'
  windFreq: number
  heartbeatRate: number
  bellFreq: number
  volume: number
}

export interface StoryData {
  title: string
  intro: string
  startNodeId: string
  nodes: StoryNode[]
  audioConfigs: Record<string, AudioConfig>
}

export interface GameState {
  currentNodeId: string
  visitedNodes: string[]
  achievements: Achievement[]
}

const STORAGE_KEY = 'starpath_game_state'

export async function fetchStoryData(): Promise<StoryData> {
  const response = await fetch('/api/story')
  if (!response.ok) throw new Error('Failed to fetch story data')
  return response.json()
}

export function shuffleBranchNodes(nodes: StoryNode[]): StoryNode[] {
  const branchNodeIds = new Set<string>()
  const branchOptionTargets = new Map<string, string>()

  nodes.forEach(node => {
    node.options.forEach(opt => {
      if (opt.isBranch) {
        branchNodeIds.add(opt.nextNodeId)
        branchOptionTargets.set(node.id + ':' + opt.text, opt.nextNodeId)
      }
    })
  })

  const branchNodes = nodes.filter(n => branchNodeIds.has(n.id))
  if (branchNodes.length < 2) return [...nodes]

  const shuffled = [...branchNodes]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const idMapping = new Map<string, string>()
  branchNodes.forEach((original, idx) => {
    idMapping.set(original.id, shuffled[idx].id)
  })

  const newNodes = nodes.map(node => {
    if (branchNodeIds.has(node.id)) {
      const mappedId = idMapping.get(node.id)!
      return nodes.find(n => n.id === mappedId)!
    }
    return {
      ...node,
      options: node.options.map(opt => ({
        ...opt,
        nextNodeId: idMapping.get(opt.nextNodeId) || opt.nextNodeId,
      })),
    }
  })

  return newNodes
}

export function loadGameState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function createInitialState(startNodeId: string): GameState {
  return {
    currentNodeId: startNodeId,
    visitedNodes: [startNodeId],
    achievements: [],
  }
}
