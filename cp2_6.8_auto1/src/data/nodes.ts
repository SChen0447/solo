import type { MapNode } from '@/types/game'

export const mapNodes: MapNode[] = [
  { id: 0, type: 'start', x: 10, y: 50, name: '起点村庄', connectedTo: [1] },
  { id: 1, type: 'forest', x: 22, y: 35, name: '幽暗森林', connectedTo: [0, 2, 3] },
  { id: 2, type: 'treasure', x: 35, y: 20, name: '神秘宝箱', connectedTo: [1, 4] },
  { id: 3, type: 'monster', x: 30, y: 55, name: '哥布林营地', connectedTo: [1, 5] },
  { id: 4, type: 'town', x: 50, y: 15, name: '边境小镇', connectedTo: [2, 6, 7] },
  { id: 5, type: 'treasure', x: 45, y: 65, name: '古老墓穴', connectedTo: [3, 8] },
  { id: 6, type: 'mountain', x: 62, y: 30, name: '险峻山峰', connectedTo: [4, 9] },
  { id: 7, type: 'monster', x: 65, y: 50, name: '强盗巢穴', connectedTo: [4, 8, 10] },
  { id: 8, type: 'forest', x: 58, y: 70, name: '迷雾沼泽', connectedTo: [5, 7, 11] },
  { id: 9, type: 'treasure', x: 78, y: 22, name: '龙穴宝藏', connectedTo: [6, 12] },
  { id: 10, type: 'town', x: 80, y: 45, name: '王都外围', connectedTo: [7, 12, 13] },
  { id: 11, type: 'monster', x: 75, y: 75, name: '亡灵墓地', connectedTo: [8, 14] },
  { id: 12, type: 'treasure', x: 92, y: 30, name: '皇家宝库', connectedTo: [9, 10, 15] },
  { id: 13, type: 'rest', x: 90, y: 55, name: '冒险者旅馆', connectedTo: [10, 15] },
  { id: 14, type: 'boss', x: 88, y: 80, name: '黑暗魔王', connectedTo: [11, 15] },
  { id: 15, type: 'boss', x: 98, y: 50, name: '最终之塔', connectedTo: [12, 13, 14] }
]

export const nodeColors: Record<string, string> = {
  start: '#c9a227',
  town: '#4a9eff',
  monster: '#8b2635',
  treasure: '#ffd700',
  forest: '#1a3a2a',
  mountain: '#6b5b4f',
  boss: '#8b0000',
  rest: '#9370db'
}
