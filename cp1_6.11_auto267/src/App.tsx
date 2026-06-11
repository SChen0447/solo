import { useState, useEffect, useMemo, useCallback } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { v4 as uuidv4 } from 'uuid'
import Scene3D from './components/Scene3D'
import AcousticMap2D from './components/AcousticMap2D'
import ControlPanel from './components/ControlPanel'
import { useAcousticField } from './hooks/useAcousticField'
import {
  Building,
  SoundSource,
  ViewMode,
  ProbeInfo,
  SceneSnapshot,
  MaterialType,
  Vec2,
  STREET_WIDTH,
  STREET_DEPTH
} from './types'

function createDefaultBuildings(): Building[] {
  return [
    {
      id: uuidv4(),
      name: '建筑 A (Building A)',
      position: { x: -8, z: 0 },
      rotation: 0,
      dimensions: { width: 6, depth: 4, height: 3 },
      walls: {
        front: MaterialType.CONCRETE,
        back: MaterialType.BRICK,
        left: MaterialType.GLASS,
        right: MaterialType.CONCRETE
      },
      color: '#4a6fa5'
    },
    {
      id: uuidv4(),
      name: '建筑 B (Building B)',
      position: { x: 8, z: 0 },
      rotation: 0,
      dimensions: { width: 8, depth: 5, height: 3 },
      walls: {
        front: MaterialType.BRICK,
        back: MaterialType.GLASS,
        left: MaterialType.CONCRETE,
        right: MaterialType.ABSORBER
      },
      color: '#a5644a'
    }
  ]
}

const DEFAULT_SOURCE: SoundSource = {
  position: { x: 0, y: 1.5, z: 0 },
  frequency: 500,
  soundPressureLevel: 90
}

export default function App() {
  const [buildings, setBuildings] = useState<Building[]>(() => createDefaultBuildings())
  const [soundSource, setSoundSource] = useState<SoundSource>(DEFAULT_SOURCE)
  const [viewMode, setViewMode] = useState<ViewMode>('topdown')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [probePosition, setProbePosition] = useState<Vec2 | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const [containerSize, setContainerSize] = useState({ w: 400, h: 260 })

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setContainerSize({
          w: Math.min(window.innerWidth - 32, 600),
          h: Math.min(260, window.innerHeight * 0.35)
        })
      } else {
        setContainerSize({
          w: Math.min(window.innerWidth * 0.3 - 48, 380),
          h: 260
        })
      }
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { heatmapData, getProbeInfo } = useAcousticField(buildings, soundSource)

  const probeInfo = useMemo<ProbeInfo | null>(() => {
    if (!probePosition) return null
    return getProbeInfo(probePosition)
  }, [probePosition, getProbeInfo])

  const handleBuildingChange = useCallback((id: string, updates: Partial<Building>) => {
    setBuildings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }, [])

  const handleBuildingPositionChange = useCallback((id: string, pos: Vec2) => {
    setBuildings(prev => prev.map(b => {
      if (b.id !== id) return b
      return { ...b, position: pos }
    }))
  }, [])

  const handleBuildingPointerDown = useCallback((_e: ThreeEvent<PointerEvent>, id: string) => {
    setSelectedBuildingId(id)
  }, [])

  const handleProbeClick = useCallback((pos: Vec2) => {
    const clamped: Vec2 = {
      x: Math.max(-STREET_WIDTH / 2 + 0.5, Math.min(STREET_WIDTH / 2 - 0.5, pos.x)),
      z: Math.max(-STREET_DEPTH / 2 + 0.5, Math.min(STREET_DEPTH / 2 - 0.5, pos.z))
    }
    setProbePosition(clamped)
  }, [])

  const handleSaveSnapshot = useCallback(() => {
    const snap: SceneSnapshot = {
      version: '1.0.0',
      timestamp: Date.now(),
      buildings,
      soundSource,
      probePosition
    }
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `acoustic-snapshot-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [buildings, soundSource, probePosition])

  const handleLoadSnapshot = useCallback((snap: SceneSnapshot) => {
    if (snap.buildings) setBuildings(snap.buildings)
    if (snap.soundSource) setSoundSource(snap.soundSource)
    if (snap.probePosition) setProbePosition(snap.probePosition)
  }, [])

  const displayRays = probeInfo?.rays || []

  const sceneStyle: React.CSSProperties = isMobile ? {
    width: '100vw',
    height: 'calc(100vh - 48px)'
  } : {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '70%',
    height: '100vh'
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={sceneStyle}>
        <Scene3D
          buildings={buildings}
          soundSource={soundSource}
          rays={displayRays}
          probePosition={probePosition}
          viewMode={viewMode}
          selectedBuildingId={selectedBuildingId}
          onBuildingPointerDown={handleBuildingPointerDown}
          onBuildingPositionChange={handleBuildingPositionChange}
          onProbeClick={handleProbeClick}
        />

        <div style={{
          position: 'absolute',
          left: '16px',
          bottom: '16px',
          width: `${containerSize.w}px`,
          height: `${containerSize.h}px`,
          zIndex: 10
        }}>
          <AcousticMap2D
            heatmapData={heatmapData}
            buildings={buildings}
            probePosition={probePosition}
            onProbePositionChange={setProbePosition}
            width={containerSize.w}
            height={containerSize.h}
          />
        </div>

        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 10,
          padding: '8px 14px',
          background: 'rgba(11, 26, 46, 0.75)',
          backdropFilter: 'blur(8px)',
          borderRadius: '6px',
          border: '1px solid rgba(0, 188, 212, 0.2)',
          fontSize: '12px'
        }}>
          <div style={{ color: '#00bcd4', fontWeight: 600, marginBottom: '4px' }}>
            {viewMode === 'topdown' ? '📍 俯视视角' : '👁️ 3D视角'}
          </div>
          <div style={{ color: '#aabbcc' }}>
            {buildings.length} 座建筑 · 50×50 声场采样
          </div>
        </div>
      </div>

      <ControlPanel
        buildings={buildings}
        soundSource={soundSource}
        probeInfo={probeInfo}
        viewMode={viewMode}
        selectedBuildingId={selectedBuildingId}
        onSoundSourceChange={setSoundSource}
        onBuildingChange={handleBuildingChange}
        onViewModeChange={setViewMode}
        onSelectedBuildingChange={setSelectedBuildingId}
        onSaveSnapshot={handleSaveSnapshot}
        onLoadSnapshot={handleLoadSnapshot}
        isMobile={isMobile}
      />
    </div>
  )
}
