import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  CakeConfig,
  getFlavorColor,
  SIZE_HEIGHT_RATIO
} from '../utils/cakeConfig'

interface Cake3DViewProps {
  config: CakeConfig
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function Cake3DView({ config }: Cake3DViewProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cakeGroupRef = useRef<THREE.Group | null>(null)
  const animationIdRef = useRef<number>(0)
  const prevConfigRef = useRef<CakeConfig>(config)
  const rotationAnimRef = useRef<{
    active: boolean
    start: number
    duration: number
  }>({ active: false, start: 0, duration: 0 })
  const liftAnimRef = useRef<{
    active: boolean
    start: number
    duration: number
  }>({ active: true, start: 0, duration: 1200 })
  const baseYRef = useRef(0)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfef9f0)
    sceneRef.current = scene

    const width = mount.clientWidth
    const height = mount.clientHeight

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 3, 8)
    camera.lookAt(0, 0.5, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 8, 5)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 50
    dirLight.shadow.camera.left = -10
    dirLight.shadow.camera.right = 10
    dirLight.shadow.camera.top = 10
    dirLight.shadow.camera.bottom = -10
    scene.add(dirLight)

    const groundGeo = new THREE.CircleGeometry(6, 64)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd5c9b6,
      transparent: true,
      opacity: 0.3
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    const cakeGroup = new THREE.Group()
    cakeGroup.position.y = -2
    cakeGroupRef.current = cakeGroup
    scene.add(cakeGroup)

    buildCake(cakeGroup, config)

    liftAnimRef.current = {
      active: true,
      start: performance.now(),
      duration: 1200
    }

    const handleResize = () => {
      if (!mount || !camera || !renderer) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      const now = performance.now()

      if (cakeGroup) {
        if (liftAnimRef.current.active) {
          const elapsed = now - liftAnimRef.current.start
          const progress = Math.min(elapsed / liftAnimRef.current.duration, 1)
          const eased = easeOutCubic(progress)
          cakeGroup.position.y = -2 + eased * 2
          if (progress >= 1) {
            liftAnimRef.current.active = false
            baseYRef.current = 0
          }
        }

        if (rotationAnimRef.current.active) {
          const elapsed = now - rotationAnimRef.current.start
          const progress = Math.min(elapsed / rotationAnimRef.current.duration, 1)
          let rotationY: number
          if (progress < 0.5) {
            rotationY = Math.PI * 2 * (progress / 0.5)
          } else {
            rotationY = Math.PI * 2 - Math.PI * 2 * ((progress - 0.5) / 0.5)
          }
          cakeGroup.rotation.y = rotationY
          if (progress >= 1) {
            rotationAnimRef.current.active = false
            cakeGroup.rotation.y = 0
          }
        } else if (!liftAnimRef.current.active) {
          cakeGroup.rotation.y += 0.003
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationIdRef.current)
      if (renderer && mount) {
        mount.removeChild(renderer.domElement)
        renderer.dispose()
      }
    }
  }, [])

  useEffect(() => {
    const group = cakeGroupRef.current
    if (!group) return

    const hasChanged =
      JSON.stringify(config) !== JSON.stringify(prevConfigRef.current)

    if (hasChanged) {
      while (group.children.length > 0) {
        const child = group.children[0]
        group.remove(child)
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      }

      buildCake(group, config)
      prevConfigRef.current = { ...config }

      rotationAnimRef.current = {
        active: true,
        start: performance.now(),
        duration: 600
      }
    }
  }, [config])

  return <div ref={mountRef} className="cake-3d-view" />
}

function buildCake(group: THREE.Group, config: CakeConfig): void {
  const size = config.size
  const baseRadius = 0.8 + (size - 6) * 0.15
  const heightRatio = SIZE_HEIGHT_RATIO[size]
  const bodyHeight = 1.4 * heightRatio
  const bodyColor = getFlavorColor(config.flavor)
  const frostingColor = config.frostingColor

  const bodyGeo = new THREE.CylinderGeometry(
    baseRadius,
    baseRadius * 0.95,
    bodyHeight,
    64
  )
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.7,
    metalness: 0.05
  })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = bodyHeight / 2
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const topRadius = baseRadius * 1.02
  const frostingThickness = 0.12
  const topFrostingGeo = new THREE.CylinderGeometry(
    topRadius,
    topRadius,
    frostingThickness,
    64
  )
  const frostingMat = new THREE.MeshStandardMaterial({
    color: frostingColor,
    roughness: 0.4,
    metalness: 0.02
  })
  const topFrosting = new THREE.Mesh(topFrostingGeo, frostingMat)
  topFrosting.position.y = bodyHeight + frostingThickness / 2
  topFrosting.castShadow = true
  group.add(topFrosting)

  if (config.frostingStyle === 'wave') {
    const wavePoints: THREE.Vector2[] = []
    const waveSegments = 20
    for (let i = 0; i <= waveSegments; i++) {
      const t = i / waveSegments
      const y = t * 0.35
      const r =
        baseRadius * 1.03 + Math.sin(t * Math.PI * 6) * 0.06
      wavePoints.push(new THREE.Vector2(r, y))
    }
    const waveGeo = new THREE.LatheGeometry(wavePoints, 64)
    const waveMesh = new THREE.Mesh(waveGeo, frostingMat)
    waveMesh.position.y = bodyHeight - 0.05
    waveMesh.castShadow = true
    group.add(waveMesh)
  } else if (config.frostingStyle === 'star') {
    const starCount = 12
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2
      const starX = Math.cos(angle) * (baseRadius * 0.85)
      const starZ = Math.sin(angle) * (baseRadius * 0.85)
      const starGeo = new THREE.SphereGeometry(0.08, 12, 8)
      const starMesh = new THREE.Mesh(starGeo, frostingMat)
      starMesh.position.set(starX, bodyHeight + 0.05, starZ)
      starMesh.castShadow = true
      group.add(starMesh)
    }
    const centerStarGeo = new THREE.SphereGeometry(0.12, 16, 12)
    const centerStar = new THREE.Mesh(centerStarGeo, frostingMat)
    centerStar.position.y = bodyHeight + 0.08
    centerStar.castShadow = true
    group.add(centerStar)
  }

  if (config.decorationText && config.decorationText.length > 0) {
    const text = config.decorationText
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 100px Arial, sans-serif'
    ctx.fillStyle = frostingColor === '#ffffff' ? '#c0392b' : frostingColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.15)'
    ctx.shadowBlur = 4
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    })
    const sprite = new THREE.Sprite(spriteMat)
    const aspect = canvas.width / canvas.height
    const spriteWidth = Math.min(baseRadius * 1.4, 2.5)
    sprite.scale.set(spriteWidth, spriteWidth / aspect, 1)
    sprite.position.set(0, bodyHeight / 2 + 0.05, baseRadius * 0.98)
    group.add(sprite)
  }

  const fruitPositions: { x: number; z: number }[] = []
  const fruitTypes: { type: 'strawberry' | 'blueberry' | 'cherry'; count: number }[] = [
    { type: 'strawberry', count: config.fruits.strawberry },
    { type: 'blueberry', count: config.fruits.blueberry },
    { type: 'cherry', count: config.fruits.cherry }
  ]

  fruitTypes.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      let geo: THREE.BufferGeometry
      let color: number
      let sizeFruit: number

      if (type === 'strawberry') {
        const points: THREE.Vector2[] = []
        for (let j = 0; j < 8; j++) {
          const t = j / 7
          const r = 0.06 + Math.sin(t * Math.PI) * 0.04
          points.push(new THREE.Vector2(r, t * 0.12))
        }
        geo = new THREE.LatheGeometry(points, 16)
        color = 0xe74c3c
        sizeFruit = 1
      } else if (type === 'blueberry') {
        geo = new THREE.SphereGeometry(0.05, 12, 10)
        color = 0x3498db
        sizeFruit = 0.9
      } else {
        geo = new THREE.SphereGeometry(0.07, 16, 12)
        color = 0xc0392b
        sizeFruit = 1.1
      }

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.1
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      mesh.scale.setScalar(sizeFruit)

      let x: number, z: number
      let attempts = 0
      do {
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * baseRadius * 0.7
        x = Math.cos(angle) * dist
        z = Math.sin(angle) * dist
        attempts++
      } while (
        attempts < 20 &&
        fruitPositions.some(
          (p) => Math.hypot(p.x - x, p.z - z) < 0.18
        )
      )
      fruitPositions.push({ x, z })

      mesh.position.set(x, bodyHeight + 0.15, z)
      group.add(mesh)

      if (type === 'cherry') {
        const stemGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.1, 8)
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22 })
        const stem = new THREE.Mesh(stemGeo, stemMat)
        stem.position.set(x, bodyHeight + 0.27, z)
        stem.rotation.z = 0.3
        group.add(stem)
      }
    }
  })

  for (let i = 0; i < config.candleCount; i++) {
    const angle = (i / Math.max(config.candleCount, 1)) * Math.PI * 2
    const candleDist = baseRadius * 0.5
    const cx = Math.cos(angle) * candleDist
    const cz = Math.sin(angle) * candleDist

    const candleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 16)
    const candleMat = new THREE.MeshStandardMaterial({
      color: 0xfffff0,
      roughness: 0.6
    })
    const candle = new THREE.Mesh(candleGeo, candleMat)
    candle.position.set(cx, bodyHeight + 0.3, cz)
    candle.castShadow = true
    group.add(candle)

    const flameGeo = new THREE.SphereGeometry(0.035, 12, 10)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa500 })
    const flame = new THREE.Mesh(flameGeo, flameMat)
    flame.position.set(cx, bodyHeight + 0.5, cz)
    group.add(flame)
  }
}

export default Cake3DView
