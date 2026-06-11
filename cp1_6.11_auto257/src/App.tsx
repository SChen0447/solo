import { useState, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { v4 as uuidv4 } from 'uuid'
import QuantumNetwork from './QuantumNetwork'
import ControlPanel from './ControlPanel'
import HistoryPanel from './HistoryPanel'

export type EntanglementState = 'bell' | 'ghz' | 'w'

export interface NetworkNode {
  id: string
  x: number
  y: number
  z: number
}

export interface Snapshot {
  id: string
  timestamp: number
  nodes: NetworkNode[]
  entanglementState: EntanglementState
  entanglementDistance: number
  thumbnail?: string
}

const generateInitialNodes = (): NetworkNode[] => {
  const nodes: NetworkNode[] = []
  const centerX = 0
  const centerY = 0
  const radius = 3

  nodes.push({ id: uuidv4(), x: centerX, y: centerY, z: 0 })

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
    nodes.push({
      id: uuidv4(),
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      z: 0
    })
  }
  return nodes
}

const App = () => {
  const [nodes, setNodes] = useState<NetworkNode[]>(generateInitialNodes)
  const [entanglementState, setEntanglementState] = useState<EntanglementState>('bell')
  const [entanglementDistance, setEntanglementDistance] = useState<number>(50)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isReplaying, setIsReplaying] = useState(false)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  const networkRef = useRef<HTMLDivElement>(null)

  const handleNodeMove = useCallback((id: string, x: number, y: number, z: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y, z } : n))
  }, [])

  const handleSaveSnapshot = useCallback(() => {
    const snapshot: Snapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      nodes: JSON.parse(JSON.stringify(nodes)),
      entanglementState,
      entanglementDistance
    }
    setSnapshots(prev => {
      const updated = [snapshot, ...prev]
      return updated.slice(0, 10)
    })
  }, [nodes, entanglementState, entanglementDistance])

  const handleReplaySnapshot = useCallback((snapshot: Snapshot) => {
    setIsReplaying(true)
    const startNodes = JSON.parse(JSON.stringify(nodes))
    const startState = entanglementState
    const startDistance = entanglementDistance
    const duration = 1500
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const interpolatedNodes = startNodes.map((n: NetworkNode, i: number) => ({
        ...n,
        x: n.x + (snapshot.nodes[i].x - n.x) * ease,
        y: n.y + (snapshot.nodes[i].y - n.y) * ease,
        z: n.z + (snapshot.nodes[i].z - n.z) * ease
      }))
      setNodes(interpolatedNodes)
      setEntanglementDistance(startDistance + (snapshot.entanglementDistance - startDistance) * ease)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setEntanglementState(snapshot.entanglementState)
        setIsReplaying(false)
      }
    }
    requestAnimationFrame(animate)
  }, [nodes, entanglementState, entanglementDistance])

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'linear-gradient(180deg, #0f0f2e 0%, #301a52 100%)',
      overflow: 'hidden'
    }}>
      <div
        ref={networkRef}
        style={{
          position: 'absolute',
          left: leftPanelOpen ? '250px' : '0',
          right: rightPanelOpen ? '200px' : '0',
          top: '140px',
          bottom: '0',
          transition: 'left 0.3s ease, right 0.3s ease'
        }}
      >
        <QuantumNetwork
          nodes={nodes}
          onNodeMove={handleNodeMove}
          entanglementState={entanglementState}
          entanglementDistance={entanglementDistance}
        />
      </div>

      <ControlPanel
        entanglementState={entanglementState}
        onStateChange={setEntanglementState}
        entanglementDistance={entanglementDistance}
        onDistanceChange={setEntanglementDistance}
        onSaveSnapshot={handleSaveSnapshot}
        isOpen={leftPanelOpen}
        onToggle={() => setLeftPanelOpen(!leftPanelOpen)}
        nodes={nodes}
      />

      <HistoryPanel
        snapshots={snapshots}
        onReplay={handleReplaySnapshot}
        isReplaying={isReplaying}
        isOpen={rightPanelOpen}
        onToggle={() => setRightPanelOpen(!rightPanelOpen)}
      />

      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        style={{
          display: leftPanelOpen ? 'none' : 'flex',
          position: 'fixed',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          width: '40px',
          height: '60px',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(26, 26, 58, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(51, 204, 255, 0.3)',
          borderRadius: '0 8px 8px 0',
          color: '#33ccff',
          cursor: 'pointer',
          fontSize: '20px',
          transition: 'all 0.3s ease'
        }}
      >
        →
      </button>

      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        style={{
          display: rightPanelOpen ? 'none' : 'flex',
          position: 'fixed',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          width: '40px',
          height: '60px',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(26, 26, 58, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(51, 204, 255, 0.3)',
          borderRadius: '8px 0 0 8px',
          color: '#33ccff',
          cursor: 'pointer',
          fontSize: '20px',
          transition: 'all 0.3s ease'
        }}
      >
        ←
      </button>
    </div>
  )
}

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)

export default App
