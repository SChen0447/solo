import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import { gsap } from 'gsap'
import {
  Building,
  SoundSource,
  AcousticRay,
  ViewMode,
  STREET_WIDTH,
  STREET_DEPTH,
  MaterialType,
  MATERIAL_ABSORPTION,
  Vec2
} from '../types'

interface BuildingMeshProps {
  building: Building
  selected: boolean
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void
  onPositionChange: (id: string, pos: Vec2) => void
}

function BuildingMesh({ building, selected, onPointerDown, onPositionChange }: BuildingMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  const dragState = useRef<{
    dragging: boolean
    plane: THREE.Plane
    offset: THREE.Vector3
  }>({ dragging: false, plane: new THREE.Plane(), offset: new THREE.Vector3() })

  const wallColors = useMemo(() => {
    const getColor = (mat: MaterialType) => {
      const alpha = 1 - MATERIAL_ABSORPTION[mat]
      if (mat === MaterialType.CONCRETE) return new THREE.Color(`hsl(30, 10%, ${30 + alpha * 20}%)`)
      if (mat === MaterialType.GLASS) return new THREE.Color(`hsl(200, 50%, ${30 + alpha * 30}%)`)
      if (mat === MaterialType.BRICK) return new THREE.Color(`hsl(15, 40%, ${25 + alpha * 20}%)`)
      return new THREE.Color(`hsl(270, 30%, ${20 + (1 - alpha) * 30}%)`)
    }
    return {
      right: getColor(building.walls.right),
      left: getColor(building.walls.left),
      front: getColor(building.walls.front),
      back: getColor(building.walls.back)
    }
  }, [building.walls])

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(building.position.x, building.dimensions.height / 2, building.position.z)
      groupRef.current.rotation.y = (building.rotation * Math.PI) / 180
    }
  }, [building.position, building.rotation, building.dimensions.height])

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    onPointerDown(e, building.id)

    const planeNormal = new THREE.Vector3(0, 1, 0)
    const planePoint = new THREE.Vector3(0, 0, 0)
    dragState.current.plane.setFromNormalAndCoplanarPoint(planeNormal, planePoint)

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(e.pointer, e.camera)
    const intersection = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(dragState.current.plane, intersection)) {
      dragState.current.offset.copy(intersection).sub(groupRef.current!.position)
      dragState.current.dragging = true
    }
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState.current.dragging) return
    e.stopPropagation()
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(e.pointer, e.camera)
    const intersection = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(dragState.current.plane, intersection)) {
      const newPos = intersection.sub(dragState.current.offset)
      const snappedX = Math.round(newPos.x / 0.5) * 0.5
      const snappedZ = Math.round(newPos.z / 0.5) * 0.5
      const halfW = STREET_WIDTH / 2 - building.dimensions.width / 2 - 0.5
      const halfD = STREET_DEPTH / 2 - building.dimensions.depth / 2 - 0.5
      const clampedX = Math.max(-halfW, Math.min(halfW, snappedX))
      const clampedZ = Math.max(-halfD, Math.min(halfD, snappedZ))
      onPositionChange(building.id, { x: clampedX, z: clampedZ })
    }
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    dragState.current.dragging = false
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const { width, depth, height } = building.dimensions

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <mesh position={[0, 0, depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color={wallColors.front} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color={wallColors.back} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[width / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, height, depth]} />
        <meshStandardMaterial color={wallColors.right} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[-width / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, height, depth]} />
        <meshStandardMaterial color={wallColors.left} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, height / 2 + 0.05, 0]} receiveShadow>
        <boxGeometry args={[width - 0.1, 0.1, depth - 0.1]} />
        <meshStandardMaterial color="#2a3a4a" roughness={0.8} />
      </mesh>
      {selected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(width + 0.3, height + 0.3, depth + 0.3)]} />
          <lineBasicMaterial color="#00bcd4" linewidth={2} />
        </lineSegments>
      )}
    </group>
  )
}

interface SoundSourceMeshProps {
  source: SoundSource
}

function SoundSourceMesh({ source }: SoundSourceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const pulseRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(source.position.x, source.position.y, source.position.z)
    }
  }, [source.position])

  useEffect(() => {
    if (pulseRef.current) pulseRef.current.kill()
    const freqRatio = (source.frequency - 100) / (2000 - 100)
    const pulseDuration = 0.5 + freqRatio * 0.5
    const baseScale = 0.6
    const pulseAmount = 0.1 + freqRatio * 0.15
    pulseRef.current = gsap.to(meshRef.current?.scale ?? { x: 1, y: 1, z: 1 }, {
      x: baseScale + pulseAmount,
      y: baseScale + pulseAmount,
      z: baseScale + pulseAmount,
      duration: pulseDuration,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    })
    return () => {
      pulseRef.current?.kill()
    }
  }, [source.frequency])

  const glowIntensity = (source.soundPressureLevel - 60) / 60

  return (
    <group position={[source.position.x, source.position.y, source.position.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={`hsl(${20 + glowIntensity * 40}, 100%, ${50 + glowIntensity * 20}%)`}
          emissive={`hsl(${20 + glowIntensity * 40}, 100%, ${30 + glowIntensity * 30}%)`}
          emissiveIntensity={0.3 + glowIntensity * 0.7}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      <pointLight
        color={`hsl(${30 + glowIntensity * 30}, 100%, 70%)`}
        intensity={0.5 + glowIntensity * 1.5}
        distance={5 + glowIntensity * 5}
        decay={2}
      />
    </group>
  )
}

interface RaysRendererProps {
  rays: AcousticRay[]
}

function RaysRenderer({ rays }: RaysRendererProps) {
  const lineGeometries = useMemo(() => {
    return rays.slice(0, 20).map(ray => {
      const points = ray.points.map(p => new THREE.Vector3(p.x, p.y, p.z))
      return { id: ray.id, points, color: ray.color }
    })
  }, [rays])

  return (
    <group>
      {lineGeometries.map(geo => (
        <Line
          key={geo.id}
          points={geo.points}
          color={geo.color}
          lineWidth={2}
          transparent
          opacity={0.7}
        />
      ))}
    </group>
  )
}

interface StreetFloorProps {
  onCanvasClick: (worldPos: Vec2) => void
}

function StreetFloor({ onCanvasClick }: StreetFloorProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.point) {
      onCanvasClick({ x: e.point.x, z: e.point.z })
    }
  }

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={handleClick}
    >
      <planeGeometry args={[STREET_WIDTH, STREET_DEPTH]} />
      <meshStandardMaterial color="#2a3340" roughness={0.9} />
    </mesh>
  )
}

function ProbeMarker({ position }: { position: Vec2 | null }) {
  if (!position) return null
  return (
    <group position={[position.x, 0.05, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.3, 32]} />
        <meshBasicMaterial color="#00bcd4" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#00bcd4" />
      </mesh>
      <Line
        points={[new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 1.5, 0)]}
        color="#00bcd4"
        lineWidth={1}
      />
    </group>
  )
}

function GridLines() {
  const lines = useMemo(() => {
    const result: { points: [number, number, number][] }[] = []
    for (let x = -STREET_WIDTH / 2; x <= STREET_WIDTH / 2; x += 5) {
      result.push({
        points: [
          [x, 0.01, -STREET_DEPTH / 2],
          [x, 0.01, STREET_DEPTH / 2]
        ]
      })
    }
    for (let z = -STREET_DEPTH / 2; z <= STREET_DEPTH / 2; z += 5) {
      result.push({
        points: [
          [-STREET_WIDTH / 2, 0.01, z],
          [STREET_WIDTH / 2, 0.01, z]
        ]
      })
    }
    return result
  }, [])

  return (
    <group>
      {lines.map((l, i) => (
        <Line
          key={i}
          points={l.points as unknown as THREE.Vector3[]}
          color="#4a5a6a"
          lineWidth={0.5}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  )
}

export interface Scene3DProps {
  buildings: Building[]
  soundSource: SoundSource
  rays: AcousticRay[]
  probePosition: Vec2 | null
  viewMode: ViewMode
  selectedBuildingId: string | null
  onBuildingPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void
  onBuildingPositionChange: (id: string, pos: Vec2) => void
  onProbeClick: (pos: Vec2) => void
}

export default function Scene3D(props: Scene3DProps) {
  const {
    buildings,
    soundSource,
    rays,
    probePosition,
    viewMode,
    selectedBuildingId,
    onBuildingPointerDown,
    onBuildingPositionChange,
    onProbeClick
  } = props

  const topCameraPos = viewMode === 'topdown'
    ? { position: [0, 35, 0.01] as [number, number, number], target: [0, 0, 0] as [number, number, number] }
    : { position: [15, 8, 12] as [number, number, number], target: [0, 1, 0] as [number, number, number] }

  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={topCameraPos.position} fov={viewMode === 'topdown' ? 45 : 60} />
      <OrbitControls
        target={topCameraPos.target}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={viewMode === 'topdown' ? Math.PI / 2 + 0.1 : Math.PI / 2 - 0.05}
        minDistance={viewMode === 'topdown' ? 15 : 3}
        maxDistance={viewMode === 'topdown' ? 60 : 50}
      />

      <fog attach="fog" args={['#0b1a2e', 30, 80]} />

      <ambientLight intensity={0.4} color="#aabbcc" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight intensity={0.3} color="#88aacc" groundColor="#334455" />

      <StreetFloor onCanvasClick={onProbeClick} />
      <GridLines />

      {buildings.map(b => (
        <BuildingMesh
          key={b.id}
          building={b}
          selected={selectedBuildingId === b.id}
          onPointerDown={onBuildingPointerDown}
          onPositionChange={onBuildingPositionChange}
        />
      ))}

      <SoundSourceMesh source={soundSource} />
      <ProbeMarker position={probePosition} />
      <RaysRenderer rays={rays} />
    </Canvas>
  )
}
