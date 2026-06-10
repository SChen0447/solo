export interface Ingredient {
  id: string
  name: string
  category: string
  iconEmoji: string
}

export interface RecipeIngredient {
  ingredientId: string
  amount: string
}

export interface Recipe {
  id: string
  name: string
  emoji: string
  time: number
  difficulty: '简单' | '中等' | '困难'
  matchIngredients: string[]
  fullIngredients: RecipeIngredient[]
  steps: string[]
  nutrition: {
    protein: number
    carbs: number
    fat: number
    vitamins: number
  }
}

export const ingredients: Ingredient[] = [
  { id: 'tomato', name: '西红柿', category: '蔬菜', iconEmoji: '🍅' },
  { id: 'egg', name: '鸡蛋', category: '蛋类', iconEmoji: '🥚' },
  { id: 'milk', name: '牛奶', category: '乳制品', iconEmoji: '🥛' },
  { id: 'potato', name: '土豆', category: '蔬菜', iconEmoji: '🥔' },
  { id: 'carrot', name: '胡萝卜', category: '蔬菜', iconEmoji: '🥕' },
  { id: 'onion', name: '洋葱', category: '蔬菜', iconEmoji: '🧅' },
  { id: 'garlic', name: '大蒜', category: '调料', iconEmoji: '🧄' },
  { id: 'chicken', name: '鸡肉', category: '肉类', iconEmoji: '🍗' },
  { id: 'beef', name: '牛肉', category: '肉类', iconEmoji: '🥩' },
  { id: 'pork', name: '猪肉', category: '肉类', iconEmoji: '🥓' },
  { id: 'rice', name: '大米', category: '主食', iconEmoji: '🍚' },
  { id: 'flour', name: '面粉', category: '主食', iconEmoji: '🌾' },
  { id: 'cucumber', name: '黄瓜', category: '蔬菜', iconEmoji: '🥒' },
  { id: 'cabbage', name: '白菜', category: '蔬菜', iconEmoji: '🥬' },
  { id: 'mushroom', name: '蘑菇', category: '蔬菜', iconEmoji: '🍄' },
  { id: 'tofu', name: '豆腐', category: '豆制品', iconEmoji: '🧈' },
  { id: 'corn', name: '玉米', category: '蔬菜', iconEmoji: '🌽' },
  { id: 'pepper', name: '青椒', category: '蔬菜', iconEmoji: '🫑' },
  { id: 'shrimp', name: '虾', category: '海鲜', iconEmoji: '🦐' },
  { id: 'spinach', name: '菠菜', category: '蔬菜', iconEmoji: '🥬' }
]

export const recipes: Recipe[] = [
  {
    id: 'r1',
    name: '番茄炒蛋',
    emoji: '🍳',
    time: 15,
    difficulty: '简单',
    matchIngredients: ['tomato', 'egg'],
    fullIngredients: [
      { ingredientId: 'tomato', amount: '2个' },
      { ingredientId: 'egg', amount: '3个' },
      { ingredientId: 'garlic', amount: '2瓣' }
    ],
    steps: [
      '西红柿洗净切块，鸡蛋打散加少许盐搅匀',
      '锅中热油，倒入蛋液炒至凝固盛出',
      '锅中再加少许油，放入蒜末爆香',
      '加入西红柿翻炒出汁',
      '倒入炒好的鸡蛋，加盐调味翻炒均匀即可'
    ],
    nutrition: { protein: 28, carbs: 15, fat: 20, vitamins: 25 }
  },
  {
    id: 'r2',
    name: '土豆烧牛肉',
    emoji: '🍲',
    time: 60,
    difficulty: '中等',
    matchIngredients: ['potato', 'beef', 'onion'],
    fullIngredients: [
      { ingredientId: 'beef', amount: '500g' },
      { ingredientId: 'potato', amount: '3个' },
      { ingredientId: 'onion', amount: '1个' },
      { ingredientId: 'garlic', amount: '3瓣' },
      { ingredientId: 'carrot', amount: '1根' }
    ],
    steps: [
      '牛肉切块焯水去血沫，捞出沥干',
      '土豆胡萝卜切滚刀块，洋葱切丝',
      '锅中热油爆香蒜末和洋葱',
      '加入牛肉翻炒，加酱油、料酒、糖调味',
      '加水没过牛肉，大火烧开转小火炖40分钟',
      '加入土豆和胡萝卜继续炖20分钟，大火收汁'
    ],
    nutrition: { protein: 45, carbs: 35, fat: 25, vitamins: 18 }
  },
  {
    id: 'r3',
    name: '鸡蛋羹',
    emoji: '🥣',
    time: 20,
    difficulty: '简单',
    matchIngredients: ['egg', 'milk'],
    fullIngredients: [
      { ingredientId: 'egg', amount: '2个' },
      { ingredientId: 'milk', amount: '150ml' }
    ],
    steps: [
      '鸡蛋打散加入牛奶，比例1:1.5',
      '加少许盐调味，搅拌均匀',
      '蛋液过筛去除浮沫',
      '碗上盖保鲜膜，水开后上锅蒸15分钟',
      '出锅淋少许香油和生抽即可'
    ],
    nutrition: { protein: 18, carbs: 8, fat: 12, vitamins: 10 }
  },
  {
    id: 'r4',
    name: '宫保鸡丁',
    emoji: '🥘',
    time: 30,
    difficulty: '中等',
    matchIngredients: ['chicken', 'pepper', 'cucumber'],
    fullIngredients: [
      { ingredientId: 'chicken', amount: '300g' },
      { ingredientId: 'pepper', amount: '1个' },
      { ingredientId: 'cucumber', amount: '1根' },
      { ingredientId: 'garlic', amount: '3瓣' }
    ],
    steps: [
      '鸡胸肉切丁，加盐、料酒、淀粉腌制15分钟',
      '黄瓜青椒切丁备用',
      '调汁：酱油、醋、糖、淀粉、水混合',
      '热锅凉油，下鸡丁滑炒至变色盛出',
      '爆香蒜末，加入黄瓜青椒翻炒',
      '倒入鸡丁和调好的汁，大火翻炒收汁'
    ],
    nutrition: { protein: 40, carbs: 20, fat: 18, vitamins: 22 }
  },
  {
    id: 'r5',
    name: '麻婆豆腐',
    emoji: '🍛',
    time: 25,
    difficulty: '中等',
    matchIngredients: ['tofu', 'pork'],
    fullIngredients: [
      { ingredientId: 'tofu', amount: '1块' },
      { ingredientId: 'pork', amount: '100g' },
      { ingredientId: 'garlic', amount: '3瓣' },
      { ingredientId: 'onion', amount: '半个' }
    ],
    steps: [
      '豆腐切块用盐水浸泡10分钟',
      '猪肉切末，蒜切末，葱切花',
      '锅中热油炒香蒜末，下肉末炒散',
      '加豆瓣酱炒出红油',
      '加水烧开，放入豆腐轻推均匀',
      '小火煮5分钟，勾芡撒葱花出锅'
    ],
    nutrition: { protein: 25, carbs: 12, fat: 22, vitamins: 8 }
  },
  {
    id: 'r6',
    name: '西红柿鸡蛋面',
    emoji: '🍜',
    time: 25,
    difficulty: '简单',
    matchIngredients: ['tomato', 'egg', 'flour'],
    fullIngredients: [
      { ingredientId: 'tomato', amount: '2个' },
      { ingredientId: 'egg', amount: '2个' },
      { ingredientId: 'flour', amount: '200g' },
      { ingredientId: 'garlic', amount: '2瓣' }
    ],
    steps: [
      '面粉加水揉成面团，醒发20分钟',
      '西红柿切块，鸡蛋打散',
      '面团擀成薄片切条',
      '锅中热油炒蛋盛出，爆香蒜末加西红柿炒出汁',
      '加水烧开，下面条煮熟',
      '倒入炒好的鸡蛋，加盐调味即可'
    ],
    nutrition: { protein: 22, carbs: 65, fat: 15, vitamins: 20 }
  },
  {
    id: 'r7',
    name: '土豆丝',
    emoji: '🥔',
    time: 20,
    difficulty: '简单',
    matchIngredients: ['potato', 'pepper'],
    fullIngredients: [
      { ingredientId: 'potato', amount: '2个' },
      { ingredientId: 'pepper', amount: '1个' },
      { ingredientId: 'garlic', amount: '2瓣' }
    ],
    steps: [
      '土豆去皮切细丝，泡水去淀粉',
      '青椒切丝，蒜切片',
      '锅热油爆香蒜片',
      '捞出土豆丝沥干水分下锅快炒',
      '加青椒丝继续翻炒，加盐、醋调味出锅'
    ],
    nutrition: { protein: 6, carbs: 40, fat: 8, vitamins: 28 }
  },
  {
    id: 'r8',
    name: '胡萝卜炒肉丝',
    emoji: '🥕',
    time: 20,
    difficulty: '简单',
    matchIngredients: ['carrot', 'pork'],
    fullIngredients: [
      { ingredientId: 'carrot', amount: '2根' },
      { ingredientId: 'pork', amount: '150g' },
      { ingredientId: 'garlic', amount: '2瓣' }
    ],
    steps: [
      '胡萝卜切丝，猪肉切丝',
      '肉丝加料酒、淀粉腌制10分钟',
      '锅热油爆香蒜末，下肉丝炒至变色',
      '加入胡萝卜丝翻炒至软',
      '加盐、生抽调味翻炒均匀'
    ],
    nutrition: { protein: 22, carbs: 18, fat: 15, vitamins: 30 }
  },
  {
    id: 'r9',
    name: '蘑菇炖鸡',
    emoji: '🍗',
    time: 50,
    difficulty: '中等',
    matchIngredients: ['chicken', 'mushroom'],
    fullIngredients: [
      { ingredientId: 'chicken', amount: '500g' },
      { ingredientId: 'mushroom', amount: '200g' },
      { ingredientId: 'onion', amount: '半个' },
      { ingredientId: 'garlic', amount: '3瓣' }
    ],
    steps: [
      '鸡肉切块焯水去血沫',
      '蘑菇撕成小朵，葱切段，蒜切片',
      '锅热油爆香蒜和葱，下鸡块翻炒',
      '加酱油、料酒、糖调味',
      '加水没过鸡肉，大火烧开转小火炖30分钟',
      '加入蘑菇继续炖15分钟，大火收汁'
    ],
    nutrition: { protein: 50, carbs: 15, fat: 20, vitamins: 25 }
  },
  {
    id: 'r10',
    name: '菠菜鸡蛋汤',
    emoji: '🥬',
    time: 15,
    difficulty: '简单',
    matchIngredients: ['spinach', 'egg'],
    fullIngredients: [
      { ingredientId: 'spinach', amount: '200g' },
      { ingredientId: 'egg', amount: '1个' },
      { ingredientId: 'garlic', amount: '2瓣' }
    ],
    steps: [
      '菠菜洗净切段，鸡蛋打散',
      '锅热油爆香蒜末',
      '加水烧开，放入菠菜',
      '水再次烧开后淋入蛋液形成蛋花',
      '加盐、香油调味即可'
    ],
    nutrition: { protein: 12, carbs: 6, fat: 8, vitamins: 45 }
  },
  {
    id: 'r11',
    name: '青椒炒玉米',
    emoji: '🌽',
    time: 15,
    difficulty: '简单',
    matchIngredients: ['corn', 'pepper'],
    fullIngredients: [
      { ingredientId: 'corn', amount: '2根' },
      { ingredientId: 'pepper', amount: '1个' },
      { ingredientId: 'garlic', amount: '2瓣' }
    ],
    steps: [
      '玉米剥粒，青椒切丁',
      '锅热油爆香蒜末',
      '下玉米粒翻炒2分钟',
      '加入青椒丁继续翻炒',
      '加盐调味翻炒均匀出锅'
    ],
    nutrition: { protein: 10, carbs: 45, fat: 6, vitamins: 25 }
  },
  {
    id: 'r12',
    name: '白灼虾',
    emoji: '🦐',
    time: 15,
    difficulty: '简单',
    matchIngredients: ['shrimp', 'garlic'],
    fullIngredients: [
      { ingredientId: 'shrimp', amount: '500g' },
      { ingredientId: 'garlic', amount: '5瓣' }
    ],
    steps: [
      '虾剪去虾须挑去虾线，洗净',
      '蒜切末，加酱油、醋、香油调成蘸料',
      '锅中加水、姜片、料酒烧开',
      '下虾煮至变红弯曲，约3分钟',
      '捞出摆盘，配蘸料食用'
    ],
    nutrition: { protein: 55, carbs: 5, fat: 8, vitamins: 12 }
  },
  {
    id: 'r13',
    name: '白菜炒豆腐',
    emoji: '🥬',
    time: 20,
    difficulty: '简单',
    matchIngredients: ['cabbage', 'tofu'],
    fullIngredients: [
      { ingredientId: 'cabbage', amount: '半棵' },
      { ingredientId: 'tofu', amount: '1块' },
      { ingredientId: 'garlic', amount: '2瓣' }
    ],
    steps: [
      '白菜切片，豆腐切块',
      '锅热油，下豆腐煎至两面金黄盛出',
      '锅中留油爆香蒜末',
      '下白菜翻炒至变软',
      '倒入煎好的豆腐，加盐、生抽翻炒均匀'
    ],
    nutrition: { protein: 20, carbs: 15, fat: 18, vitamins: 30 }
  },
  {
    id: 'r14',
    name: '洋葱炒牛肉',
    emoji: '🧅',
    time: 25,
    difficulty: '中等',
    matchIngredients: ['onion', 'beef'],
    fullIngredients: [
      { ingredientId: 'beef', amount: '300g' },
      { ingredientId: 'onion', amount: '1个' },
      { ingredientId: 'garlic', amount: '3瓣' }
    ],
    steps: [
      '牛肉逆纹切薄片，加生抽、料酒、淀粉腌制15分钟',
      '洋葱切丝，蒜切片',
      '锅热油，下牛肉滑炒至变色盛出',
      '锅中留油爆香蒜片，下洋葱翻炒至透明',
      '倒入牛肉，加盐、生抽翻炒均匀出锅'
    ],
    nutrition: { protein: 48, carbs: 12, fat: 22, vitamins: 15 }
  },
  {
    id: 'r15',
    name: '黄瓜拌皮蛋',
    emoji: '🥒',
    time: 10,
    difficulty: '简单',
    matchIngredients: ['cucumber', 'garlic'],
    fullIngredients: [
      { ingredientId: 'cucumber', amount: '2根' },
      { ingredientId: 'garlic', amount: '4瓣' }
    ],
    steps: [
      '黄瓜拍碎切段',
      '蒜切末，加酱油、醋、糖、香油、辣椒油调汁',
      '将黄瓜放入碗中',
      '倒入调好的料汁拌匀',
      '腌制10分钟更入味'
    ],
    nutrition: { protein: 8, carbs: 10, fat: 12, vitamins: 35 }
  }
]
