import { v4 as uuidv4 } from 'uuid'
import { cloneDeep } from 'lodash'
import {
  Card,
  Player,
  ReactionRule,
  StatusEffect,
  AttackResult,
  ElementType,
  BattleLogEntry,
  ELEMENT_NAMES
} from './types'
import { REACTION_RULES, CARD_TEMPLATES } from './data/reactionRules'

export function createCardFromTemplate(template: typeof CARD_TEMPLATES[number]): Card {
  return {
    id: uuidv4(),
    name: template.name,
    cost: template.cost,
    element: template.element,
    attack: template.attack,
    hp: template.hp,
    maxHp: template.hp,
    statuses: []
  }
}

export function drawRandomCards(count: number): Card[] {
  const cards: Card[] = []
  for (let i = 0; i < count; i++) {
    const template = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)]
    cards.push(createCardFromTemplate(template))
  }
  return cards
}

export function createInitialPlayer(id: 'player' | 'ai', name: string): Player {
  return {
    id,
    name,
    hp: 30,
    maxHp: 30,
    hand: drawRandomCards(5),
    field: [null, null, null],
    statuses: []
  }
}

export function findReaction(attackerElement: ElementType, defenderElement: ElementType): ReactionRule | null {
  return REACTION_RULES.find(
    rule => rule.elements[0] === attackerElement && rule.elements[1] === defenderElement
  ) || null
}

export function getCardEffectiveAttack(card: Card): number {
  let attack = card.attack
  const halveStatus = card.statuses.find(s => s.type === 'halve_attack')
  if (halveStatus) {
    attack = Math.floor(attack * halveStatus.value)
  }
  return attack
}

export function executeAttack(
  attacker: Card,
  defender: Card,
  attackerOwner: 'player' | 'ai'
): AttackResult {
  const logMessages: string[] = []
  const appliedStatuses: StatusEffect[] = []

  const baseAttack = getCardEffectiveAttack(attacker)
  logMessages.push(`${attacker.name}(${ELEMENT_NAMES[attacker.element]}) 攻击 ${defender.name}(${ELEMENT_NAMES[defender.element]})`)
  logMessages.push(`基础攻击力: ${baseAttack}`)

  const reaction = findReaction(attacker.element, defender.element)
  let finalDamage = baseAttack

  if (reaction) {
    logMessages.push(`触发反应: ${reaction.icon} ${reaction.description}`)
    finalDamage = Math.floor(finalDamage * reaction.multiplier) + reaction.flatDamage

    if (reaction.statusEffect) {
      const status: StatusEffect = {
        ...reaction.statusEffect,
        duration: reaction.statusDuration
      }
      appliedStatuses.push(status)
      logMessages.push(`施加状态: ${status.icon} ${status.name} (${status.duration}回合)`)
    }
  }

  logMessages.push(`最终伤害: ${finalDamage}`)

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    baseDamage: baseAttack,
    reaction,
    finalDamage,
    appliedStatuses,
    logMessages,
    targetDestroyed: defender.hp - finalDamage <= 0
  }
}

export function applyDamageToCard(card: Card, damage: number): Card {
  const updated = cloneDeep(card)
  updated.hp = Math.max(0, updated.hp - damage)
  return updated
}

export function applyStatusesToCard(card: Card, statuses: StatusEffect[]): Card {
  const updated = cloneDeep(card)
  for (const status of statuses) {
    const existing = updated.statuses.find(s => s.type === status.type)
    if (existing) {
      existing.duration = Math.max(existing.duration, status.duration)
    } else {
      updated.statuses.push(cloneDeep(status))
    }
  }
  return updated
}

export function settleCardStatuses(card: Card): { card: Card; damages: { status: StatusEffect; damage: number }[] } {
  const updated = cloneDeep(card)
  const damages: { status: StatusEffect; damage: number }[] = []

  updated.statuses = updated.statuses.filter(status => {
    if (status.type === 'burn' || status.type === 'bloom') {
      damages.push({ status, damage: status.value })
      updated.hp = Math.max(0, updated.hp - status.value)
    }
    status.duration -= 1
    return status.duration > 0
  })

  return { card: updated, damages }
}

export function settleAllStatuses(player: Player, isPlayer: boolean) {
  const settlements: {
    targetId: string
    targetName: string
    status: StatusEffect
    damage: number
    isPlayer: boolean
  }[] = []
  const updatedPlayer = cloneDeep(player)

  for (let i = 0; i < updatedPlayer.field.length; i++) {
    const card = updatedPlayer.field[i]
    if (card) {
      const { card: settledCard, damages } = settleCardStatuses(card)
      for (const d of damages) {
        settlements.push({
          targetId: card.id,
          targetName: card.name,
          status: d.status,
          damage: d.damage,
          isPlayer
        })
      }
      if (settledCard.hp <= 0) {
        updatedPlayer.field[i] = null
      } else {
        updatedPlayer.field[i] = settledCard
      }
    }
  }

  return { player: updatedPlayer, settlements }
}

export function placeCardOnField(player: Player, cardId: string, slotIndex: number): Player | null {
  if (slotIndex < 0 || slotIndex >= player.field.length) return null
  if (player.field[slotIndex] !== null) return null

  const cardIndex = player.hand.findIndex(c => c.id === cardId)
  if (cardIndex === -1) return null

  const updated = cloneDeep(player)
  const [card] = updated.hand.splice(cardIndex, 1)
  updated.field[slotIndex] = card
  return updated
}

export function isCardParalyzed(card: Card): boolean {
  return card.statuses.some(s => s.type === 'paralyze')
}

export function aiChooseAction(aiPlayer: Player, playerField: (Card | null)[]): {
  cardToPlay: Card | null
  slotIndex: number
  attackTarget: Card | null
} | null {
  const emptySlots = aiPlayer.field
    .map((c, i) => (c === null ? i : -1))
    .filter(i => i !== -1)

  let cardToPlay: Card | null = null
  let slotIndex: number = -1

  if (emptySlots.length > 0 && aiPlayer.hand.length > 0) {
    slotIndex = emptySlots[0]
    cardToPlay = aiPlayer.hand[0]
  }

  const availableAttackers = aiPlayer.field.filter(c => c !== null && !isCardParalyzed(c)) as Card[]
  const availableTargets = playerField.filter(c => c !== null) as Card[]

  let attackTarget: Card | null = null
  if (availableAttackers.length > 0 && availableTargets.length > 0) {
    attackTarget = availableTargets[0]
  }

  return { cardToPlay, slotIndex, attackTarget }
}

export function createBattleLog(
  turn: number,
  attackerCard: Card | null,
  defenderCard: Card | null,
  reaction: ReactionRule | null,
  damage: number,
  statuses: StatusEffect[],
  description: string,
  logType: 'attack' | 'status_settlement' | 'system'
): BattleLogEntry {
  return {
    id: uuidv4(),
    turn,
    timestamp: Date.now(),
    attackerCardId: attackerCard?.id || null,
    attackerCardName: attackerCard?.name || null,
    defenderCardId: defenderCard?.id || null,
    defenderCardName: defenderCard?.name || null,
    attackerElement: attackerCard?.element || null,
    defenderElement: defenderCard?.element || null,
    reaction,
    damage,
    statuses,
    description,
    logType,
    highlightedCards: [attackerCard?.id, defenderCard?.id].filter(Boolean) as string[]
  }
}
