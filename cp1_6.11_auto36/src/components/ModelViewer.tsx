import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'
import { allParts, LegoPart } from '../data/steps'

interface LegoBrickProps {
  part: LegoPart
  isVisible: boolean
  isNew: boolean
  hasDetail: boolean
}

function LegoBrick({ part, isVisible, isNew, hasDetail }: LegoBrickProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [opacity, setOpacity] = useState(isVisible ? 1 : 0)
  const [yOffset, setYOffset] = useState(0)
  const [glowIntensity, setGlowIntensity] = useState(0)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (isVisible) {
      setOpacity(1)
      if (isNew) {
        animRef.current = 0
        const startTime = performance.now()
        const animate = () => {
          const elapsed = (performance.now() - startTime) / 1000
          if (elapsed < 0.5) {
            const t = elapsed / 0.5
            const easeOutBounce = (t: number) => {
              if (t < 1 / 2.75) return 7.5625 * t * t
              if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
              if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
              return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
            }
            const bounceT = easeOutBounce(t)
            setYOffset(3 * (1 - bounceT))
            setGlowIntensity(1 - t)
            animRef.current = requestAnimationFrame(animate)
          } else {
            setYOffset(0)
            setGlowIntensity(0)
          }
        }
        animRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animRef.current)
      }
    } else {
      setOpacity(0)
    }
  }, [isVisible, isNew])

  const geometry = useMemo(() => {
    switch (part.type) {
      case 'brick':
      case 'plate':
        return new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2])
      case 'cylinder':
        return new THREE.CylinderGeometry(part.size[0] / 2, part.size[0] / 2, part.size[1], 16)
      case 'cone':
        return new THREE.ConeGeometry(part.size[0] / 2, part.size[1], 16)
      case 'slope':
        return new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2])
      default:
        return new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2])
    }
  }, [part.type, part.size])

  const colorObj = useMemo(() => new THREE.Color(part.color), [part.color])

  const studCount = useMemo(() => {
    if (!hasDetail || (part.type !== 'brick' && part.type !== 'plate')) return []
    const studs: { x: number; z: number }[] = []
    const studSize = 0.2
    const studHeight = 0.15
    const xCount = Math.floor(part.size[0] / 0.4)
    const zCount = Math.floor(part.size[2] / 0.4)
    for (let i = 0; i < xCount; i++) {
      for (let j = 0; j < zCount; j++) {
        studs.push({
          x: -part.size[0] / 2 + 0.2 + i * 0.4,
          z: -part.size[2] / 2 + 0.2 + j * 0.4,
        })
      }
    }
    return studs
  }, [hasDetail, part.type, part.size])

  if (!isVisible && opacity === 0) return null

  return (
    <group position={[part.position[0], part.position[1] + yOffset, part.position[2]]}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={colorObj}
          transparent
          opacity={opacity}
          metalness={0.1}
          roughness={0.6}
          emissive={colorObj}
          emissiveIntensity={glowIntensity * 0.5}
        />
      </mesh>
      
      {isNew && glowIntensity > 0 && (
        <Edges scale={1.02} threshold={15} color="#ffffff">
          <mesh geometry={geometry}>
            <meshBasicMaterial color="#ffffff" transparent opacity={glowIntensity * 0.3} />
          </mesh>
        </Edges>
      )}

      {studCount.map((stud, i) => (
        <mesh
          key={i}
          position={[
            stud.x,
            part.size[1] / 2 + 0.075,
            stud.z,
          ]}
        >
          <cylinderGeometry args={[0.08, 0.08, 0.15, 12]} />
          <meshStandardMaterial
            color={colorObj}
            transparent
            opacity={opacity}
            metalness={0.1}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

interface CameraControllerProps {
  hasDetail: boolean
  setHasDetail: (value: boolean) => void
}

function CameraController({ hasDetail, setHasDetail }: CameraControllerProps) {
  const { camera } = useThree()

  useFrame(() => {
    const distance = camera.position.length()
    const shouldHaveDetail = distance < 20
    if (shouldHaveDetail !== hasDetail) {
      setHasDetail(shouldHaveDetail)
    }
  })

  return null
}

interface ModelViewerProps {
  currentStep: number
}

function Scene({ currentStep }: ModelViewerProps) {
  const [hasDetail, setHasDetail] = useState(false)
  const controlsRef = useRef<any>(null)

  const visibleParts = useMemo(() => {
    return allParts.filter(part => part.step <= currentStep)
  }, [currentStep])

  const newParts = useMemo(() => {
    return allParts.filter(part => part.step === currentStep).map(p => p.id)
  }, [currentStep])

  return (
    <>
      <CameraController hasDetail={hasDetail} setHasDetail={setHasDetail} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#4a9eff" />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#7b2ff7" />
      
      {allParts.map(part => (
        <LegoBrick
          key={part.id}
          part={part}
          isVisible={part.step <= currentStep}
          isNew={newParts.includes(part.id)}
          hasDetail={hasDetail}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={5}
        maxDistance={40}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
        enableDamping
        dampingFactor={0.08}
        target={[0, 4, 0]}
      />
    </>
  )
}

export default function ModelViewer({ currentStep }: ModelViewerProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene currentStep={currentStep} />
      </Canvas>
    </div>
  )
}
