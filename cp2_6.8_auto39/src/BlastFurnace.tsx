import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface BlastFurnaceProps {
  chargeLevel: number
  chargeLayers: Array<{ type: string; height: number }>
  temperature: number
  ironLevel: number
  isBlasting: boolean
  isTapping: boolean
  isWarning: boolean
}

const FURNACE_HEIGHT = 8
const FURNACE_BOTTOM_RADIUS = 2.5
const FURNACE_TOP_RADIUS = 1.5
const FURNACE_BOSH_RADIUS = 2.8
const BOSH_HEIGHT = 1.5
const HEARTH_HEIGHT = 1.5

function BlastFurnace({
  chargeLevel,
  chargeLayers,
  temperature,
  ironLevel,
  isBlasting,
  isTapping,
  isWarning
}: BlastFurnaceProps) {
  const ironSurfaceRef = useRef<THREE.Mesh>(null)
  const hotParticlesRef = useRef<THREE.Points>(null)
  const tapParticlesRef = useRef<THREE.Points>(null)
  const warningLightRef = useRef<THREE.PointLight>(null)

  const furnaceGeometry = useMemo(() => {
    const points: THREE.Vector2[] = []
    const segments = 32
    
    const topY = FURNACE_HEIGHT
    const shaftBottomY = BOSH_HEIGHT + HEARTH_HEIGHT
    const hearthTopY = HEARTH_HEIGHT
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      let y: number
      let r: number
      
      if (t < 0.15) {
        const tt = t / 0.15
        y = topY - tt * 0.8
        r = FURNACE_TOP_RADIUS + tt * 0.3
      } else if (t < 0.65) {
        const tt = (t - 0.15) / 0.5
        y = topY - 0.8 - tt * (topY - 0.8 - shaftBottomY)
        r = FURNACE_TOP_RADIUS + 0.3 + tt * (FURNACE_BOSH_RADIUS - FURNACE_TOP_RADIUS - 0.3)
      } else if (t < 0.8) {
        const tt = (t - 0.65) / 0.15
        y = shaftBottomY - tt * BOSH_HEIGHT
        r = FURNACE_BOSH_RADIUS - tt * (FURNACE_BOSH_RADIUS - FURNACE_BOTTOM_RADIUS)
      } else {
        const tt = (t - 0.8) / 0.2
        y = hearthTopY - tt * HEARTH_HEIGHT
        r = FURNACE_BOTTOM_RADIUS
      }
      
      points.push(new THREE.Vector2(r, y))
    }
    
    return new THREE.LatheGeometry(points, 64)
  }, [])

  const chargeParticles = useMemo(() => {
    const particles: Array<{
      position: [number, number, number]
      color: string
      size: number
    }> = []
    
    let currentHeight = 0
    const maxParticles = 500
    
    const layerColors: Record<string, string> = {
      ore: '#5c3d2e',
      coke: '#2a2a2a',
      limestone: '#e8e8e8'
    }
    
    for (let i = chargeLayers.length - 1; i >= 0 && particles.length < maxParticles; i--) {
      const layer = chargeLayers[i]
      const layerHeight = (layer.height / 100) * (FURNACE_HEIGHT * 0.6)
      const yBottom = currentHeight
      const yTop = currentHeight + layerHeight
      
      const particlesInLayer = Math.min(Math.floor(layerHeight * 80), 100)
      
      for (let j = 0; j < particlesInLayer && particles.length < maxParticles; j++) {
        const y = yBottom + Math.random() * layerHeight
        const radiusAtY = FURNACE_BOTTOM_RADIUS * 0.85 + (y / (FURNACE_HEIGHT * 0.6)) * (FURNACE_TOP_RADIUS * 0.7 - FURNACE_BOTTOM_RADIUS * 0.85)
        const r = Math.random() * radiusAtY
        const theta = Math.random() * Math.PI * 2
        const x = Math.cos(theta) * r
        const z = Math.sin(theta) * r
        
        particles.push({
          position: [x, y + HEARTH_HEIGHT + 0.2, z],
          color: layerColors[layer.type] || '#666666',
          size: 0.05 + Math.random() * 0.08
        })
      }
      
      currentHeight = yTop
    }
    
    return particles
  }, [chargeLayers])

  const chargeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(chargeParticles.length * 3)
    const colors = new Float32Array(chargeParticles.length * 3)
    const sizes = new Float32Array(chargeParticles.length)
    
    chargeParticles.forEach((p, i) => {
      positions[i * 3] = p.position[0]
      positions[i * 3 + 1] = p.position[1]
      positions[i * 3 + 2] = p.position[2]
      
      const color = new THREE.Color(p.color)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
      
      sizes[i] = p.size
    })
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [chargeParticles])

  const hotParticleCount = 800
  const hotParticleData = useMemo(() => {
    const positions = new Float32Array(hotParticleCount * 3)
    const velocities = new Float32Array(hotParticleCount)
    const offsets = new Float32Array(hotParticleCount)
    
    for (let i = 0; i < hotParticleCount; i++) {
      const r = Math.random() * FURNACE_BOTTOM_RADIUS * 0.9
      const theta = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(theta) * r
      positions[i * 3 + 1] = Math.random() * (FURNACE_HEIGHT * 0.5) + HEARTH_HEIGHT
      positions[i * 3 + 2] = Math.sin(theta) * r
      
      velocities[i] = 0.5 + Math.random() * 1.5
      offsets[i] = Math.random() * Math.PI * 2
    }
    
    return { positions, velocities, offsets }
  }, [])

  const hotParticleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(hotParticleData.positions), 3))
    return geometry
  }, [hotParticleData])

  const tapParticleCount = 200
  const tapParticleData = useMemo(() => {
    const positions = new Float32Array(tapParticleCount * 3)
    const velocities = new Float32Array(tapParticleCount * 3)
    
    for (let i = 0; i < tapParticleCount; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      
      velocities[i * 3] = 0.5 + Math.random() * 1
      velocities[i * 3 + 1] = -1 - Math.random() * 2
      velocities[i * 3 + 2] = -0.5 + Math.random()
    }
    
    return { positions, velocities }
  }, [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    
    if (ironSurfaceRef.current) {
      ironSurfaceRef.current.position.y = HEARTH_HEIGHT * 0.1 + (ironLevel / 100) * HEARTH_HEIGHT * 0.8
      
      const geometry = ironSurfaceRef.current.geometry as THREE.PlaneGeometry
      const positions = geometry.attributes.position
      
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i)
        const z = positions.getZ(i)
        const waveHeight = Math.sin(time * 2 + x * 3) * Math.cos(time * 1.5 + z * 2) * 0.05
        positions.setY(i, waveHeight)
      }
      positions.needsUpdate = true
      geometry.computeVertexNormals()
    }
    
    if (hotParticlesRef.current && isBlasting) {
      const positions = hotParticlesRef.current.geometry.attributes.position.array as Float32Array
      
      for (let i = 0; i < hotParticleCount; i++) {
        const idx = i * 3
        
        positions[idx + 1] += hotParticleData.velocities[i] * delta * 0.5
        
        positions[idx] += Math.sin(time * 2 + hotParticleData.offsets[i]) * delta * 0.2
        positions[idx + 2] += Math.cos(time * 2 + hotParticleData.offsets[i]) * delta * 0.2
        
        if (positions[idx + 1] > FURNACE_HEIGHT * 0.7) {
          positions[idx + 1] = HEARTH_HEIGHT + 0.5
          const r = Math.random() * FURNACE_BOTTOM_RADIUS * 0.9
          const theta = Math.random() * Math.PI * 2
          positions[idx] = Math.cos(theta) * r
          positions[idx + 2] = Math.sin(theta) * r
        }
        
        const distFromCenter = Math.sqrt(positions[idx] ** 2 + positions[idx + 2] ** 2)
        const maxRadius = FURNACE_BOTTOM_RADIUS * 0.85
        if (distFromCenter > maxRadius) {
          const scale = maxRadius / distFromCenter
          positions[idx] *= scale
          positions[idx + 2] *= scale
        }
      }
      
      hotParticlesRef.current.geometry.attributes.position.needsUpdate = true
    }
    
    if (tapParticlesRef.current && isTapping) {
      const positions = tapParticlesRef.current.geometry.attributes.position.array as Float32Array
      
      for (let i = 0; i < tapParticleCount; i++) {
        const idx = i * 3
        
        if (positions[idx + 1] < -3) {
          positions[idx] = 0
          positions[idx + 1] = HEARTH_HEIGHT * 0.3
          positions[idx + 2] = 0
        }
        
        positions[idx] += tapParticleData.velocities[idx] * delta * 2
        positions[idx + 1] += tapParticleData.velocities[idx + 1] * delta * 2
        positions[idx + 2] += tapParticleData.velocities[idx + 2] * delta * 2
      }
      
      tapParticlesRef.current.geometry.attributes.position.needsUpdate = true
    }
    
    if (warningLightRef.current && isWarning) {
      warningLightRef.current.intensity = 2 + Math.sin(time * 8) * 1.5
    } else if (warningLightRef.current) {
      warningLightRef.current.intensity = 0
    }
  })

  const ironColor = useMemo(() => {
    const t = Math.min((temperature - 1000) / 200, 1)
    const r = 1
    const g = 0.4 + t * 0.3
    const b = t * 0.1
    return new THREE.Color(r, g, b)
  }, [temperature])

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={furnaceGeometry} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          color="#3a4a6a"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.2}
          wireframe={false}
        />
      </mesh>
      
      <mesh geometry={furnaceGeometry} position={[0, 0, 0]}>
        <meshBasicMaterial
          color="#4a8fff"
          transparent
          opacity={0.2}
          wireframe={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <mesh position={[0, FURNACE_HEIGHT + 0.3, 0]}>
        <cylinderGeometry args={[FURNACE_TOP_RADIUS * 0.6, FURNACE_TOP_RADIUS * 0.8, 0.6, 32]} />
        <meshStandardMaterial color="#2a3a5a" metalness={0.5} roughness={0.5} />
      </mesh>
      
      <mesh position={[0, FURNACE_HEIGHT + 0.6, 0]}>
        <cylinderGeometry args={[FURNACE_TOP_RADIUS * 0.4, FURNACE_TOP_RADIUS * 0.6, 0.4, 32]} />
        <meshStandardMaterial color="#1a2a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      
      <mesh position={[FURNACE_BOTTOM_RADIUS + 0.3, HEARTH_HEIGHT * 0.3, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.8, 16]} />
        <meshStandardMaterial color="#3a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      
      <mesh position={[FURNACE_BOTTOM_RADIUS + 0.7, HEARTH_HEIGHT * 0.3, 0]}>
        <torusGeometry args={[0.3, 0.08, 8, 16]} />
        <meshStandardMaterial color="#5a4a4a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {chargeParticles.length > 0 && (
        <points geometry={chargeGeometry}>
          <pointsMaterial
            size={0.1}
            vertexColors={true}
            sizeAttenuation={true}
            transparent
            opacity={0.9}
          />
        </points>
      )}
      
      {temperature >= 1000 && (
        <mesh ref={ironSurfaceRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, HEARTH_HEIGHT * 0.5, 0]}>
          <circleGeometry args={[FURNACE_BOTTOM_RADIUS * 0.9, 64]} />
          <meshPhysicalMaterial
            color={ironColor}
            transparent
            opacity={0.85}
            emissive={ironColor}
            emissiveIntensity={0.6}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      )}
      
      {isBlasting && temperature >= 500 && (
        <points ref={hotParticlesRef} geometry={hotParticleGeometry}>
          <pointsMaterial
            size={0.08}
            color="#ff6622"
            transparent
            opacity={0.6}
            sizeAttenuation={true}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
      
      {isTapping && (
        <group position={[FURNACE_BOTTOM_RADIUS + 0.3, HEARTH_HEIGHT * 0.3, 0]}>
          <points ref={tapParticlesRef}>
            <pointsMaterial
              size={0.1}
              color="#ff5500"
              transparent
              opacity={0.9}
              sizeAttenuation={true}
              blending={THREE.AdditiveBlending}
            />
          </points>
          
          <mesh position={[1, -1, 0]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[2.5, 0.15, 0.5]} />
            <meshStandardMaterial color="#3a2a2a" metalness={0.5} roughness={0.6} />
          </mesh>
        </group>
      )}
      
      <pointLight
        ref={warningLightRef}
        position={[0, FURNACE_HEIGHT * 0.8, 0]}
        color="#ff2222"
        intensity={0}
        distance={8}
      />
      
      {temperature >= 1000 && (
        <pointLight
          position={[0, HEARTH_HEIGHT * 0.5, 0]}
          color="#ff6600"
          intensity={2}
          distance={6}
        />
      )}
      
      <mesh position={[FURNACE_BOTTOM_RADIUS + 1.5, FURNACE_HEIGHT * 0.5, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh position={[FURNACE_BOTTOM_RADIUS + 1.5, FURNACE_HEIGHT * 0.5, 0.03]}>
        <cylinderGeometry args={[0.5, 0.5, 0.02, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
      </mesh>
      
      <mesh position={[-FURNACE_BOTTOM_RADIUS - 1.5, FURNACE_HEIGHT * 0.8, 0]}>
        <cylinderGeometry args={[0.02, 0.02, FURNACE_HEIGHT * 0.4, 8]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
    </group>
  )
}

export default BlastFurnace
