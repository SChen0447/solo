import * as THREE from 'three'
import { ParticleSystem, ParticleData } from './particleSystem'

const SPHERE_RADIUS = 5
const PARTICLE_COUNT = 2000

const app = document.getElementById('app')!
app.style.width = '100vw'
app.style.height = '100vh'
app.style.position = 'relative'
app.style.background = 'linear-gradient(180deg, #0b1120 0%, #162032 100%)'
app.style.overflow = 'hidden'

const style = document.createElement('style')
style.textContent = `
  .ui-panel {
    position: absolute;
    border: 0.5px solid #4a6fa5;
    box-shadow: 0 0 8px rgba(74, 111, 165, 0.3), inset 0 0 8px rgba(74, 111, 165, 0.1);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    background: rgba(0, 0, 0, 0.35);
    border-radius: 6px;
    font-family: 'Courier New', 'Consolas', monospace;
    color: #aac8e0;
    transition: all 0.2s ease;
  }
  .ui-panel:hover {
    box-shadow: 0 0 12px rgba(106, 159, 181, 0.5), inset 0 0 12px rgba(74, 111, 165, 0.15);
    border-color: #6a9fb5;
  }
  #data-panel {
    top: 16px;
    left: 16px;
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.8;
    min-width: 220px;
    white-space: nowrap;
  }
  #particle-info {
    top: auto;
    left: 16px;
    bottom: auto;
    padding: 10px 14px;
    font-size: 12px;
    line-height: 1.7;
    min-width: 200px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    margin-top: 8px;
  }
  #particle-info.visible {
    opacity: 1;
  }
  #minimap {
    top: 16px;
    right: 16px;
    width: 160px;
    height: 160px;
    padding: 0;
  }
  #minimap canvas {
    display: block;
    border-radius: 6px;
  }
  #control-panel {
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 28px;
    display: flex;
    gap: 32px;
    align-items: center;
  }
  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }
  .slider-label {
    font-size: 12px;
    letter-spacing: 0.5px;
    color: #aac8e0;
  }
  .slider-value {
    font-size: 11px;
    color: #6a9fb5;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 160px;
    height: 6px;
    background: #2a3a50;
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  input[type="range"]:hover {
    background: #3a4a60;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(circle, #4fc3f7 0%, #1e88e5 100%);
    cursor: pointer;
    box-shadow: 0 0 8px rgba(79, 195, 247, 0.8), 0 0 16px rgba(79, 195, 247, 0.4);
    transition: all 0.2s ease;
    transform: translateY(0);
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: translateY(-2px);
    background: radial-gradient(circle, #6fd3ff 0%, #3ea8f5 100%);
    box-shadow: 0 0 12px rgba(106, 159, 181, 1), 0 0 24px rgba(79, 195, 247, 0.6);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(circle, #4fc3f7 0%, #1e88e5 100%);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 8px rgba(79, 195, 247, 0.8);
  }
  #data-wrapper {
    position: absolute;
    top: 16px;
    left: 16px;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }
`
document.head.appendChild(style)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x0b1120, 0.035)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 8, 14)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)
app.appendChild(renderer.domElement)

const earthGroup = new THREE.Group()
scene.add(earthGroup)

function createEarthGrid() {
  const meridians = 24
  const parallels = 24
  const color = new THREE.Color(0x4a6fa5)

  for (let i = 0; i <= meridians; i++) {
    const lon = (i / meridians) * Math.PI * 2
    const points: THREE.Vector3[] = []
    const segments = 128
    for (let j = 0; j <= segments; j++) {
      const lat = (j / segments) * Math.PI - Math.PI / 2
      points.push(new THREE.Vector3(
        SPHERE_RADIUS * Math.cos(lat) * Math.cos(lon),
        SPHERE_RADIUS * Math.sin(lat),
        SPHERE_RADIUS * Math.cos(lat) * Math.sin(lon)
      ))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
    const line = new THREE.Line(geo, mat)
    earthGroup.add(line)
  }

  for (let i = 0; i <= parallels; i++) {
    const lat = (i / parallels) * Math.PI - Math.PI / 2
    const points: THREE.Vector3[] = []
    const segments = 128
    for (let j = 0; j <= segments; j++) {
      const lon = (j / segments) * Math.PI * 2
      points.push(new THREE.Vector3(
        SPHERE_RADIUS * Math.cos(lat) * Math.cos(lon),
        SPHERE_RADIUS * Math.sin(lat),
        SPHERE_RADIUS * Math.cos(lat) * Math.sin(lon)
      ))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
    const line = new THREE.Line(geo, mat)
    earthGroup.add(line)
  }

  const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64)
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x0a1628,
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide
  })
  const sphere = new THREE.Mesh(sphereGeo, sphereMat)
  earthGroup.add(sphere)
}

createEarthGrid()

const particleSystem = new ParticleSystem(SPHERE_RADIUS, PARTICLE_COUNT)

let particlesGeo: THREE.BufferGeometry
let particlesMat: THREE.PointsMaterial
let particles: THREE.Points
let trailsGroup: THREE.Group
let highlightTrail: THREE.Line | null = null
let highlightParticle: ParticleData | null = null
let highlightTimeout: number | null = null

function initParticleRendering() {
  const positions = new Float32Array(particleSystem.particles.length * 3)
  const colors = new Float32Array(particleSystem.particles.length * 3)
  const sizes = new Float32Array(particleSystem.particles.length)

  particleSystem.particles.forEach((p, i) => {
    positions[i * 3] = p.position.x
    positions[i * 3 + 1] = p.position.y
    positions[i * 3 + 2] = p.position.z
    colors[i * 3] = p.color.r
    colors[i * 3 + 1] = p.color.g
    colors[i * 3 + 2] = p.color.b
    sizes[i] = p.size
  })

  particlesGeo = new THREE.BufferGeometry()
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  particlesMat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  particles = new THREE.Points(particlesGeo, particlesMat)
  scene.add(particles)

  trailsGroup = new THREE.Group()
  scene.add(trailsGroup)
}

initParticleRendering()

function rebuildTrails() {
  while (trailsGroup.children.length > 0) {
    const child = trailsGroup.children[0]
    trailsGroup.remove(child)
    if (child instanceof THREE.Line) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  }

  const step = Math.max(1, Math.floor(particleSystem.particles.length / 600))
  for (let i = 0; i < particleSystem.particles.length; i += step) {
    const p = particleSystem.particles[i]
    if (p.history.length < 2) continue

    const trailPositions: THREE.Vector3[] = []
    const maxLen = Math.min(p.history.length, particleSystem.trailLength + 1)
    for (let j = 0; j < maxLen; j++) {
      trailPositions.push(p.history[j])
    }

    const geo = new THREE.BufferGeometry().setFromPoints(trailPositions)
    const opacities = new Float32Array(trailPositions.length)
    for (let j = 0; j < trailPositions.length; j++) {
      opacities[j] = 0.6 - (0.5 * j / Math.max(1, trailPositions.length - 1))
    }

    const mat = new THREE.LineBasicMaterial({
      color: p.color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const line = new THREE.Line(geo, mat)
    line.userData.particleIndex = i
    trailsGroup.add(line)
  }
}

rebuildTrails()

let isDragging = false
let prevMouseX = 0
let prevMouseY = 0
let cameraTheta = Math.PI / 2
let cameraPhi = Math.atan2(camera.position.y, Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z))
let cameraDistance = camera.position.length()
let cameraTargetPhi = cameraPhi
let cameraTargetTheta = cameraTheta
let cameraTargetDistance = cameraDistance

renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true
  prevMouseX = e.clientX
  prevMouseY = e.clientY
})

window.addEventListener('mouseup', () => { isDragging = false })

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return
  const dx = e.clientX - prevMouseX
  const dy = e.clientY - prevMouseY
  cameraTargetTheta -= dx * 0.005
  cameraTargetPhi = THREE.MathUtils.clamp(cameraTargetPhi - dy * 0.005, 0.1, Math.PI - 0.1)
  prevMouseX = e.clientX
  prevMouseY = e.clientY
})

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault()
  cameraTargetDistance = THREE.MathUtils.clamp(
    cameraTargetDistance * (1 + e.deltaY * 0.001),
    3, 20
  )
}, { passive: false })

const raycaster = new THREE.Raycaster()
const mouseVec = new THREE.Vector2()
const particleInfoEl = document.createElement('div')
particleInfoEl.id = 'particle-info'
particleInfoEl.className = 'ui-panel'

const dataWrapper = document.createElement('div')
dataWrapper.id = 'data-wrapper'

const dataPanel = document.createElement('div')
dataPanel.id = 'data-panel'
dataPanel.className = 'ui-panel'
dataPanel.innerHTML = `
  <div>粒子总数: <span id="count">2000</span></div>
  <div>平均流速: <span id="speed">0.00</span> px/帧</div>
  <div>偏转角度: <span id="deflect">0.00</span>°</div>
  <div>帧率 FPS: <span id="fps">60</span></div>
`

dataWrapper.appendChild(dataPanel)
dataWrapper.appendChild(particleInfoEl)
app.appendChild(dataWrapper)

const minimapContainer = document.createElement('div')
minimapContainer.id = 'minimap'
minimapContainer.className = 'ui-panel'
const minimapCanvas = document.createElement('canvas')
minimapCanvas.width = 160
minimapCanvas.height = 160
minimapContainer.appendChild(minimapCanvas)
app.appendChild(minimapContainer)

const minimapCtx = minimapCanvas.getContext('2d')!

const controlPanel = document.createElement('div')
controlPanel.id = 'control-panel'
controlPanel.className = 'ui-panel'

function createSliderGroup(label: string, min: number, max: number, step: number, value: number, onChange: (v: number) => void) {
  const group = document.createElement('div')
  group.className = 'slider-group'

  const labelEl = document.createElement('div')
  labelEl.className = 'slider-label'
  labelEl.textContent = label

  const valueEl = document.createElement('div')
  valueEl.className = 'slider-value'
  valueEl.textContent = value.toFixed(1)

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = String(min)
  slider.max = String(max)
  slider.step = String(step)
  slider.value = String(value)

  slider.addEventListener('input', (e) => {
    const v = parseFloat((e.target as HTMLInputElement).value)
    if (step === 1) {
      valueEl.textContent = String(Math.round(v))
    } else {
      valueEl.textContent = v.toFixed(1)
    }
    onChange(v)
  })

  group.appendChild(labelEl)
  group.appendChild(valueEl)
  group.appendChild(slider)
  return group
}

controlPanel.appendChild(createSliderGroup('科里奥利力强度', 0, 2, 0.1, 1.0, (v) => {
  particleSystem.setCoriolisStrength(v)
}))

controlPanel.appendChild(createSliderGroup('粒子数量', 500, 3000, 100, 2000, (v) => {
  const count = Math.round(v)
  particleSystem.setParticleCount(count)
  rebuildParticleGeometry()
  rebuildTrails()
  const countEl = document.getElementById('count')
  if (countEl) countEl.textContent = String(count)
}))

controlPanel.appendChild(createSliderGroup('尾迹长度', 0, 20, 1, 10, (v) => {
  particleSystem.setTrailLength(Math.round(v))
  rebuildTrails()
}))

app.appendChild(controlPanel)

function rebuildParticleGeometry() {
  scene.remove(particles)
  particlesGeo.dispose()
  particlesMat.dispose()

  const positions = new Float32Array(particleSystem.particles.length * 3)
  const colors = new Float32Array(particleSystem.particles.length * 3)

  particleSystem.particles.forEach((p, i) => {
    positions[i * 3] = p.position.x
    positions[i * 3 + 1] = p.position.y
    positions[i * 3 + 2] = p.position.z
    colors[i * 3] = p.color.r
    colors[i * 3 + 1] = p.color.g
    colors[i * 3 + 2] = p.color.b
  })

  particlesGeo = new THREE.BufferGeometry()
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  particles = new THREE.Points(particlesGeo, particlesMat)
  scene.add(particles)
}

renderer.domElement.addEventListener('click', (e) => {
  const rect = renderer.domElement.getBoundingClientRect()
  mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouseVec, camera)
  const hits = raycaster.intersectObject(particles)

  if (hits.length > 0) {
    const idx = hits[0].index
    if (idx !== undefined) {
      const particle = particleSystem.particles[idx]
      if (particle) {
        showParticleHighlight(particle, idx)
      }
    }
  }
})

function showParticleHighlight(particle: ParticleData, idx: number) {
  if (highlightTimeout) {
    window.clearTimeout(highlightTimeout)
    highlightTimeout = null
  }
  if (highlightTrail) {
    scene.remove(highlightTrail)
    highlightTrail.geometry.dispose()
    ;(highlightTrail.material as THREE.Material).dispose()
    highlightTrail = null
  }

  highlightParticle = particle
  particlesMat.opacity = 0.15

  const histPoints: THREE.Vector3[] = []
  const maxFrames = Math.min(50, particle.history.length)
  for (let i = 0; i < maxFrames; i++) {
    if (particle.history[i]) {
      histPoints.push(particle.history[i])
    }
  }

  if (histPoints.length >= 2) {
    const geo = new THREE.BufferGeometry().setFromPoints(histPoints)
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      linewidth: 2
    })
    highlightTrail = new THREE.Line(geo, mat)
    scene.add(highlightTrail)
  }

  const lat = (Math.asin(particle.position.y / particle.position.length()) * 180 / Math.PI).toFixed(2)
  const lon = (Math.atan2(particle.position.z, particle.position.x) * 180 / Math.PI).toFixed(2)
  const speed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y).toFixed(4)

  particleInfoEl.innerHTML = `
    <div>粒子 #${idx}</div>
    <div>纬度: ${lat}°</div>
    <div>经度: ${lon}°</div>
    <div>速度: ${speed}</div>
  `
  particleInfoEl.classList.add('visible')

  highlightTimeout = window.setTimeout(() => {
    particlesMat.opacity = 0.9
    particleInfoEl.classList.remove('visible')
    highlightParticle = null
    if (highlightTrail) {
      scene.remove(highlightTrail)
      highlightTrail.geometry.dispose()
      ;(highlightTrail.material as THREE.Material).dispose()
      highlightTrail = null
    }
    highlightTimeout = null
  }, 2000)
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const clock = new THREE.Clock()
let frameCount = 0
let fpsAccum = 0
let lastFpsUpdate = 0
let currentFps = 60
let trailRebuildCounter = 0

function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()
  const elapsed = clock.elapsedTime

  fpsAccum += delta
  frameCount++
  if (fpsAccum >= 0.5) {
    currentFps = Math.round(frameCount / fpsAccum)
    fpsAccum = 0
    frameCount = 0
  }

  earthGroup.rotation.y += 0.05 * delta

  cameraTheta += (cameraTargetTheta - cameraTheta) * 0.1
  cameraPhi += (cameraTargetPhi - cameraPhi) * 0.1
  cameraDistance += (cameraTargetDistance - cameraDistance) * 0.1

  camera.position.x = cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta)
  camera.position.y = cameraDistance * Math.cos(cameraPhi)
  camera.position.z = cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta)
  camera.lookAt(0, 0, 0)

  particleSystem.update(delta)

  const posAttr = particlesGeo.getAttribute('position') as THREE.BufferAttribute
  particleSystem.particles.forEach((p, i) => {
    if (i < posAttr.count) {
      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z)
    }
  })
  posAttr.needsUpdate = true

  trailRebuildCounter++
  if (trailRebuildCounter >= 2) {
    trailRebuildCounter = 0
    trailsGroup.children.forEach((line, idx) => {
      if (!(line instanceof THREE.Line)) return
      const step = Math.max(1, Math.floor(particleSystem.particles.length / 600))
      const pIdx = idx * step
      const p = particleSystem.particles[pIdx]
      if (!p) return

      const posArr: number[] = []
      const maxLen = Math.min(p.history.length, particleSystem.trailLength + 1)
      for (let j = 0; j < maxLen; j++) {
        posArr.push(p.history[j].x, p.history[j].y, p.history[j].z)
      }
      line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
      line.geometry.attributes.position.needsUpdate = true
    })
  }

  if (highlightTrail && highlightParticle) {
    const histPoints: THREE.Vector3[] = []
    const maxFrames = Math.min(50, highlightParticle.history.length)
    for (let i = 0; i < maxFrames; i++) {
      if (highlightParticle.history[i]) {
        histPoints.push(highlightParticle.history[i])
      }
    }
    if (histPoints.length >= 2) {
      const posArr: number[] = []
      for (const hp of histPoints) posArr.push(hp.x, hp.y, hp.z)
      highlightTrail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
      ;(highlightTrail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
  }

  if (elapsed - lastFpsUpdate >= 0.5) {
    lastFpsUpdate = elapsed
    const fpsEl = document.getElementById('fps')
    const speedEl = document.getElementById('speed')
    const deflectEl = document.getElementById('deflect')
    const countEl = document.getElementById('count')
    if (fpsEl) fpsEl.textContent = String(currentFps)
    if (speedEl) speedEl.textContent = particleSystem.getAvgSpeed().toFixed(2)
    if (deflectEl) deflectEl.textContent = particleSystem.getAvgDeflection().toFixed(2)
    if (countEl) countEl.textContent = String(particleSystem.particles.length)
  }

  drawMinimap()

  renderer.render(scene, camera)
}

function drawMinimap() {
  const w = 160, h = 160
  const cx = w / 2, cy = h / 2
  const r = 70

  minimapCtx.clearRect(0, 0, w, h)

  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  minimapCtx.lineWidth = 1
  minimapCtx.beginPath()
  minimapCtx.arc(cx, cy, r, 0, Math.PI * 2)
  minimapCtx.stroke()

  minimapCtx.beginPath()
  minimapCtx.moveTo(cx - r, cy)
  minimapCtx.lineTo(cx + r, cy)
  minimapCtx.moveTo(cx, cy - r)
  minimapCtx.lineTo(cx, cy + r)
  minimapCtx.stroke()

  const avg = particleSystem.getAvgVelocityVector()
  const len = Math.min(50, Math.sqrt(avg.dx * avg.dx + avg.dy * avg.dy) * 3)
  if (len > 1) {
    const angle = Math.atan2(avg.dy, avg.dx)
    const ex = cx + Math.cos(angle) * len
    const ey = cy - Math.sin(angle) * len

    minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    minimapCtx.lineWidth = 2
    minimapCtx.beginPath()
    minimapCtx.moveTo(cx, cy)
    minimapCtx.lineTo(ex, ey)
    minimapCtx.stroke()

    const ah = 8
    minimapCtx.beginPath()
    minimapCtx.moveTo(ex, ey)
    minimapCtx.lineTo(ex - ah * Math.cos(angle - 0.4), ey + ah * Math.sin(angle - 0.4))
    minimapCtx.lineTo(ex - ah * Math.cos(angle + 0.4), ey + ah * Math.sin(angle + 0.4))
    minimapCtx.closePath()
    minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    minimapCtx.fill()
  }

  const step = Math.max(1, Math.floor(particleSystem.particles.length / 150))
  for (let i = 0; i < particleSystem.particles.length; i += step) {
    const p = particleSystem.particles[i]
    const { lat, lon } = {
      lat: Math.asin(p.position.y / p.position.length()),
      lon: Math.atan2(p.position.z, p.position.x)
    }
    const px = cx + (lon / Math.PI) * r
    const py = cy - (lat / (Math.PI / 2)) * (r * 0.9)

    minimapCtx.fillStyle = `rgba(${Math.floor(p.color.r * 255)}, ${Math.floor(p.color.g * 255)}, ${Math.floor(p.color.b * 255)}, 0.6)`
    minimapCtx.beginPath()
    minimapCtx.arc(px, py, 1.5, 0, Math.PI * 2)
    minimapCtx.fill()
  }
}

animate()
