import * as THREE from 'three'

export interface PoleData {
  position: THREE.Vector3
  strength: number
  type: 'N' | 'S'
}

export interface FieldLineData {
  points: THREE.Vector3[]
  startPole: PoleData
  endPole: PoleData | null
}

export class FieldLine {
  private scene: THREE.Scene
  private lineObjects: THREE.Group
  private arrows: THREE.Group
  private currentLines: { line: THREE.Line; data: FieldLineData }[] = []
  private targetLines: { line: THREE.Line; data: FieldLineData }[] = []
  private transitionProgress: number = 1
  private transitionDuration: number = 0.3
  private lineCount: number = 12
  private pointsPerLine: number = 60

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.lineObjects = new THREE.Group()
    this.arrows = new THREE.Group()
    this.scene.add(this.lineObjects)
    this.scene.add(this.arrows)
  }

  public calculateField(point: THREE.Vector3, poles: PoleData[]): THREE.Vector3 {
    const field = new THREE.Vector3(0, 0, 0)
    for (const pole of poles) {
      const dir = new THREE.Vector3().subVectors(point, pole.position)
      const dist = dir.length()
      if (dist < 0.1) continue
      dir.normalize()
      const sign = pole.type === 'N' ? 1 : -1
      const magnitude = (pole.strength * sign) / (dist * dist)
      field.add(dir.multiplyScalar(magnitude))
    }
    return field
  }

  public calculateFieldMagnitude(point: THREE.Vector3, poles: PoleData[]): number {
    return this.calculateField(point, poles).length()
  }

  public generateFieldLines(poles: PoleData[]): FieldLineData[] {
    const lines: FieldLineData[] = []
    const nPoles = poles.filter(p => p.type === 'N')
    const sPoles = poles.filter(p => p.type === 'S')

    if (nPoles.length === 0 || sPoles.length === 0) {
      return lines
    }

    for (const nPole of nPoles) {
      const linesPerPole = Math.floor(this.lineCount / nPoles.length)
      for (let i = 0; i < linesPerPole; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / linesPerPole)
        const theta = Math.PI * (1 + Math.sqrt(5)) * i
        const startDir = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        )
        const startPoint = nPole.position.clone().add(startDir.multiplyScalar(0.6))
        const line = this.traceFieldLine(startPoint, poles, 1)
        if (line.points.length > 2) {
          line.startPole = nPole
          lines.push(line)
        }
      }
    }
    return lines
  }

  private traceFieldLine(
    start: THREE.Vector3,
    poles: PoleData[],
    direction: number
  ): FieldLineData {
    const points: THREE.Vector3[] = [start.clone()]
    let current = start.clone()
    const stepSize = 0.15
    let endPole: PoleData | null = null

    for (let i = 0; i < this.pointsPerLine * 10; i++) {
      const field = this.calculateField(current, poles)
      if (field.length() < 0.001) break
      field.normalize().multiplyScalar(stepSize * direction)
      current = current.clone().add(field)
      points.push(current.clone())

      for (const pole of poles) {
        if (direction > 0 && pole.type === 'S') {
          if (current.distanceTo(pole.position) < 0.6) {
            endPole = pole
            points.push(pole.position.clone())
            return { points: this.resampleLine(points), startPole: {} as PoleData, endPole }
          }
        }
      }

      if (current.length() > 30) break
    }

    return { points: this.resampleLine(points), startPole: {} as PoleData, endPole }
  }

  private resampleLine(points: THREE.Vector3[]): THREE.Vector3[] {
    if (points.length < 2) return points
    const result: THREE.Vector3[] = []
    let totalDist = 0
    const segDists: number[] = []
    for (let i = 1; i < points.length; i++) {
      const d = points[i].distanceTo(points[i - 1])
      segDists.push(d)
      totalDist += d
    }
    if (totalDist < 0.01) return points

    const step = totalDist / (this.pointsPerLine - 1)
    result.push(points[0].clone())
    let acc = 0
    let idx = 0

    for (let i = 1; i < this.pointsPerLine - 1; i++) {
      const target = step * i
      while (idx < segDists.length && acc + segDists[idx] < target) {
        acc += segDists[idx]
        idx++
      }
      if (idx >= segDists.length) break
      const t = (target - acc) / segDists[idx]
      const p = new THREE.Vector3().lerpVectors(points[idx], points[idx + 1], t)
      result.push(p)
    }
    result.push(points[points.length - 1].clone())
    return result
  }

  public update(poles: PoleData[], immediate: boolean = false): void {
    const newLines = this.generateFieldLines(poles)

    if (immediate) {
      this.clearLines()
      this.createLineObjects(newLines)
      this.currentLines = this.targetLines
      this.transitionProgress = 1
    } else {
      this.targetLines = []
      for (const data of newLines) {
        const geometry = new THREE.BufferGeometry().setFromPoints(data.points)
        const material = new THREE.LineBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.8
        })
        const line = new THREE.Line(geometry, material)
        this.targetLines.push({ line, data })
      }
      this.transitionProgress = 0
    }
  }

  private createLineObjects(linesData: FieldLineData[]): void {
    this.currentLines = []
    for (const data of linesData) {
      const geometry = new THREE.BufferGeometry().setFromPoints(data.points)
      const material = new THREE.LineBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.8
      })
      const line = new THREE.Line(geometry, material)
      this.lineObjects.add(line)
      this.currentLines.push({ line, data })
      this.addArrow(data)
    }
  }

  private addArrow(data: FieldLineData): void {
    if (data.points.length < 3) return
    const midIdx = Math.floor(data.points.length * 0.5)
    const p1 = data.points[midIdx - 1]
    const p2 = data.points[midIdx]
    const p3 = data.points[midIdx + 1]

    const dir = new THREE.Vector3().subVectors(p3, p1).normalize()
    const arrowHelper = new THREE.ArrowHelper(
      dir,
      p2.clone(),
      0.4,
      0x00d4ff,
      0.2,
      0.12
    )
    this.arrows.add(arrowHelper)
  }

  private clearLines(): void {
    while (this.lineObjects.children.length > 0) {
      const obj = this.lineObjects.children[0]
      this.lineObjects.remove(obj)
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose()
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose()
        }
      }
    }
    while (this.arrows.children.length > 0) {
      const obj = this.arrows.children[0]
      this.arrows.remove(obj)
    }
    this.currentLines = []
  }

  public animate(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration)
      const t = this.easeInOutCubic(this.transitionProgress)

      if (this.targetLines.length > 0) {
        this.clearLines()
        for (const target of this.targetLines) {
          const points = target.data.points
          if (this.currentLines.length > 0 && this.currentLines[0]) {
            const srcPoints = this.currentLines[0].data.points
            const blended: THREE.Vector3[] = []
            const count = Math.min(points.length, srcPoints.length)
            for (let i = 0; i < count; i++) {
              blended.push(new THREE.Vector3().lerpVectors(srcPoints[i], points[i], t))
            }
            for (let i = count; i < points.length; i++) {
              blended.push(points[i].clone())
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(blended)
            const material = new THREE.LineBasicMaterial({
              color: 0x00d4ff,
              transparent: true,
              opacity: 0.8
            })
            const line = new THREE.Line(geometry, material)
            this.lineObjects.add(line)
            if (t > 0.5) this.addArrow(target.data)
          } else {
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            const material = new THREE.LineBasicMaterial({
              color: 0x00d4ff,
              transparent: true,
              opacity: 0.8 * t
            })
            const line = new THREE.Line(geometry, material)
            this.lineObjects.add(line)
            if (t > 0.5) this.addArrow(target.data)
          }
        }
      }

      if (this.transitionProgress >= 1) {
        this.clearLines()
        this.createLineObjects(this.targetLines.map(t => t.data))
        this.targetLines = []
      }
    }
  }

  public getFieldLineData(): FieldLineData[] {
    return this.currentLines.map(l => l.data)
  }

  public findNearestLine(point: THREE.Vector3): FieldLineData | null {
    let bestLine: FieldLineData | null = null
    let bestDist = Infinity
    for (const line of this.currentLines) {
      for (const p of line.data.points) {
        const d = point.distanceTo(p)
        if (d < bestDist) {
          bestDist = d
          bestLine = line.data
        }
      }
    }
    return bestLine
  }

  public hasValidConfiguration(poles: PoleData[]): boolean {
    const nPoles = poles.filter(p => p.type === 'N').length
    const sPoles = poles.filter(p => p.type === 'S').length
    return nPoles > 0 && sPoles > 0
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  public dispose(): void {
    this.clearLines()
    this.scene.remove(this.lineObjects)
    this.scene.remove(this.arrows)
  }
}
