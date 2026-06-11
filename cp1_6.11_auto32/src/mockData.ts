import { Artwork } from './types';
import { v4 as uuidv4 } from 'uuid';

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
];

export const generateMockArtworks = (): Artwork[] => {
  const titles = [
    '星空之梦', '海的呼吸', '黎明之光', '时间的河流',
    '城市幻影', '自然之诗', '色彩交响', '未来幻想'
  ];
  const artists = [
    '李明轩', '王诗韵', '张雨辰', '陈浩然',
    '刘雅婷', '赵子墨', '孙婉清', '周星辰'
  ];
  const descriptions = [
    '这幅作品通过梦幻的色彩组合，展现了艺术家对宇宙的无限遐想。',
    '灵感来自于海边的清晨，海浪与阳光交织成的宁静画面。',
    '捕捉了日出时分天空中绚烂的色彩变化，充满希望与生命力。',
    '用抽象的笔触描绘时间的流动，让观者感受岁月的痕迹。',
    '现代都市的繁华与孤独，在霓虹灯下演绎着独特的故事。',
    '大自然的鬼斧神工，四季更迭中蕴藏着生命的奥秘。',
    '色彩是无声的音乐，每一笔都是艺术家内心的旋律。',
    '对未来世界的想象，科技与艺术的完美融合。'
  ];

  return titles.map((title, index) => ({
    id: uuidv4(),
    title,
    artist: artists[index],
    startingPrice: 1000 + Math.floor(Math.random() * 5000),
    currentPrice: 1000 + Math.floor(Math.random() * 5000),
    endTime: Date.now() + (3600000 + Math.floor(Math.random() * 7200000)),
    gradient: gradients[index],
    description: descriptions[index],
    bids: []
  }));
};

export const mockBidders = [
  '艺术爱好者88', '收藏家老王', '神秘买家X', '画廊代表',
  '投资人李', '设计师小张', '艺术系学生', '匿名买家A',
  '文化基金会', '私人藏家陈'
];
