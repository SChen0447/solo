import * as THREE from 'three'

export type ElementType = 'geometry' | 'particles' | 'beam' | 'text' | 'ring'
export type GeometryType = 'cube' | 'tetrahedron' | 'dodecahedron'

export interface HoloElementOptions {
  type: ElementType
  geometryType?: GeometryType
  text?: string
  color?: number
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export class HoloElement {
  id: string
  type: ElementType
  group: THREE.Group
  position: THREE.Vector3
  color: number
  autoRotate: boolean
  rotationSpeed: number
  mesh: THREE.Object3D | null = null
  private _isEntering = false
  private _enterProgress = 0
  private _enterDuration = 0.5
  private _isExiting = false
  private _exitProgress = 0
  private _exitDuration = 0.3
  private _dragTarget: THREE.Vector3 | null = null
  private _isDragging = false

  constructor(options: HoloElementOptions) {
    this.id = Math.random().toString(36).substr(2, 9)
    this.type = options.type
    this.color = options.color ?? 0x00bfff
    this.autoRotate = true
    this.rotationSpeed = options.type === 'ring' ? 0.3 : 0.5
    this.position = new THREE.Vector3(0, 1.5, 0)
    this.group = new THREE.Group()
    this.group.position.copy(this.position)
    this._createMesh(options)
  }

  private _createMesh(options: HoloElementOptions) {
    switch (this.type) {
      case 'geometry':
        this._createGeometry(options.geometryType ?? 'cube')
        break
      case 'particles':
        this._createParticles()
        break
      case 'beam':
        this._createBeam()
        break
      case 'text':
        this._createText(options.text ?? 'HOLOGRAM')
        break
      case 'ring':
        this._createRing()
        break
    }
  }

  private _createGeometry(geoType: GeometryType) {
    let geometry: THREE.BufferGeometry
    let color: number
    switch (geoType) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1)
        color = 0x00bfff
        break
      case 'tetrahedron':
        geometry = new THREE.TetrahedronGeometry(0.8)
        color = 0x8a2be2
        break
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(0.7)
        color = 0xff1493
        break
    }
    this.color = color
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)
    const edges = new THREE.EdgesGeometry(geometry)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
    })
    const wireframe = new THREE.LineSegments(edges, lineMaterial)
    mesh.add(wireframe)
    this.mesh = mesh
    this.group.add(mesh)
    this._setInitialScale()
  }

  private _createParticles() {
    const count = 200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.5 + Math.random() * 0.5
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      const t = Math.random()
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xff0000),
        new THREE.Color(0x0000ff),
        t
      )
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(geometry, material)
    this.mesh = particles
    this.group.add(particles)
    this._setInitialScale()
  }

  private _createBeam() {
    const geometry = new THREE.ConeGeometry(0.5, 4, 32, 1, true)
    geometry.translate(0, 2, 0)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00bfff) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vY;
        void main() {
          vUv = uv;
          vY = position.y / 4.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        varying float vY;
        void main() {
          float stripe = sin(vY * 20.0 + time * 3.0) * 0.5 + 0.5;
          float alpha = (1.0 - vY) * 0.4 * (0.5 + stripe * 0.5);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const beam = new THREE.Mesh(geometry, material)
    this.mesh = beam
    this.group.add(beam)
    this._setInitialScale()
  }

  private _createText(text: string) {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0, 0, 0, 0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 140px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#00bfff'
    ctx.shadowBlur = 30
    ctx.fillStyle = '#00bfff'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)'
    for (let i = 0; i < canvas.height; i += 4) {
      ctx.fillRect(0, i, canvas.width, 2)
    }
    const texture = new THREE.CanvasTexture(canvas)
    const geometry = new THREE.PlaneGeometry(3, 0.75)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const textMesh = new THREE.Mesh(geometry, material)
    this.mesh = textMesh
    this.group.add(textMesh)
    this._setInitialScale()
  }

  private _createRing() {
    const count = 300
    const positions = new Float32Array(count * 3)
    const radius = 5
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = radius + (Math.random() - 0.5) * 0.3
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2
      positions[i * 3 + 2] = Math.sin(angle) * r
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      size: 0.06,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    })
    const ring = new THREE.Points(geometry, material)
    ring.rotation.x = Math.PI / 3
    this.mesh = ring
    this.group.add(ring)
    this._setInitialScale()
  }

  private _setInitialScale() {
    this.group.scale.set(0.001, 0.001, 0.001)
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material as THREE.Material
        mat.transparent = true
        mat.opacity = 0
      }
    })
  }

  startEnterAnimation() {
    this._isEntering = true
    this._enterProgress = 0
  }

  startExitAnimation() {
    this._isExiting = true
    this._exitProgress = 0
  }

  get isExiting() {
    return this._isExiting
  }

  get isEntering() {
    return this._isEntering
  }

  startDrag() {
    this._isDragging = true
    this._dragTarget = this.position.clone()
  }

  setDragTarget(pos: THREE.Vector3) {
    if (this._dragTarget) {
      this._dragTarget.x = THREE.MathUtils.clamp(pos.x, -5, 5)
      this._dragTarget.z = THREE.MathUtils.clamp(pos.z, -5, 5)
    }
  }

  endDrag() {
    this._isDragging = false
    this._dragTarget = null
  }

  get isDragging() {
    return this._isDragging
  }

  setColor(color: number) {
    this.color = color
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => {
          const mat = m as THREE.MeshBasicMaterial & { uniforms?: { color: { value: THREE.Color } } }
          if ('color' in mat && mat.color) {
            mat.color.setHex(color)
          }
          if (mat.uniforms && mat.uniforms.color) {
            mat.uniforms.color.value.setHex(color)
          }
        })
      }
    })
  }

  update(delta: number, elapsed: number) {
    if (this._isEntering) {
      this._enterProgress += delta / this._enterDuration
      const t = Math.min(this._enterProgress, 1)
      const eased = easeOut(t)
      this.group.scale.setScalar(eased)
      this.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((mat) => {
            mat.opacity = eased * (mat as THREE.MeshBasicMaterial).opacity || eased * 0.7
          })
        }
      })
      if (t >= 1) {
        this._isEntering = false
      }
    }

    if (this._isExiting) {
      this._exitProgress += delta / this._exitDuration
      const t = Math.min(this._exitProgress, 1)
      const eased = 1 - easeOut(t)
      this.group.scale.setScalar(eased)
      this.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((mat) => {
            mat.opacity *= eased
          })
        }
      })
      if (t >= 1) {
        this._isExiting = false
      }
    }

    if (this.autoRotate && !this._isEntering && !this._isExiting) {
      if (this.type === 'ring') {
        if (this.mesh) {
          this.mesh.rotation.y += this.rotationSpeed * delta
        }
      } else {
        this.group.rotation.y += this.rotationSpeed * delta
        this.group.rotation.x += this.rotationSpeed * delta * 0.5
      }
    }

    if (this._isDragging && this._dragTarget) {
      this.position.lerp(this._dragTarget, 0.2)
      this.group.position.copy(this.position)
    }

    if (this.type === 'particles' && this.mesh) {
      const points = this.mesh as THREE.Points
      const pulse = 1 + Math.sin(elapsed * 3) * 0.15
      points.scale.setScalar(pulse)
    }

    if (this.type === 'beam' && this.mesh) {
      const mesh = this.mesh as THREE.Mesh
      const mat = mesh.material as THREE.ShaderMaterial
      if (mat.uniforms) {
        mat.uniforms.time.value = elapsed
      }
    }
  }
}
