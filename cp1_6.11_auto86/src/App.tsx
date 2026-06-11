import { useState, useCallback, useEffect, useRef } from 'react'
import GardenCanvas from './components/GardenCanvas'
import Toolbar from './components/Toolbar'
import StatsPanel from './components/StatsPanel'

export type ElementType = 'rock' | 'rake' | 'moss'

export interface RockData {
  kind: 'rock'
  points: [number, number][]
  size: number
  gradientAngle: number
}

export interface RakeData {
  kind: 'rake'
  arcCount: number
  paths: string[]
  rotation: number
  width: number
  height: number
}

export interface MossData {
  kind: 'moss'
  radius: number
}

export type ElementData = RockData | RakeData | MossData

export interface GardenElement {
  id: string
  type: ElementType
  x: number
  y: number
  data: ElementData
  fadeIn?: boolean
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

function generateRockData(): RockData {
  const vertexCount = 4 + Math.floor(Math.random() * 3)
  const size = 30 + Math.random() * 30
  const gradientAngle = Math.random() * 360
  const points: [number, number][] = []
  for (let i = 0; i < vertexCount; i++) {
    const angle = (2 * Math.PI * i) / vertexCount + (Math.random() - 0.5) * 0.6
    const r = size * (0.5 + Math.random() * 0.5)
    points.push([Math.cos(angle) * r, Math.sin(angle) * r])
  }
  return { kind: 'rock', points, size, gradientAngle }
}

function generateRakeData(): RakeData {
  const arcCount = 5 + Math.floor(Math.random() * 4)
  const spacing = 6 + Math.random() * 4
  const curveHeight = 20 + Math.random() * 25
  const baseLength = 60 + Math.random() * 40
  const rotation = Math.random() * Math.PI * 2

  const paths: string[] = []
  for (let i = 0; i < arcCount; i++) {
    const offset = (i - (arcCount - 1) / 2) * spacing
    const startX = -baseLength / 2
    const startY = offset
    const endX = baseLength / 2
    const endY = offset
    const controlX = 0
    const controlY = offset - curveHeight
    paths.push(`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`)
  }

  return {
    kind: 'rake',
    arcCount,
    paths,
    rotation,
    width: baseLength,
    height: (arcCount - 1) * spacing + curveHeight,
  }
}

function generateMossData(): MossData {
  const radius = 15 + Math.random() * 15
  return { kind: 'moss', radius }
}

export function generateElementData(type: ElementType): ElementData {
  switch (type) {
    case 'rock': return generateRockData()
    case 'rake': return generateRakeData()
    case 'moss': return generateMossData()
  }
}

export function calculateFillRate(elements: GardenElement[], canvasSize: number): number {
  let totalArea = 0
  for (const el of elements) {
    const data = el.data
    if (data.kind === 'rock') {
      totalArea += Math.PI * (data.size / 2) ** 2
    } else if (data.kind === 'rake') {
      totalArea += data.width * data.height * 0.5
    } else if (data.kind === 'moss') {
      totalArea += Math.PI * data.radius ** 2
    }
  }
  return Math.min((totalArea / (canvasSize * canvasSize)) * 100, 100)
}

const MAX_ELEMENTS = 20
const MAX_UNDO = 10
const CANVAS_SIZE = 600

export default function App() {
  const [elements, setElements] = useState<GardenElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<GardenElement[][]>([])
  const [stepCount, setStepCount] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const lastMoveActionRef = useRef(false)

  const pushUndo = useCallback((currentElements: GardenElement[], isMove = false) => {
    if (isMove && lastMoveActionRef.current) return
    if (isMove) lastMoveActionRef.current = true
    setUndoStack(prev => {
      const next = [...prev, currentElements]
      return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next
    })
  }, [])

  const addElement = useCallback((type: ElementType, x: number, y: number) => {
    setElements(prev => {
      if (prev.length >= MAX_ELEMENTS) return prev
      pushUndo(prev)
      const newEl: GardenElement = {
        id: generateId(),
        type,
        x: Math.max(40, Math.min(CANVAS_SIZE - 40, x)),
        y: Math.max(40, Math.min(CANVAS_SIZE - 40, y)),
        data: generateElementData(type),
        fadeIn: true,
      }
      return [...prev, newEl]
    })
    setStepCount(prev => prev + 1)
  }, [pushUndo])

  const addElementRandom = useCallback((type: ElementType) => {
    const x = 60 + Math.random() * (CANVAS_SIZE - 120)
    const y = 60 + Math.random() * (CANVAS_SIZE - 120)
    addElement(type, x, y)
  }, [addElement])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setElements(prev => {
      pushUndo(prev)
      return prev.filter(e => e.id !== selectedId)
    })
    setSelectedId(null)
    setStepCount(prev => prev + 1)
  }, [selectedId, pushUndo])

  const moveSelected = useCallback((dx: number, dy: number) => {
    if (!selectedId) return
    setElements(prev => {
      const el = prev.find(e => e.id === selectedId)
      if (!el) return prev
      pushUndo(prev, true)
      return prev.map(e =>
        e.id === selectedId
          ? { ...e, x: Math.max(10, Math.min(CANVAS_SIZE - 10, e.x + dx)), y: Math.max(10, Math.min(CANVAS_SIZE - 10, e.y + dy)) }
          : e
      )
    })
    setStepCount(prev => prev + 1)
  }, [selectedId, pushUndo])

  const moveElementTo = useCallback((id: string, x: number, y: number) => {
    setElements(prev => {
      pushUndo(prev, true)
      return prev.map(e =>
        e.id === id
          ? { ...e, x: Math.max(10, Math.min(CANVAS_SIZE - 10, x)), y: Math.max(10, Math.min(CANVAS_SIZE - 10, y)) }
          : e
      )
    })
    setStepCount(prev => prev + 1)
  }, [pushUndo])

  const startDragElement = useCallback((id: string) => {
    setElements(prev => {
      pushUndo(prev)
      return prev
    })
    lastMoveActionRef.current = false
    setSelectedId(id)
  }, [pushUndo])

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const restored = prev[prev.length - 1]
      setElements(restored.map(e => ({ ...e, fadeIn: true })))
      setSelectedId(null)
      setStepCount(s => s + 1)
      return prev.slice(0, -1)
    })
  }, [])

  const clearAll = useCallback(() => {
    if (elements.length === 0) return
    if (!window.confirm('确定要清空花园吗？所有元素将被移除。')) return
    setIsClearing(true)
    setTimeout(() => {
      pushUndo(elements)
      setElements([])
      setSelectedId(null)
      setStepCount(prev => prev + 1)
      setIsClearing(false)
    }, 500)
  }, [elements, pushUndo])

  const fillRate = calculateFillRate(elements, CANVAS_SIZE)

  useEffect(() => {
    if (fillRate > 80 && !isFlashing) {
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 2000)
    }
  }, [fillRate, isFlashing])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }
      const step = 5
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); moveSelected(0, -step); break
        case 'ArrowDown': e.preventDefault(); moveSelected(0, step); break
        case 'ArrowLeft': e.preventDefault(); moveSelected(-step, 0); break
        case 'ArrowRight': e.preventDefault(); moveSelected(step, 0); break
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        lastMoveActionRef.current = false
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [deleteSelected, moveSelected, undo])

  return (
    <div className="app-container">
      <Toolbar
        onAddRock={() => addElementRandom('rock')}
        onAddRake={() => addElementRandom('rake')}
        onAddMoss={() => addElementRandom('moss')}
        onUndo={undo}
        onClear={clearAll}
        canUndo={undoStack.length > 0}
        elementCount={elements.length}
        maxElements={MAX_ELEMENTS}
      />
      <div className="main-area">
        <GardenCanvas
          elements={elements}
          selectedId={selectedId}
          isClearing={isClearing}
          isFlashing={isFlashing}
          onSelect={setSelectedId}
          onMoveElement={moveElementTo}
          onStartDrag={startDragElement}
          onAddElement={addElement}
          canvasSize={CANVAS_SIZE}
        />
        <StatsPanel
          elements={elements}
          fillRate={fillRate}
          stepCount={stepCount}
        />
      </div>
    </div>
  )
}
