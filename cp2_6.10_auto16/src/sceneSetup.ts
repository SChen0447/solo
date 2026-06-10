import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface MaterialPreset {
  id: string
  name: string
  color: string
  roughness: number
  metalness: number
  clearcoat: number
  clearcoatRoughness: number
  aoMapIntensity: number
  emissive?: string
  emissiveIntensity?: number
}

export interface LightingPreset {
  id: string
  name: string
  description: string
  icon: string
  ambientColor: string
  ambientIntensity: number
  directionalColor: string
  directionalIntensity: number
  directionalPosition: [number, number, number]
  pointLights: Array<{
    color: string
    intensity: number
    position: [number, number, number]
    distance?: number
  }>
  background: string
}

export interface MaterialParams {
  color?: string
  roughness?: number
  metalness?: number
  clearcoat?: number
  clearcoatRoughness?: number
  aoMapIntensity?: number
  emissive?: string
  emissiveIntensity?: number
}

export interface SceneAPI {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  meshes: THREE.Mesh[]
  materials: Map<string, THREE.MeshPhysicalMaterial>
  materialPresets: MaterialPreset[]
  lightingPresets: LightingPreset[]
  currentLightingId: string
  currentMaterialId: string
  getMeshByName: (name: string) => THREE.Mesh | undefined
  getMaterial: (id: string) => THREE.MeshPhysicalMaterial | undefined
  applyMaterialPreset: (id: string) => void
  updateMaterialParams: (params: MaterialParams) => void
  setLightingPreset: (id: string) => void
  resize: () => void
  tick: (delta: number) => void
}

const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'rough-wood',
    name: '粗糙木纹',
    color: '#8B6914',
    roughness: 0.85,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 1.0,
    aoMapIntensity: 1.0
  },
  {
    id: 'brushed-metal',
    name: '磨砂金属',
    color: '#8C8C8C',
    roughness: 0.4,
    metalness: 0.9,
    clearcoat: 0.1,
    clearcoatRoughness: 0.8,
    aoMapIntensity: 0.8
  },
  {
    id: 'polished-marble',
    name: '抛光大理石',
    color: '#F5F5F0',
    roughness: 0.05,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    aoMapIntensity: 1.0
  },
  {
    id: 'copper',
    name: '紫铜',
    color: '#B87333',
    roughness: 0.25,
    metalness: 1.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    aoMapIntensity: 0.6
  },
  {
    id: 'glossy-plastic',
    name: '亮面塑料',
    color: '#e94560',
    roughness: 0.15,
    metalness: 0.0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    aoMapIntensity: 0.5
  },
  {
    id: 'obsidian',
    name: '黑曜石',
    color: '#1a1a2e',
    roughness: 0.1,
    metalness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    aoMapIntensity: 1.0
  }
]

const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'daylight',
    name: '日光',
    description: '模拟自然户外光照',
    icon: '☀️',
    ambientColor: '#a0c4ff',
    ambientIntensity: 0.6,
    directionalColor: '#ffffff',
    directionalIntensity: 1.2,
    directionalPosition: [5, 8, 5],
    pointLights: [
      { color: '#ffe4b5', intensity: 0.3, position: [-3, 2, -3] }
    ],
    background: '#1a1a2e'
  },
  {
    id: 'warm-spotlight',
    name: '暖光射灯',
    description: '室内暖色聚光效果',
    icon: '💡',
    ambientColor: '#3d2e1f',
    ambientIntensity: 0.25,
    directionalColor: '#ffb347',
    directionalIntensity: 0.6,
    directionalPosition: [2, 6, 2],
    pointLights: [
      { color: '#ff8c00', intensity: 1.5, position: [0, 5, 0], distance: 15 },
      { color: '#ffa500', intensity: 0.8, position: [-4, 3, -2], distance: 12 }
    ],
    background: '#0f0a05'
  },
  {
    id: 'cool-darkroom',
    name: '冷光暗室',
    description: '低照度冷色调环境',
    icon: '🌙',
    ambientColor: '#1a2a4a',
    ambientIntensity: 0.15,
    directionalColor: '#6b9bd1',
    directionalIntensity: 0.4,
    directionalPosition: [-3, 4, -3],
    pointLights: [
      { color: '#4169e1', intensity: 1.0, position: [3, 2, 3], distance: 10 },
      { color: '#00bfff', intensity: 0.6, position: [-2, 1, 4], distance: 8 }
    ],
    background: '#050810'
  }
]

interface LightState {
  ambient: { color: THREE.Color; intensity: number }
  directional: { color: THREE.Color; intensity: number; position: THREE.Vector3 }
  points: Array<{ color: THREE.Color; intensity: number; position: THREE.Vector3; distance: number }>
  background: THREE.Color
}

export function createScene(container: HTMLElement): SceneAPI {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#1a1a2e')

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.set(6, 4, 8)

  const renderer = new THREE.WebGLRenderer({
    antialias: true
  })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 3
  controls.maxDistance = 20
  controls.maxPolarAngle = Math.PI * 0.85
  controls.target.set(0, 0.5, 0)

  const ambientLight = new THREE.AmbientLight('#a0c4ff', 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight('#ffffff', 1.2)
  directionalLight.position.set(5, 8, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.5
  directionalLight.shadow.camera.far = 30
  directionalLight.shadow.camera.left = -8
  directionalLight.shadow.camera.right = 8
  directionalLight.shadow.camera.top = 8
  directionalLight.shadow.camera.bottom = -8
  directionalLight.shadow.bias = -0.0001
  scene.add(directionalLight)

  const pointLights: THREE.PointLight[] = []
  const initialPreset = LIGHTING_PRESETS[0]
  initialPreset.pointLights.forEach((pl) => {
    const pointLight = new THREE.PointLight(pl.color, pl.intensity, pl.distance ?? 0)
    pointLight.position.set(...pl.position)
    pointLight.castShadow = true
    pointLight.shadow.mapSize.width = 1024
    pointLight.shadow.mapSize.height = 1024
    scene.add(pointLight)
    pointLights.push(pointLight)
  })

  const groundGeo = new THREE.PlaneGeometry(30, 30)
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  ground.receiveShadow = true
  scene.add(ground)

  const materials = new Map<string, THREE.MeshPhysicalMaterial>()
  MATERIAL_PRESETS.forEach((preset) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(preset.color),
      roughness: preset.roughness,
      metalness: preset.metalness,
      clearcoat: preset.clearcoat,
      clearcoatRoughness: preset.clearcoatRoughness,
      aoMapIntensity: preset.aoMapIntensity,
      envMapIntensity: 1.0
    })
    materials.set(preset.id, mat)
  })

  const meshes: THREE.Mesh[] = []
  const geometries = [
    new THREE.SphereGeometry(0.7, 64, 64),
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.TorusKnotGeometry(0.5, 0.18, 100, 16)
  ]

  const materialIds = Array.from(materials.keys())
  const rows = Math.ceil(materialIds.length / 3)
  const spacing = 2.4

  materialIds.forEach((matId, index) => {
    const col = index % 3
    const row = Math.floor(index / 3)
    const geoIndex = index % geometries.length
    const geometry = geometries[geoIndex]
    const material = materials.get(matId)!

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = matId

    const offsetX = (col - 1) * spacing
    const offsetZ = (row - (rows - 1) / 2) * spacing * 1.2
    mesh.position.set(offsetX, 0.8, offsetZ)

    scene.add(mesh)
    meshes.push(mesh)
  })

  let currentLightingId = 'daylight'
  let currentMaterialId = materialIds[0]
  let lightTransitionActive = false
  let lightTransitionProgress = 0
  let lightTransitionDuration = 1.5
  const targetLightState: LightState = {
    ambient: { color: new THREE.Color(), intensity: 0 },
    directional: { color: new THREE.Color(), intensity: 0, position: new THREE.Vector3() },
    points: [],
    background: new THREE.Color()
  }
  const startLightState: LightState = {
    ambient: { color: new THREE.Color(), intensity: 0 },
    directional: { color: new THREE.Color(), intensity: 0, position: new THREE.Vector3() },
    points: [],
    background: new THREE.Color()
  }
  const currentBgColor = new THREE.Color('#1a1a2e')

  function captureLightState(state: LightState, preset: LightingPreset): void {
    state.ambient.color.set(preset.ambientColor)
    state.ambient.intensity = preset.ambientIntensity
    state.directional.color.set(preset.directionalColor)
    state.directional.intensity = preset.directionalIntensity
    state.directional.position.set(...preset.directionalPosition)
    state.background.set(preset.background)

    while (state.points.length < preset.pointLights.length) {
      state.points.push({
        color: new THREE.Color(),
        intensity: 0,
        position: new THREE.Vector3(),
        distance: 0
      })
    }
    preset.pointLights.forEach((pl, i) => {
      state.points[i].color.set(pl.color)
      state.points[i].intensity = pl.intensity
      state.points[i].position.set(...pl.position)
      state.points[i].distance = pl.distance ?? 0
    })
  }

  function lerpColor(a: THREE.Color, b: THREE.Color, t: number, target: THREE.Color): void {
    target.r = a.r + (b.r - a.r) * t
    target.g = a.g + (b.g - a.g) * t
    target.b = a.b + (b.b - a.b) * t
  }

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const api: SceneAPI = {
    scene,
    camera,
    renderer,
    controls,
    meshes,
    materials,
    materialPresets: MATERIAL_PRESETS,
    lightingPresets: LIGHTING_PRESETS,
    get currentLightingId() {
      return currentLightingId
    },
    get currentMaterialId() {
      return currentMaterialId
    },
    getMeshByName: (name) => meshes.find((m) => m.name === name),
    getMaterial: (id) => materials.get(id),
    applyMaterialPreset: (id) => {
      const preset = MATERIAL_PRESETS.find((p) => p.id === id)
      if (!preset) return
      currentMaterialId = id
      api.updateMaterialParams({
        color: preset.color,
        roughness: preset.roughness,
        metalness: preset.metalness,
        clearcoat: preset.clearcoat,
        clearcoatRoughness: preset.clearcoatRoughness,
        aoMapIntensity: preset.aoMapIntensity
      })
    },
    updateMaterialParams: (params) => {
      const material = materials.get(currentMaterialId)
      if (!material) return
      if (params.color !== undefined) material.color.set(params.color)
      if (params.roughness !== undefined) material.roughness = params.roughness
      if (params.metalness !== undefined) material.metalness = params.metalness
      if (params.clearcoat !== undefined) material.clearcoat = params.clearcoat
      if (params.clearcoatRoughness !== undefined) material.clearcoatRoughness = params.clearcoatRoughness
      if (params.aoMapIntensity !== undefined) material.aoMapIntensity = params.aoMapIntensity
      material.needsUpdate = true
    },
    setLightingPreset: (id) => {
      const preset = LIGHTING_PRESETS.find((p) => p.id === id)
      if (!preset) return
      currentLightingId = id

      const currentPreset = LIGHTING_PRESETS.find((p) => p.id === currentLightingId) ?? preset
      captureLightState(startLightState, currentPreset)
      startLightState.ambient.color.copy(ambientLight.color)
      startLightState.ambient.intensity = ambientLight.intensity
      startLightState.directional.color.copy(directionalLight.color)
      startLightState.directional.intensity = directionalLight.intensity
      startLightState.directional.position.copy(directionalLight.position)
      startLightState.background.copy(currentBgColor)
      pointLights.forEach((pl, i) => {
        if (startLightState.points[i]) {
          startLightState.points[i].color.copy(pl.color)
          startLightState.points[i].intensity = pl.intensity
          startLightState.points[i].position.copy(pl.position)
          startLightState.points[i].distance = pl.distance
        }
      })

      captureLightState(targetLightState, preset)

      while (pointLights.length < preset.pointLights.length) {
        const pl = new THREE.PointLight('#ffffff', 0, 0)
        pl.castShadow = true
        pl.shadow.mapSize.width = 1024
        pl.shadow.mapSize.height = 1024
        scene.add(pl)
        pointLights.push(pl)
      }

      lightTransitionActive = true
      lightTransitionProgress = 0
    },
    resize: () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    },
    tick: (delta) => {
      controls.update()

      if (lightTransitionActive) {
        lightTransitionProgress += delta / lightTransitionDuration
        if (lightTransitionProgress >= 1) {
          lightTransitionProgress = 1
          lightTransitionActive = false
        }
        const t = easeInOutCubic(lightTransitionProgress)

        lerpColor(startLightState.ambient.color, targetLightState.ambient.color, t, ambientLight.color)
        ambientLight.intensity = startLightState.ambient.intensity + (targetLightState.ambient.intensity - startLightState.ambient.intensity) * t

        lerpColor(startLightState.directional.color, targetLightState.directional.color, t, directionalLight.color)
        directionalLight.intensity = startLightState.directional.intensity + (targetLightState.directional.intensity - startLightState.directional.intensity) * t
        directionalLight.position.lerpVectors(startLightState.directional.position, targetLightState.directional.position, t)

        pointLights.forEach((pl, i) => {
          const start = startLightState.points[i]
          const target = targetLightState.points[i]
          if (start && target) {
            lerpColor(start.color, target.color, t, pl.color)
            pl.intensity = start.intensity + (target.intensity - start.intensity) * t
            pl.position.lerpVectors(start.position, target.position, t)
            pl.distance = start.distance + (target.distance - start.distance) * t
          }
        })

        lerpColor(startLightState.background, targetLightState.background, t, currentBgColor)
        if (scene.background instanceof THREE.Color) {
          scene.background.copy(currentBgColor)
        }
      }

      meshes.forEach((mesh, i) => {
        mesh.rotation.y += delta * (0.1 + i * 0.02)
      })

      renderer.render(scene, camera)
    }
  }

  return api
}
