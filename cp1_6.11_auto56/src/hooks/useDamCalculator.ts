import { useMemo } from 'react'

export type DamType = 'gravity' | 'arch' | 'buttress'

export interface DamParams {
  damHeight: number
  damTopWidth: number
  damBottomWidth: number
  upstreamSlope: number
  downstreamSlope: number
  upstreamWaterLevel: number
  downstreamWaterLevel: number
  damType: DamType
  buttressCount: number
  archRadius: number
  displacementScale: number
}

export interface Point {
  x: number
  y: number
}

export interface StressPoint {
  x: number
  y: number
  stress: number
}

export interface WaterPressurePoint {
  y: number
  pressure: number
  depth: number
  damSurfaceX: number
}

export interface Buttress {
  x: number
  width: number
}

export interface DamCalculationResult {
  damProfile: Point[]
  upstreamFace: Point[]
  downstreamFace: Point[]
  stressGrid: StressPoint[]
  upstreamPressure: WaterPressurePoint[]
  downstreamPressure: WaterPressurePoint[]
  buttresses: Buttress[]
  displacedProfile: Point[]
  topDisplacement: { x: number; y: number }
  foundationSupports: Point[]
  rollerSupports: number[]
  upstreamWaterHeight: number
  downstreamWaterHeight: number
  damBottomWidth: number
  damHeight: number
}

const WATER_GAMMA = 9.81

export function useDamCalculator(params: DamParams): DamCalculationResult {
  return useMemo(() => {
    const {
      damHeight,
      damTopWidth,
      damBottomWidth,
      upstreamSlope,
      downstreamSlope,
      upstreamWaterLevel,
      downstreamWaterLevel,
      damType,
      buttressCount,
      archRadius,
      displacementScale,
    } = params

    const H = damHeight
    const B = damBottomWidth
    const T = damTopWidth

    const upstreamWaterHeight = (upstreamWaterLevel / 100) * H
    const downstreamWaterHeight = (downstreamWaterLevel / 100) * H

    const { profile, upstreamFace, downstreamFace } = calculateDamGeometry(
      H, T, B, upstreamSlope, downstreamSlope, damType, archRadius
    )

    const stressGrid = calculateStressGrid(
      H, B, upstreamFace, downstreamFace, upstreamWaterHeight, damType, archRadius
    )

    const upstreamPressure = calculateWaterPressure(
      upstreamWaterHeight, H, upstreamFace, 'upstream'
    )

    const downstreamPressure = calculateWaterPressure(
      downstreamWaterHeight, H, downstreamFace, 'downstream'
    )

    const buttresses = calculateButtresses(B, buttressCount, H)

    const { displacedProfile, topDisplacement } = calculateDisplacement(
      profile, H, upstreamWaterHeight, displacementScale, damType, upstreamFace, downstreamFace
    )

    const { foundationSupports, rollerSupports } = calculateFoundationSupports(B)

    return {
      damProfile: profile,
      upstreamFace,
      downstreamFace,
      stressGrid,
      upstreamPressure,
      downstreamPressure,
      buttresses,
      displacedProfile,
      topDisplacement,
      foundationSupports,
      rollerSupports,
      upstreamWaterHeight,
      downstreamWaterHeight,
      damBottomWidth: B,
      damHeight: H,
    }
  }, [params])
}

function calculateDamGeometry(
  H: number,
  T: number,
  B: number,
  sUp: number,
  sDown: number,
  damType: DamType,
  archRadius: number
): { profile: Point[]; upstreamFace: Point[]; downstreamFace: Point[] } {
  const profile: Point[] = []
  const upstreamFace: Point[] = []
  const downstreamFace: Point[] = []

  const segments = 50

  if (damType === 'arch') {
    const centerX = B / 2

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = H * t
      const widthAtY = B - (B - T) * (1 - t)

      const archSag = Math.sin(t * Math.PI) * archRadius * 0.5
      const leftX = centerX - widthAtY / 2 - archSag * 0.3

      upstreamFace.push({ x: leftX, y })
    }

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = H * t
      const widthAtY = B - (B - T) * (1 - t)

      const rightX = centerX + widthAtY / 2 - sDown * (H - y) * 0.3

      downstreamFace.push({ x: rightX, y })
    }

    for (let i = 0; i <= segments; i++) {
      profile.push(upstreamFace[i])
    }
    for (let i = segments; i >= 0; i--) {
      profile.push(downstreamFace[i])
    }
  } else {
    const bottomLeftX = 0
    const bottomRightX = B
    const topLeftX = sUp * H
    const topRightX = B - sDown * H

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = H * t
      const x = bottomLeftX + (topLeftX - bottomLeftX) * t
      upstreamFace.push({ x, y })
    }

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = H * t
      const x = bottomRightX + (topRightX - bottomRightX) * t
      downstreamFace.push({ x, y })
    }

    profile.push({ x: bottomLeftX, y: 0 })
    for (let i = segments; i >= 0; i--) {
      profile.push(downstreamFace[i])
    }
    for (let i = 0; i <= segments; i++) {
      profile.push(upstreamFace[i])
    }
  }

  return { profile, upstreamFace, downstreamFace }
}

function calculateStressGrid(
  H: number,
  B: number,
  upstreamFace: Point[],
  downstreamFace: Point[],
  upstreamWaterHeight: number,
  damType: DamType,
  archRadius: number
): StressPoint[] {
  const points: StressPoint[] = []
  const gridSize = 2.5
  const waterPressureFactor = upstreamWaterHeight / H

  const getUpstreamX = (y: number): number => {
    const t = y / H
    const idx = Math.floor(t * (upstreamFace.length - 1))
    if (idx < 0) return upstreamFace[0].x
    if (idx >= upstreamFace.length - 1) return upstreamFace[upstreamFace.length - 1].x
    const frac = t * (upstreamFace.length - 1) - idx
    return upstreamFace[idx].x + (upstreamFace[idx + 1].x - upstreamFace[idx].x) * frac
  }

  const getDownstreamX = (y: number): number => {
    const t = y / H
    const idx = Math.floor(t * (downstreamFace.length - 1))
    if (idx < 0) return downstreamFace[0].x
    if (idx >= downstreamFace.length - 1) return downstreamFace[downstreamFace.length - 1].x
    const frac = t * (downstreamFace.length - 1) - idx
    return downstreamFace[idx].x + (downstreamFace[idx + 1].x - downstreamFace[idx].x) * frac
  }

  for (let y = gridSize; y < H - gridSize; y += gridSize) {
    const leftX = getUpstreamX(y)
    const rightX = getDownstreamX(y)
    const width = rightX - leftX

    if (width <= 0) continue

    const t = y / H

    for (let x = leftX + gridSize; x < rightX - gridSize; x += gridSize) {
      const normalizedX = (x - leftX) / width

      const selfWeightStress = t * 0.7

      const momentStress = (normalizedX - 0.5) * 2 * waterPressureFactor * 0.8

      let archEffect = 0
      if (damType === 'arch') {
        archEffect = Math.sin(t * Math.PI) * 0.4 * (archRadius / 100)
      }

      const totalStress = selfWeightStress + momentStress - archEffect * 0.4

      const clampedStress = Math.max(-1, Math.min(1, totalStress))

      points.push({ x, y, stress: clampedStress })
    }
  }

  return points
}

function calculateWaterPressure(
  waterHeight: number,
  damHeight: number,
  damFace: Point[],
  side: 'upstream' | 'downstream'
): WaterPressurePoint[] {
  const points: WaterPressurePoint[] = []
  const steps = 15

  if (waterHeight <= 0) return points

  const getFaceX = (y: number): number => {
    const t = (damHeight - y) / damHeight
    const idx = Math.floor(t * (damFace.length - 1))
    const clampedIdx = Math.max(0, Math.min(damFace.length - 2, idx))
    const frac = t * (damFace.length - 1) - clampedIdx
    return damFace[clampedIdx].x + (damFace[clampedIdx + 1].x - damFace[clampedIdx].x) * frac
  }

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const depth = waterHeight * t
    const y = damHeight - depth
    const pressure = WATER_GAMMA * depth
    const damSurfaceX = getFaceX(y)
    points.push({ y, pressure, depth, damSurfaceX })
  }

  return points
}

function calculateButtresses(
  B: number,
  count: number,
  H: number
): Buttress[] {
  const buttresses: Buttress[] = []
  const width = B / 10

  if (count < 2) {
    buttresses.push({ x: B / 2 - width / 2, width })
    return buttresses
  }

  const totalWidth = count * width
  const totalGap = B - totalWidth
  const gap = totalGap / (count - 1)

  for (let i = 0; i < count; i++) {
    const x = i * (width + gap)
    buttresses.push({ x, width })
  }

  return buttresses
}

function calculateDisplacement(
  profile: Point[],
  H: number,
  upstreamWaterHeight: number,
  scale: number,
  damType: DamType,
  upstreamFace: Point[],
  downstreamFace: Point[]
): { displacedProfile: Point[]; topDisplacement: Point } {
  const displacedProfile: Point[] = []

  const waterFactor = upstreamWaterHeight / H
  const maxHorizontalDisp = 0.008 * scale * waterFactor
  const maxVerticalDisp = 0.003 * scale

  let topLeftX = Infinity
  let topRightX = -Infinity
  let topY = -Infinity

  for (const p of profile) {
    const heightFactor = Math.min(1, Math.max(0, p.y / H))
    const dispX = maxHorizontalDisp * Math.pow(heightFactor, 1.4)

    let archStiffness = 1
    if (damType === 'arch') {
      archStiffness = 0.65
    }

    const dispY = -maxVerticalDisp * heightFactor * archStiffness

    const newX = p.x + dispX
    const newY = p.y + dispY

    displacedProfile.push({ x: newX, y: newY })

    if (Math.abs(p.y - H) < 1) {
      if (p.x < topLeftX) topLeftX = p.x
      if (p.x > topRightX) topRightX = p.x
      if (p.y > topY) topY = newY
    }
  }

  const topDispX = maxHorizontalDisp * 1000
  const topDispY = -maxVerticalDisp * 1000

  return {
    displacedProfile,
    topDisplacement: { x: topDispX, y: topDispY },
  }
}

function calculateFoundationSupports(B: number): {
  foundationSupports: Point[]
  rollerSupports: number[]
} {
  const supports: Point[] = []
  const rollerIndices: number[] = []

  const count = 4
  const gap = B / (count + 1)

  for (let i = 0; i < count; i++) {
    const x = gap * (i + 1)
    supports.push({ x, y: 0 })
  }

  rollerIndices.push(1)
  rollerIndices.push(3)

  return { foundationSupports: supports, rollerSupports: rollerIndices }
}

export default useDamCalculator
