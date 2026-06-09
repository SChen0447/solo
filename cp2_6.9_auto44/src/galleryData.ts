export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  description: string;
  imageUrl: string;
}

export interface GalleryConfig {
  width: number;
  height: number;
  depth: number;
  wallHeight: number;
  paintingWidth: number;
  paintingHeight: number;
  paintingSpacing: number;
  paintingY: number;
}

export const GALLERY_CONFIG: GalleryConfig = {
  width: 12,
  height: 4,
  depth: 10,
  wallHeight: 4,
  paintingWidth: 2,
  paintingHeight: 1.5,
  paintingSpacing: 1.5,
  paintingY: 2
};

export const ARTWORKS: Artwork[] = [
  {
    id: 'art-001',
    title: '星夜',
    artist: '文森特·梵高',
    year: '1889',
    description: '后印象派杰作，以旋转的笔触描绘夜空中的星云与明月，展现艺术家内心的激情与挣扎。',
    imageUrl: 'https://picsum.photos/seed/starrynight/1024/768'
  },
  {
    id: 'art-002',
    title: '蒙娜丽莎',
    artist: '列奥纳多·达·芬奇',
    year: '1503',
    description: '文艺复兴时期的巅峰肖像，神秘微笑与渐隐法开创了全新的绘画语言。',
    imageUrl: 'https://picsum.photos/seed/monalisa/1024/768'
  },
  {
    id: 'art-003',
    title: '日出·印象',
    artist: '克劳德·莫奈',
    year: '1872',
    description: '印象派命名之作，光影与色彩的瞬间捕捉颠覆了传统绘画的写实观念。',
    imageUrl: 'https://picsum.photos/seed/impression/1024/768'
  },
  {
    id: 'art-004',
    title: '呐喊',
    artist: '爱德华·蒙克',
    year: '1893',
    description: '表现主义的标志性作品，扭曲的线条与强烈的色彩传递出现代人的焦虑与孤独。',
    imageUrl: 'https://picsum.photos/seed/thescream/1024/768'
  },
  {
    id: 'art-005',
    title: '戴珍珠耳环的少女',
    artist: '约翰内斯·维米尔',
    year: '1665',
    description: '荷兰黄金时代的璀璨明珠，光影在少女面庞上的细腻处理令人叹为观止。',
    imageUrl: 'https://picsum.photos/seed/pearlearring/1024/768'
  },
  {
    id: 'art-006',
    title: '亚维农的少女',
    artist: '巴勃罗·毕加索',
    year: '1907',
    description: '立体主义开山之作，碎裂的几何形体重构了人们对空间与形式的认知。',
    imageUrl: 'https://picsum.photos/seed/avignon/1024/768'
  },
  {
    id: 'art-007',
    title: '向日葵',
    artist: '文森特·梵高',
    year: '1888',
    description: '金色花瓣在厚重笔触下绽放，是艺术家对生命炽热情感的纯粹表达。',
    imageUrl: 'https://picsum.photos/seed/sunflowers/1024/768'
  },
  {
    id: 'art-008',
    title: '记忆的永恒',
    artist: '萨尔瓦多·达利',
    year: '1931',
    description: '超现实主义经典，柔软融化的时钟探索了时间、梦境与潜意识的神秘边界。',
    imageUrl: 'https://picsum.photos/seed/persistence/1024/768'
  }
];
