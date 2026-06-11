export interface LegoPart {
  id: string
  type: 'brick' | 'plate' | 'slope' | 'cylinder' | 'cone'
  position: [number, number, number]
  size: [number, number, number]
  color: string
  step: number
}

export interface StepData {
  step: number
  title: string
  description: string
  parts: string[]
}

const COLORS = {
  darkGray: '#3d3d3d',
  lightGray: '#8c8c8c',
  red: '#c91a1a',
  blue: '#1a54c9',
  yellow: '#f5c535',
  green: '#2e8b2e',
  brown: '#8b4513',
  tan: '#d2b48c',
  white: '#ffffff',
  black: '#1a1a1a',
  gold: '#ffd700',
}

const legoUnit = 0.8

const u = (n: number): number => n * legoUnit

export const allParts: LegoPart[] = [
  // Step 1 - 地基底板
  { id: 'base-1', type: 'plate', position: [0, 0, 0], size: [u(10), u(0.5), u(10)], color: COLORS.darkGray, step: 1 },
  { id: 'base-2', type: 'plate', position: [u(8), 0, 0], size: [u(4), u(0.5), u(10)], color: COLORS.darkGray, step: 1 },
  { id: 'base-3', type: 'plate', position: [-u(8), 0, 0], size: [u(4), u(0.5), u(10)], color: COLORS.darkGray, step: 1 },
  { id: 'base-4', type: 'plate', position: [0, 0, u(8)], size: [u(10), u(0.5), u(4)], color: COLORS.darkGray, step: 1 },
  { id: 'base-5', type: 'plate', position: [0, 0, -u(8)], size: [u(10), u(0.5), u(4)], color: COLORS.darkGray, step: 1 },

  // Step 2 - 前墙底层
  { id: 'wall-f-1', type: 'brick', position: [0, u(1), -u(8.5)], size: [u(10), u(2), u(1)], color: COLORS.lightGray, step: 2 },
  { id: 'wall-f-2', type: 'brick', position: [-u(4), u(1), -u(8.5)], size: [u(2), u(2), u(1)], color: COLORS.darkGray, step: 2 },
  { id: 'wall-f-3', type: 'brick', position: [u(4), u(1), -u(8.5)], size: [u(2), u(2), u(1)], color: COLORS.darkGray, step: 2 },

  // Step 3 - 后墙底层
  { id: 'wall-b-1', type: 'brick', position: [0, u(1), u(8.5)], size: [u(10), u(2), u(1)], color: COLORS.lightGray, step: 3 },
  { id: 'wall-b-2', type: 'brick', position: [-u(4), u(1), u(8.5)], size: [u(2), u(2), u(1)], color: COLORS.darkGray, step: 3 },
  { id: 'wall-b-3', type: 'brick', position: [u(4), u(1), u(8.5)], size: [u(2), u(2), u(1)], color: COLORS.darkGray, step: 3 },

  // Step 4 - 左墙底层
  { id: 'wall-l-1', type: 'brick', position: [-u(9), u(1), 0], size: [u(1), u(2), u(10)], color: COLORS.lightGray, step: 4 },
  { id: 'wall-l-2', type: 'brick', position: [-u(9), u(1), -u(4)], size: [u(1), u(2), u(2)], color: COLORS.darkGray, step: 4 },
  { id: 'wall-l-3', type: 'brick', position: [-u(9), u(1), u(4)], size: [u(1), u(2), u(2)], color: COLORS.darkGray, step: 4 },

  // Step 5 - 右墙底层
  { id: 'wall-r-1', type: 'brick', position: [u(9), u(1), 0], size: [u(1), u(2), u(10)], color: COLORS.lightGray, step: 5 },
  { id: 'wall-r-2', type: 'brick', position: [u(9), u(1), -u(4)], size: [u(1), u(2), u(2)], color: COLORS.darkGray, step: 5 },
  { id: 'wall-r-3', type: 'brick', position: [u(9), u(1), u(4)], size: [u(1), u(2), u(2)], color: COLORS.darkGray, step: 5 },

  // Step 6 - 第一层地板
  { id: 'floor-1', type: 'plate', position: [0, u(2.5), 0], size: [u(8), u(0.5), u(8)], color: COLORS.tan, step: 6 },

  // Step 7 - 前墙第二层（带窗户）
  { id: 'wall2-f-1', type: 'brick', position: [-u(3), u(3.5), -u(8.5)], size: [u(4), u(2), u(1)], color: COLORS.lightGray, step: 7 },
  { id: 'wall2-f-2', type: 'brick', position: [u(3), u(3.5), -u(8.5)], size: [u(4), u(2), u(1)], color: COLORS.lightGray, step: 7 },
  { id: 'wall2-f-3', type: 'brick', position: [0, u(4), -u(8.5)], size: [u(2), u(1), u(1)], color: COLORS.darkGray, step: 7 },
  { id: 'window-f', type: 'brick', position: [0, u(3.5), -u(8.5)], size: [u(2), u(1.5), u(0.5)], color: COLORS.blue, step: 7 },

  // Step 8 - 后墙第二层
  { id: 'wall2-b-1', type: 'brick', position: [0, u(3.5), u(8.5)], size: [u(10), u(2), u(1)], color: COLORS.lightGray, step: 8 },
  { id: 'wall2-b-2', type: 'brick', position: [-u(3), u(3.5), u(8.5)], size: [u(2), u(2), u(1)], color: COLORS.darkGray, step: 8 },
  { id: 'wall2-b-3', type: 'brick', position: [u(3), u(3.5), u(8.5)], size: [u(2), u(2), u(1)], color: COLORS.darkGray, step: 8 },

  // Step 9 - 左墙第二层（带门）
  { id: 'wall2-l-1', type: 'brick', position: [-u(9), u(3.5), u(3)], size: [u(1), u(2), u(4)], color: COLORS.lightGray, step: 9 },
  { id: 'wall2-l-2', type: 'brick', position: [-u(9), u(3.5), -u(3)], size: [u(1), u(2), u(4)], color: COLORS.lightGray, step: 9 },
  { id: 'wall2-l-3', type: 'brick', position: [-u(9), u(4.5), 0], size: [u(1), u(1), u(2)], color: COLORS.darkGray, step: 9 },
  { id: 'door-l', type: 'brick', position: [-u(9), u(3.5), 0], size: [u(0.5), u(2), u(2)], color: COLORS.brown, step: 9 },

  // Step 10 - 右墙第二层
  { id: 'wall2-r-1', type: 'brick', position: [u(9), u(3.5), 0], size: [u(1), u(2), u(10)], color: COLORS.lightGray, step: 10 },
  { id: 'wall2-r-2', type: 'brick', position: [u(9), u(3.5), -u(3)], size: [u(1), u(2), u(2)], color: COLORS.darkGray, step: 10 },
  { id: 'wall2-r-3', type: 'brick', position: [u(9), u(3.5), u(3)], size: [u(1), u(2), u(2)], color: COLORS.darkGray, step: 10 },

  // Step 11 - 第二层地板
  { id: 'floor-2', type: 'plate', position: [0, u(5), 0], size: [u(8), u(0.5), u(8)], color: COLORS.tan, step: 11 },

  // Step 12 - 左塔楼底层
  { id: 'tower-l-1', type: 'brick', position: [-u(9), u(6), 0], size: [u(2), u(3), u(2)], color: COLORS.darkGray, step: 12 },
  { id: 'tower-l-2', type: 'brick', position: [-u(9), u(7.5), 0], size: [u(2.4), u(0.5), u(2.4)], color: COLORS.lightGray, step: 12 },

  // Step 13 - 右塔楼底层
  { id: 'tower-r-1', type: 'brick', position: [u(9), u(6), 0], size: [u(2), u(3), u(2)], color: COLORS.darkGray, step: 13 },
  { id: 'tower-r-2', type: 'brick', position: [u(9), u(7.5), 0], size: [u(2.4), u(0.5), u(2.4)], color: COLORS.lightGray, step: 13 },

  // Step 14 - 左塔楼中层
  { id: 'tower-l-3', type: 'brick', position: [-u(9), u(9), 0], size: [u(1.6), u(2), u(1.6)], color: COLORS.lightGray, step: 14 },
  { id: 'tower-l-4', type: 'brick', position: [-u(9), u(10), 0], size: [u(2), u(0.3), u(2)], color: COLORS.darkGray, step: 14 },

  // Step 15 - 右塔楼中层
  { id: 'tower-r-3', type: 'brick', position: [u(9), u(9), 0], size: [u(1.6), u(2), u(1.6)], color: COLORS.lightGray, step: 15 },
  { id: 'tower-r-4', type: 'brick', position: [u(9), u(10), 0], size: [u(2), u(0.3), u(2)], color: COLORS.darkGray, step: 15 },

  // Step 16 - 左塔楼顶（锥形）
  { id: 'tower-l-roof', type: 'cone', position: [-u(9), u(11.5), 0], size: [u(2.5), u(3), u(2.5)], color: COLORS.red, step: 16 },

  // Step 17 - 右塔楼顶（锥形）
  { id: 'tower-r-roof', type: 'cone', position: [u(9), u(11.5), 0], size: [u(2.5), u(3), u(2.5)], color: COLORS.red, step: 17 },

  // Step 18 - 主屋顶
  { id: 'roof-main-1', type: 'slope', position: [0, u(6), 0], size: [u(10), u(2), u(10)], color: COLORS.red, step: 18 },
  { id: 'roof-main-2', type: 'brick', position: [0, u(7), 0], size: [u(6), u(0.5), u(6)], color: COLORS.darkGray, step: 18 },

  // Step 19 - 装饰 - 旗帜和炮塔
  { id: 'flag-pole-l', type: 'cylinder', position: [-u(9), u(13.5), 0], size: [u(0.2), u(2), u(0.2)], color: COLORS.darkGray, step: 19 },
  { id: 'flag-l', type: 'brick', position: [-u(8.4), u(14.2), 0], size: [u(1), u(0.6), u(0.1)], color: COLORS.yellow, step: 19 },
  { id: 'flag-pole-r', type: 'cylinder', position: [u(9), u(13.5), 0], size: [u(0.2), u(2), u(0.2)], color: COLORS.darkGray, step: 19 },
  { id: 'flag-r', type: 'brick', position: [u(9.6), u(14.2), 0], size: [u(1), u(0.6), u(0.1)], color: COLORS.yellow, step: 19 },

  // Step 20 - 完成 - 金色装饰
  { id: 'deco-gold-1', type: 'brick', position: [0, u(7.5), -u(8.5)], size: [u(1), u(0.5), u(0.5)], color: COLORS.gold, step: 20 },
  { id: 'deco-gold-2', type: 'brick', position: [0, u(7.5), u(8.5)], size: [u(1), u(0.5), u(0.5)], color: COLORS.gold, step: 20 },
  { id: 'deco-gold-3', type: 'cylinder', position: [0, u(8), 0], size: [u(0.5), u(1.5), u(0.5)], color: COLORS.gold, step: 20 },
]

export const steps: StepData[] = [
  {
    step: 1,
    title: '搭建地基',
    description: '铺设城堡的基础底板，为后续建筑提供稳固的平台。',
    parts: allParts.filter(p => p.step === 1).map(p => p.id),
  },
  {
    step: 2,
    title: '前墙底层',
    description: '安装城堡正面墙壁的第一层砖块，注意灰色砖块的点缀。',
    parts: allParts.filter(p => p.step === 2).map(p => p.id),
  },
  {
    step: 3,
    title: '后墙底层',
    description: '建造背面墙壁，与前墙对称，保持整体结构平衡。',
    parts: allParts.filter(p => p.step === 3).map(p => p.id),
  },
  {
    step: 4,
    title: '左墙底层',
    description: '搭建左侧墙壁，为后续安装城门做准备。',
    parts: allParts.filter(p => p.step === 4).map(p => p.id),
  },
  {
    step: 5,
    title: '右墙底层',
    description: '完成右侧墙壁，第一层墙体结构全部就位。',
    parts: allParts.filter(p => p.step === 5).map(p => p.id),
  },
  {
    step: 6,
    title: '第一层地板',
    description: '铺设第一层室内地板，使用米色板材营造温馨氛围。',
    parts: allParts.filter(p => p.step === 6).map(p => p.id),
  },
  {
    step: 7,
    title: '前墙第二层',
    description: '建造二楼前墙，安装蓝色玻璃窗，增加采光效果。',
    parts: allParts.filter(p => p.step === 7).map(p => p.id),
  },
  {
    step: 8,
    title: '后墙第二层',
    description: '完成后墙第二层，深灰色装饰砖增添层次感。',
    parts: allParts.filter(p => p.step === 8).map(p => p.id),
  },
  {
    step: 9,
    title: '左墙第二层',
    description: '在左墙安装木质城门，这是城堡的主要入口。',
    parts: allParts.filter(p => p.step === 9).map(p => p.id),
  },
  {
    step: 10,
    title: '右墙第二层',
    description: '完成右侧第二层墙壁，整体结构愈发完整。',
    parts: allParts.filter(p => p.step === 10).map(p => p.id),
  },
  {
    step: 11,
    title: '第二层地板',
    description: '铺设二楼地板，城堡的主体结构基本成型。',
    parts: allParts.filter(p => p.step === 11).map(p => p.id),
  },
  {
    step: 12,
    title: '左塔楼底层',
    description: '开始建造左侧防御塔楼，增强城堡的防御能力。',
    parts: allParts.filter(p => p.step === 12).map(p => p.id),
  },
  {
    step: 13,
    title: '右塔楼底层',
    description: '对称建造右侧塔楼，保持建筑的视觉平衡。',
    parts: allParts.filter(p => p.step === 13).map(p => p.id),
  },
  {
    step: 14,
    title: '左塔楼中层',
    description: '继续向上搭建左塔楼，添加城垛装饰。',
    parts: allParts.filter(p => p.step === 14).map(p => p.id),
  },
  {
    step: 15,
    title: '右塔楼中层',
    description: '完成右塔楼中层结构，塔楼雏形显现。',
    parts: allParts.filter(p => p.step === 15).map(p => p.id),
  },
  {
    step: 16,
    title: '左塔楼顶',
    description: '为左塔楼安装红色锥形屋顶，经典的城堡造型。',
    parts: allParts.filter(p => p.step === 16).map(p => p.id),
  },
  {
    step: 17,
    title: '右塔楼顶',
    description: '右塔楼封顶，双塔对峙的格局形成。',
    parts: allParts.filter(p => p.step === 17).map(p => p.id),
  },
  {
    step: 18,
    title: '主屋顶',
    description: '安装城堡主体的红色坡屋顶，气势恢宏。',
    parts: allParts.filter(p => p.step === 18).map(p => p.id),
  },
  {
    step: 19,
    title: '塔楼旗帜',
    description: '在塔楼顶升起黄色旗帜，标志着城堡的归属。',
    parts: allParts.filter(p => p.step === 19).map(p => p.id),
  },
  {
    step: 20,
    title: '金色装饰',
    description: '添加金色装饰细节，完成整座城堡的建造！',
    parts: allParts.filter(p => p.step === 20).map(p => p.id),
  },
]

export const totalSteps = steps.length
