export type Category = 'nature' | 'architecture' | 'technology'

export interface CardData {
  id: number
  imageUrl: string
  title: string
  backDescription: string
  colorTheme: string
  category: Category
}

export const cards: CardData[] = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    title: '雪山之巅',
    backDescription: '巍峨的雪山直插云霄，洁白的峰顶在阳光下闪耀着神圣的光芒。这是大自然最壮丽的杰作，每一道山脊都诉说着亿万年的沧桑变迁。',
    colorTheme: '#87CEEB',
    category: 'nature',
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80',
    title: '静谧森林',
    backDescription: '阳光透过层层叠叠的树叶，在地面上投下斑驳的光影。微风拂过，树叶沙沙作响，仿佛在低语着森林的古老秘密。',
    colorTheme: '#228B22',
    category: 'nature',
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    title: '碧海蓝天',
    backDescription: '一望无际的蔚蓝海面与天空相连，金色的沙滩上浪花轻轻拍打着岸边。这一刻，时间仿佛静止，心灵得到了最深的宁静。',
    colorTheme: '#00CED1',
    category: 'nature',
  },
  {
    id: 4,
    imageUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=600&q=80',
    title: '金色日出',
    backDescription: '朝阳从地平线缓缓升起，将整片天空染成温暖的橙红色。新的一天开始了，万物都在这光芒中苏醒，充满希望与可能。',
    colorTheme: '#FF8C00',
    category: 'nature',
  },
  {
    id: 5,
    imageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
    title: '都市天际线',
    backDescription: '现代摩天大楼拔地而起，玻璃幕墙在阳光下闪烁着未来的光芒。城市的脉搏在这里跳动，每一栋建筑都是人类智慧的结晶。',
    colorTheme: '#708090',
    category: 'architecture',
  },
  {
    id: 6,
    imageUrl: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=600&q=80',
    title: '古典拱廊',
    backDescription: '精美的石柱与拱形回廊诉说着历史的辉煌。每一块砖石都经过精心雕琢，展现着古典建筑艺术的永恒魅力。',
    colorTheme: '#DEB887',
    category: 'architecture',
  },
  {
    id: 7,
    imageUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&q=80',
    title: '几何之美',
    backDescription: '简洁的线条与完美的几何形态，构成了这幅现代建筑的抽象画面。光影在墙面流动，创造出不断变化的视觉韵律。',
    colorTheme: '#D3D3D3',
    category: 'architecture',
  },
  {
    id: 8,
    imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
    title: '夜色阑珊',
    backDescription: '夜幕降临，城市灯火通明。高楼大厦的霓虹灯光交织成一片璀璨的星海，展现着都市夜晚的繁华与活力。',
    colorTheme: '#4B0082',
    category: 'architecture',
  },
  {
    id: 9,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
    title: '科技核心',
    backDescription: '精密的电路板上，无数电子元件以惊人的速度传递着信息。这是现代科技的心脏，每一个脉冲都推动着世界向前发展。',
    colorTheme: '#00FF7F',
    category: 'technology',
  },
  {
    id: 10,
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80',
    title: '数字矩阵',
    backDescription: '流动的代码与数据构成了数字世界的基础设施。在这个虚拟的空间里，信息以光速穿梭，连接着全球每一个角落。',
    colorTheme: '#00BFFF',
    category: 'technology',
  },
  {
    id: 11,
    imageUrl: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80',
    title: '虚拟现实',
    backDescription: 'VR技术将我们带入全新的数字世界，突破物理界限，体验前所未有的沉浸感。未来已来，想象不再有边界。',
    colorTheme: '#9370DB',
    category: 'technology',
  },
  {
    id: 12,
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80',
    title: '智能未来',
    backDescription: '人工智能正在重塑我们的生活方式，从智能家居到自动驾驶，机器学习的算法正在让机器变得越来越聪明，越来越懂我们。',
    colorTheme: '#FF69B4',
    category: 'technology',
  },
]
