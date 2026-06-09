export type PotionColor = '#FF4444' | '#4488FF' | '#44BB66' | '#AA44FF' | '#FFD700' | '#FF69B4'

export interface Potion {
  id: string
  color: PotionColor
  name: string
}

export type AnimationType = 'bubble' | 'vortex' | 'explosion'

export interface Recipe {
  name: string
  colors: PotionColor[]
  finalColor: string
  animation: AnimationType
  explosionProbability: number
  description: string
}

export interface ReactionResult {
  finalColor: string
  bubbleDensity: number
  animationType: AnimationType | 'none'
  matched: boolean
  recipeName?: string
}

export const POTIONS: Potion[] = [
  { id: 'red', color: '#FF4444', name: '炽焰药剂' },
  { id: 'blue', color: '#4488FF', name: '深海之泪' },
  { id: 'green', color: '#44BB66', name: '翠叶精华' },
  { id: 'purple', color: '#AA44FF', name: '幻紫魔晶' },
  { id: 'yellow', color: '#FFD700', name: '金辉液' },
  { id: 'pink', color: '#FF69B4', name: '樱花瓣露' }
]

export const RECIPES: Recipe[] = [
  {
    name: '紫焰药水',
    colors: ['#FF4444', '#4488FF'],
    finalColor: '#8844FF',
    animation: 'vortex',
    explosionProbability: 0.1,
    description: '红与蓝的交融，诞生神秘紫焰'
  },
  {
    name: '翠光药水',
    colors: ['#44BB66', '#FFD700'],
    finalColor: '#AAEE22',
    animation: 'bubble',
    explosionProbability: 0.3,
    description: '绿意与金光共舞，生机盎然'
  },
  {
    name: '烈焰魔药',
    colors: ['#FF4444', '#FFD700'],
    finalColor: '#FF8822',
    animation: 'explosion',
    explosionProbability: 0.5,
    description: '炽热火焰，危险而强大'
  },
  {
    name: '海洋之心',
    colors: ['#4488FF', '#44BB66'],
    finalColor: '#33CCCC',
    animation: 'vortex',
    explosionProbability: 0.05,
    description: '深邃海洋，蕴藏无尽力量'
  },
  {
    name: '粉霞梦境',
    colors: ['#FF4444', '#FF69B4'],
    finalColor: '#FF5588',
    animation: 'bubble',
    explosionProbability: 0.15,
    description: '温柔的粉色霞光，如梦似幻'
  },
  {
    name: '星光秘药',
    colors: ['#4488FF', '#AA44FF'],
    finalColor: '#7744CC',
    animation: 'vortex',
    explosionProbability: 0.2,
    description: '星河流转，奥秘无穷'
  },
  {
    name: '黄金圣药',
    colors: ['#FFD700', '#FF69B4'],
    finalColor: '#FFB347',
    animation: 'bubble',
    explosionProbability: 0.1,
    description: '闪耀的黄金之光'
  },
  {
    name: '幻影三重奏',
    colors: ['#FF4444', '#4488FF', '#44BB66'],
    finalColor: '#668888',
    animation: 'explosion',
    explosionProbability: 0.6,
    description: '三色交汇，幻影丛生'
  },
  {
    name: '虹彩药水',
    colors: ['#FF4444', '#FFD700', '#4488FF'],
    finalColor: '#CC8844',
    animation: 'vortex',
    explosionProbability: 0.4,
    description: '彩虹凝聚，绚丽夺目'
  },
  {
    name: '死亡绽放',
    colors: ['#AA44FF', '#FF69B4', '#44BB66'],
    finalColor: '#88CC88',
    animation: 'explosion',
    explosionProbability: 0.7,
    description: '剧毒之花，美丽而致命'
  }
]

const recipeMap: Map<string, Recipe> = new Map()

function sortColors(colors: PotionColor[]): string {
  return [...new Set(colors)].sort().join(',')
}

RECIPES.forEach(recipe => {
  recipeMap.set(sortColors(recipe.colors), recipe)
})

export function matchRecipe(potionColors: PotionColor[]): Recipe | null {
  if (potionColors.length < 2 || potionColors.length > 3) return null
  const key = sortColors(potionColors)
  return recipeMap.get(key) || null
}

export function getRandomRecipe(): Recipe {
  return RECIPES[Math.floor(Math.random() * RECIPES.length)]
}
