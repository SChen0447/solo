import type { Recipe } from './types';

export const defaultRecipes: Recipe[] = [
  {
    id: '1',
    name: '番茄炒蛋',
    prepTime: 15,
    difficulty: 2,
    favorite: true,
    coverImage: '',
    ingredients: [
      { name: '番茄', amount: '2个' },
      { name: '鸡蛋', amount: '3个' },
      { name: '葱花', amount: '少许' },
      { name: '盐', amount: '适量' },
      { name: '糖', amount: '1勺' }
    ],
    steps: '1. 番茄洗净切块，鸡蛋打散备用。\n\n2. 锅中热油，倒入蛋液炒至凝固盛出。\n\n3. 锅中再加少许油，放入番茄翻炒出汁。\n\n4. 加入盐和糖调味，倒入炒好的鸡蛋翻炒均匀。\n\n5. 撒上葱花即可出锅。'
  },
  {
    id: '2',
    name: '青椒土豆丝',
    prepTime: 20,
    difficulty: 2,
    favorite: false,
    coverImage: '',
    ingredients: [
      { name: '土豆', amount: '2个' },
      { name: '青椒', amount: '1个' },
      { name: '大蒜', amount: '3瓣' },
      { name: '醋', amount: '1勺' },
      { name: '盐', amount: '适量' }
    ],
    steps: '1. 土豆去皮切细丝，泡水去淀粉。\n\n2. 青椒切丝，大蒜切末。\n\n3. 锅中热油，爆香蒜末。\n\n4. 放入土豆丝大火快炒，加醋。\n\n5. 加入青椒丝和盐，翻炒均匀即可。'
  },
  {
    id: '3',
    name: '红烧肉',
    prepTime: 90,
    difficulty: 4,
    favorite: true,
    coverImage: '',
    ingredients: [
      { name: '五花肉', amount: '500g' },
      { name: '冰糖', amount: '30g' },
      { name: '生抽', amount: '2勺' },
      { name: '老抽', amount: '1勺' },
      { name: '料酒', amount: '2勺' },
      { name: '八角', amount: '2个' },
      { name: '桂皮', amount: '1小块' },
      { name: '姜片', amount: '5片' }
    ],
    steps: '1. 五花肉切块，冷水下锅焯水，捞出沥干。\n\n2. 锅中放少许油，加入冰糖小火炒出糖色。\n\n3. 放入五花肉翻炒上色。\n\n4. 加入姜片、八角、桂皮、料酒、生抽、老抽翻炒。\n\n5. 加入热水没过肉，大火烧开后转小火炖60分钟。\n\n6. 大火收汁即可。'
  }
];
