export type Habitat = '浅海' | '深海热泉' | '极地冰洋' | '深渊平原';

export interface BioData {
  id: number;
  name: string;
  scientificName: string;
  depthRange: [number, number];
  description: string;
  habitat: Habitat;
  classification: string[];
  color: string;
  emoji: string;
  frames: string[];
}

const shallowSeaCreatures: Omit<BioData, 'id'>[] = [
  {
    name: '蓝鲸',
    scientificName: 'Balaenoptera musculus',
    depthRange: [0, 200],
    description: '蓝鲸是地球上现存最大的动物，体长可达33米，体重超过180吨。它们以小型甲壳类动物磷虾为主要食物，通过滤食方式进食。',
    habitat: '浅海',
    classification: ['动物界', '脊索动物门', '哺乳纲', '偶蹄目', '须鲸科'],
    color: 'linear-gradient(135deg, #4a90d9, #1e5fa8)',
    emoji: '🐋',
    frames: ['🐋', '🌊', '💨', '🐋']
  },
  {
    name: '海豚',
    scientificName: 'Delphinidae',
    depthRange: [0, 300],
    description: '海豚是高度智能的海洋哺乳动物，具有复杂的社会结构和出色的回声定位能力。它们常以群体形式活动，展现出非凡的协作狩猎技巧。',
    habitat: '浅海',
    classification: ['动物界', '脊索动物门', '哺乳纲', '偶蹄目', '海豚科'],
    color: 'linear-gradient(135deg, #6bb5e0, #2a7ab0)',
    emoji: '🐬',
    frames: ['🐬', '💦', '🐬', '✨']
  },
  {
    name: '海月水母',
    scientificName: 'Aurelia aurita',
    depthRange: [0, 100],
    description: '海月水母是最常见的水母种类之一，具有透明的伞状身体和四条马蹄形的生殖腺。它们通过脉动式运动在水中漂流。',
    habitat: '浅海',
    classification: ['动物界', '刺胞动物门', '钵水母纲', '旗口水母目', '羊须水母科'],
    color: 'linear-gradient(135deg, #e0f7ff, #a8d8ea)',
    emoji: '🎐',
    frames: ['🎐', '💫', '🎐', '🌊']
  },
  {
    name: '小丑鱼',
    scientificName: 'Amphiprioninae',
    depthRange: [1, 50],
    description: '小丑鱼因鲜艳的橙白相间条纹而闻名，与海葵形成互利共生关系。它们是少数能在海葵有毒触手中生存的鱼类。',
    habitat: '浅海',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '鲈形目', '雀鲷科'],
    color: 'linear-gradient(135deg, #ff8c42, #ff5e3a)',
    emoji: '🐠',
    frames: ['🐠', '🪸', '🐠', '💛']
  },
  {
    name: '海龟',
    scientificName: 'Chelonioidea',
    depthRange: [0, 1200],
    description: '海龟是古老的海洋爬行动物，已在地球上存在超过1亿年。它们具有出色的导航能力，能跨越数千公里返回出生地产卵。',
    habitat: '浅海',
    classification: ['动物界', '脊索动物门', '爬行纲', '龟鳖目', '海龟总科'],
    color: 'linear-gradient(135deg, #7cb342, #33691e)',
    emoji: '🐢',
    frames: ['🐢', '🌿', '🐢', '💚']
  },
  {
    name: '章鱼',
    scientificName: 'Octopoda',
    depthRange: [0, 4000],
    description: '章鱼是无脊椎动物中智力最高的代表，具有三颗心脏、蓝色血液和极强的变色伪装能力。它们能使用工具并展现出复杂的学习行为。',
    habitat: '浅海',
    classification: ['动物界', '软体动物门', '头足纲', '八腕目'],
    color: 'linear-gradient(135deg, #c25c94, #6a1b9a)',
    emoji: '🐙',
    frames: ['🐙', '💜', '🐙', '🌀']
  },
  {
    name: '海马',
    scientificName: 'Hippocampus',
    depthRange: [1, 60],
    description: '海马是唯一由雄性怀孕的动物物种，它们没有胃，食物快速通过消化系统。独特的直立游泳姿态使其成为浅海珊瑚礁的标志性居民。',
    habitat: '浅海',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '海龙目', '海龙科'],
    color: 'linear-gradient(135deg, #f4d03f, #c9a227)',
    emoji: '🐴',
    frames: ['🐴', '🌊', '🐴', '💛']
  },
  {
    name: '蝠鲼',
    scientificName: 'Mobulidae',
    depthRange: [0, 1000],
    description: '蝠鲼以其优雅的"飞行"姿态著称，翼展可达9米。它们拥有所有鱼类中最大的脑体比，展现出非凡的好奇心和社交行为。',
    habitat: '浅海',
    classification: ['动物界', '脊索动物门', '软骨鱼纲', '鲼目', '鲼科'],
    color: 'linear-gradient(135deg, #5c6bc0, #283593)',
    emoji: '🦈',
    frames: ['🦈', '💙', '🦈', '✨']
  }
];

const hydrothermalVentCreatures: Omit<BioData, 'id'>[] = [
  {
    name: '庞贝蠕虫',
    scientificName: 'Alvinella pompejana',
    depthRange: [2500, 3000],
    description: '庞贝蠕虫是地球上最耐热的多细胞动物之一，能在高达80°C的热泉口附近生存。它们在热泉烟囱壁上建造管状巢穴。',
    habitat: '深海热泉',
    classification: ['动物界', '环节动物门', '多毛纲', '缨鳃虫目', '阿尔文虫科'],
    color: 'linear-gradient(135deg, #ff5722, #bf360c)',
    emoji: '🔥',
    frames: ['🔥', '🌋', '🔥', '💥']
  },
  {
    name: '深海管蠕虫',
    scientificName: 'Riftia pachyptila',
    depthRange: [1500, 3200],
    description: '深海管蠕虫没有口和消化系统，完全依赖体内共生的化能合成细菌提供营养。它们的羽毛状鳃用于吸收硫化氢和氧气。',
    habitat: '深海热泉',
    classification: ['动物界', '环节动物门', '须腕动物纲', '西伯加虫目', '管须虫科'],
    color: 'linear-gradient(135deg, #e91e63, #880e4f)',
    emoji: '🌸',
    frames: ['🌸', '🔥', '🌸', '💗']
  },
  {
    name: '白化盲蟹',
    scientificName: 'Bythograea thermydron',
    depthRange: [2000, 3000],
    description: '白化盲蟹是深海热泉生态系统的顶级捕食者，完全失去了视力但拥有敏锐的化学感受器。它们以管蠕虫和贻贝为食。',
    habitat: '深海热泉',
    classification: ['动物界', '节肢动物门', '软甲纲', '十足目', '深泉蟹科'],
    color: 'linear-gradient(135deg, #e0e0e0, #9e9e9e)',
    emoji: '🦀',
    frames: ['🦀', '🔥', '🦀', '⚪']
  },
  {
    name: '热泉贻贝',
    scientificName: 'Bathymodiolus thermophilus',
    depthRange: [1700, 3200],
    description: '热泉贻贝鳃内含有大量共生细菌，能将硫化氢转化为有机物质。它们形成密集的贻贝床，是热泉生态的关键物种。',
    habitat: '深海热泉',
    classification: ['动物界', '软体动物门', '双壳纲', '贻贝目', '贻贝科'],
    color: 'linear-gradient(135deg, #795548, #3e2723)',
    emoji: '🐚',
    frames: ['🐚', '🔥', '🐚', '🧡']
  },
  {
    name: '雪人蟹',
    scientificName: 'Kiwa hirsuta',
    depthRange: [2200, 2400],
    description: '雪人蟹因全身覆盖丝状细菌的绒毛而得名，这些细菌可能帮助它们解毒或获取营养。它们是2005年才被发现的新物种。',
    habitat: '深海热泉',
    classification: ['动物界', '节肢动物门', '软甲纲', '十足目', '雪人蟹科'],
    color: 'linear-gradient(135deg, #ffe082, #ff8f00)',
    emoji: '🦐',
    frames: ['🦐', '❄️', '🦐', '💛']
  },
  {
    name: '热泉虾',
    scientificName: 'Rimicaris exoculata',
    depthRange: [2300, 3600],
    description: '热泉虾背部拥有独特的感光器官，能感知热泉微弱的红外辐射，帮助它们在黑暗中找到适宜的温度区域。',
    habitat: '深海热泉',
    classification: ['动物界', '节肢动物门', '软甲纲', '十足目', '藻虾科'],
    color: 'linear-gradient(135deg, #ff9800, #e65100)',
    emoji: '🦐',
    frames: ['🦐', '🔥', '🦐', '🌟']
  },
  {
    name: '烟囱海绵',
    scientificName: 'Chaetetella',
    depthRange: [1800, 3000],
    description: '烟囱海绵在热泉烟囱上生长，其硅质骨骼形成复杂的过滤系统。它们是深海中最古老的动物生命形式之一。',
    habitat: '深海热泉',
    classification: ['动物界', '多孔动物门', '寻常海绵纲'],
    color: 'linear-gradient(135deg, #607d8b, #263238)',
    emoji: '🪸',
    frames: ['🪸', '🔥', '🪸', '💨']
  },
  {
    name: '热泉蜗牛',
    scientificName: 'Chrysomallon squamiferum',
    depthRange: [2400, 2800],
    description: '鳞脚蜗牛拥有独特的铁质外壳和鳞片足，是已知唯一将硫化铁整合进外骨骼的动物，被称为"铁甲战士"。',
    habitat: '深海热泉',
    classification: ['动物界', '软体动物门', '腹足纲', '新腹足目', '平轴螺科'],
    color: 'linear-gradient(135deg, #424242, #212121)',
    emoji: '🐌',
    frames: ['🐌', '⚔️', '🐌', '🛡️']
  }
];

const polarOceanCreatures: Omit<BioData, 'id'>[] = [
  {
    name: '帝企鹅',
    scientificName: 'Aptenodytes forsteri',
    depthRange: [0, 565],
    description: '帝企鹅是最大的企鹅种类，能在南极-60°C的极寒环境中生存。它们在冬季进行最长可达3个月的禁食孵卵。',
    habitat: '极地冰洋',
    classification: ['动物界', '脊索动物门', '鸟纲', '企鹅目', '企鹅科'],
    color: 'linear-gradient(135deg, #fafafa, #424242)',
    emoji: '🐧',
    frames: ['🐧', '❄️', '🐧', '💙']
  },
  {
    name: '独角鲸',
    scientificName: 'Monodon monoceros',
    depthRange: [0, 1500],
    description: '独角鲸因雄性头部伸出的长牙而闻名，这根长牙实际上是经过特化的牙齿，长度可达3米，用于感知环境和社交展示。',
    habitat: '极地冰洋',
    classification: ['动物界', '脊索动物门', '哺乳纲', '偶蹄目', '一角鲸科'],
    color: 'linear-gradient(135deg, #90caf9, #1565c0)',
    emoji: '🦄',
    frames: ['🦄', '❄️', '🦄', '💠']
  },
  {
    name: '北极鳕鱼',
    scientificName: 'Boreogadus saida',
    depthRange: [0, 900],
    description: '北极鳕是北极生态系统的关键物种，血液中含有抗冻蛋白使其能在-2°C的冰水中生存。它们是众多捕食者的主要食物来源。',
    habitat: '极地冰洋',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '鳕形目', '鳕科'],
    color: 'linear-gradient(135deg, #b3e5fc, #0288d1)',
    emoji: '🐟',
    frames: ['🐟', '❄️', '🐟', '💎']
  },
  {
    name: '南极磷虾',
    scientificName: 'Euphausia superba',
    depthRange: [0, 4000],
    description: '南极磷虾是地球上生物量最大的单一物种之一，总重量估计超过5亿吨。它们是南极食物链的基础，支撑着鲸类、海豹和海鸟。',
    habitat: '极地冰洋',
    classification: ['动物界', '节肢动物门', '软甲纲', '磷虾目', '磷虾科'],
    color: 'linear-gradient(135deg, #ff8a80, #d50000)',
    emoji: '🦐',
    frames: ['🦐', '❄️', '🦐', '❤️']
  },
  {
    name: '格陵兰鲨',
    scientificName: 'Somniosus microcephalus',
    depthRange: [0, 2200],
    description: '格陵兰鲨是地球上最长寿的脊椎动物，寿命可达400年以上。它们以极慢的速度在寒冷深海中游弋，是顶级掠食者。',
    habitat: '极地冰洋',
    classification: ['动物界', '脊索动物门', '软骨鱼纲', '角鲨目', '睡鲨科'],
    color: 'linear-gradient(135deg, #78909c, #37474f)',
    emoji: '🦈',
    frames: ['🦈', '❄️', '🦈', '⏳']
  },
  {
    name: '白鲸',
    scientificName: 'Delphinapterus leucas',
    depthRange: [0, 800],
    description: '白鲸以其丰富的"歌声"闻名，能发出数百种不同的声音用于交流和回声定位。它们的额隆可以灵活改变形状以调制声音。',
    habitat: '极地冰洋',
    classification: ['动物界', '脊索动物门', '哺乳纲', '偶蹄目', '一角鲸科'],
    color: 'linear-gradient(135deg, #ffffff, #cfd8dc)',
    emoji: '🐋',
    frames: ['🐋', '🎵', '🐋', '❄️']
  },
  {
    name: '冰鱼',
    scientificName: 'Channichthyidae',
    depthRange: [0, 1000],
    description: '冰鱼是唯一没有红细胞和血红蛋白的脊椎动物，血液呈半透明白色。它们直接利用溶解在血液中的氧气，适应极寒水域。',
    habitat: '极地冰洋',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '鲈形目', '冰鱼科'],
    color: 'linear-gradient(135deg, #e1f5fe, #81d4fa)',
    emoji: '🐟',
    frames: ['🐟', '🧊', '🐟', '❄️']
  }
];

const abyssalPlainCreatures: Omit<BioData, 'id'>[] = [
  {
    name: '深海鮟鱇',
    scientificName: 'Melanocetus johnsonii',
    depthRange: [1000, 4500],
    description: '深海鮟鱇雌性头顶悬挂着发光诱饵，用于在漆黑的深海中吸引猎物。雄性比小数十倍，永久附着在雌性身上进行寄生繁殖。',
    habitat: '深渊平原',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '鮟鱇目', '黑角鮟鱇科'],
    color: 'linear-gradient(135deg, #212121, #000000)',
    emoji: '💡',
    frames: ['💡', '✨', '💡', '🖤']
  },
  {
    name: '巨型等足虫',
    scientificName: 'Bathynomus giganteus',
    depthRange: [170, 2140],
    description: '巨型等足虫是深海的"清道夫"，与潮虫是近亲但体型大百倍。它们拥有极强的耐饥饿能力，曾在水族馆中绝食5年。',
    habitat: '深渊平原',
    classification: ['动物界', '节肢动物门', '软甲纲', '等足目', '漂水虱科'],
    color: 'linear-gradient(135deg, #5d4037, #3e2723)',
    emoji: '🪲',
    frames: ['🪲', '🌑', '🪲', '💀']
  },
  {
    name: '水滴鱼',
    scientificName: 'Psychrolutes marcidus',
    depthRange: [600, 1200],
    description: '水滴鱼缺乏肌肉和骨骼，身体呈凝胶状以适应深海高压。在水面时因减压而呈现"悲伤"表情，被称为"世界上最丑的鱼"。',
    habitat: '深渊平原',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '鲉形目', '隐棘杜父鱼科'],
    color: 'linear-gradient(135deg, #ffccbc, #d7ccc8)',
    emoji: '😢',
    frames: ['😢', '💧', '😢', '🌊']
  },
  {
    name: '玻璃章鱼',
    scientificName: 'Vitreledonella richardi',
    depthRange: [300, 1000],
    description: '玻璃章鱼全身几乎完全透明，只有消化系统、眼睛和神经节不透明。这种透明度是它们在弱光层中生存的完美伪装策略。',
    habitat: '深渊平原',
    classification: ['动物界', '软体动物门', '头足纲', '八腕目', '玻璃章鱼科'],
    color: 'linear-gradient(135deg, #e3f2fd, #90caf9)',
    emoji: '🔮',
    frames: ['🔮', '💎', '🔮', '✨']
  },
  {
    name: '吸血鬼乌贼',
    scientificName: 'Vampyroteuthis infernalis',
    depthRange: [600, 900],
    description: '吸血鬼乌贼是古老的活化石，兼具章鱼和乌贼的特征。遇到威胁时能将带刺的触手翻转包裹身体，形成"菠萝"防御姿态。',
    habitat: '深渊平原',
    classification: ['动物界', '软体动物门', '头足纲', '幽灵蛸目', '吸血鬼乌贼科'],
    color: 'linear-gradient(135deg, #4a148c, #311b92)',
    emoji: '🦑',
    frames: ['🦑', '🩸', '🦑', '🌑']
  },
  {
    name: '深海蜥鱼',
    scientificName: 'Bathysaurus ferox',
    depthRange: [600, 3500],
    description: '深海蜥鱼是潜伏在海底的伏击掠食者，拥有尖锐的牙齿和灵活的身体。它们同时具有雌雄两性生殖器官，是罕见的深海雌雄同体鱼类。',
    habitat: '深渊平原',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '仙女鱼目', '深海狗母鱼科'],
    color: 'linear-gradient(135deg, #37474f, #102027)',
    emoji: '🦎',
    frames: ['🦎', '🖤', '🦎', '⚡']
  },
  {
    name: '桶眼鱼',
    scientificName: 'Macropinna microstoma',
    depthRange: [600, 800],
    description: '桶眼鱼拥有完全透明的头部和管状眼睛，眼睛能旋转向上看以寻找上方猎物。这种结构是2004年才被完整观察到的。',
    habitat: '深渊平原',
    classification: ['动物界', '脊索动物门', '硬骨鱼纲', '水珍鱼目', '后肛鱼科'],
    color: 'linear-gradient(135deg, #80deea, #00838f)',
    emoji: '👀',
    frames: ['👀', '💚', '👀', '🔍']
  }
];

const allCreatures: Omit<BioData, 'id'>[] = [
  ...shallowSeaCreatures,
  ...hydrothermalVentCreatures,
  ...polarOceanCreatures,
  ...abyssalPlainCreatures
];

export const bioDatabase: BioData[] = allCreatures.map((creature, index) => ({
  ...creature,
  id: index + 1
}));

export const habitats: Habitat[] = ['浅海', '深海热泉', '极地冰洋', '深渊平原'];

export const habitatColors: Record<Habitat, string> = {
  '浅海': 'linear-gradient(135deg, #0288d1, #4fc3f7)',
  '深海热泉': 'linear-gradient(135deg, #e64a19, #ff7043)',
  '极地冰洋': 'linear-gradient(135deg, #4fc3f7, #e1f5fe)',
  '深渊平原': 'linear-gradient(135deg, #1a237e, #3949ab)'
};
