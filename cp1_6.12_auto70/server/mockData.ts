import { v4 as uuidv4 } from 'uuid';
import type { Book, ExchangeRequest, User, BookCategory } from '../src/types';

export const categoryColors: Record<BookCategory, string> = {
  '科幻': '#6A5ACD',
  '文学': '#FF8C00',
  '技术': '#4A90D9',
  '艺术': '#E91E63',
  '历史': '#2E7D32',
  '哲学': '#795548',
  '生活': '#FF5722',
};

const gradientColors = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
];

const getRandomGradient = () => gradientColors[Math.floor(Math.random() * gradientColors.length)];

const sampleBooks: Omit<Book, 'id' | 'createdAt'>[] = [
  {
    title: '三体',
    author: '刘慈欣',
    category: '科幻',
    description: '《三体》是刘慈欣创作的系列长篇科幻小说，由《三体》、《三体Ⅱ·黑暗森林》、《三体Ⅲ·死神永生》组成，第一部于2006年5月起在《科幻世界》杂志上连载。',
    coverColor: getRandomGradient(),
    ownerId: 'user_002',
    ownerName: '书虫_银河',
    status: 'available',
    rating: 4.8,
    ratingCount: 256,
    exchangeHistory: [
      { id: 'eh1', date: '2024-01-15', partnerName: '书虫_星辰', partnerBookTitle: '基地' }
    ],
  },
  {
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    category: '文学',
    description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。',
    coverColor: getRandomGradient(),
    ownerId: 'user_003',
    ownerName: '书虫_墨香',
    status: 'available',
    rating: 4.9,
    ratingCount: 312,
    exchangeHistory: [],
  },
  {
    title: 'JavaScript高级程序设计',
    author: 'Nicholas C. Zakas',
    category: '技术',
    description: '本书是JavaScript超级畅销书的最新版，从变量、数据类型、函数开始，到对象、操作符、语句，再到DOM、BOM、事件、Ajax、JSON等。',
    coverColor: getRandomGradient(),
    ownerId: 'user_004',
    ownerName: '书虫_代码',
    status: 'available',
    rating: 4.7,
    ratingCount: 189,
    exchangeHistory: [
      { id: 'eh2', date: '2024-02-20', partnerName: '书虫_极客', partnerBookTitle: '你不知道的JavaScript' }
    ],
  },
  {
    title: '艺术的故事',
    author: '贡布里希',
    category: '艺术',
    description: '《艺术的故事》是有关艺术的书籍中最著名、最流行的著作之一。它概括地叙述了从最早的洞窟绘画到当今的实验艺术的发展历程。',
    coverColor: getRandomGradient(),
    ownerId: 'user_005',
    ownerName: '书虫_梵高',
    status: 'available',
    rating: 4.9,
    ratingCount: 421,
    exchangeHistory: [],
  },
  {
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    category: '历史',
    description: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史。作者用独特的视角审视人类历史，探讨我们是如何成为地球的主宰者。',
    coverColor: getRandomGradient(),
    ownerId: 'user_006',
    ownerName: '书虫_时光',
    status: 'available',
    rating: 4.8,
    ratingCount: 567,
    exchangeHistory: [
      { id: 'eh3', date: '2024-03-10', partnerName: '书虫_穿越', partnerBookTitle: '万历十五年' }
    ],
  },
  {
    title: '苏菲的世界',
    author: '乔斯坦·贾德',
    category: '哲学',
    description: '《苏菲的世界》是挪威作家乔斯坦·贾德创作的一本关于西方哲学史的长篇小说，它以小说的形式，通过一名哲学导师向一个叫苏菲的女孩传授哲学知识的经过。',
    coverColor: getRandomGradient(),
    ownerId: 'user_007',
    ownerName: '书虫_智慧',
    status: 'exchanged',
    rating: 4.6,
    ratingCount: 234,
    exchangeHistory: [
      { id: 'eh4', date: '2024-04-05', partnerName: '书虫_思考', partnerBookTitle: '存在与时间' }
    ],
  },
  {
    title: '中国食文化史',
    author: '赵荣光',
    category: '生活',
    description: '本书全面系统地论述了中国食文化的发展历程，从史前时代到近现代，涵盖了饮食原料、烹饪技术、饮食器具、饮食礼仪、饮食思想等方面。',
    coverColor: getRandomGradient(),
    ownerId: 'user_008',
    ownerName: '书虫_美食家',
    status: 'available',
    rating: 4.5,
    ratingCount: 145,
    exchangeHistory: [],
  },
  {
    title: '流浪地球',
    author: '刘慈欣',
    category: '科幻',
    description: '《流浪地球》是刘慈欣的科幻小说集，收录了《流浪地球》、《乡村教师》、《微纪元》、《朝闻道》等多篇代表作。',
    coverColor: getRandomGradient(),
    ownerId: 'user_009',
    ownerName: '书虫_宇宙',
    status: 'available',
    rating: 4.7,
    ratingCount: 378,
    exchangeHistory: [],
  },
  {
    title: '活着',
    author: '余华',
    category: '文学',
    description: '《活着》是作家余华的代表作之一，讲述了在大时代背景下，随着内战、三反五反、大跃进、文化大革命等社会变革，徐福贵的人生和家庭不断经受着苦难。',
    coverColor: getRandomGradient(),
    ownerId: 'user_010',
    ownerName: '书虫_人生',
    status: 'available',
    rating: 4.9,
    ratingCount: 612,
    exchangeHistory: [
      { id: 'eh5', date: '2024-05-12', partnerName: '书虫_平凡', partnerBookTitle: '平凡的世界' }
    ],
  },
  {
