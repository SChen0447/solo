import { useRef, useCallback, memo } from 'react'
import { AnimationElement, SCENE_WIDTH, SCENE_HEIGHT } from '../types'
import { buildBezierPath, getPointOnPath, applyEasing } from '../utils/easing'

interface Props {
  elements: AnimationElement[]
  selectedElementId: string | null
  selectedNodeId: string | null
  splitScreen: boolean
  currentTime: number
  isPlaying: boolean
  onSelectElement: (id: string | null) => void
  onSelectNode: (id: string | null) => void
  onUpdatePathNode: (elementId: string, nodeId: string, x: number, y: number) => void
}

interface SceneProps {
  elements: AnimationElement[]
  selectedElementId: string | null
  selectedNodeId: string | null
  readOnly: boolean
  currentTime: number
  isPlaying: boolean
  onSelectElement?: (id: string | null) => void
  onSelectNode?: (id: string | null) => void
  onUpdatePathNode?: (elementId: string, nodeId: string, x: number, y: number) => void
}

const getElementPosition = (element: AnimationElement, currentTime: number, isPlaying: boolean) => {
  if (!isPlaying) {
    const node = element.pathNodes[0]
    return { x: node.x, y: node.y }
  }
  const totalTime = element.duration + element.delay
  if (totalTime <= 0) return { x: element.pathNodes[0].x, y: element.pathNodes[0].y }

  let t = (currentTime % totalTime)
  if (t < element.delay) {
    t = 0
  } else {
    t = (t - element.delay) / element.duration
  }

  const easedT = applyEasing(t, element.easing)
  return getPointOnPath(element.pathNodes, easedT)
}

const SceneContent = memo(
  ({
    elements,
    selectedElementId,
    selectedNodeId,
    readOnly,
    currentTime,
    isPlaying,
    onSelectElement,
    onSelectNode,
    onUpdatePathNode
  }: SceneProps) => {
    const sceneRef = useRef<HTMLDivElement>(null)
    const draggingRef = useRef<{ elementId: string; nodeId: string } | null>(null)

    const getSceneCoords = useCallback((clientX: number, clientY: number) => {
      if (!sceneRef.current) return { x: 0, y: 0 }
      const rect = sceneRef.current.getBoundingClientRect()
      return {
        x: Math.max(0, Math.min(SCENE_WIDTH, clientX - rect.left)),
        y: Math.max(0, Math.min(SCENE_HEIGHT, clientY - rect.top))
      }
    }, [])

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!draggingRef.current || !onUpdatePathNode) return
        const { x, y } = getSceneCoords(e.clientX, e.clientY)
        onUpdatePathNode(draggingRef.current.elementId, draggingRef.current.nodeId, x, y)
      },
      [getSceneCoords, onUpdatePathNode]
    )

    const handleMouseUp = useCallback(() => {
      draggingRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }, [handleMouseMove])

    const handleNodeMouseDown = useCallback(
      (e: React.MouseEvent, elementId: string, nodeId: string) => {
        if (readOnly) return
        e.stopPropagation()
        draggingRef.current = { elementId, nodeId }
        onSelectNode?.(nodeId)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
      },
      [readOnly, onSelectNode, handleMouseMove, handleMouseUp]
    )

    const handleSceneClick = useCallback(() => {
      if (!readOnly) {
        onSelectElement?.(null)
        onSelectNode?.(null)
      }
    }, [readOnly, onSelectElement, onSelectNode])

    return (
      <div
        ref={sceneRef}
        className="scene"
        onClick={handleSceneClick}
      >
        <div className="scene-axis">
          <span>O (0, 0)</span>
        </div>
        <span className="axis-label axis-x-label">x →</span>
        <span className="axis-label axis-y-label">↑ y</span>

        <svg className="scene-svg" width={SCENE_WIDTH} height={SCENE_HEIGHT}>
          {elements.map((element) => {
            const isSelected = element.id === selectedElementId
            if (!isSelected || element.pathNodes.length < 2) return null
            const pathD = buildBezierPath(element.pathNodes)
            return (
              <path
                key={`path-${element.id}`}
                d={pathD}
                fill="none"
                stroke="#3498db"
                strokeWidth={2}
                strokeOpacity={0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}

          {!readOnly &&
            elements.map((element) => {
              const isSelected = element.id === selectedElementId
              if (!isSelected) return null
              return element.pathNodes.map((node) => {
                const isNodeSelected = node.id === selectedNodeId
                return (
                  <circle
                    key={`node-${node.id}`}
                    className={`path-node${isNodeSelected ? ' selected' : ''}`}
                    cx={node.x}
                    cy={node.y}
                    r={isNodeSelected ? 8 : 6}
                    fill={isNodeSelected ? '#e74c3c' : '#ffffff'}
                    stroke="#333"
                    strokeWidth={1.5}
                    onMouseDown={(e) => handleNodeMouseDown(e, element.id, node.id)}
                  />
                )
              })
            })}
        </svg>

        {elements.map((element) => {
          const pos = getElementPosition(element, currentTime, isPlaying)
          const isSelected = element.id === selectedElementId
          return (
            <div
              key={element.id}
              className={`animated-element${isSelected ? ' selected' : ''}`}
              style={{
                backgroundColor: element.color,
                left: pos.x,
                top: pos.y,
                cursor: readOnly ? 'default' : 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (!readOnly) onSelectElement?.(element.id)
              }}
            />
          )
        })}
      </div>
    )
  }
)

SceneContent.displayName = 'SceneContent'

const PathEditor = ({
  elements,
  selectedElementId,
  selectedNodeId,
  splitScreen,
  currentTime,
  isPlaying,
  onSelectElement,
  onSelectNode,
  onUpdatePathNode
}: Props) => {
  return (
    <div className="scene-wrapper">
      <div className="scene-container">
        <SceneContent
          elements={elements}
          selectedElementId={selectedElementId}
          selectedNodeId={selectedNodeId}
          readOnly={false}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onSelectElement={onSelectElement}
          onSelectNode={onSelectNode}
          onUpdatePathNode={onUpdatePathNode}
        />
        {splitScreen && (
          <>
            <div className="scene-divider" />
            <SceneContent
              elements={elements}
              selectedElementId={selectedElementId}
              selectedNodeId={selectedNodeId}
              readOnly={true}
              currentTime={currentTime}
              isPlaying={isPlaying}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default memo(PathEditor)
