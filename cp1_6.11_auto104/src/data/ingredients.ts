import { Ingredient } from '../types'

export const ingredients: Ingredient[] = [
  { id: 'top-1', name: '柠檬', nameEn: 'Lemon', noteType: 'top', color: '#fff176', icon: '🍋' },
  { id: 'top-2', name: '佛手柑', nameEn: 'Bergamot', noteType: 'top', color: '#ffcc80', icon: '🍊' },
  { id: 'top-3', name: '葡萄柚', nameEn: 'Grapefruit', noteType: 'top', color: '#ffab91', icon: '🍊' },
  { id: 'top-4', name: '薄荷', nameEn: 'Mint', noteType: 'top', color: '#a5d6a7', icon: '🌿' },
  { id: 'top-5', name: '薰衣草', nameEn: 'Lavender', noteType: 'top', color: '#ce93d8', icon: '💜' },
  { id: 'top-6', name: '柑橘', nameEn: 'Mandarin', noteType: 'top', color: '#ffe082', icon: '🍊' },
  { id: 'top-7', name: '苦橙叶', nameEn: 'Petitgrain', noteType: 'top', color: '#c5e1a5', icon: '🍃' },
  { id: 'top-8', name: '粉红胡椒', nameEn: 'Pink Pepper', noteType: 'top', color: '#f48fb1', icon: '🌶️' },
  
  { id: 'mid-1', name: '玫瑰', nameEn: 'Rose', noteType: 'middle', color: '#f48fb1', icon: '🌹' },
  { id: 'mid-2', name: '茉莉', nameEn: 'Jasmine', noteType: 'middle', color: '#fff9c4', icon: '🤍' },
  { id: 'mid-3', name: '鸢尾', nameEn: 'Iris', noteType: 'middle', color: '#b39ddb', icon: '💜' },
  { id: 'mid-4', name: '依兰', nameEn: 'Ylang Ylang', noteType: 'middle', color: '#fff59d', icon: '💛' },
  { id: 'mid-5', name: '牡丹', nameEn: 'Peony', noteType: 'middle', color: '#f8bbd0', icon: '🌸' },
  { id: 'mid-6', name: '铃兰', nameEn: 'Lily of the Valley', noteType: 'middle', color: '#e1f5fe', icon: '🔔' },
  { id: 'mid-7', name: '橙花', nameEn: 'Orange Blossom', noteType: 'middle', color: '#ffe0b2', icon: '🧡' },
  { id: 'mid-8', name: '肉桂', nameEn: 'Cinnamon', noteType: 'middle', color: '#ffab91', icon: '🪵' },
  
  { id: 'base-1', name: '雪松', nameEn: 'Cedar', noteType: 'base', color: '#a1887f', icon: '🌲' },
  { id: 'base-2', name: '檀香', nameEn: 'Sandalwood', noteType: 'base', color: '#d7ccc8', icon: '🪵' },
  { id: 'base-3', name: '麝香', nameEn: 'Musk', noteType: 'base', color: '#bcaaa4', icon: '🦌' },
  { id: 'base-4', name: '香草', nameEn: 'Vanilla', noteType: 'base', color: '#ffe0b2', icon: '🍦' },
  { id: 'base-5', name: '琥珀', nameEn: 'Amber', noteType: 'base', color: '#ffcc80', icon: '🟠' },
  { id: 'base-6', name: '广藿香', nameEn: 'Patchouli', noteType: 'base', color: '#8d6e63', icon: '🌿' },
  { id: 'base-7', name: '零陵香豆', nameEn: 'Tonka Bean', noteType: 'base', color: '#a1887f', icon: '🫘' },
  { id: 'base-8', name: '皮革', nameEn: 'Leather', noteType: 'base', color: '#6d4c41', icon: '👜' },
]

export const getIngredientsByNote = (noteType: 'top' | 'middle' | 'base') => {
  return ingredients.filter(ing => ing.noteType === noteType)
}
