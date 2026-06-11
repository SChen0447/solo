import { FlowerItem, VaseType } from '@/types'

export const flowerCatalog: FlowerItem[] = [
  {
    id: 'rose',
    name: '玫瑰',
    color: '#e63946',
    petalCount: 12,
    stemMin: 20,
    stemMax: 50,
    meaning: '爱情与热情'
  },
  {
    id: 'tulip',
    name: '郁金香',
    color: '#f8c8dc',
    petalCount: 6,
    stemMin: 25,
    stemMax: 45,
    meaning: '优雅与祝福'
  },
  {
    id: 'sunflower',
    name: '向日葵',
    color: '#ffd700',
    petalCount: 20,
    stemMin: 30,
    stemMax: 55,
    meaning: '阳光与希望'
  },
  {
    id: 'lily',
    name: '百合',
    color: '#ffffff',
    petalCount: 6,
    stemMin: 28,
    stemMax: 48,
    meaning: '纯洁与高贵'
  },
  {
    id: 'lavender',
    name: '薰衣草',
    color: '#c9b1ff',
    petalCount: 15,
    stemMin: 22,
    stemMax: 42,
    meaning: '等待与浪漫'
  },
  {
    id: 'daisy',
    name: '雏菊',
    color: '#fff5e6',
    petalCount: 16,
    stemMin: 18,
    stemMax: 35,
    meaning: '纯真与快乐'
  },
  {
    id: 'carnation',
    name: '康乃馨',
    color: '#ff9aa2',
    petalCount: 14,
    stemMin: 24,
    stemMax: 46,
    meaning: '感恩与母爱'
  },
  {
    id: 'hydrangea',
    name: '绣球花',
    color: '#b2d8ff',
    petalCount: 25,
    stemMin: 26,
    stemMax: 44,
    meaning: '团聚与希望'
  },
  {
    id: 'peony',
    name: '牡丹',
    color: '#ffb6c1',
    petalCount: 30,
    stemMin: 28,
    stemMax: 50,
    meaning: '富贵与吉祥'
  },
  {
    id: 'eucalyptus',
    name: '尤加利叶',
    color: '#b2d8b2',
    petalCount: 0,
    stemMin: 20,
    stemMax: 40,
    meaning: '清新与自然'
  }
]

export const vaseTypes: { id: VaseType; name: string }[] = [
  { id: 'round', name: '圆肚瓶' },
  { id: 'square', name: '方口瓶' },
  { id: 'long', name: '长颈瓶' }
]

export const getFlowerById = (id: string): FlowerItem | undefined => {
  return flowerCatalog.find(f => f.id === id)
}
