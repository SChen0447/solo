export interface Vec2 {
  x: number
  y: number
}

export enum EntityType {
  PLAYER = 'player',
  CREATURE = 'creature',
  UNDERFLOW = 'underflow',
  VOLCANO_PARTICLE = 'volcano_particle',
}

export type CreatureShape = 'jellyfish' | 'starfish' | 'fish'

export interface Entity {
  id: string
  position: Vec2
  velocity: Vec2
  type: EntityType
  alive: boolean
}

export interface Player extends Entity {
  type: EntityType.PLAYER
  radius: number
  health: number
  maxHealth: number
  currentVelocityOffset: Vec2
  offsetTimer: number
}

export interface Creature extends Entity {
  type: EntityType.CREATURE
  shape: CreatureShape
  color: string
  isRare: boolean
  pulsePhase: number
  fleeing: boolean
  collectAnimating: boolean
  collectProgress: number
  baseRadius: number
}

export interface Underflow extends Entity {
  type: EntityType.UNDERFLOW
  direction: Vec2
  strength: number
  lifetime: number
  radius: number
}

export interface VolcanoParticle extends Entity {
  type: EntityType.VOLCANO_PARTICLE
  radius: number
  color: string
  lifetime: number
  maxLifetime: number
}

export interface FloatingParticle {
  x: number
  y: number
  baseY: number
  radius: number
  alpha: number
  phase: number
  speed: number
}

export interface Terrain {
  heights: number[]
  width: number
}

export interface CollectRecord {
  shape: CreatureShape
  color: string
  count: number
}

export interface GameState {
  player: Player
  creatures: Creature[]
  underflows: Underflow[]
  volcanoParticles: VolcanoParticle[]
  floatingParticles: FloatingParticle[]
  terrain: Terrain
  collectedCreatures: Map<string, CollectRecord>
  totalScore: number
  rareCollected: number
  gameOver: boolean
  gameWon: boolean
  lastVolcanoTime: number
  nextVolcanoInterval: number
  rareFlashTimer: number
  mapWidth: number
  mapHeight: number
  cameraOffset: Vec2
}

export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 800
export const PLAYER_RADIUS = 15
export const PLAYER_SPEED = 180
export const MAX_HEALTH = 5
export const COLLECT_DISTANCE = 30
export const CREATURE_FLEE_SPEED = 120
export const PULSE_PERIOD = 1.5
export const PULSE_AMPLITUDE = 0.1
export const UNDERFLOW_DURATION = 2
export const UNDERFLOW_STRENGTH = 180
export const VOLCANO_INTERVAL_MIN = 15
export const VOLCANO_INTERVAL_MAX = 20
export const VOLCANO_PARTICLE_LIFETIME = 5
export const RARE_CHANCE = 0.15
export const CREATURE_COUNT = 20
export const FLOATING_PARTICLE_COUNT = 300
export const CULL_THRESHOLD = 150
export const CULL_RATIO = 0.2
export const COLLECT_ANIM_DURATION = 0.3

export const WARM_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF']
export const VOLCANO_COLORS = ['#FF4500', '#FF6347', '#FFA500', '#FF8C00']

export function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1))
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len < 1e-6) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}
