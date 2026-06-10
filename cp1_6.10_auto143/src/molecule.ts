import * as THREE from 'three'

const OXYGEN_COLOR = 0xe07a5f
const CHLORINE_COLOR = 0x98c1d9
const BOND_COLOR = 0x555555
const OXYGEN_RADIUS = 0.3
const CHLORINE_RADIUS = 0.4
const BOND_RADIUS = 0.08

function createSphere(radius: number, color: number, metalness: number = 0.1, roughness: number = 0.6): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 32)
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness
  })
  return new THREE.Mesh(geometry, material)
}

function createBond(from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from)
  const length = direction.length()
  const geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 16)
  const material = new THREE.MeshStandardMaterial({ color: BOND_COLOR })
  const bond = new THREE.Mesh(geometry, material)
  bond.position.copy(from).add(to).multiplyScalar(0.5)
  bond.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  )
  return bond
}

export function createOzoneMolecule(scale: number = 1): THREE.Group {
  const group = new THREE.Group()
  const r = 1 * scale
  const angle = (120 * Math.PI) / 180

  const o1 = createSphere(OXYGEN_RADIUS * scale, OXYGEN_COLOR, 0.15, 0.5)
  o1.position.set(r, 0, 0)
  const o2 = createSphere(OXYGEN_RADIUS * scale, OXYGEN_COLOR, 0.15, 0.5)
  o2.position.set(r * Math.cos(angle), 0, r * Math.sin(angle))
  const o3 = createSphere(OXYGEN_RADIUS * scale, OXYGEN_COLOR, 0.15, 0.5)
  o3.position.set(r * Math.cos(angle * 2), 0, r * Math.sin(angle * 2))

  const bond1 = createBond(o1.position, o2.position)
  const bond2 = createBond(o2.position, o3.position)

  group.add(o1, o2, o3, bond1, bond2)
  group.userData = {
    atoms: [o1, o2, o3],
    bonds: [bond1, bond2],
    type: 'ozone'
  }
  return group
}

export function createChlorineAtom(scale: number = 1): THREE.Group {
  const group = new THREE.Group()
  const cl = createSphere(CHLORINE_RADIUS * scale, CHLORINE_COLOR, 0.5, 0.3)
  group.add(cl)
  group.userData = {
    atoms: [cl],
    bonds: [],
    type: 'chlorine'
  }
  return group
}

export function createOxygenMolecule(scale: number = 1): THREE.Group {
  const group = new THREE.Group()
  const bondLength = 0.8 * scale

  const o1 = createSphere(OXYGEN_RADIUS * scale, OXYGEN_COLOR, 0.15, 0.5)
  o1.position.set(-bondLength / 2, 0, 0)
  const o2 = createSphere(OXYGEN_RADIUS * scale, OXYGEN_COLOR, 0.15, 0.5)
  o2.position.set(bondLength / 2, 0, 0)
  const bond = createBond(o1.position, o2.position)

  group.add(o1, o2, bond)
  group.userData = {
    atoms: [o1, o2],
    bonds: [bond],
    type: 'oxygen'
  }
  return group
}

export function createClOMolecule(scale: number = 1): THREE.Group {
  const group = new THREE.Group()
  const bondLength = 1.1 * scale

  const cl = createSphere(CHLORINE_RADIUS * scale, CHLORINE_COLOR, 0.5, 0.3)
  cl.position.set(-bondLength / 2, 0, 0)
  const o = createSphere(OXYGEN_RADIUS * scale, OXYGEN_COLOR, 0.15, 0.5)
  o.position.set(bondLength / 2, 0, 0)
  const bond = createBond(cl.position, o.position)

  group.add(cl, o, bond)
  group.userData = {
    atoms: [cl, o],
    bonds: [bond],
    type: 'clo'
  }
  return group
}

export function animateMoleculeMove(
  group: THREE.Group,
  from: THREE.Vector3,
  to: THREE.Vector3,
  duration: number,
  onComplete?: () => void
): (elapsed: number) => boolean {
  let completed = false
  return (elapsed: number): boolean => {
    if (completed) return true
    const t = Math.min(elapsed / duration, 1)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    group.position.lerpVectors(from, to, eased)
    if (t >= 1 && !completed) {
      completed = true
      onComplete?.()
    }
    return completed
  }
}

export function animateMoleculeRotate(
  group: THREE.Group,
  degreesPerSecond: number
): (delta: number) => void {
  const radiansPerSecond = (degreesPerSecond * Math.PI) / 180
  return (delta: number): void => {
    group.rotation.y += radiansPerSecond * delta
  }
}

export interface CollisionParticles {
  group: THREE.Group
  update: (elapsed: number) => boolean
}

export function createCollisionParticles(
  position: THREE.Vector3,
  count: number = 50,
  lifetime: number = 1.2
): CollisionParticles {
  const group = new THREE.Group()
  const particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; startSize: number }[] = []

  for (let i = 0; i < count; i++) {
    const size = 0.05 + Math.random() * 0.1
    const geometry = new THREE.SphereGeometry(size, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)

    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const speed = 1.5 + Math.random() * 2
    const velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    )

    group.add(mesh)
    particles.push({ mesh, velocity, startSize: size })
  }

  let completed = false
  const startTime = performance.now()

  const update = (elapsed: number): boolean => {
    if (completed) return true
    const t = (performance.now() - startTime) / 1000 / lifetime
    if (t >= 1) {
      completed = true
      return true
    }
    for (const p of particles) {
      p.mesh.position.add(p.velocity.clone().multiplyScalar(elapsed))
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t
      p.mesh.scale.setScalar(1 - t * 0.5)
    }
    return false
  }

  return { group, update }
}

export function scaleMolecule(group: THREE.Group, scale: number): void {
  group.scale.setScalar(scale)
}

export function getAtomWorldPosition(group: THREE.Group, atomIndex: number): THREE.Vector3 {
  const pos = new THREE.Vector3()
  const atom = group.userData.atoms[atomIndex] as THREE.Object3D
  if (atom) {
    atom.getWorldPosition(pos)
  }
  return pos
}

export function clearGroupChildren(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0]
    group.remove(child)
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  }
}
