import { ReactionRule } from '../types'

export const REACTION_RULES: ReactionRule[] = [
  {
    elements: ['fire', 'grass'],
    resultElement: 'fire',
    multiplier: 1.0,
    flatDamage: 0,
    statusEffect: {
      type: 'burn',
      name: '燃烧',
      value: 5,
      icon: '🔥'
    },
    statusDuration: 3,
    description: '燃烧：每回合持续伤害5点，持续3回合',
    icon: '🔥'
  },
  {
    elements: ['grass', 'fire'],
    resultElement: 'fire',
    multiplier: 1.0,
    flatDamage: 0,
    statusEffect: {
      type: 'burn',
      name: '燃烧',
      value: 5,
      icon: '🔥'
    },
    statusDuration: 3,
    description: '燃烧：每回合持续伤害5点，持续3回合',
    icon: '🔥'
  },
  {
    elements: ['water', 'fire'],
    resultElement: null,
    multiplier: 1.5,
    flatDamage: 0,
    statusEffect: null,
    statusDuration: 1,
    description: '蒸发：伤害×1.5',
    icon: '💨'
  },
  {
    elements: ['fire', 'water'],
    resultElement: null,
    multiplier: 1.5,
    flatDamage: 0,
    statusEffect: null,
    statusDuration: 1,
    description: '蒸发：伤害×1.5',
    icon: '💨'
  },
  {
    elements: ['thunder', 'water'],
    resultElement: 'thunder',
    multiplier: 1.0,
    flatDamage: 8,
    statusEffect: {
      type: 'paralyze',
      name: '感电麻痹',
      value: 1,
      icon: '⚡'
    },
    statusDuration: 1,
    description: '感电：伤害8点并麻痹对手下一张出手卡牌',
    icon: '⚡'
  },
  {
    elements: ['water', 'thunder'],
    resultElement: 'thunder',
    multiplier: 1.0,
    flatDamage: 8,
    statusEffect: {
      type: 'paralyze',
      name: '感电麻痹',
      value: 1,
      icon: '⚡'
    },
    statusDuration: 1,
    description: '感电：伤害8点并麻痹对手下一张出手卡牌',
    icon: '⚡'
  },
  {
    elements: ['thunder', 'grass'],
    resultElement: 'thunder',
    multiplier: 1.0,
    flatDamage: 10,
    statusEffect: {
      type: 'halve_attack',
      name: '激化',
      value: 0.5,
      icon: '🌩️'
    },
    statusDuration: 2,
    description: '激化：伤害10点使目标卡牌攻击力减半2回合',
    icon: '🌩️'
  },
  {
    elements: ['grass', 'thunder'],
    resultElement: 'thunder',
    multiplier: 1.0,
    flatDamage: 10,
    statusEffect: {
      type: 'halve_attack',
      name: '激化',
      value: 0.5,
      icon: '🌩️'
    },
    statusDuration: 2,
    description: '激化：伤害10点使目标卡牌攻击力减半2回合',
    icon: '🌩️'
  },
  {
    elements: ['fire', 'thunder'],
    resultElement: 'fire',
    multiplier: 1.0,
    flatDamage: 12,
    statusEffect: {
      type: 'overload',
      name: '超载',
      value: 12,
      icon: '💥'
    },
    statusDuration: 1,
    description: '超载：伤害12点并弹回对手牌堆',
    icon: '💥'
  },
  {
    elements: ['thunder', 'fire'],
    resultElement: 'fire',
    multiplier: 1.0,
    flatDamage: 12,
    statusEffect: {
      type: 'overload',
      name: '超载',
      value: 12,
      icon: '💥'
    },
    statusDuration: 1,
    description: '超载：伤害12点并弹回对手牌堆',
    icon: '💥'
  },
  {
    elements: ['water', 'grass'],
    resultElement: 'grass',
    multiplier: 1.0,
    flatDamage: 0,
    statusEffect: {
      type: 'bloom',
      name: '绽放毒雾',
      value: 3,
      icon: '🌸'
    },
    statusDuration: 2,
    description: '绽放：产生毒雾状态，每回合伤害3点，持续2回合',
    icon: '🌸'
  },
  {
    elements: ['grass', 'water'],
    resultElement: 'grass',
    multiplier: 1.0,
    flatDamage: 0,
    statusEffect: {
      type: 'bloom',
      name: '绽放毒雾',
      value: 3,
      icon: '🌸'
    },
    statusDuration: 2,
    description: '绽放：产生毒雾状态，每回合伤害3点，持续2回合',
    icon: '🌸'
  }
]

export const CARD_TEMPLATES = [
  { name: '烈焰骑士', element: 'fire' as const, cost: 2, attack: 6, hp: 8 },
  { name: '火焰法师', element: 'fire' as const, cost: 3, attack: 8, hp: 5 },
  { name: '熔岩巨人', element: 'fire' as const, cost: 4, attack: 10, hp: 12 },
  { name: '潮汐守卫', element: 'water' as const, cost: 2, attack: 4, hp: 10 },
  { name: '水之精灵', element: 'water' as const, cost: 3, attack: 7, hp: 7 },
  { name: '深海巨兽', element: 'water' as const, cost: 4, attack: 9, hp: 11 },
  { name: '藤蔓战士', element: 'grass' as const, cost: 2, attack: 5, hp: 9 },
  { name: '森林德鲁伊', element: 'grass' as const, cost: 3, attack: 6, hp: 8 },
  { name: '远古树人', element: 'grass' as const, cost: 4, attack: 7, hp: 14 },
  { name: '雷电使者', element: 'thunder' as const, cost: 2, attack: 7, hp: 6 },
  { name: '风暴法师', element: 'thunder' as const, cost: 3, attack: 9, hp: 5 },
  { name: '雷霆巨龙', element: 'thunder' as const, cost: 4, attack: 11, hp: 9 }
]
