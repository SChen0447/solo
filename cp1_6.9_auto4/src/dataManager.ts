export interface CosmicEvent {
  id: number;
  name: string;
  era: number;
  eraLabel: string;
  position: { x: number; y: number; z: number };
  color: string;
  description: string;
  particleCount: number;
  importance: number;
}

const EVENT_COLORS = [
  '#FF4500',
  '#FF5722',
  '#FF7043',
  '#FF8A65',
  '#FFA07A',
  '#CD853F',
  '#9370DB',
  '#8A2BE2',
  '#7B68EE',
  '#6495ED',
  '#4169E1',
  '#1E90FF',
  '#00BFFF',
  '#87CEEB',
  '#00BFFF'
];

const NODE_DISTANCE = 3;
const S_AMPLITUDE = 4;

function calculateSCurvePosition(index: number, total: number): { x: number; y: number; z: number } {
  const z = index * NODE_DISTANCE - ((total - 1) * NODE_DISTANCE) / 2;
  const t = index / (total - 1);
  const x = Math.sin(t * Math.PI * 2) * S_AMPLITUDE;
  const y = Math.sin(t * Math.PI) * 2 - 1;
  return { x, y, z };
}

function interpolateColor(start: string, end: string, t: number): string {
  const r1 = parseInt(start.slice(1, 3), 16);
  const g1 = parseInt(start.slice(3, 5), 16);
  const b1 = parseInt(start.slice(5, 7), 16);
  const r2 = parseInt(end.slice(1, 3), 16);
  const g2 = parseInt(end.slice(3, 5), 16);
  const b2 = parseInt(end.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const EVENTS_DATA = [
  {
    name: '宇宙大爆炸',
    era: 138,
    eraLabel: '138 亿年前',
    description: '宇宙从一个密度无限大、温度无限高的奇点爆发，时间和空间由此诞生。在最初的几秒钟内，基本粒子和四种基本力逐渐形成。',
    importance: 2.0
  },
  {
    name: '暴胀时期',
    era: 137.99999,
    eraLabel: '138 亿年前（大爆炸后 10⁻³⁵ 秒）',
    description: '宇宙经历了指数级的极速膨胀，时空以超过光速的速度扩张，为后来的大规模结构播下了量子涨落的种子。',
    importance: 1.8
  },
  {
    name: '原初核合成',
    era: 137.999,
    eraLabel: '138 亿年前（大爆炸后 3 分钟）',
    description: '宇宙冷却到足以让质子和中子结合形成轻元素，约 75% 的氢和 25% 的氦在此阶段合成，还有微量的锂和铍。',
    importance: 1.5
  },
  {
    name: '宇宙微波背景辐射',
    era: 137,
    eraLabel: '137 亿年前（大爆炸后 38 万年）',
    description: '电子与原子核结合形成中性原子，光子首次自由传播，形成了今天可观测到的 2.7K 微波背景辐射。',
    importance: 1.7
  },
  {
    name: '黑暗时代',
    era: 135,
    eraLabel: '135 亿年前',
    description: '宇宙进入漫长的黑暗时代，没有任何恒星发光。物质在引力作用下缓慢聚集，为第一代恒星的诞生做准备。',
    importance: 1.2
  },
  {
    name: '再电离与第一代恒星',
    era: 132,
    eraLabel: '132 亿年前',
    description: '第一代大质量恒星（第三星族星）诞生，它们发出的强烈紫外线将宇宙中的中性氢重新电离，宇宙重见光明。',
    importance: 1.8
  },
  {
    name: '第一代星系形成',
    era: 128,
    eraLabel: '128 亿年前',
    description: '在暗物质引力的牵引下，气体云坍缩形成了宇宙中第一批星系，小星系随后通过合并逐渐成长为大星系。',
    importance: 1.7
  },
  {
    name: '类星体纪元',
    era: 120,
    eraLabel: '120 亿年前',
    description: '超大质量黑洞在年轻星系中心快速吸积物质，释放出极其强烈的辐射，形成宇宙中最明亮的天体——类星体。',
    importance: 1.4
  },
  {
    name: '银河系形成',
    era: 110,
    eraLabel: '110 亿年前',
    description: '我们的银河系通过一系列的小星系合并逐渐形成，银晕、银盘和银核的结构逐步确立，球状星团在此期间形成。',
    importance: 1.6
  },
  {
    name: '恒星形成峰值',
    era: 100,
    eraLabel: '100 亿年前',
    description: '宇宙进入恒星形成的黄金时代，恒星诞生速率约为今天的 10 倍，大量的恒星和行星系统在此时期诞生。',
    importance: 1.5
  },
  {
    name: '太阳系诞生',
    era: 46,
    eraLabel: '46 亿年前',
    description: '一团分子云在邻近超新星的冲击波触发下坍缩，中心形成太阳，周围的原行星盘逐渐凝聚出八大行星和小天体。',
    importance: 1.9
  },
  {
    name: '地球形成与月球起源',
    era: 45,
    eraLabel: '45 亿年前',
    description: '原始地球通过吸积形成，随后一颗火星大小的天体撞击地球，飞溅的物质在轨道上凝聚形成月球，地球获得了稳定的自转轴。',
    importance: 1.7
  },
  {
    name: '生命起源',
    era: 38,
    eraLabel: '38 亿年前',
    description: '地球冷却后，原始海洋中的化学物质在闪电和火山活动的能量驱动下，逐渐形成了能自我复制的有机分子，生命由此诞生。',
    importance: 1.8
  },
  {
    name: '大氧化事件',
    era: 24,
    eraLabel: '24 亿年前',
    description: '蓝藻的光合作用使大气中的游离氧含量急剧上升，改变了地球化学循环，为复杂真核生物的出现铺平了道路。',
    importance: 1.5
  },
  {
    name: '现代天文时代',
    era: 0.00000002,
    eraLabel: '公元 2024 年',
    description: '人类建立了现代天文学体系，通过地面望远镜和空间探测器探索宇宙，詹姆斯·韦布望远镜正揭示宇宙最深处的奥秘。',
    importance: 1.6
  }
];

export class DataManager {
  private events: CosmicEvent[] = [];

  constructor() {
    this.loadEvents();
  }

  private loadEvents(): void {
    const total = EVENTS_DATA.length;

    this.events = EVENTS_DATA.map((event, index) => {
      const t = index / (total - 1);
      const baseColor = EVENT_COLORS[0];
      const endColor = EVENT_COLORS[EVENT_COLORS.length - 1];
      const color = interpolateColor(baseColor, endColor, t);
      const position = calculateSCurvePosition(index, total);
      const particleCount = Math.round(100 + (138 - event.era) / 138 * 200);

      return {
        id: index,
        name: event.name,
        era: event.era,
        eraLabel: event.eraLabel,
        position,
        color,
        description: event.description,
        particleCount,
        importance: event.importance
      };
    });
  }

  getEvents(): CosmicEvent[] {
    return this.events;
  }

  getEventById(id: number): CosmicEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  getTotalTimespan(): number {
    return 138;
  }
}
