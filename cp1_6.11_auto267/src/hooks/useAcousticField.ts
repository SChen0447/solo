import { useMemo, useCallback, useRef } from 'react'
import {
  Building,
  SoundSource,
  FieldSample,
  ProbeInfo,
  AcousticRay,
  Wall,
  MaterialType,
  MATERIAL_ABSORPTION,
  STREET_WIDTH,
  STREET_DEPTH,
  GRID_SIZE,
  CELL_SPACING,
  SOUND_SPEED,
  MAX_REFLECTIONS,
  Vec2,
  Vec3
} from '../types'
import { v4 as uuidv4 } from 'uuid'

const RAY_COLORS = [
  '#ff4444',
  '#4488ff',
  '#44ff44',
  '#ff8800',
  '#ff44ff',
  '#00ffff',
  '#ffff44',
  '#ff88ff'
]

interface WallWithBuilding extends Wall {
  buildingId: string
}

function rotatePoint(point: Vec2, center: Vec2, angleDeg: number): Vec2 {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = point.x - center.x
  const dz = point.z - center.z
  return {
    x: center.x + dx * cos - dz * sin,
    z: center.z + dx * sin + dz * cos
  }
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.z * v.z)
  if (len < 1e-6) return { x: 0, z: 0 }
  return { x: v.x / len, z: v.z / len }
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z }
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z }
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, z: v.z * s }
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.z * b.z
}

function reflectPoint(point: Vec2, wall: Wall): Vec2 {
  const lineVec = sub(wall.end, wall.start)
  const lineLen2 = dot(lineVec, lineVec)
  const t = Math.max(0, Math.min(1, dot(sub(point, wall.start), lineVec) / lineLen2))
  const foot = add(wall.start, scale(lineVec, t))
  const diff = sub(foot, point)
  return add(foot, diff)
}

function raySegmentIntersect(
  rayOrigin: Vec2,
  rayDir: Vec2,
  segStart: Vec2,
  segEnd: Vec2
): { point: Vec2; t: number } | null {
  const v1 = sub(rayOrigin, segStart)
  const v2 = sub(segEnd, segStart)
  const v3 = { x: -rayDir.z, z: rayDir.x }
  const dotV2V3 = dot(v2, v3)
  if (Math.abs(dotV2V3) < 1e-6) return null
  const t1 = (v2.x * v1.z - v2.z * v1.x) / dotV2V3
  const t2 = dot(v1, v3) / dotV2V3
  if (t1 >= 1e-4 && t2 >= 0 && t2 <= 1) {
    return {
      point: add(rayOrigin, scale(rayDir, t1)),
      t: t1
    }
  }
  return null
}

function isPointInsideBuilding(p: Vec2, building: Building): boolean {
  const rel = rotatePoint(p, building.position, -building.rotation)
  const hw = building.dimensions.width / 2
  const hd = building.dimensions.depth / 2
  return Math.abs(rel.x) <= hw && Math.abs(rel.z) <= hd
}

function computeBuildingWalls(building: Building): WallWithBuilding[] {
  const hw = building.dimensions.width / 2
  const hd = building.dimensions.depth / 2
  const corners: { pos: Vec2; mat: MaterialType }[] = [
    { pos: { x: -hw, z: -hd }, mat: building.walls.front },
    { pos: { x: hw, z: -hd }, mat: building.walls.right },
    { pos: { x: hw, z: hd }, mat: building.walls.back },
    { pos: { x: -hw, z: hd }, mat: building.walls.left }
  ]
  const walls: WallWithBuilding[] = []
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    const start = rotatePoint(a.pos, building.position, building.rotation)
    const end = rotatePoint(b.pos, building.position, building.rotation)
    const wallVec = sub(end, start)
    const normal = normalize({ x: -wallVec.z, z: wallVec.x })
    walls.push({
      id: `${building.id}-wall-${i}`,
      start,
      end,
      normal,
      material: b.mat,
      buildingId: building.id
    })
  }
  return walls
}

function findNearestWallHit(
  origin: Vec2,
  dir: Vec2,
  walls: WallWithBuilding[],
  excludeBuildingIds: string[] = []
): { wall: WallWithBuilding; point: Vec2; t: number } | null {
  let nearest: { wall: WallWithBuilding; point: Vec2; t: number } | null = null
  for (const wall of walls) {
    if (excludeBuildingIds.includes(wall.buildingId)) continue
    const hit = raySegmentIntersect(origin, dir, wall.start, wall.end)
    if (hit && (!nearest || hit.t < nearest.t)) {
      nearest = { wall, point: hit.point, t: hit.t }
    }
  }
  return nearest
}

function computeRaysToPoint(
  source: Vec2,
  receiver: Vec2,
  buildings: Building[],
  walls: WallWithBuilding[],
  sourceSPL: number
): AcousticRay[] {
  const rays: AcousticRay[] = []
  const toReceiver = sub(receiver, source)
  const distDirect = Math.sqrt(dot(toReceiver, toReceiver))
  if (distDirect > 0.1) {
    const dirDirect = scale(toReceiver, 1 / distDirect)
    const blocker = findNearestWallHit(source, dirDirect, walls)
    if (!blocker || blocker.t > distDirect) {
      const spl = computeSPL(sourceSPL, distDirect, 1)
      rays.push({
        id: uuidv4(),
        color: RAY_COLORS[0],
        points: [
          { x: source.x, y: 1.5, z: source.z },
          { x: receiver.x, y: 1.5, z: receiver.z }
        ],
        pathLength: distDirect,
        delayMs: (distDirect / SOUND_SPEED) * 1000,
        soundPressureLevel: spl,
        isDirect: true,
        reflectionOrder: 0
      })
    }
  }

  let colorIdx = 1
  for (const wall of walls) {
    const virtualSource = reflectPoint(source, wall)
    const toRec = sub(receiver, virtualSource)
    const distToRec = Math.sqrt(dot(toRec, toRec))
    if (distToRec < 0.1) continue

    const dirToRec = scale(toRec, 1 / distToRec)
    const wallHit = raySegmentIntersect(virtualSource, dirToRec, wall.start, wall.end)
    if (!wallHit || Math.abs(wallHit.t - distToRec) > 0.01) continue

    const reflectPoint_ = wallHit.point
    const sourceToReflect = sub(reflectPoint_, source)
    const distS1 = Math.sqrt(dot(sourceToReflect, sourceToReflect))
    if (distS1 < 0.1) continue

    const dirS1 = scale(sourceToReflect, 1 / distS1)
    const block1 = findNearestWallHit(source, dirS1, walls, [wall.buildingId])
    if (block1 && block1.t < distS1 - 0.01) continue

    const reflectToRec = sub(receiver, reflectPoint_)
    const distR1 = Math.sqrt(dot(reflectToRec, reflectToRec))
    const dirR1 = scale(reflectToRec, 1 / distR1)
    const block2 = findNearestWallHit(reflectPoint_, dirR1, walls, [wall.buildingId])
    if (block2 && block2.t < distR1 - 0.01) continue

    const totalDist = distS1 + distR1
    const reflectFactor = 1 - MATERIAL_ABSORPTION[wall.material]
    const spl = computeSPL(sourceSPL, totalDist, reflectFactor)

    rays.push({
      id: uuidv4(),
      color: RAY_COLORS[colorIdx % RAY_COLORS.length],
      points: [
        { x: source.x, y: 1.5, z: source.z },
        { x: reflectPoint_.x, y: 1.5, z: reflectPoint_.z },
        { x: receiver.x, y: 1.5, z: receiver.z }
      ],
      pathLength: totalDist,
      delayMs: (totalDist / SOUND_SPEED) * 1000,
      soundPressureLevel: spl,
      isDirect: false,
      reflectionOrder: 1
    })
    colorIdx++

    if (rays.length >= MAX_REFLECTIONS) break
  }

  return rays.slice(0, MAX_REFLECTIONS)
}

function computeSPL(sourceSPL: number, distance: number, reflectionFactor: number): number {
  const r = Math.max(distance, 0.1)
  const geometricLoss = 20 * Math.log10(r / 1)
  const airAbsorption = 0.01 * r
  let effective = sourceSPL - geometricLoss - airAbsorption
  if (reflectionFactor < 1) {
    const reflDB = -20 * Math.log10(Math.max(reflectionFactor, 0.001))
    effective -= reflDB * 0.5
  }
  return Math.max(0, effective)
}

function combineSPLs(spls: number[]): number {
  if (spls.length === 0) return 0
  let sum = 0
  for (const spl of spls) {
    sum += Math.pow(10, spl / 10)
  }
  return 10 * Math.log10(sum)
}

export function useAcousticField(
  buildings: Building[],
  soundSource: SoundSource
) {
  const cacheRef = useRef<{
    buildingsKey: string
    sourceKey: string
    heatmap: FieldSample[] | null
  }>({ buildingsKey: '', sourceKey: '', heatmap: null })

  const walls = useMemo<WallWithBuilding[]>(() => {
    const all: WallWithBuilding[] = []
    for (const b of buildings) {
      all.push(...computeBuildingWalls(b))
    }
    return all
  }, [buildings])

  const buildingsKey = useMemo(
    () => JSON.stringify(buildings.map(b => ({ p: b.position, r: b.rotation, d: b.dimensions, w: b.walls }))),
    [buildings]
  )
  const sourceKey = useMemo(
    () => JSON.stringify({ p: soundSource.position, f: soundSource.frequency, spl: soundSource.soundPressureLevel }),
    [soundSource]
  )

  const heatmapData = useMemo<FieldSample[]>(() => {
    const key = buildingsKey + sourceKey
    if (cacheRef.current.buildingsKey === buildingsKey &&
        cacheRef.current.sourceKey === sourceKey &&
        cacheRef.current.heatmap) {
      return cacheRef.current.heatmap
    }

    const gridOrigin = { x: -STREET_WIDTH / 2 + CELL_SPACING, z: -STREET_DEPTH / 2 + CELL_SPACING }
    const samples: FieldSample[] = []
    const source2D: Vec2 = { x: soundSource.position.x, z: soundSource.position.z }

    for (let ix = 0; ix < GRID_SIZE; ix++) {
      for (let iz = 0; iz < GRID_SIZE; iz++) {
        const px = gridOrigin.x + ix * CELL_SPACING
        const pz = gridOrigin.z + iz * CELL_SPACING
        const pos: Vec2 = { x: px, z: pz }

        let insideBuilding = false
        for (const b of buildings) {
          if (isPointInsideBuilding(pos, b)) {
            insideBuilding = true
            break
          }
        }
        if (insideBuilding) {
          samples.push({ position: pos, soundPressureLevel: -1 })
          continue
        }

        const rays = computeRaysToPoint(source2D, pos, buildings, walls, soundSource.soundPressureLevel)
        const spls = rays.map(r => r.soundPressureLevel)
        const total = combineSPLs(spls)
        samples.push({ position: pos, soundPressureLevel: total })
      }
    }

    cacheRef.current = { buildingsKey, sourceKey, heatmap: samples }
    return samples
  }, [buildingsKey, sourceKey, buildings, walls, soundSource])

  const getProbeInfo = useCallback(
    (position: Vec2): ProbeInfo | null => {
      for (const b of buildings) {
        if (isPointInsideBuilding(position, b)) return null
      }
      const clamped: Vec2 = {
        x: Math.max(-STREET_WIDTH / 2 + 0.5, Math.min(STREET_WIDTH / 2 - 0.5, position.x)),
        z: Math.max(-STREET_DEPTH / 2 + 0.5, Math.min(STREET_DEPTH / 2 - 0.5, position.z))
      }
      const source2D: Vec2 = { x: soundSource.position.x, z: soundSource.position.z }
      const rays = computeRaysToPoint(source2D, clamped, buildings, walls, soundSource.soundPressureLevel)
      const spls = rays.map(r => r.soundPressureLevel)
      return {
        position: clamped,
        totalSPL: combineSPLs(spls),
        rays
      }
    },
    [buildings, walls, soundSource]
  )

  return { heatmapData, getProbeInfo, walls }
}
