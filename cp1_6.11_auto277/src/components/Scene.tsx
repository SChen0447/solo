import { useRef, useMemo, useCallback, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { SimulationParams, ClickInfo } from '../App'

const SCALE = 0.8
const TOTAL_DEPTH = 515
const WEDGE_WIDTH = 200
const WEDGE_THICKNESS = 30
const CRUST_THICKNESS = 15
const LITHOSPHERE_THICKNESS = 100
const ASTHENOSPHERE_THICKNESS = 400
const PLUME_DIAMETER = 40

const DEPTH_SCALE = TOTAL_DEPTH / 700

interface SceneContentProps {
  params: SimulationParams
  onClick: (info: Omit<ClickInfo, 'visible'>) => void
}

function BackgroundRotation({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.02 * delta
    }
  })
  return <group ref={groupRef}>{children}</group>
}

function WedgeProfile() {
  const crustGeometry = useMemo(() => {
    return new THREE.BoxGeometry(WEDGE_WIDTH, CRUST_THICKNESS * SCALE, WEDGE_THICKNESS)
  }, [])

  const lithosphereGeometry = useMemo(() => {
    return new THREE.BoxGeometry(WEDGE_WIDTH, LITHOSPHERE_THICKNESS * SCALE, WEDGE_THICKNESS)
  }, [])

  const asthenosphereGeometry = useMemo(() => {
    return new THREE.BoxGeometry(WEDGE_WIDTH, ASTHENOSPHERE_THICKNESS * SCALE, WEDGE_THICKNESS)
  }, [])

  const lowerMantleHeight = TOTAL_DEPTH - CRUST_THICKNESS - LITHOSPHERE_THICKNESS - ASTHENOSPHERE_THICKNESS
  const lowerMantleGeometry = useMemo(() => {
    return new THREE.BoxGeometry(WEDGE_WIDTH, lowerMantleHeight * SCALE, WEDGE_THICKNESS)
  }, [lowerMantleHeight])

  const yOffset = TOTAL_DEPTH * SCALE / 2

  return (
    <group>
      <mesh position={[0, yOffset - (CRUST_THICKNESS * SCALE) / 2, 0]} geometry={crustGeometry}>
        <meshStandardMaterial color="#6d4c41" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, yOffset - CRUST_THICKNESS * SCALE - (LITHOSPHERE_THICKNESS * SCALE) / 2, 0]} geometry={lithosphereGeometry}>
        <meshStandardMaterial color="#8b5a2b" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, yOffset - (CRUST_THICKNESS + LITHOSPHERE_THICKNESS) * SCALE - (ASTHENOSPHERE_THICKNESS * SCALE) / 2, 0]} geometry={asthenosphereGeometry}>
        <meshStandardMaterial color="#e65100" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, yOffset - (CRUST_THICKNESS + LITHOSPHERE_THICKNESS + ASTHENOSPHERE_THICKNESS) * SCALE - (lowerMantleHeight * SCALE) / 2, 0]} geometry={lowerMantleGeometry}>
        <meshStandardMaterial color="#4a0000" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

interface PlumeParticlesProps {
  temperature: number
  onClick: (info: Omit<ClickInfo, 'visible'>) => void
}

function PlumeParticles({ temperature, onClick }: PlumeParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const baseCount = 200 + Math.max(0, Math.floor((temperature - 1200) / 100)) * 50
  const maxCount = Math.min(baseCount, 5000)

  const heightMultiplier = 1 + ((temperature - 1000) / 100) * 0.2
  const sizeMultiplier = 1 + ((temperature - 1000) / 100) * 0.2
  const plumeHeight = 200 * heightMultiplier
  const whiteOffset = (temperature - 1000) / 1000

  const dummy = useMemo(() => new THREE.Object3D(), [])

  const { positions, colors, sizes, lifetimes, velocities } = useMemo(() => {
    const positions = new Float32Array(maxCount * 3)
    const colors = new Float32Array(maxCount * 3)
    const sizes = new Float32Array(maxCount)
    const lifetimes = new Float32Array(maxCount)
    const velocities = new Float32Array(maxCount)

    for (let i = 0; i < maxCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * PLUME_DIAMETER * 0.5
      positions[i * 3] = Math.cos(angle) * radius * SCALE
      positions[i * 3 + 1] = -TOTAL_DEPTH * SCALE * 0.4 + Math.random() * 20
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.3 * SCALE

      const t = Math.random()
      const r = 1
      const g = Math.min(1, 0.4 + t * 0.6 * (1 - whiteOffset) + whiteOffset)
      const b = Math.min(1, 0.1 + t * 0.2 + whiteOffset * 0.9)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      sizes[i] = (3 + Math.random() * 5) * sizeMultiplier
      lifetimes[i] = 2 + Math.random() * 3
      velocities[i] = 30 + Math.random() * 40
    }

    return { positions, colors, sizes, lifetimes, velocities }
  }, [maxCount, sizeMultiplier, whiteOffset])

  const ageRef = useRef(new Float32Array(maxCount))

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const geometry = pointsRef.current.geometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const colAttr = geometry.attributes.color as THREE.BufferAttribute
    const pos = posAttr.array as Float32Array
    const col = colAttr.array as Float32Array

    const yOffset = TOTAL_DEPTH * SCALE / 2

    for (let i = 0; i < maxCount; i++) {
      ageRef.current[i] += delta
      if (ageRef.current[i] > lifetimes[i]) {
        ageRef.current[i] = 0
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * PLUME_DIAMETER * 0.5
        pos[i * 3] = Math.cos(angle) * radius * SCALE
        pos[i * 3 + 1] = yOffset - TOTAL_DEPTH * SCALE * 0.8
        pos[i * 3 + 2] = Math.sin(angle) * radius * 0.3 * SCALE
      }

      const lifeRatio = ageRef.current[i] / lifetimes[i]
      const rise = velocities[i] * lifeRatio * plumeHeight * 0.01 * SCALE
      const wobble = Math.sin(ageRef.current[i] * 2 + i) * 5 * SCALE
      const wobbleZ = Math.cos(ageRef.current[i] * 1.5 + i * 0.7) * 3 * SCALE

      const baseY = yOffset - TOTAL_DEPTH * SCALE * 0.8
      pos[i * 3 + 1] = baseY + rise
      pos[i * 3] += wobble * delta
      pos[i * 3 + 2] += wobbleZ * delta

      if (pos[i * 3 + 1] > yOffset - CRUST_THICKNESS * SCALE) {
        ageRef.current[i] = lifetimes[i]
      }

      const fade = 1 - lifeRatio
      const whiteBoost = lifeRatio < 0.3 ? (1 - lifeRatio / 0.3) * 0.3 : 0
      col[i * 3] = 1
      col[i * 3 + 1] = Math.min(1, 0.5 + (1 - lifeRatio) * 0.3 + whiteBoost + whiteOffset * 0.5) * fade
      col[i * 3 + 2] = Math.min(1, 0.1 + whiteBoost * 0.5 + whiteOffset * 0.8) * fade
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    const point = e.point
    const yOffset = TOTAL_DEPTH * SCALE / 2
    const depthPx = yOffset - point.y
    const depthKm = depthPx / SCALE / DEPTH_SCALE
    const temp = temperature + (700 - Math.max(0, Math.min(700, depthKm))) * 1.5
    onClick({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
      depth: Math.max(0, depthKm),
      temperature: Math.max(temperature, temp),
      type: '地幔热柱',
    })
  }, [onClick, temperature])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [positions, colors])

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      onClick={handleClick}
    >
      <pointsMaterial
        size={4}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

interface SubductionPlateProps {
  angle: number
  speed: number
  plumeTemp: number
  onClick: (info: Omit<ClickInfo, 'visible'>) => void
  onContactChange: (contact: boolean) => void
}

function SubductionPlate({ angle, speed, plumeTemp, onClick, onContactChange }: SubductionPlateProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const plateWidth = 120
  const plateHeight = 8
  const plateDepth = WEDGE_THICKNESS * 0.9
  const angleRad = (angle * Math.PI) / 180

  const positionRef = useRef(-80)
  const contactRef = useRef(false)

  useFrame((_, delta) => {
    if (meshRef.current) {
      positionRef.current += speed * delta * 5
      if (positionRef.current > 100) {
        positionRef.current = -100
      }

      const yOffset = TOTAL_DEPTH * SCALE / 2
      const startY = yOffset - (CRUST_THICKNESS + LITHOSPHERE_THICKNESS * 0.3) * SCALE
      const descent = (positionRef.current + 100) * Math.tan(angleRad) * 0.5

      meshRef.current.position.x = positionRef.current * SCALE
      meshRef.current.position.y = startY - descent * SCALE
      meshRef.current.rotation.z = -angleRad

      const distToPlume = Math.abs(positionRef.current)
      const isContact = distToPlume < PLUME_DIAMETER * 0.6 && descent > 20
      if (isContact !== contactRef.current) {
        contactRef.current = isContact
        onContactChange(isContact)
      }
    }
  })

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    const yOffset = TOTAL_DEPTH * SCALE / 2
    const depthPx = yOffset - e.point.y
    const depthKm = depthPx / SCALE / DEPTH_SCALE
    const temp = 600 + depthKm * 1.5 + plumeTemp * 0.1
    onClick({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
      depth: Math.max(0, depthKm),
      temperature: temp,
      type: '俯冲板块',
    })
  }, [onClick, plumeTemp])

  return (
    <mesh ref={meshRef} onClick={handleClick}>
      <boxGeometry args={[plateWidth * SCALE, plateHeight * SCALE, plateDepth * SCALE]} />
      <meshStandardMaterial
        vertexColors={false}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
             varying vec3 vLocalPos;`
          ).replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             vLocalPos = position;`
          )
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
             varying vec3 vLocalPos;`
          ).replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            `float colorMix = (vLocalPos.x / ${(plateWidth * SCALE).toFixed(1)} + 0.5);
             vec3 blueGray = vec3(0.3, 0.4, 0.55);
             vec3 darkRed = vec3(0.55, 0.15, 0.1);
             vec3 finalColor = mix(blueGray, darkRed, colorMix);
             vec4 diffuseColor = vec4(finalColor, 0.85);`
          )
        }}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

interface VolcanicArcProps {
  active: boolean
  plumeTemp: number
  onClick: (info: Omit<ClickInfo, 'visible'>) => void
}

function VolcanicArc({ active, plumeTemp, onClick }: VolcanicArcProps) {
  const groupRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)
  const triangleCount = 4

  useFrame((_, delta) => {
    if (!groupRef.current || !active) return
    timeRef.current += delta
    const pulse = 0.7 + 0.3 * Math.sin(timeRef.current * Math.PI)
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.opacity = 0.4 + pulse * 0.4
      const scale = 1 + Math.sin(timeRef.current * Math.PI + i * 0.5) * 0.15
      mesh.scale.set(scale, scale, scale)
    })
  })

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    const yOffset = TOTAL_DEPTH * SCALE / 2
    const depthPx = yOffset - e.point.y
    const depthKm = depthPx / SCALE / DEPTH_SCALE
    onClick({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
      depth: Math.max(0, depthKm),
      temperature: plumeTemp + 200,
      type: '火山弧',
    })
  }, [onClick, plumeTemp])

  const triangles = useMemo(() => {
    const result = []
    const yOffset = TOTAL_DEPTH * SCALE / 2
    const surfaceY = yOffset - CRUST_THICKNESS * SCALE * 0.5

    for (let i = 0; i < triangleCount; i++) {
      const offsetX = (i - (triangleCount - 1) / 2) * 18 * SCALE
      const shape = new THREE.Shape()
      const height = (25 + Math.random() * 15) * SCALE
      const baseWidth = (10 + Math.random() * 8) * SCALE
      shape.moveTo(-baseWidth / 2, 0)
      shape.lineTo(baseWidth / 2, 0)
      shape.lineTo(0, height)
      shape.lineTo(-baseWidth / 2, 0)

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 6 * SCALE,
        bevelEnabled: false,
      })
      geometry.translate(offsetX, surfaceY, -3 * SCALE)

      result.push(geometry)
    }
    return result
  }, [])

  if (!active) return null

  return (
    <group ref={groupRef}>
      {triangles.map((geo, i) => (
        <mesh key={i} geometry={geo} onClick={handleClick}>
          <meshStandardMaterial
            color="#ff6d00"
            transparent
            opacity={0.6}
            emissive="#ff4500"
            emissiveIntensity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

interface ConvectionCellsProps {
  temperature: number
  plateAngle: number
}

function ConvectionCells({ temperature, plateAngle }: ConvectionCellsProps) {
  const linesRef = useRef<THREE.Group>(null)
  const lastUpdate = useRef(0)

  const curveCount = 6

  const createCurves = useCallback(() => {
    const lines: THREE.Line[] = []
    const yOffset = TOTAL_DEPTH * SCALE / 2
    const tempColor = new THREE.Color().setHSL(0.05 + (temperature - 1000) / 2000, 1, 0.5)

    for (let i = 0; i < curveCount; i++) {
      const startX = (-80 + Math.random() * 160) * SCALE
      const startY = yOffset - (CRUST_THICKNESS + LITHOSPHERE_THICKNESS + 50 + Math.random() * 100) * SCALE
      const endX = startX + (Math.random() - 0.5) * 100 * SCALE
      const endY = startY + (30 + Math.random() * 60) * SCALE
      const cp1X = startX + (endX - startX) * 0.3 + (Math.random() - 0.5) * 40 * SCALE
      const cp1Y = startY + (endY - startY) * 0.5 + (Math.random() - 0.5) * 30 * SCALE
      const cp2X = startX + (endX - startX) * 0.7 + (Math.random() - 0.5) * 40 * SCALE
      const cp2Y = startY + (endY - startY) * 0.5 + (Math.random() - 0.5) * 30 * SCALE

      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(startX, startY, (Math.random() - 0.5) * 10),
        new THREE.Vector3(cp1X, cp1Y, (Math.random() - 0.5) * 10),
        new THREE.Vector3(cp2X, cp2Y, (Math.random() - 0.5) * 10),
        new THREE.Vector3(endX, endY, (Math.random() - 0.5) * 10),
      )

      const points = curve.getPoints(30)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)

      const material = new THREE.LineBasicMaterial({
        color: tempColor,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.2,
      })

      lines.push(new THREE.Line(geometry, material))
    }
    return lines
  }, [temperature])

  useFrame((_, delta) => {
    lastUpdate.current += delta
    if (lastUpdate.current >= 0.5 && linesRef.current) {
      lastUpdate.current = 0
      while (linesRef.current.children.length > 0) {
        const child = linesRef.current.children[0] as THREE.Line
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
        linesRef.current.remove(child)
      }
      const newLines = createCurves()
      newLines.forEach(line => linesRef.current!.add(line))
    }
  })

  return <group ref={linesRef}>{createCurves().map((line, i) => (
    <primitive key={i} object={line} />
  ))}</group>
}

function CameraSetup() {
  const { camera } = useThree()

  useMemo(() => {
    camera.position.set(0, 150, 350)
    camera.lookAt(0, 0, 0)
  }, [camera])

  return null
}

function SceneContent({ params, onClick }: SceneContentProps) {
  const [volcanicActive, setVolcanicActive] = useState(false)

  return (
    <>
      <CameraSetup />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 200, 100]} intensity={1} color="#ffffff" />
      <pointLight position={[0, -200, 0]} intensity={0.8} color="#ff4500" />
      <BackgroundRotation>
        <WedgeProfile />
      </BackgroundRotation>
      <PlumeParticles temperature={params.plumeTemp} onClick={onClick} />
      <SubductionPlate
        angle={params.subductionAngle}
        speed={params.subductionSpeed}
        plumeTemp={params.plumeTemp}
        onClick={onClick}
        onContactChange={setVolcanicActive}
      />
      <VolcanicArc active={volcanicActive} plumeTemp={params.plumeTemp} onClick={onClick} />
      <ConvectionCells temperature={params.plumeTemp} plateAngle={params.subductionAngle} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={200}
        maxDistance={800}
        minPolarAngle={(10 * Math.PI) / 180}
        maxPolarAngle={(80 * Math.PI) / 180}
        minAzimuthAngle={0}
        maxAzimuthAngle={Math.PI * 2}
        autoRotate={false}
      />
    </>
  )
}

interface SceneProps {
  params: SimulationParams
  onClick: (info: Omit<ClickInfo, 'visible'>) => void
}

function Scene({ params, onClick }: SceneProps) {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0d0d1a', width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0d0d1a']} />
      <fog attach="fog" args={['#0d0d1a', 500, 1200]} />
      <SceneContent params={params} onClick={onClick} />
    </Canvas>
  )
}

export default Scene
