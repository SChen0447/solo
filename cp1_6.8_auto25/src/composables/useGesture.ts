import { ref, computed, reactive } from 'vue'
import type { Node, PathSegment, GestureConfig } from '../types'

export function useGesture(canvasSize: { width: number; height: number }) {
  const gridSize = 3
  const nodes = ref<Node[]>([])
  const path = ref<number[]>([])
  const pathSegments = ref<PathSegment[]>([])
  const isDrawing = ref(false)
  const currentMousePos = reactive({ x: 0, y: 0 })
  const animatingSegments = ref<Map<number, number>>(new Map())

  const padding = 60

  const initNodes = () => {
    const newNodes: Node[] = []
    const cellWidth = (canvasSize.width - padding * 2) / (gridSize - 1)
    const cellHeight = (canvasSize.height - padding * 2) / (gridSize - 1)

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const id = row * gridSize + col
        newNodes.push({
          id,
          row,
          col,
          x: padding + col * cellWidth,
          y: padding + row * cellHeight,
          color: '#e94560'
        })
      }
    }
    nodes.value = newNodes
  }

  const updateNodePositions = () => {
    const cellWidth = (canvasSize.width - padding * 2) / (gridSize - 1)
    const cellHeight = (canvasSize.height - padding * 2) / (gridSize - 1)

    nodes.value.forEach(node => {
      node.x = padding + node.col * cellWidth
      node.y = padding + node.row * cellHeight
    })
  }

  const getNodeAtPosition = (x: number, y: number, nodeSize: number): Node | null => {
    for (const node of nodes.value) {
      const dx = x - node.x
      const dy = y - node.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nodeSize * 1.5) {
        return node
      }
    }
    return null
  }

  const addNodeToPath = (nodeId: number): boolean => {
    if (path.value.includes(nodeId)) {
      return false
    }

    const lastNodeId = path.value[path.value.length - 1]
    path.value.push(nodeId)

    if (lastNodeId !== undefined) {
      const segmentIndex = pathSegments.value.length
      pathSegments.value.push({
        from: lastNodeId,
        to: nodeId,
        progress: 0
      })
      animateSegment(segmentIndex)
    }

    return true
  }

  const animateSegment = (index: number) => {
    const duration = 300
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      if (pathSegments.value[index]) {
        pathSegments.value[index].progress = easeOutCubic(progress)
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }

  const startDrawing = (x: number, y: number, nodeSize: number) => {
    isDrawing.value = true
    currentMousePos.x = x
    currentMousePos.y = y

    const node = getNodeAtPosition(x, y, nodeSize)
    if (node) {
      path.value = [node.id]
      pathSegments.value = []
    } else {
      path.value = []
      pathSegments.value = []
    }
  }

  const continueDrawing = (x: number, y: number, nodeSize: number) => {
    if (!isDrawing.value) return

    currentMousePos.x = x
    currentMousePos.y = y

    const node = getNodeAtPosition(x, y, nodeSize)
    if (node && !path.value.includes(node.id)) {
      addNodeToPath(node.id)
    }
  }

  const endDrawing = () => {
    isDrawing.value = false
  }

  const resetPath = () => {
    path.value = []
    pathSegments.value = []
    animatingSegments.value.clear()
  }

  const isValidPath = computed(() => path.value.length >= 4)

  const pathNodePositions = computed(() => {
    return path.value.map(id => {
      const node = nodes.value.find(n => n.id === id)
      return node ? { x: node.x, y: node.y, color: node.color } : { x: 0, y: 0, color: '#e94560' }
    })
  })

  const setNodeColor = (nodeId: number, color: string) => {
    const node = nodes.value.find(n => n.id === nodeId)
    if (node) {
      node.color = color
    }
  }

  const getAllNodeColors = (): Record<number, string> => {
    const colors: Record<number, string> = {}
    nodes.value.forEach(node => {
      colors[node.id] = node.color
    })
    return colors
  }

  const restoreFromHistory = (nodeColors: Record<number, string>, pathIds: number[]) => {
    nodes.value.forEach(node => {
      if (nodeColors[node.id] !== undefined) {
        node.color = nodeColors[node.id]
      }
    })

    path.value = [...pathIds]
    pathSegments.value = []

    for (let i = 1; i < pathIds.length; i++) {
      pathSegments.value.push({
        from: pathIds[i - 1],
        to: pathIds[i],
        progress: 1
      })
    }
  }

  return {
    nodes,
    path,
    pathSegments,
    isDrawing,
    currentMousePos,
    isValidPath,
    pathNodePositions,
    initNodes,
    updateNodePositions,
    getNodeAtPosition,
    startDrawing,
    continueDrawing,
    endDrawing,
    resetPath,
    setNodeColor,
    getAllNodeColors,
    restoreFromHistory
  }
}
