import * as THREE from 'three'
import {
  ProfilePoint,
  GlazeLayer,
  generatePotteryGeometry,
  createDefaultProfile,
  mixGlazeColors,
  getPressureAtHeight,
} from './utils'

export interface PotteryScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  potteryMesh: THREE.Mesh
  potteryGroup: THREE.Group
  wheelMesh: THREE.Mesh
  wheelGroup: THREE.Group
  profile: ProfilePoint[]
  originalProfile: ProfilePoint[]
  rpm: number
  isFired: boolean
  pressure: number
  updateShape: (heightIndex: number, direction: 'up' | 'down') => void
  updateGlaze: (layers: GlazeLayer[], isPreview?: boolean) => void
  updateRPM: (rpm: number) => void
  updatePressure: (pressure: number) => void
  firePottery: (onProgress?: (temp: number) => void, onComplete?: () => void) => void
  reset: () => void
  resize: () => void
  animate: () => void
  getCanvas: () => HTMLCanvasElement
  setContainer: (container: HTMLElement) => void
  raycast: (clientX: number, clientY: number) => { hit: boolean; heightIndex: number; point: THREE.Vector3 | null }
}

const SEGMENTS = 16
const HEIGHT_SEGMENTS = 16

export function createPotteryScene(container: HTMLElement): PotteryScene {
  const scene = new THREE.Scene()
  scene.background = null

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 3, 12)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  const wheelGroup = new THREE.Group()
  scene.add(wheelGroup)

  const potteryGroup = new THREE.Group()
  potteryGroup.position.y = 0.2
  wheelGroup.add(potteryGroup)

  const ambientLight = new THREE.HemisphereLight(0xffffff, 0x8b7355, 0.6)
  scene.add(ambientLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8)
  keyLight.position.set(5, 10, 5)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.width = 2048
  keyLight.shadow.mapSize.height = 2048
  scene.add(keyLight)

  const fillLight = new THREE.PointLight(0xffeedd, 0.5, 20)
  fillLight.position.set(-5, 3, 5)
  scene.add(fillLight)

  const rimLight = new THREE.PointLight(0xffd7a3, 0.3, 20)
  rimLight.position.set(0, 5, -8)
  scene.add(rimLight)

  const wheelGeometry = new THREE.CylinderGeometry(3, 3, 0.4, 64)
  const wheelTexture = createWoodTexture()
  const wheelMaterial = new THREE.MeshStandardMaterial({
    map: wheelTexture,
    roughness: 0.8,
    metalness: 0.1,
  })
  const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial)
  wheelMesh.receiveShadow = true
  wheelGroup.add(wheelMesh)

  const wheelRimGeometry = new THREE.TorusGeometry(3, 0.1, 8, 64)
  const wheelRimMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.6,
    metalness: 0.3,
  })
  const wheelRim = new THREE.Mesh(wheelRimGeometry, wheelRimMaterial)
  wheelRim.rotation.x = Math.PI / 2
  wheelRim.position.y = 0.2
  wheelGroup.add(wheelRim)

  const profile = createDefaultProfile(4, 2, HEIGHT_SEGMENTS)
  const originalProfile = [...profile.map(p => ({ ...p }))]

  const potteryGeometry = generatePotteryGeometry(profile, SEGMENTS)
  const potteryMaterial = new THREE.MeshPhongMaterial({
    color: 0xc8b4a0,
    shininess: 30,
    side: THREE.DoubleSide,
  })
  const potteryMesh = new THREE.Mesh(potteryGeometry, potteryMaterial)
  potteryMesh.castShadow = true
  potteryMesh.receiveShadow = true
  potteryGroup.add(potteryMesh)

  let currentContainer = container
  let rpm = 60
  let isFired = false
  let pressure = 0
  let animationId: number | null = null
  let targetRotationSpeed = 0

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  function createWoodTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, '#8b6914')
    gradient.addColorStop(0.3, '#a07818')
    gradient.addColorStop(0.6, '#7a5a10')
    gradient.addColorStop(1, '#5a4008')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)

    for (let i = 0; i < 30; i++) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(60, 40, 10, ${0.1 + Math.random() * 0.2})`
      ctx.lineWidth = 1 + Math.random() * 2
      const radius = 20 + i * 8
      ctx.arc(256, 256, radius, 0, Math.PI * 2)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }

  function updatePotteryGeometry() {
    const newGeometry = generatePotteryGeometry(profile, SEGMENTS)
    const pressureAttr = newGeometry.getAttribute('pressure') as THREE.BufferAttribute
    
    for (let i = 0; i <= HEIGHT_SEGMENTS; i++) {
      const p = getPressureAtHeight(profile, originalProfile, i)
      for (let j = 0; j <= SEGMENTS; j++) {
        const idx = i * (SEGMENTS + 1) + j
        pressureAttr.setX(idx, p)
      }
    }
    
    pressureAttr.needsUpdate = true
    newGeometry.attributes.position.needsUpdate = true
    newGeometry.attributes.normal.needsUpdate = true
    newGeometry.computeVertexNormals()

    potteryMesh.geometry.dispose()
    potteryMesh.geometry = newGeometry
  }

  function updateShape(heightIndex: number, direction: 'up' | 'down') {
    if (isFired) return
    
    const pressureAmount = pressure * 0.01
    const influenceRange = 3

    for (let i = 0; i < profile.length; i++) {
      const distance = Math.abs(i - heightIndex)
      if (distance <= influenceRange) {
        const falloff = 1 - distance / influenceRange
        const deformation = pressureAmount * falloff

        if (direction === 'up') {
          profile[i].radius -= deformation * 0.5
          profile[i].y += deformation * 0.3
        } else {
          profile[i].radius += deformation * 0.6
          profile[i].y -= deformation * 0.2
        }

        profile[i].radius = Math.max(0.3, Math.min(5, profile[i].radius))
      }
    }

    updatePotteryGeometry()
  }

  function updateGlaze(layers: GlazeLayer[], isPreview: boolean = false) {
    const mixedColor = mixGlazeColors(layers)
    
    if (isFired) {
      const material = potteryMesh.material as unknown as THREE.MeshStandardMaterial
      material.color.set(mixedColor)
    } else {
      const material = potteryMesh.material as unknown as THREE.MeshPhongMaterial
      material.color.set(mixedColor)
      if (isPreview && layers.length > 0) {
        material.opacity = 0.4
        material.transparent = true
      } else {
        material.opacity = 1
        material.transparent = false
      }
    }
  }

  function updateRPM(newRpm: number) {
    rpm = Math.max(0, Math.min(300, newRpm))
    targetRotationSpeed = (rpm / 60) * Math.PI * 2
  }

  function updatePressure(newPressure: number) {
    pressure = Math.max(0, Math.min(100, newPressure))
  }

  function firePottery(onProgress?: (temp: number) => void, onComplete?: () => void) {
    if (isFired) {
      onComplete?.()
      return
    }

    const duration = 4000
    const startTime = Date.now()
    const startColor = (potteryMesh.material as unknown as THREE.MeshPhongMaterial).color.getHex()

    const fireInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      const temp = 25 + progress * 1275

      onProgress?.(temp)

      const t = progress
      const material = potteryMesh.material as unknown as THREE.MeshPhongMaterial
      
      const heatR = 200 + t * 55
      const heatG = 50 + t * 100
      const heatB = 30 + t * 50
      material.color.setRGB(heatR / 255, heatG / 255, heatB / 255)
      material.emissive = new THREE.Color(0xff4400).multiplyScalar(t * 0.5)

      if (progress >= 1) {
        clearInterval(fireInterval)
        completeFiring()
        onComplete?.()
      }
    }, 50)
  }

  function completeFiring() {
    isFired = true
    
    const currentColor = (potteryMesh.material as unknown as THREE.MeshPhongMaterial).color.getHex()
    potteryMesh.material.dispose()
    
    const standardMaterial = new THREE.MeshStandardMaterial({
      color: currentColor,
      roughness: 0.2,
      metalness: 0.1,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    })
    potteryMesh.material = standardMaterial as unknown as THREE.MeshPhongMaterial
  }

  function reset() {
    for (let i = 0; i < profile.length; i++) {
      profile[i].y = originalProfile[i].y
      profile[i].radius = originalProfile[i].radius
    }
    isFired = false
    rpm = 60
    pressure = 0
    targetRotationSpeed = (rpm / 60) * Math.PI * 2

    potteryMesh.material.dispose()
    const phongMaterial = new THREE.MeshPhongMaterial({
      color: 0xc8b4a0,
      shininess: 30,
      side: THREE.DoubleSide,
    })
    potteryMesh.material = phongMaterial

    updatePotteryGeometry()
    wheelGroup.rotation.set(0, 0, 0)
  }

  function resize() {
    if (!currentContainer) return
    camera.aspect = currentContainer.clientWidth / currentContainer.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight)
  }

  function animate() {
    animationId = requestAnimationFrame(animate)
    
    wheelGroup.rotation.y += targetRotationSpeed * 0.016
    renderer.render(scene, camera)
  }

  function getCanvas(): HTMLCanvasElement {
    return renderer.domElement
  }

  function setContainer(container: HTMLElement) {
    if (currentContainer && currentContainer.contains(renderer.domElement)) {
      currentContainer.removeChild(renderer.domElement)
    }
    currentContainer = container
    container.appendChild(renderer.domElement)
    resize()
  }

  function raycast(clientX: number, clientY: number): { hit: boolean; heightIndex: number; point: THREE.Vector3 | null } {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(potteryMesh)

    if (intersects.length > 0) {
      const point = intersects[0].point
      const localY = potteryGroup.worldToLocal(point.clone()).y
      const heightIndex = Math.round(((localY + 2) / 4) * HEIGHT_SEGMENTS)
      return {
        hit: true,
        heightIndex: Math.max(0, Math.min(HEIGHT_SEGMENTS, heightIndex)),
        point: point,
      }
    }

    return { hit: false, heightIndex: -1, point: null }
  }

  updateRPM(60)
  animate()

  return {
    scene,
    camera,
    renderer,
    potteryMesh,
    potteryGroup,
    wheelMesh,
    wheelGroup,
    profile,
    originalProfile,
    rpm,
    isFired,
    pressure,
    updateShape,
    updateGlaze,
    updateRPM,
    updatePressure,
    firePottery,
    reset,
    resize,
    animate,
    getCanvas,
    setContainer,
    raycast,
  }
}
