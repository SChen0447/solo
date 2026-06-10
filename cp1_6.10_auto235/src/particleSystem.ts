import * as THREE from 'three'

export interface ParticleData {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  history: THREE.Vector3[]
  baseLat: number
  baseLon: number
  size: number
}

export class ParticleSystem {
  particles: ParticleData[] = []
  sphereRadius: number
  coriolisStrength: number = 1.0
  trailLength: number = 10
  maxParticles: number = 3000
  minLat: number = -60 * Math.PI / 180
  maxLat: number = 60 * Math.PI / 180
  repulsiveDistance: number = 0.3
  repulsiveForce: number = 0.02
  targetCount: number = 2000
  transitionProgress: number = 1.0
  oldPositions: Map<number, THREE.Vector3> = new Map()

  constructor(sphereRadius: number, initialCount: number = 2000) {
    this.sphereRadius = sphereRadius
    this.targetCount = initialCount
    this.generateParticles(initialCount)
  }

  private generateParticles(count: number) {
    this.particles = []
    const colorStart = new THREE.Color(0x1e90ff)
    const colorEnd = new THREE.Color(0xff8c00)

    for (let i = 0; i < count; i++) {
      const lat = this.minLat + Math.random() * (this.maxLat - this.minLat)
      const lon = Math.random() * Math.PI * 2
      const r = this.sphereRadius * (1.0 + Math.random() * 0.2)

      const position = this.latLonToVec3(lat, lon, r)
      const latNorm = (lat - this.minLat) / (this.maxLat - this.minLat)
      const color = colorStart.clone().lerp(colorEnd, latNorm)

      const speedFactor = Math.cos(lat) * 0.015 + 0.005
      const direction = Math.random() > 0.5 ? 1 : -1
      const velLat = direction * speedFactor
      const velLon = (Math.random() - 0.5) * 0.002

      const velocity = new THREE.Vector3(velLat, velLon, 0)

      this.particles.push({
        id: i,
        position,
        velocity,
        color,
        history: [position.clone()],
        baseLat: lat,
        baseLon: lon,
        size: 0.08 + Math.random() * 0.07
      })
    }
  }

  private latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
    return new THREE.Vector3(
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.sin(lon)
    )
  }

  private vec3ToLatLon(pos: THREE.Vector3): { lat: number; lon: number; r: number } {
    const r = pos.length()
    const lat = Math.asin(pos.y / r)
    const lon = Math.atan2(pos.z, pos.x)
    return { lat, lon, r }
  }

  setCoriolisStrength(factor: number) {
    this.coriolisStrength = factor
  }

  setTrailLength(length: number) {
    this.trailLength = length
  }

  setParticleCount(count: number) {
    if (count === this.particles.length) return

    this.targetCount = count
    this.transitionProgress = 0.0
    this.oldPositions.clear()

    this.particles.forEach(p => {
      this.oldPositions.set(p.id, p.position.clone())
    })

    const colorStart = new THREE.Color(0x1e90ff)
    const colorEnd = new THREE.Color(0xff8c00)

    if (count > this.particles.length) {
      for (let i = this.particles.length; i < count; i++) {
        const lat = this.minLat + Math.random() * (this.maxLat - this.minLat)
        const lon = Math.random() * Math.PI * 2
        const r = this.sphereRadius * (1.0 + Math.random() * 0.2)

        const position = this.latLonToVec3(lat, lon, r)
        const latNorm = (lat - this.minLat) / (this.maxLat - this.minLat)
        const color = colorStart.clone().lerp(colorEnd, latNorm)

        const speedFactor = Math.cos(lat) * 0.015 + 0.005
        const direction = Math.random() > 0.5 ? 1 : -1
        const velLat = direction * speedFactor
        const velLon = (Math.random() - 0.5) * 0.002

        this.particles.push({
          id: i,
          position,
          velocity: new THREE.Vector3(velLat, velLon, 0),
          color,
          history: [position.clone()],
          baseLat: lat,
          baseLon: lon,
          size: 0.08 + Math.random() * 0.07
        })
      }
    } else if (count < this.particles.length) {
      this.particles = this.particles.slice(0, count)
    }
  }

  private computeCoriolisForce(lat: number, velLat: number, velLon: number): { dLat: number; dLon: number } {
    const f = 2 * this.coriolisStrength * Math.sin(lat)
    const hemisphereSign = lat >= 0 ? 1 : -1

    const dLon = -hemisphereSign * f * velLat * 0.5
    const dLat = hemisphereSign * f * velLon * 0.5

    return { dLat, dLon }
  }

  private applyRepulsiveForces() {
    const count = this.particles.length
    if (count < 2) return

    const sampleStep = Math.max(1, Math.floor(count / 200))

    for (let i = 0; i < count; i += sampleStep) {
      const p1 = this.particles[i]
      const { lat: lat1, lon: lon1, r: r1 } = this.vec3ToLatLon(p1.position)

      for (let j = i + sampleStep; j < count; j += sampleStep) {
        const p2 = this.particles[j]
        const dist = p1.position.distanceTo(p2.position)

        if (dist < this.repulsiveDistance && dist > 0.001) {
          const force = this.repulsiveForce * (1 - dist / this.repulsiveDistance)
          const dir = new THREE.Vector3().subVectors(p1.position, p2.position).normalize().multiplyScalar(force)

          const { lat: lat2, lon: lon2, r: r2 } = this.vec3ToLatLon(p2.position)

          p1.velocity.x += dir.x * 0.1
          p1.velocity.y += dir.y * 0.1
          p2.velocity.x -= dir.x * 0.1
          p2.velocity.y -= dir.y * 0.1
        }
      }
    }
  }

  update(deltaTime: number) {
    const dt = Math.min(deltaTime, 0.05)

    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + deltaTime / 0.3)
    }

    this.applyRepulsiveForces()

    for (const p of this.particles) {
      const { lat, lon, r } = this.vec3ToLatLon(p.position)
      let velLat = p.velocity.x
      let velLon = p.velocity.y

      const coriolis = this.computeCoriolisForce(lat, velLat, velLon)
      velLat += coriolis.dLat * dt * 60
      velLon += coriolis.dLon * dt * 60

      const speedFactor = Math.cos(lat)
      velLat = THREE.MathUtils.clamp(velLat, -0.03 * speedFactor - 0.005, 0.03 * speedFactor + 0.005)
      velLon = THREE.MathUtils.clamp(velLon, -0.015, 0.015)

      let newLat = lat + velLat * dt * 60
      let newLon = lon + velLon * dt * 60

      if (newLat > this.maxLat) {
        newLat = this.maxLat
        velLat = -Math.abs(velLat) * 0.8
      } else if (newLat < this.minLat) {
        newLat = this.minLat
        velLat = Math.abs(velLat) * 0.8
      }

      while (newLon > Math.PI) newLon -= Math.PI * 2
      while (newLon < -Math.PI) newLon += Math.PI * 2

      const newPos = this.latLonToVec3(newLat, newLon, r)

      if (this.transitionProgress < 1.0 && this.oldPositions.has(p.id)) {
        const oldPos = this.oldPositions.get(p.id)!
        newPos.lerpVectors(oldPos, newPos, this.transitionProgress)
      }

      p.position.copy(newPos)
      p.velocity.set(velLat, velLon, 0)

      p.history.unshift(p.position.clone())
      if (p.history.length > this.trailLength + 1) {
        p.history.pop()
      }
    }
  }

  getAvgSpeed(): number {
    if (this.particles.length === 0) return 0
    let total = 0
    for (const p of this.particles) {
      total += Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y)
    }
    return total / this.particles.length * 100
  }

  getAvgDeflection(): number {
    if (this.particles.length === 0) return 0
    let total = 0
    for (const p of this.particles) {
      const { lat } = this.vec3ToLatLon(p.position)
      total += Math.abs(2 * this.coriolisStrength * Math.sin(lat))
    }
    return (total / this.particles.length) * 180 / Math.PI
  }

  getAvgVelocityVector(): { dx: number; dy: number } {
    if (this.particles.length === 0) return { dx: 0, dy: 0 }
    let dx = 0, dy = 0
    for (const p of this.particles) {
      dx += p.velocity.y
      dy += p.velocity.x
    }
    const n = this.particles.length
    return { dx: dx / n * 500, dy: dy / n * 500 }
  }
}
