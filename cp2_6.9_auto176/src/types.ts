export interface ScentDescriptor {
  id: string;
  name: string;
}

export interface ScentSubCategory {
  id: string;
  name: string;
  descriptors: ScentDescriptor[];
}

export interface ScentCategory {
  id: string;
  name: string;
  color: string;
  subCategories: ScentSubCategory[];
}

export interface ScentRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  descriptorId: string;
  descriptorName: string;
  color: string;
  timestamp: number;
  note?: string;
  imageDataUrl?: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  floral: '#E91E63',
  fruity: '#FF9800',
  woody: '#795548',
  herbal: '#4CAF50',
  spicy: '#F44336',
  resin: '#9C27B0'
};

export const PARTICLE_PALETTE: string[] = [
  '#F4D03F',
  '#E74C3C',
  '#E91E63',
  '#9C27B0',
  '#3498DB',
  '#2ECC71',
  '#FF9800',
  '#1ABC9C'
];

export const SCENT_CATEGORIES: ScentCategory[] = [
  {
    id: 'floral',
    name: '花香',
    color: CATEGORY_COLORS.floral,
    subCategories: [
      {
        id: 'rose',
        name: '玫瑰',
        descriptors: [
          { id: 'sweet', name: '甜美' },
          { id: 'rich', name: '浓郁' },
          { id: 'elegant', name: '优雅' },
          { id: 'thorny', name: '带刺' }
        ]
      },
      {
        id: 'jasmine',
        name: '茉莉',
        descriptors: [
          { id: 'fresh', name: '清新' },
          { id: 'intoxicating', name: '醉人' },
          { id: 'delicate', name: '细腻' },
          { id: 'warm', name: '温暖' }
        ]
      },
      {
        id: 'lavender',
        name: '薰衣草',
        descriptors: [
          { id: 'calming', name: '舒缓' },
          { id: 'clean', name: '洁净' },
          { id: 'herbal', name: '草本' },
          { id: 'soft', name: '柔和' }
        ]
      },
      {
        id: 'osmanthus',
        name: '桂花',
        descriptors: [
          { id: 'honey', name: '蜜甜' },
          { id: 'autumn', name: '秋意' },
          { id: 'mellow', name: '醇厚' },
          { id: 'lingering', name: '悠长' }
        ]
      }
    ]
  },
  {
    id: 'fruity',
    name: '果香',
    color: CATEGORY_COLORS.fruity,
    subCategories: [
      {
        id: 'apple',
        name: '苹果',
        descriptors: [
          { id: 'crisp', name: '清脆' },
          { id: 'juicy', name: '多汁' },
          { id: 'tart', name: '微酸' },
          { id: 'ripe', name: '成熟' }
        ]
      },
      {
        id: 'citrus',
        name: '柑橘',
        descriptors: [
          { id: 'zesty', name: '活力' },
          { id: 'bright', name: '明亮' },
          { id: 'tangy', name: '酸爽' },
          { id: 'refreshing', name: '提神' }
        ]
      },
      {
        id: 'berry',
        name: '浆果',
        descriptors: [
          { id: 'jammy', name: '果酱感' },
          { id: 'tart', name: '酸甜' },
          { id: 'juicy', name: '饱满' },
          { id: 'wild', name: '野生' }
        ]
      },
      {
        id: 'peach',
        name: '桃子',
        descriptors: [
          { id: 'fuzzy', name: '绒毛感' },
          { id: 'sweet', name: '甜蜜' },
          { id: 'creamy', name: '奶油' },
          { id: 'summer', name: '夏日' }
        ]
      }
    ]
  },
  {
    id: 'woody',
    name: '木香',
    color: CATEGORY_COLORS.woody,
    subCategories: [
      {
        id: 'sandalwood',
        name: '檀香',
        descriptors: [
          { id: 'warm-rich', name: '温暖醇厚' },
          { id: 'creamy', name: '奶油感' },
          { id: 'earthy', name: '泥土' },
          { id: 'meditative', name: '禅意' }
        ]
      },
      {
        id: 'cedar',
        name: '雪松',
        descriptors: [
          { id: 'dry', name: '干燥' },
          { id: 'resinous', name: '树脂' },
          { id: 'masculine', name: '阳刚' },
          { id: 'forest', name: '森林' }
        ]
      },
      {
        id: 'oud',
        name: '沉香',
        descriptors: [
          { id: 'smoky', name: '烟熏' },
          { id: 'animalic', name: '动物感' },
          { id: 'mysterious', name: '神秘' },
          { id: 'ancient', name: '古老' }
        ]
      },
      {
        id: 'pine',
        name: '松木',
        descriptors: [
          { id: 'resinous', name: '树脂' },
          { id: 'fresh', name: '清新' },
          { id: 'conifer', name: '针叶' },
          { id: 'outdoor', name: '户外' }
        ]
      }
    ]
  },
  {
    id: 'herbal',
    name: '草香',
    color: CATEGORY_COLORS.herbal,
    subCategories: [
      {
        id: 'mint',
        name: '薄荷',
        descriptors: [
          { id: 'cool', name: '清凉' },
          { id: 'sharp', name: '锐利' },
          { id: 'clean', name: '洁净' },
          { id: 'invigorating', name: '活力' }
        ]
      },
      {
        id: 'grass',
        name: '青草',
        descriptors: [
          { id: 'green', name: '绿意' },
          { id: 'fresh-cut', name: '刚割' },
          { id: 'earthy', name: '泥土' },
          { id: 'morning', name: '晨露' }
        ]
      },
      {
        id: 'basil',
        name: '罗勒',
        descriptors: [
          { id: 'aromatic', name: '芳香' },
          { id: 'spicy-sweet', name: '辛甜' },
          { id: 'culinary', name: '烹饪' },
          { id: 'mediterranean', name: '地中海' }
        ]
      },
      {
        id: 'tea',
        name: '茶香',
        descriptors: [
          { id: 'umami', name: '鲜味' },
          { id: 'vegetal', name: '植物' },
          { id: 'bitter-sweet', name: '甘苦' },
          { id: 'zen', name: '禅意' }
        ]
      }
    ]
  },
  {
    id: 'spicy',
    name: '辛香',
    color: CATEGORY_COLORS.spicy,
    subCategories: [
      {
        id: 'cinnamon',
        name: '肉桂',
        descriptors: [
          { id: 'warm', name: '温暖' },
          { id: 'sweet-spicy', name: '甜辣' },
          { id: 'cozy', name: '温馨' },
          { id: 'winter', name: '冬日' }
        ]
      },
      {
        id: 'pepper',
        name: '胡椒',
        descriptors: [
          { id: 'hot', name: '热辣' },
          { id: 'sharp', name: '尖锐' },
          { id: 'tingling', name: '麻刺' },
          { id: 'bold', name: '大胆' }
        ]
      },
      {
        id: 'clove',
        name: '丁香',
        descriptors: [
          { id: 'strong', name: '浓烈' },
          { id: 'medicinal', name: '药感' },
          { id: 'warm', name: '暖意' },
          { id: 'festive', name: '节日' }
        ]
      },
      {
        id: 'ginger',
        name: '生姜',
        descriptors: [
          { id: 'zingy', name: '刺激' },
          { id: 'warm', name: '温热' },
          { id: 'fresh-spicy', name: '鲜辣' },
          { id: 'energizing', name: '振奋' }
        ]
      }
    ]
  },
  {
    id: 'resin',
    name: '树脂',
    color: CATEGORY_COLORS.resin,
    subCategories: [
      {
        id: 'frankincense',
        name: '乳香',
        descriptors: [
          { id: 'holy', name: '神圣' },
          { id: 'smoky-sweet', name: '烟甜' },
          { id: 'ancient', name: '古老' },
          { id: 'meditative', name: '冥想' }
        ]
      },
      {
        id: 'myrrh',
        name: '没药',
        descriptors: [
          { id: 'balsamic', name: '香脂' },
          { id: 'earthy', name: '泥土' },
          { id: 'mysterious', name: '神秘' },
          { id: 'deep', name: '深沉' }
        ]
      },
      {
        id: 'amber',
        name: '琥珀',
        descriptors: [
          { id: 'warm', name: '温暖' },
          { id: 'sweet-resin', name: '甜树脂' },
          { id: 'vanilla-like', name: '香草' },
          { id: 'golden', name: '金色' }
        ]
      },
      {
        id: 'benzoin',
        name: '安息香',
        descriptors: [
          { id: 'vanilla', name: '香草' },
          { id: 'balsamic', name: '香脂' },
          { id: 'warm-sweet', name: '暖甜' },
          { id: 'comforting', name: '安心' }
        ]
      }
    ]
  }
];
