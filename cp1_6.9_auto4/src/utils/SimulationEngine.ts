export type SignalColor = 'red' | 'yellow' | 'green'
export type VehicleType = 'car' | 'bus' | 'truck' | 'motorcycle' | 'bicycle'
export type PhasePlan = 'balanced' | 'trunkPriority' | 'tidalLane'

export interface Vehicle {
  id: string
  type: VehicleType
  lat: number
  lng: number
  targetLat: number
  targetLng: number
  speed: number
  direction: number
  intersectionId: string
}

export interface TrafficData {
  car: number
  bus: number
  truck: number
  motorcycle: number
  bicycle: number
}

export interface IntersectionConfig {
  id: string
  name: string
  lat: number
  lng: number
  isTrunkRoad: boolean
}

export interface PhaseConfig {
  greenDuration: number
  yellowDuration: number
  offset: number
}

export interface IntersectionState {
  id: string
  name: string
  lat: number
  lng: number
  signal: SignalColor
  phase: number
  trafficData: TrafficData
  waitTime: number
}

export interface GlobalStats {
  totalVehicles: number
  avgWaitTime: number
  congestionIndex: number
}

const VEHICLE_ICONS: Record<VehicleType, string> = {
  car: '🚗',
  bus: '🚌',
  truck: '🚚',
  motorcycle: '🏍️',
  bicycle: '🚲',
}

const VEHICLE_SPEEDS: Record<VehicleType, number> = {
  car: 0.00015,
  bus: 0.00012,
  truck: 0.0001,
  motorcycle: 0.00018,
  bicycle: 0.00006,
}

const INTERSECTIONS: IntersectionConfig[] = [
  { id: 'A', name: '中山路·人民大道', lat: 31.2304, lng: 121.4737, isTrunkRoad: true },
  { id: 'B', name: '南京路·外滩大街', lat: 31.2354, lng: 121.4837, isTrunkRoad: true },
  { id: 'C', name: '淮海路·陕西南路', lat: 31.2254, lng: 121.4637, isTrunkRoad: false },
  { id: 'D', name: '静安寺·华山路', lat: 31.2284, lng: 121.4537, isTrunkRoad: false },
]

const PHASE_PLANS: Record<PhasePlan, Record<string, PhaseConfig[]>> = {
  balanced: {
    A: [{ greenDuration: 3000, yellowDuration: 800, offset: 0 }],
    B: [{ greenDuration: 3000, yellowDuration: 800, offset: 0 }],
    C: [{ greenDuration: 2500, yellowDuration: 800, offset: 0 }],
    D: [{ greenDuration: 2500, yellowDuration: 800, offset: 0 }],
  },
  trunkPriority: {
    A: [{ greenDuration: 5000, yellowDuration: 800, offset: 0 }],
    B: [{ greenDuration: 5000, yellowDuration: 800, offset: 0 }],
    C: [{ greenDuration: 1500, yellowDuration: 800, offset: 0 }],
    D: [{ greenDuration: 1500, yellowDuration: 800, offset: 0 }],
  },
  tidalLane: {
    A: [{ greenDuration: 4000, yellowDuration: 800, offset: 0 }],
    B: [{ greenDuration: 2000, yellowDuration: 800, offset: 2000 }],
    C: [{ greenDuration: 3500, yellowDuration: 800, offset: 0 }],
    D: [{ greenDuration: 2000, yellowDuration: 800, offset: 2000 }],
  },
}

class SimulationEngineClass {
  private running: boolean = false
  private startTime: number = 0
  private phasePlan: PhasePlan = 'balanced'
  private vehicles: Map<string, Vehicle[]> = new Map()
  private trafficData: Map<string, TrafficData> = new Map()
  private vehicleIdCounter: number = 0
  private lastTrafficUpdate: number = 0
  private frameCount: number = 0

  init() {
    this.running = true
    this.startTime = Date.now()
    this.frameCount = 0

    INTERSECTIONS.forEach((intersection) => {
      this.vehicles.set(intersection.id, [])
      this.trafficData.set(intersection.id, {
        car: 0,
        bus: 0,
        truck: 0,
        motorcycle: 0,
        bicycle: 0,
      })
    })

    this.lastTrafficUpdate = Date.now()
    this.start()
  }

  start() {
    if (!this.running) return
    this.tick()
  }

  stop() {
    this.running = false
  }

  private tick() {
    if (!this.running) return

    const now = Date.now()
    this.frameCount++

    if (now - this.lastTrafficUpdate >= 500) {
      this.updateTrafficData()
      this.spawnVehicles()
      this.lastTrafficUpdate = now
    }

    this.updateVehiclePositions()
  }

  private spawnVehicles() {
    INTERSECTIONS.forEach((intersection) => {
      const list = this.vehicles.get(intersection.id) || []
      const maxVehicles = 8
      const spawnChance = intersection.isTrunkRoad ? 0.6 : 0.45

      if (list.length < maxVehicles && Math.random() < spawnChance) {
        const types: VehicleType[] = ['car', 'bus', 'truck', 'motorcycle', 'bicycle']
        const weights = [0.45, 0.12, 0.1, 0.2, 0.13]
        const type = this.weightedRandom(types, weights)

        const directions = [0, 90, 180, 270]
        const direction = directions[Math.floor(Math.random() * directions.length)]
        const rad = (direction * Math.PI) / 180

        const distance = 0.003
        const startLat = intersection.lat - Math.cos(rad) * distance
        const startLng = intersection.lng - Math.sin(rad) * distance
        const targetLat = intersection.lat + Math.cos(rad) * distance
        const targetLng = intersection.lng + Math.sin(rad) * distance

        const vehicle: Vehicle = {
          id: `v_${++this.vehicleIdCounter}`,
          type,
          lat: startLat,
          lng: startLng,
          targetLat,
          targetLng,
          speed: VEHICLE_SPEEDS[type],
          direction,
          intersectionId: intersection.id,
        }

        list.push(vehicle)
      }

      this.vehicles.set(intersection.id, list)
    })
  }

  private updateVehiclePositions() {
    INTERSECTIONS.forEach((intersection) => {
      const list = this.vehicles.get(intersection.id) || []
      const signal = this.getSignalForIntersection(intersection.id)
      const updated: Vehicle[] = []

      for (const vehicle of list) {
        const dx = vehicle.targetLng - vehicle.lng
        const dy = vehicle.targetLat - vehicle.lat
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 0.00008) {
          continue
        }

        let speed = vehicle.speed

        if (signal !== 'green') {
          const distToIntersection = Math.sqrt(
            Math.pow(intersection.lng - vehicle.lng, 2) +
            Math.pow(intersection.lat - vehicle.lat, 2)
          )
          if (distToIntersection < 0.0015) {
            speed *= 0.1
            if (distToIntersection < 0.0008) {
              speed = 0
            }
          }
        }

        const moveLat = (dy / dist) * speed
        const moveLng = (dx / dist) * speed

        updated.push({
          ...vehicle,
          lat: vehicle.lat + moveLat,
          lng: vehicle.lng + moveLng,
        })
      }

      this.vehicles.set(intersection.id, updated)
    })
  }

  private updateTrafficData() {
    INTERSECTIONS.forEach((intersection) => {
      const current = this.trafficData.get(intersection.id) || {
        car: 0,
        bus: 0,
        truck: 0,
        motorcycle: 0,
        bicycle: 0,
      }

      const base: TrafficData = intersection.isTrunkRoad
        ? { car: 45, bus: 15, truck: 10, motorcycle: 20, bicycle: 12 }
        : { car: 30, bus: 8, truck: 6, motorcycle: 25, bicycle: 18 }

      const signal = this.getSignalForIntersection(intersection.id)
      const factor = signal === 'green' ? 0.7 : signal === 'yellow' ? 1.0 : 1.3

      const newData: TrafficData = {
        car: Math.round((base.car + Math.random() * 25 - 10) * factor),
        bus: Math.round((base.bus + Math.random() * 8 - 3) * factor),
        truck: Math.round((base.truck + Math.random() * 6 - 2) * factor),
        motorcycle: Math.round((base.motorcycle + Math.random() * 12 - 5) * factor),
        bicycle: Math.round((base.bicycle + Math.random() * 10 - 4) * factor),
      }

      Object.keys(current).forEach((key) => {
        const k = key as VehicleType
        current[k] = Math.max(0, Math.round(current[k] * 0.6 + newData[k] * 0.4))
      })

      this.trafficData.set(intersection.id, current)
    })
  }

  private weightedRandom<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * total
    for (let i = 0; i < items.length; i++) {
      random -= weights[i]
      if (random <= 0) return items[i]
    }
    return items[0]
  }

  setPhasePlan(plan: PhasePlan) {
    this.phasePlan = plan
    this.startTime = Date.now()
  }

  getSignalForIntersection(id: string): SignalColor {
    const now = Date.now() - this.startTime
    const configs = PHASE_PLANS[this.phasePlan][id]
    if (!configs || configs.length === 0) return 'red'

    const config = configs[0]
    const cycleLength = config.greenDuration + config.yellowDuration + 2000
    const adjusted = (now + config.offset) % cycleLength

    if (adjusted < config.greenDuration) return 'green'
    if (adjusted < config.greenDuration + config.yellowDuration) return 'yellow'
    return 'red'
  }

  getIntersectionStates(): Map<string, IntersectionState> {
    this.tick()

    const result = new Map<string, IntersectionState>()
    INTERSECTIONS.forEach((intersection) => {
      const signal = this.getSignalForIntersection(intersection.id)
      const trafficData = this.trafficData.get(intersection.id) || {
        car: 0,
        bus: 0,
        truck: 0,
        motorcycle: 0,
        bicycle: 0,
      }

      const vehicleCount = this.vehicles.get(intersection.id)?.length || 0
      const waitMultiplier = signal === 'red' ? 1.8 : signal === 'yellow' ? 1.2 : 0.3
      const waitTime = vehicleCount * waitMultiplier * 0.5

      result.set(intersection.id, {
        id: intersection.id,
        name: intersection.name,
        lat: intersection.lat,
        lng: intersection.lng,
        signal,
        phase: 0,
        trafficData,
        waitTime,
      })
    })

    return result
  }

  getVehicles(): Map<string, Vehicle[]> {
    return new Map(this.vehicles)
  }

  getVehicleIcon(type: VehicleType): string {
    return VEHICLE_ICONS[type]
  }

  getGlobalStats(): GlobalStats {
    let totalVehicles = 0
    let totalWaitTime = 0
    let congestionSum = 0
    let count = 0

    INTERSECTIONS.forEach((intersection) => {
      const list = this.vehicles.get(intersection.id) || []
      const traffic = this.trafficData.get(intersection.id)
      const signal = this.getSignalForIntersection(intersection.id)

      totalVehicles += list.length
      const vehicleCount = list.length
      const waitMultiplier = signal === 'red' ? 2.5 : signal === 'yellow' ? 1.5 : 0.5
      const waitTime = vehicleCount * waitMultiplier
      totalWaitTime += waitTime

      if (traffic) {
        const total = traffic.car + traffic.bus + traffic.truck + traffic.motorcycle + traffic.bicycle
        congestionSum += Math.min(100, total * (signal === 'red' ? 1.3 : 0.8))
        count++
      }
    })

    return {
      totalVehicles,
      avgWaitTime: count > 0 ? totalWaitTime / count : 0,
      congestionIndex: count > 0 ? congestionSum / count : 0,
    }
  }

  getIntersections(): IntersectionConfig[] {
    return INTERSECTIONS
  }

  getPhasePlanName(plan: PhasePlan): string {
    const names: Record<PhasePlan, string> = {
      balanced: '均衡模式',
      trunkPriority: '主干优先',
      tidalLane: '潮汐车道',
    }
    return names[plan]
  }
}

export const SimulationEngine = new SimulationEngineClass()
export { VEHICLE_ICONS }
