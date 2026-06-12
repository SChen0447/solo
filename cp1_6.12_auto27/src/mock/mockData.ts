import Mock from 'mockjs';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe } from '@/types';

const coverColors = [
  '#FF6B6B', '#FFA07A', '#FFD700', '#98D8C8', '#F7DC6F',
  '#E8A87C', '#D4A574', '#C9B1FF', '#A8D8EA', '#AA96DA',
  '#FCB69F', '#FFEAA7', '#DFE6E9', '#81ECEC', '#74B9FF',
  '#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7', '#00B894',
  '#E17055', '#0984E3', '#B2BEC3', '#55EFC4', '#FAB1A0',
];

const coverEmojis = [
  '🍳', '🥘', '🍲', '🥗', '🍝', '🍣', '🥩', '🍰',
  '🧁', '🍕', '🌮', '🍔', '🥐', '🍜', '🍛', '🥧',
  '🍱', '🥟', '🍱', '🫕', '🥖', '🧆', '🥫', '🥮',
];

const recipeNames = [
  '红烧肉', '宫保鸡丁', '麻婆豆腐', '糖醋排骨', '鱼香肉丝',
  '回锅肉', '水煮鱼', '蒜蓉西兰花', '番茄炒蛋', '酸菜鱼',
  '东坡肉', '蚂蚁上树', '干煸四季豆', '麻辣小龙虾', '蒜泥白肉',
  '梅菜扣肉', '辣子鸡', '清蒸鲈鱼', '红烧茄子', '夫妻肺片',
  '京酱肉丝', '糖醋里脊', '剁椒鱼头', '小炒黄牛肉', '葱油拌面',
  '椒盐排条', '口水鸡', '蒜蓉粉丝蒸虾', '干锅花菜', '香菇滑鸡',
];

const authors = [
  '张大厨', '李妈妈', '王阿姨', '赵师傅', '刘大厨',
  '陈小美', '周奶奶', '吴大厨', '郑姐姐', '孙大厨',
];

function generateIngredients(): { name: string; amount: string }[] {
  const ingredientPool = [
    '猪肉', '鸡肉', '牛肉', '豆腐', '鸡蛋', '番茄', '土豆', '青椒',
    '洋葱', '大蒜', '生姜', '酱油', '料酒', '白糖', '盐', '醋',
    '花椒', '辣椒', '豆瓣酱', '淀粉', '葱花', '香菜', '芝麻', '蚝油',
    '排骨', '鱼肉', '虾仁', '西兰花', '茄子', '豆角',
  ];
  const amountPool = [
    '300g', '200g', '500g', '100g', '2勺', '1勺', '3片', '适量',
    '少许', '2个', '1根', '4瓣', '50g', '150g', '250ml',
  ];
  const count = Mock.Random.integer(4, 8);
  const selected = Mock.Random.shuffle(ingredientPool).slice(0, count);
  return selected.map((name) => ({
    name,
    amount: amountPool[Mock.Random.integer(0, amountPool.length - 1)],
  }));
}

function generateSteps(): string[] {
  const stepTemplates = [
    '将食材洗净切好备用',
    '热锅凉油，放入姜蒜爆香',
    '加入主料翻炒至变色',
    '加入调味料翻炒均匀',
    '倒入适量清水，大火烧开',
    '转中小火慢炖{minute}分钟',
    '大火收汁至浓稠',
    '加入配菜翻炒断生',
    '调入盐和胡椒粉调味',
    '撒上葱花和香菜点缀',
    '起锅装盘即可享用',
    '腌制{minute}分钟入味',
    '焯水去腥捞出沥干',
    '加入豆瓣酱炒出红油',
    '淋上香油提鲜',
  ];
  const count = Mock.Random.integer(4, 7);
  const selected = Mock.Random.shuffle(stepTemplates).slice(0, count);
  return selected.map((s) => s.replace('{minute}', String(Mock.Random.integer(5, 30))));
}

export function generateMockRecipes(count: number = 20): Recipe[] {
  const recipes: Recipe[] = [];
  for (let i = 0; i < count; i++) {
    recipes.push({
      id: uuidv4(),
      name: recipeNames[i % recipeNames.length],
      author: authors[Mock.Random.integer(0, authors.length - 1)],
      rating: Mock.Random.float(3, 5, 1, 1),
      cookTime: Mock.Random.integer(15, 120),
      ingredients: generateIngredients(),
      steps: generateSteps(),
      coverColor: coverColors[i % coverColors.length],
      coverEmoji: coverEmojis[i % coverEmojis.length],
    });
  }
  return recipes;
}

export const initialRecipes: Recipe[] = generateMockRecipes(20);
