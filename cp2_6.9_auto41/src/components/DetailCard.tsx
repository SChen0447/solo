import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PartData } from '../data/partsData'

interface DetailCardProps {
  part: PartData | null
  visible: boolean
  onClose: () => void
}

const DetailCard: React.FC<DetailCardProps> = ({ part, visible, onClose }) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const meshRef = useRef<THREE.LineSegments | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const container = canvasRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 5)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xf59e0b, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xef4444, 0.8)
    directionalLight.position.set(3, 5, 4)
    scene.add(directionalLight)

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.006
        meshRef.current.rotation.y += 0.01
      }
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!canvasRef.current || !camera || !renderer) return
      const w = canvasRef.current.clientWidth
      const h = canvasRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (meshRef.current) {
        scene.remove(meshRef.current)
        meshRef.current.geometry.dispose()
        ;(meshRef.current.material as THREE.Material).dispose()
      }
      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current || !part) return

    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current)
      meshRef.current.geometry.dispose()
      ;(meshRef.current.material as THREE.Material).dispose()
      meshRef.current = null
    }

    let geometry: THREE.BufferGeometry
    const size = 1.6

    switch (part.shapeType) {
      case 'box':
        geometry = new THREE.BoxGeometry(size, size * 0.8, size)
        break
      case 'sphere':
        geometry = new THREE.SphereGeometry(size * 0.7, 16, 12)
        break
      case 'pyramid':
        geometry = new THREE.ConeGeometry(size * 0.7, size, 4)
        break
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(size * 0.5, size * 0.5, size * 1.2, 24)
        break
      case 'torus':
        geometry = new THREE.TorusGeometry(size * 0.55, size * 0.18, 10, 32)
        break
      case 'cone':
        geometry = new THREE.ConeGeometry(size * 0.6, size * 1.1, 8)
        break
      default:
        geometry = new THREE.BoxGeometry(size, size, size)
    }

    const edges = new THREE.EdgesGeometry(geometry)
    geometry.dispose()

    const material = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.95,
    })

    const wireframe = new THREE.LineSegments(edges, material)
    sceneRef.current.add(wireframe)
    meshRef.current = wireframe
  }, [part])

  if (!part) return null

  return (
    <div className={`detail-card ${visible ? 'visible' : ''}`}>
      <button className="card-close" onClick={onClose}>
        ✕
      </button>

      <div className="card-header">
        <h2 className="card-title">{part.name}</h2>
        <div className="card-dynasty">{part.dynasty}</div>
      </div>

      <div ref={canvasRef} className="canvas-container" />

      <div className="card-body">
        <div className="card-section">
          <h3 className="card-section-title">结构原理</h3>
          <p className="card-section-text">{part.description}</p>
        </div>
        <div className="card-section">
          <h3 className="card-section-title">文化寓意</h3>
          <p className="card-section-text">{part.culturalMeaning}</p>
        </div>
      </div>
    </div>
  )
}

export default DetailCard
