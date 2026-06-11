import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line as DreiLine } from '@react-three/drei'
import * as THREE from 'three'
import type { NetworkNode, EntanglementState } from './App'

interface QuantumNetworkProps {
  nodes: NetworkNode[]
  onNodeMove: (id: string, x: number, y: number, z: number) => void
  entanglementState: EntanglementState
  entanglementDistance: number
}

const getPolarizationColor = (state: EntanglementState, t: number): string => {
  const colors = {
    bell: ['#00ffaa', '#00aaff'],
    ghz: ['#00ffaa', '#ff00aa'],
    w: ['#00ffaa', '#ffff00']
  }
  const [c1, c2] = colors[state]
  const mix = Math.abs(Math.sin(t))
  return mixColors(c1, c2, mix)
}

const mixColors = (c1: string, c2: string, t: number): string => {
  const r1 = parseInt(c1.slice(1, 3), 16)
  const g1 = parseInt(c1.slice(3, 5), 16)
  const b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16)
  const g2 = parseInt(c2.slice(3, 5), 16)
  const b2 = parseInt(c2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const HexagonNode = ({
  node,
  onDragStart,
  onDrag,
  onDragEnd,
  isCenter,
  haloRadius,
  flipFrequency
}: {
  node: NetworkNode
  onDragStart: (id: string) => void
  onDrag: (id: string, x: number, y: number, z: number) => void
  onDragEnd: () => void
  isCenter: boolean
  haloRadius: number
  flipFrequency: number
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { camera, gl } = useThree()
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const dragOffset = useRef(new THREE.Vector3())
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    const pulse = Math.sin(timeRef.current * flipFrequency) * 0.1 + 1
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.15 : pulse)
    }
    if (haloRef.current) {
      const haloScale = haloRadius * 0.1
      haloRef.current.scale.setScalar(haloScale)
      const material = haloRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.3 + Math.sin(timeRef.current * 2) * 0.15
    }
  })

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    onDragStart(node.id)
    const rect = gl.domElement.getBoundingClientRect()
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.current.setFromCamera(mouse.current, camera)
    const intersection = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(dragPlane.current, intersection)
    if (intersection) {
      dragOffset.current.copy(intersection).sub(new THREE.Vector3(node.x, node.y, node.z))
    }
    gl.domElement.style.cursor = 'grabbing'
  }

  const handlePointerMove = (e: any) => {
    if (!isDragging) return
    e.stopPropagation()
    const rect = gl.domElement.getBoundingClientRect()
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.current.setFromCamera(mouse.current, camera)
    const intersection = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(dragPlane.current, intersection)
    if (intersection) {
      const newPos = intersection.sub(dragOffset.current)
      onDrag(node.id, newPos.x, newPos.y, newPos.z)
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    onDragEnd()
    gl.domElement.style.cursor = 'auto'
  }

  const hexShape = useMemo(() => {
    const shape = new THREE.Shape()
    const size = 0.4
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(angle) * size
      const y = Math.sin(angle) * size
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
  }, [])

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={haloRef}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color={isCenter ? '#ff66cc' : '#33ccff'}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); gl.domElement.style.cursor = 'grab' }}
        onPointerOut={() => { setHovered(false); if (!isDragging) gl.domElement.style.cursor = 'auto' }}
      >
        <shapeGeometry args={[hexShape]} />
        <meshBasicMaterial
          color={isCenter ? '#ff66cc' : '#33ccff'}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.ShapeGeometry(hexShape)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </lineSegments>
    </group>
  )
}

const ConnectionLine = ({
  start,
  end,
  entanglementState,
  lineWidth
}: {
  start: NetworkNode
  end: NetworkNode
  entanglementState: EntanglementState
  lineWidth: number
}) => {
  const particleRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Points>(null)
  const timeRef = useRef(Math.random() * Math.PI * 2)
  const trailPositions = useRef<Float32Array>(new Float32Array(10 * 3))
  const trailIndex = useRef(0)
  const [lineColor, setLineColor] = useState('#00ffaa')
  const [lineOpacity, setLineOpacity] = useState(0.6)

  const points = useMemo(() => {
    return [
      [start.x, start.y, start.z] as [number, number, number],
      [end.x, end.y, end.z] as [number, number, number]
    ]
  }, [start.x, start.y, start.z, end.x, end.y, end.z])

  useFrame((_, delta) => {
    timeRef.current += delta * 0.8
    const t = (Math.sin(timeRef.current) + 1) / 2

    const px = start.x + (end.x - start.x) * t
    const py = start.y + (end.y - start.y) * t
    const pz = start.z + (end.z - start.z) * t

    if (particleRef.current) {
      particleRef.current.position.set(px, py, pz)
    }

    const idx = (trailIndex.current % 10) * 3
    trailPositions.current[idx] = px
    trailPositions.current[idx + 1] = py
    trailPositions.current[idx + 2] = pz
    trailIndex.current++

    if (trailRef.current) {
      const posAttr = trailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      posAttr.array = trailPositions.current
      posAttr.needsUpdate = true
    }

    setLineColor(getPolarizationColor(entanglementState, timeRef.current))
    setLineOpacity(0.4 + Math.sin(timeRef.current * 2) * 0.2)
  })

  return (
    <group>
      <DreiLine
        points={points}
        color={lineColor}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffdd00" />
      </mesh>
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={10}
            array={trailPositions.current}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#ffdd00" size={0.05} transparent opacity={0.6} />
      </points>
    </group>
  )
}

const PulseWave = ({ active, centerNode }: { active: boolean; centerNode: NetworkNode }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    if (!meshRef.current || !active) return

    const cycle = (timeRef.current % 2) / 2
    const radius = cycle * 2
    const opacity = Math.max(0, 0.8 * (1 - cycle))

    meshRef.current.scale.setScalar(radius)
    meshRef.current.position.set(centerNode.x, centerNode.y, centerNode.z)
    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.opacity = opacity
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} visible={active}>
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial color="#ff66cc" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  )
}

const Scene = ({
  nodes,
  onNodeMove,
  entanglementState,
  entanglementDistance
}: {
  nodes: NetworkNode[]
  onNodeMove: (id: string, x: number, y: number, z: number) => void
  entanglementState: EntanglementState
  entanglementDistance: number
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const haloRadius = 5 + (entanglementDistance / 100) * 25
  const flipFrequency = 0.5 + (entanglementDistance / 100) * 2.5
  const pulseActive = entanglementDistance > 60

  const connections = useMemo(() => {
    const conns: Array<{ start: NetworkNode; end: NetworkNode }> = []
    if (nodes.length < 2) return conns
    const center = nodes[0]
    for (let i = 1; i < nodes.length; i++) {
      conns.push({ start: center, end: nodes[i] })
    }
    for (let i = 1; i < nodes.length - 1; i++) {
      conns.push({ start: nodes[i], end: nodes[i + 1] })
    }
    if (nodes.length > 2) {
      conns.push({ start: nodes[nodes.length - 1], end: nodes[1] })
    }
    return conns
  }, [nodes])

  const handleDragStart = (id: string) => setDraggingId(id)
  const handleDrag = (id: string, x: number, y: number, z: number) => onNodeMove(id, x, y, z)
  const handleDragEnd = () => setDraggingId(null)

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#33ccff" />

      {connections.map((conn, i) => (
        <ConnectionLine
          key={`conn-${i}`}
          start={conn.start}
          end={conn.end}
          entanglementState={entanglementState}
          lineWidth={2 + (entanglementDistance / 100) * 2}
        />
      ))}

      {nodes.map((node, i) => (
        <HexagonNode
          key={node.id}
          node={node}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          isCenter={i === 0}
          haloRadius={haloRadius}
          flipFrequency={flipFrequency}
        />
      ))}

      {nodes.length > 0 && (
        <PulseWave active={pulseActive} centerNode={nodes[0]} />
      )}
    </>
  )
}

const QuantumNetwork = ({
  nodes,
  onNodeMove,
  entanglementState,
  entanglementDistance
}: QuantumNetworkProps) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene
          nodes={nodes}
          onNodeMove={onNodeMove}
          entanglementState={entanglementState}
          entanglementDistance={entanglementDistance}
        />
      </Canvas>
    </div>
  )
}

export default QuantumNetwork
