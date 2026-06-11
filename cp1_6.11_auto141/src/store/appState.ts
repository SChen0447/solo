import { proxy } from 'valtio'
import { v4 as uuidv4 } from 'uuid'
import type { PlacedFlower, VaseType, AppState, AppSnapshot } from '@/types'
import { getFlowerById } from '@/data/flowerCatalog'
import { getVaseOpeningRadius } from '@/utils/vaseUtils'

const MAX_HISTORY = 20

const createInitialState = (): AppState => ({
  flowers: [],
  vaseType: 'round',
  selectedFlowerId: null,
  viewMode: 'normal',
  history: [],
  historyIndex: -1,
  currentView: 'editor',
  workName: '我的插花作品'
})

export const appState = proxy<AppState>(createInitialState())

const saveSnapshot = () => {
  const snapshot: AppSnapshot = {
    flowers: JSON.parse(JSON.stringify(appState.flowers)),
    vaseType: appState.vaseType
  }
  
  if (appState.historyIndex < appState.history.length - 1) {
    appState.history = appState.history.slice(0, appState.historyIndex + 1)
  }
  
  appState.history.push(snapshot)
  
  if (appState.history.length > MAX_HISTORY) {
    appState.history.shift()
  } else {
    appState.historyIndex++
  }
}

export const addFlower = (flowerType: string) => {
  const flowerData = getFlowerById(flowerType)
  if (!flowerData) return

  const stemHeight = flowerData.stemMin + Math.random() * (flowerData.stemMax - flowerData.stemMin)
  
  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * 0.5
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  const newFlower: PlacedFlower = {
    id: uuidv4(),
    flowerType,
    stemHeight: Math.round(stemHeight),
    position: { x, z },
    rotation: Math.floor(Math.random() * 360)
  }

  saveSnapshot()
  appState.flowers.push(newFlower)
  appState.selectedFlowerId = newFlower.id
}

export const removeFlower = (flowerId: string) => {
  const index = appState.flowers.findIndex(f => f.id === flowerId)
  if (index === -1) return

  saveSnapshot()
  appState.flowers.splice(index, 1)
  if (appState.selectedFlowerId === flowerId) {
    appState.selectedFlowerId = null
  }
}

export const updateFlowerPosition = (flowerId: string, x: number, z: number) => {
  const flower = appState.flowers.find(f => f.id === flowerId)
  if (!flower) return
  flower.position.x = x
  flower.position.z = z
}

export const updateFlowerStemHeight = (flowerId: string, height: number) => {
  const flower = appState.flowers.find(f => f.id === flowerId)
  if (!flower) return
  flower.stemHeight = height
}

export const updateFlowerRotation = (flowerId: string, rotation: number) => {
  const flower = appState.flowers.find(f => f.id === flowerId)
  if (!flower) return
  flower.rotation = rotation
}

export const selectFlower = (flowerId: string | null) => {
  appState.selectedFlowerId = flowerId
}

export const setVaseType = (vaseType: VaseType) => {
  if (appState.vaseType === vaseType) return
  saveSnapshot()
  appState.vaseType = vaseType
  redistribukeFlowers(vaseType)
}

const redistribukeFlowers = (vaseType: VaseType) => {
  const maxRadius = vaseType === 'square' ? 0.7 : vaseType === 'long' ? 0.4 : 0.6
  
  appState.flowers.forEach(flower => {
    const currentRadius = Math.sqrt(
      flower.position.x ** 2 + flower.position.z ** 2
    )
    if (currentRadius > maxRadius && currentRadius > 0) {
      const scale = maxRadius / currentRadius
      flower.position.x *= scale
      flower.position.z *= scale
    }
  })
}

export const setViewMode = (mode: 'normal' | 'top') => {
  appState.viewMode = mode
}

export const undo = () => {
  if (appState.historyIndex <= 0) return
  
  appState.historyIndex--
  const snapshot = appState.history[appState.historyIndex]
  
  appState.flowers = JSON.parse(JSON.stringify(snapshot.flowers))
  appState.vaseType = snapshot.vaseType
  appState.selectedFlowerId = null
}

export const redo = () => {
  if (appState.historyIndex >= appState.history.length - 1) return
  
  appState.historyIndex++
  const snapshot = appState.history[appState.historyIndex]
  
  appState.flowers = JSON.parse(JSON.stringify(snapshot.flowers))
  appState.vaseType = snapshot.vaseType
  appState.selectedFlowerId = null
}

export const setCurrentView = (view: 'editor' | 'gallery') => {
  appState.currentView = view
}

export const setWorkName = (name: string) => {
  appState.workName = name
}

export const loadWork = (flowers: PlacedFlower[], vaseType: VaseType, workName: string) => {
  saveSnapshot()
  appState.flowers = JSON.parse(JSON.stringify(flowers))
  appState.vaseType = vaseType
  appState.workName = workName
  appState.selectedFlowerId = null
  appState.currentView = 'editor'
}

let isInitialized = false

export const initHistory = () => {
  if (isInitialized) return
  isInitialized = true
  
  const initialSnapshot: AppSnapshot = {
    flowers: [],
    vaseType: 'round'
  }
  appState.history = [initialSnapshot]
  appState.historyIndex = 0
}

export const canUndo = (): boolean => appState.historyIndex > 0
export const canRedo = (): boolean => appState.historyIndex < appState.history.length - 1
