import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { EntanglementState, NetworkNode } from './App'

interface ControlPanelProps {
  entanglementState: EntanglementState
  onStateChange: (state: EntanglementState) => void
  entanglementDistance: number
  onDistanceChange: (distance: number) => void
  onSaveSnapshot: () => void
  isOpen: boolean
  onToggle: () => void
  nodes: NetworkNode[]
}

const BlochSphere = ({ entanglementState, flipFrequency }: { entanglementState: EntanglementState; flipFrequency: number }) => {
  const groupRef = useRef<THREE.Group>(null)
  const arrowRef = useRef<THREE.ArrowHelper>(null)
  const timeRef = useRef(0)

  const stateAngles = useMemo(() => {
    switch (entanglementState) {
      case 'bell': return { theta: Math.PI / 4, phi: 0 }
      case 'ghz': return { theta: Math.PI / 3, phi: Math.PI / 4 }
      case 'w': return { theta: Math.PI / 2, phi: Math.PI / 3 }
    }
  }, [entanglementState])

  useFrame((_, delta) => {
    timeRef.current += delta * flipFrequency
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3
    }
    if (arrowRef.current) {
      const wobble = Math.sin(timeRef.current * 2) * 0.1
      const theta = stateAngles.theta + wobble
      const phi = stateAngles.phi + timeRef.current * 0.5
      const dir = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
      ).normalize()
      arrowRef.current.setDirection(dir)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#1a1a4a" transparent opacity={0.3} wireframe={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#3366ff" transparent opacity={0.3} wireframe={true} />
      </mesh>
      <arrowHelper
        ref={arrowRef as any}
        args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xff3333, 0.2, 0.1]}
      />
    </group>
  )
}

const BlochSphereDisplay = ({ entanglementState, flipFrequency }: { entanglementState: EntanglementState; flipFrequency: number }) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.5} />
        <BlochSphere entanglementState={entanglementState} flipFrequency={flipFrequency} />
      </Canvas>
    </div>
  )
}

const HeatMap = ({ flipFrequency }: { flipFrequency: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridData = useRef<number[][]>([])
  const timeRef = useRef(0)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    gridData.current = Array(40).fill(null).map(() =>
      Array(40).fill(null).map(() => Math.random())
    )

    const animate = () => {
      timeRef.current += 0.016
      const canvas = canvasRef.current
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }
      const cellSize = canvas.width / 40

      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
          const wave = Math.sin(x * 0.3 + timeRef.current * flipFrequency) * Math.cos(y * 0.3 + timeRef.current * flipFrequency * 0.7)
          const value = (wave + 1) / 2
          gridData.current[y][x] = value * 0.7 + gridData.current[y][x] * 0.3

          const t = gridData.current[y][x]
          const r = Math.round(0 + (255 - 0) * t)
          const g = Math.round(51 + (51 - 51) * t)
          const b = Math.round(204 + (0 - 204) * t)

          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [flipFrequency])

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={160}
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        borderRadius: '4px'
      }}
    />
  )
}

const TopDashboard = ({ entanglementState, entanglementDistance }: { entanglementState: EntanglementState; entanglementDistance: number }) => {
  const flipFrequency = 0.5 + (entanglementDistance / 100) * 2.5

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '140px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '30px',
      padding: '15px 20px',
      background: 'rgba(26, 26, 58, 0.6)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(51, 204, 255, 0.2)',
      zIndex: 50
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#33ccff', fontWeight: 600, letterSpacing: '1px' }}>
          光子 A - Bloch球
        </div>
        <div style={{ width: '100px', height: '100px', border: '1px solid rgba(51, 204, 255, 0.3)', borderRadius: '8px', overflow: 'hidden' }}>
          <BlochSphereDisplay entanglementState={entanglementState} flipFrequency={flipFrequency} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#ff66cc', fontWeight: 600, letterSpacing: '1px' }}>
          光子 B - Bloch球
        </div>
        <div style={{ width: '100px', height: '100px', border: '1px solid rgba(255, 102, 204, 0.3)', borderRadius: '8px', overflow: 'hidden' }}>
          <BlochSphereDisplay entanglementState={entanglementState} flipFrequency={flipFrequency} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#ffdd00', fontWeight: 600, letterSpacing: '1px' }}>
          量子比特翻转热力图
        </div>
        <div style={{ width: '100px', height: '100px', border: '1px solid rgba(255, 221, 0, 0.3)', borderRadius: '8px', overflow: 'hidden' }}>
          <HeatMap flipFrequency={flipFrequency} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '20px', minWidth: '180px' }}>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          翻转频率: <span style={{ color: '#ff3366', fontWeight: 700 }}>{flipFrequency.toFixed(2)} Hz</span>
        </div>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          纠缠距离: <span style={{ color: '#33ccff', fontWeight: 700 }}>{entanglementDistance}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          量子态: <span style={{ color: '#ffdd00', fontWeight: 700 }}>{entanglementState.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}

const StateButton = ({
  label,
  active,
  onClick,
  description,
  formula
}: {
  label: string
  active: boolean
  onClick: () => void
  description: string
  formula: string
}) => {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '14px 16px',
        background: active
          ? 'linear-gradient(135deg, rgba(51, 204, 255, 0.3) 0%, rgba(255, 102, 204, 0.3) 100%)'
          : 'rgba(255, 255, 255, 0.05)',
        border: active
          ? '1px solid rgba(51, 204, 255, 0.8)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: '#ffffff',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.3s ease',
        transform: hovered || active ? 'scale(1.03)' : 'scale(1)',
        boxShadow: hovered || active
          ? '0 0 20px rgba(51, 204, 255, 0.4)'
          : 'none'
      }}
    >
      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '10px', color: active ? '#33ccff' : '#888', marginBottom: '4px' }}>{description}</div>
      <div style={{ fontSize: '9px', color: '#ffdd00', fontFamily: 'monospace' }}>{formula}</div>
    </button>
  )
}

const ControlPanel = ({
  entanglementState,
  onStateChange,
  entanglementDistance,
  onDistanceChange,
  onSaveSnapshot,
  isOpen
}: ControlPanelProps) => {
  return (
    <>
      <TopDashboard entanglementState={entanglementState} entanglementDistance={entanglementDistance} />
      <div
        style={{
          position: 'fixed',
          left: isOpen ? '0' : '-260px',
          top: '140px',
          bottom: '0',
          width: '250px',
          background: 'rgba(26, 26, 58, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(51, 204, 255, 0.2)',
          padding: '20px 16px',
          overflowY: 'auto',
          zIndex: 60,
          transition: 'left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div>
          <h3 style={{
            fontSize: '14px',
            color: '#33ccff',
            marginBottom: '14px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(51, 204, 255, 0.2)',
            letterSpacing: '1px',
            fontWeight: 700
          }}>
            ⚛ 纠缠状态选择
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <StateButton
              label="Bell 态"
              active={entanglementState === 'bell'}
              onClick={() => onStateChange('bell')}
              description="两光子最大纠缠态"
              formula="|Φ+⟩ = 1/√2(|00⟩+|11⟩)"
            />
            <StateButton
              label="GHZ 态"
              active={entanglementState === 'ghz'}
              onClick={() => onStateChange('ghz')}
              description="多粒子 Greenberger-Horne-Zeilinger"
              formula="|GHZ⟩ = 1/√2(|000⟩+|111⟩)"
            />
            <StateButton
              label="W 态"
              active={entanglementState === 'w'}
              onClick={() => onStateChange('w')}
              description="对称分布式纠缠态"
              formula="|W⟩ = 1/√3(|001⟩+|010⟩+|100⟩)"
            />
          </div>
        </div>

        <div>
          <h3 style={{
            fontSize: '14px',
            color: '#ff66cc',
            marginBottom: '14px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255, 102, 204, 0.2)',
            letterSpacing: '1px',
            fontWeight: 700
          }}>
            ✦ 纠缠距离调节
          </h3>
          <div style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              fontSize: '12px'
            }}>
              <span style={{ color: '#aaa' }}>距离参数</span>
              <span style={{ color: '#ff66cc', fontWeight: 700, fontFamily: 'monospace' }}>
                {entanglementDistance}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={entanglementDistance}
              onChange={(e) => onDistanceChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: 'linear-gradient(90deg, #33ccff, #ff66cc)',
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '10px',
              color: '#666'
            }}>
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            <div style={{ marginTop: '14px', fontSize: '10px', color: '#888', lineHeight: 1.6 }}>
              ↑ 光晕半径: {(5 + (entanglementDistance / 100) * 25).toFixed(1)}px<br />
              ↑ 翻转频率: {(0.5 + (entanglementDistance / 100) * 2.5).toFixed(2)}Hz
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={onSaveSnapshot}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #33ccff 0%, #ff66cc 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(51, 204, 255, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)'
              e.currentTarget.style.boxShadow = '0 0 25px rgba(51, 204, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(51, 204, 255, 0.3)'
            }}
          >
            📸 保存状态快照
          </button>
        </div>
      </div>
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(51, 204, 255, 0.8);
          transition: transform 0.2s ease;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(51, 204, 255, 0.8);
        }
      `}</style>
    </>
  )
}

export default ControlPanel
