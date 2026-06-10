export type FossilCategory = 'invertebrate' | 'vertebrate' | 'plant';

export interface FossilData {
  id: string;
  name: string;
  period: string;
  location: string;
  category: FossilCategory;
  description: string;
  color: string;
}

export interface CategoryInfo {
  key: FossilCategory | 'all';
  label: string;
}

const FOSSIL_DATASET: FossilData[] = [
  {
    id: 'trilobite',
    name: '三叶虫',
    period: '寒武纪 - 二叠纪',
    location: '世界各地',
    category: 'invertebrate',
    description: '三叶虫是已灭绝的节肢动物，生活在古生代海洋中。它们的身体分为头部、胸部和尾部，背甲分为中轴和两侧肋叶三部分，因此得名。三叶虫是最早的节肢动物之一，化石数量众多，是地层对比的重要标准化石。',
    color: '#c9a87c'
  },
  {
    id: 'ammonite',
    name: '菊石',
    period: '泥盆纪 - 白垩纪',
    location: '欧洲、亚洲、北美洲',
    category: 'invertebrate',
    description: '菊石是已灭绝的头足类软体动物，具有螺旋形外壳。壳面通常具有复杂的缝合线，是中生代海洋中的重要掠食者。菊石化石分布广泛，演化迅速，是划分和对比中生代地层的标准化石。',
    color: '#d4a574'
  },
  {
    id: 'archaeopteryx',
    name: '始祖鸟',
    period: '晚侏罗纪',
    location: '德国巴伐利亚州',
    category: 'vertebrate',
    description: '始祖鸟被认为是最早的鸟类之一，同时具有爬行动物和鸟类的特征。它保留了牙齿、长尾椎骨和爪子等爬行动物特征，但也拥有羽毛和叉骨等鸟类特征，是恐龙向鸟类演化的关键过渡物种。',
    color: '#8b7355'
  },
  {
    id: 'smilodon',
    name: '剑齿虎',
    period: '更新世',
    location: '北美洲、南美洲',
    category: 'vertebrate',
    description: '剑齿虎是已灭绝的大型猫科动物，以其极长的上犬齿而闻名。它们生活在更新世的草原和森林中，是顶级掠食者，主要以大型哺乳动物如猛犸象、野牛等为食。其强健的前肢和颈部肌肉适合扑倒大型猎物。',
    color: '#a0826d'
  },
  {
    id: 'tyrannosaurus',
    name: '霸王龙',
    period: '晚白垩纪',
    location: '北美洲西部',
    category: 'vertebrate',
    description: '霸王龙是已知最大的肉食性恐龙之一，生活在白垩纪末期。它拥有巨大的头颅、强壮的颌骨和锯齿状牙齿，咬合力极强。虽然前肢短小，但后肢极为强壮，是当时陆地生态系统中的顶级掠食者。',
    color: '#6b5b4e'
  },
  {
    id: 'mammoth',
    name: '猛犸象',
    period: '上新世 - 全新世',
    location: '北半球寒带地区',
    category: 'vertebrate',
    description: '猛犸象是已灭绝的大型长鼻目动物，与现代亚洲象和非洲象有亲缘关系。它们身披浓密长毛，拥有巨大的弯曲象牙，适应寒冷的冰期气候。猛犸象在约四千年前灭绝，是更新世巨型动物群的代表。',
    color: '#7a6b5d'
  },
  {
    id: 'lepidodendron',
    name: '鳞木',
    period: '石炭纪 - 二叠纪',
    location: '全球热带沼泽',
    category: 'plant',
    description: '鳞木是已灭绝的石松类植物，是石炭纪沼泽森林的主要树种之一。它们可高达30-40米，树干表面覆盖着螺旋状排列的叶座脱落后留下的菱形痕迹，形似鳞片，因此得名。鳞木是形成煤的重要植物之一。',
    color: '#5d6b4e'
  },
  {
    id: 'cycad',
    name: '苏铁',
    period: '二叠纪 - 现代',
    location: '热带、亚热带地区',
    category: 'plant',
    description: '苏铁是一类古老的裸子植物，最早出现于二叠纪，在中生代极为繁盛，被称为"恐龙时代的植物"。它们具有大型羽状复叶和粗壮的茎干，外观类似棕榈树。现代苏铁类植物种类较少，多为珍稀濒危物种。',
    color: '#4e7a5d'
  }
];

const CATEGORY_LIST: CategoryInfo[] = [
  { key: 'all', label: '全部' },
  { key: 'invertebrate', label: '古无脊椎动物' },
  { key: 'vertebrate', label: '古脊椎动物' },
  { key: 'plant', label: '古植物' }
];

export class DataManager {
  private data: FossilData[];
  private categories: CategoryInfo[];

  constructor() {
    this.data = FOSSIL_DATASET;
    this.categories = CATEGORY_LIST;
  }

  getAll(): FossilData[] {
    return [...this.data];
  }

  getById(id: string): FossilData | undefined {
    return this.data.find((f) => f.id === id);
  }

  filterByCategory(category: FossilCategory | null): FossilData[] {
    if (category === null) {
      return [...this.data];
    }
    return this.data.filter((f) => f.category === category);
  }

  getCategories(): CategoryInfo[] {
    return [...this.categories];
  }

  getCategoryLabel(key: FossilCategory): string {
    const found = this.categories.find((c) => c.key === key);
    return found ? found.label : key;
  }
}
