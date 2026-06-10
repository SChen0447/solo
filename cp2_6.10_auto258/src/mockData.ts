import { v4 as uuidv4 } from 'uuid'
import type { Yarn } from './types'

const warmColors = [
  { name: '朱砂红', color: '#c0392b' },
  { name: '珊瑚粉', color: '#e07a5f' },
  { name: '蜜橘橙', color: '#e67e22' },
  { name: '南瓜橙', color: '#d35400' },
  { name: '暖阳黄', color: '#f1c40f' },
  { name: '柠檬黄', color: '#f4d03f' },
  { name: '蜜桃粉', color: '#f5b7b1' },
  { name: '玫瑰红', color: '#c2185b' },
  { name: '砖红', color: '#a04020' },
  { name: '杏色', color: '#f3d5b5' },
  { name: '胭脂红', color: '#8b0000' },
  { name: '枫叶橙', color: '#cc5500' },
  { name: '暖米黄', color: '#f5e6cc' },
  { name: '焦糖色', color: '#8b4513' },
  { name: '樱花粉', color: '#ffb7c5' },
]

const coolColors = [
  { name: '湖蓝', color: '#3498db' },
  { name: '深海蓝', color: '#2c3e50' },
  { name: '天蓝', color: '#5dade2' },
  { name: '靛蓝', color: '#4a235a' },
  { name: '紫罗兰', color: '#8e44ad' },
  { name: '薰衣草', color: '#bb8fce' },
  { name: '薄荷绿', color: '#73c6b6' },
  { name: '森林绿', color: '#1e8449' },
  { name: '青绿色', color: '#16a085' },
  { name: '宝石蓝', color: '#1a5276' },
  { name: '丁香紫', color: '#af7ac5' },
  { name: '海水蓝', color: '#1f618d' },
  { name: '嫩绿', color: '#82e0aa' },
  { name: '冰蓝', color: '#aed6f1' },
  { name: '祖母绿', color: '#0b5345' },
]

const neutralColors = [
  { name: '卡其色', color: '#c4a35a' },
  { name: '驼色', color: '#a67b5b' },
  { name: '灰褐色', color: '#8a7968' },
  { name: '橄榄绿', color: '#6b7c3f' },
  { name: '土黄', color: '#b8860b' },
  { name: '咖啡色', color: '#6f4e37' },
  { name: '苔藓绿', color: '#556b2f' },
  { name: '赭石色', color: '#8b5a2b' },
  { name: '沙色', color: '#e8d4a8' },
  { name: '米色', color: '#d4c4a8' },
  { name: '军绿', color: '#4a5d23' },
  { name: '青铜色', color: '#70640d' },
  { name: '棕褐色', color: '#654321' },
  { name: '暗金', color: '#85754e' },
  { name: '亚麻棕', color: '#b4916c' },
]

const monochromeColors = [
  { name: '雪白', color: '#ffffff' },
  { name: '奶白', color: '#f8f5f0' },
  { name: '浅灰', color: '#d5d8dc' },
  { name: '中灰', color: '#909497' },
  { name: '深灰', color: '#566573' },
  { name: '炭黑', color: '#2c2c2c' },
  { name: '银灰', color: '#bdc3c7' },
  { name: '珍珠灰', color: '#e8e8e8' },
  { name: '石板灰', color: '#708090' },
  { name: '象牙白', color: '#fffff0' },
  { name: '烟灰', color: '#6e6e6e' },
  { name: '冷白', color: '#f0f8ff' },
  { name: '暖灰', color: '#b8a99c' },
  { name: '米灰', color: '#c0b8a8' },
  { name: '纯黑', color: '#1a1a1a' },
]

const brands = ['Laine Nordique', 'Drops', 'Rowan', 'Puppy', '芭贝', '回归线', '盛莲']

function generateYarns(colors: { name: string; color: string }[], category: Yarn['category']): Yarn[] {
  return colors.map((c, idx) => ({
    id: uuidv4(),
    name: c.name,
    color: c.color,
    hexCode: c.color,
    grams: Math.floor(Math.random() * 200) + 20,
    batch: `B${2024}${String(Math.floor(idx / 5) + 1).padStart(2, '0')}${String(idx % 10).padStart(3, '0')}`,
    category,
    brand: brands[Math.floor(Math.random() * brands.length)],
    purchaseLink: 'https://example.com/yarn',
    usageHistory: ['2024-03 制作围巾 ×1', '2024-01 制作手套 ×1']
  }))
}

export const mockYarns: Yarn[] = [
  ...generateYarns(warmColors, 'warm'),
  ...generateYarns(coolColors, 'cool'),
  ...generateYarns(neutralColors, 'neutral'),
  ...generateYarns(monochromeColors, 'monochrome'),
]
