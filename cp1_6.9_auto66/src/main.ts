import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FluidParticleSystem } from './FluidParticleSystem'
import { InteractionManager } from './InteractionManager'
import { UIOverlay } from './UIOverlay'

const app = document.getElementById('app')!

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(10, 8, 10)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x000000, 0)
app.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minPolarAngle = (10 * Math.PI) / 180
controls.maxPolarAngle = (120 * Math.PI) / 180
controls.minDistance = 5
controls.maxDistance = 50

const world = new CANNON.World()
world.gravity.set(0, -9.8, 0)

const groundShape = new CANNON.Plane()
const groundBody = new CANNON.Body({ mass: 0, shape: groundShape })
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
world.addBody(groundBody)

const gridSize = 20
const gridDivisions = 20
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x444444)
const gridMat = gridHelper.material as THREE.Material
gridMat.transparent = true
gridMat.opacity = 0.3
scene.add(gridHelper)

function createBoundaryWall(x: number, z: number, rotY: number): THREE.Mesh {
  const w = gridSize
  const h = 0.5
  const geo = new THREE.PlaneGeometry(w, h)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, h / 2, z)
  mesh.rotation.y = rotY
  return mesh
}

scene.add(createBoundaryWall(0, -gridSize / 2, 0))
scene.add(createBoundaryWall(0, gridSize / 2, Math.PI))
scene.add(createBoundaryWall(-gridSize / 2, 0, Math.PI / 2))
scene.add(createBoundaryWall(gridSize / 2, 0, -Math.PI / 2))

const bgCanvas = document.createElement('canvas')
bgCanvas.width = 2
bgCanvas.height = 512
const bgCtx = bgCanvas.getContext('2d')!
const bgGradient = bgCtx.createLinearGradient(0, 0, 0, 512)
bgGradient.addColorStop(0, '#000011')
bgGradient.addColorStop(1, '#112244')
bgCtx.fillStyle = bgGradient
bgCtx.fillRect(0, 0, 2, 512)
const bgTexture = new THREE.CanvasTexture(bgCanvas)
bgTexture.colorSpace = THREE.SRGBColorSpace
scene.background = bgTexture

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
dirLight.position.set(5, 10, 7)
scene.add(dirLight)

const particleSystem = new FluidParticleSystem(scene)

const interactionManager = new InteractionManager(
  scene,
  camera,
  renderer,
  particleSystem,
  world
)

const uiOverlay = new UIOverlay(app)
uiOverlay.setOnPerformanceChange((degraded) => {
  particleSystem.setEmitRateMultiplier(degraded ? 0.5 : 1.0)
})

const clock = new THREE.Clock()
let frameCount = 0
let fpsTimer = 0
let instantFps = 60

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()

  frameCount++
  fpsTimer += delta
  if (fpsTimer >= 0.2) {
    instantFps = frameCount / fpsTimer
    frameCount = 0
    fpsTimer = 0
  }

  controls.update()
  world.step(1 / 60, delta, 3)
  particleSystem.update(delta)
  interactionManager.update(delta)

  uiOverlay.update(
    particleSystem.getParticleCount(),
    interactionManager.getObstacleCount(),
    instantFps
  )

  renderer.render(scene, camera)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', onResize)

animate()
