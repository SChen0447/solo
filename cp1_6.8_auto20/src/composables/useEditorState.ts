import { ref, computed } from 'vue'
import type { PrototypeElement, HistoryState, ToolType } from '@/types'
import { generateId, getElementDefaults, deepClone } from '@/utils/helpers'

const MAX_HISTORY_STEPS = 50

export function useEditorState() {
  const elements = ref<PrototypeElement[]>([])
  const selectedId = ref<string | null>(null)
  const currentTool = ref<ToolType>('select')
  const historyStack = ref<HistoryState[]>([])
  const historyIndex = ref(-1)

  const selectedElement = computed(() => {
    if (!selectedId.value) return null
    return elements.value.find((el) => el.id === selectedId.value) || null
  })

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

  const saveHistory = (): void => {
    const state: HistoryState = {
      elements: deepClone(elements.value),
      selectedId: selectedId.value
    }

    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
    }

    historyStack.value.push(state)

    if (historyStack.value.length > MAX_HISTORY_STEPS) {
      historyStack.value.shift()
    } else {
      historyIndex.value++
    }
  }

  const undo = (): void => {
    if (!canUndo.value) return

    historyIndex.value--
    const state = historyStack.value[historyIndex.value]
    if (state) {
      elements.value = deepClone(state.elements)
      selectedId.value = state.selectedId
    }
  }

  const redo = (): void => {
    if (!canRedo.value) return

    historyIndex.value++
    const state = historyStack.value[historyIndex.value]
    if (state) {
      elements.value = deepClone(state.elements)
      selectedId.value = state.selectedId
    }
  }

  const addElement = (type: string, x: number, y: number): PrototypeElement => {
    const defaults = getElementDefaults(type)
    const element: PrototypeElement = {
      id: generateId(),
      type: type as PrototypeElement['type'],
      label: defaults.label || '元素',
      style: {
        x,
        y,
        width: defaults.style?.width || 100,
        height: defaults.style?.height || 100,
        rotation: 0,
        opacity: 100
      },
      triggers: []
    }

    elements.value.push(element)
    selectedId.value = element.id
    saveHistory()

    return element
  }

  const updateElement = (id: string, updates: Partial<PrototypeElement>): void => {
    const index = elements.value.findIndex((el) => el.id === id)
    if (index === -1) return

    elements.value[index] = {
      ...elements.value[index],
      ...updates,
      style: {
        ...elements.value[index].style,
        ...(updates.style || {})
      }
    }
  }

  const updateElementWithHistory = (id: string, updates: Partial<PrototypeElement>): void => {
    updateElement(id, updates)
    saveHistory()
  }

  const deleteElement = (id: string): void => {
    const index = elements.value.findIndex((el) => el.id === id)
    if (index === -1) return

    elements.value.splice(index, 1)

    if (selectedId.value === id) {
      selectedId.value = null
    }

    saveHistory()
  }

  const selectElement = (id: string | null): void => {
    selectedId.value = id
  }

  const setTool = (tool: ToolType): void => {
    currentTool.value = tool
  }

  const clearSelection = (): void => {
    selectedId.value = null
  }

  const setElements = (newElements: PrototypeElement[]): void => {
    elements.value = deepClone(newElements)
    saveHistory()
  }

  const initHistory = (): void => {
    historyStack.value = []
    historyIndex.value = -1
    saveHistory()
  }

  return {
    elements,
    selectedId,
    selectedElement,
    currentTool,
    canUndo,
    canRedo,
    historyStack,
    historyIndex,
    addElement,
    updateElement,
    updateElementWithHistory,
    deleteElement,
    selectElement,
    setTool,
    clearSelection,
    saveHistory,
    undo,
    redo,
    setElements,
    initHistory
  }
}
