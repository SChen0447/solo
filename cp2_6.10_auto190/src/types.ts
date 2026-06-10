export type ElementType = 'fire' | 'water' | 'grass' | 'thunder'

export interface StatusEffect {
  type: 'burn' | 'vaporize' | 'electrocharge' | 'aggravate' | 'overload' | 'bloom' | 'paralyze' | 'halve_attack'
  name: string
  duration: number
  value: number
  icon: string
}

export interface ReactionRule {
  elements: [ElementType, ElementType]
  resultElement: ElementType | null
  multiplier: number
  flatDamage: number
  statusEffect: Omit<StatusEffect, 'duration'> | null
  statusDuration: number
  description: string
  icon: string
}

export interface Card {
  id: string
  name: string
  cost: number
  element: ElementType
  attack: number
  hp: number
  maxHp: number
  statuses: StatusEffect[]
}

export interface Player {
  id: 'player' | 'ai'
  name: string
  hp: number
  maxHp: number
  hand: Card[]
  field: (Card | null)[]
  statuses: StatusEffect[]
}

export interface AttackResult {
  attackerId: string
  defenderId: string
  baseDamage: number
  reaction: ReactionRule | null
  finalDamage: number
  appliedStatuses: StatusEffect[]
  logMessages: string[]
  targetDestroyed: boolean
}

export interface TurnResult {
  turnNumber: number
  activePlayer: 'player' | 'ai'
  attacks: AttackResult[]
  statusSettlements: {
    targetId: string
    targetName: string
    status: StatusEffect
    damage: number
    isPlayer: boolean
  }[]
  logMessages: string[]
}

export interface BattleLogEntry {
  id: string
  turn: number
  timestamp: number
  attackerCardId: string | null
  attackerCardName: string | null
  defenderCardId: string | null
  defenderCardName: string | null
  attackerElement: ElementType | null
  defenderElement: ElementType | null
  reaction: ReactionRule | null
  damage: number
  statuses: StatusEffect[]
  description: string
  logType: 'attack' | 'status_settlement' | 'system'
  highlightedCards?: string[]
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ef4444',
  water: '#3b82f6',
  grass: '#22c55e',
  thunder: '#a855f7'
}

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  thunder: '雷'
}

export const ELEMENTS: ElementType[] = ['fire', 'water', 'grass', 'thunder']
