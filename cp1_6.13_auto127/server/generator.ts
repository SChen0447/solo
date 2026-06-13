import type { Dish, Emotion, Flavor, EmotionConfig, FlavorConfig } from './types';

const emotionConfigs: Record<Emotion, EmotionConfig> = {
  happy: {
    key: 'happy',
    label: '快乐',
    color: '#ffe66d',
    gradientFrom: '#ffe66d',
    gradientTo: '#ff9ff3',
    icon: '😊'
  },
  sad: {
    key: 'sad',
    label: '忧郁',
    color: '#4ecdc4',
    gradientFrom: '#4ecdc4',
    gradientTo: '#54a0ff',
    icon: '🌊'
  },
  excited: {
    key: 'excited',
    label: '兴奋',
    color: '#ff6b6b',
    gradientFrom: '#ff6b6b',
    gradientTo: '#ff8e8e',
    icon: '🔥'
  },
  calm: {
    key: 'calm',
    label: '平静',
    color: '#95e1a3',
    gradientFrom: '#95e1a3',
    gradientTo: '#6ee7de',
    icon: '🍃'
  }
};

const flavorConfigs: Record<Flavor, FlavorConfig> = {
  sweet: { key: 'sweet', label: '甜', color: '#ff9ff3', icon: '🍯' },
  spicy: { key: 'spicy', label: '辣', color: '#ee5253', icon: '🌶️' },
  sour: { key: 'sour', label: '酸', color: '#1dd1a1', icon: '🍋' },
  umami: { key: 'umami', label: '鲜', color: '#54a0ff', icon: '🌿' }
};

const dishNameTemplates: Record<Emotion, Record<Flavor, string[]>> = {
  happy: {
    sweet: [
      '量子欢愉·晨曦蜜露',
      '分子微笑·金粉梦境',
      '快乐奇点·焦糖星云',
      '甜蜜共振·光子布丁'
    ],
    spicy: [
      '热舞量子·甜辣彗星',
      '欢乐辣椒·黄金风暴',
      '幸福燃烧·芒果火花',
      '微笑爆炸·蜜汁焰火'
    ],
    sour: [
      '柠檬欢愉·量子气泡',
      '快乐酸橙·阳光分子',
      '微笑柠檬酸·晶脆泡沫',
      '喜悦果酸·流光果冻'
    ],
    umami: [
      '快乐鲜萃·黄金海味',
      '微笑分子·鲜萃水晶',
      '愉悦鲜境·松露霞光',
      '幸福鲜味·量子海藻'
    ]
  },
  sad: {
    sweet: [
      '深海蜜语·蓝色眼泪',
      '忧郁甜心·深蓝梦境',
      '海洋柔情·珍珠蜜露',
      '静谧甜蜜·月光糖浆'
    ],
    spicy: [
      '深蓝烈焰·冰与火之歌',
      '忧郁燃烧·寒域辣椒',
      '深海焰火·蓝调麻辣',
      '冷静辣意·冰洋火花'
    ],
    sour: [
      '蓝调酸柠·深海呼吸',
      '忧郁柠檬酸·海雾分子',
      '静谧果酸·午夜柠檬',
      '深海酸韵·蓝光晶冻'
    ],
    umami: [
      '深海鲜境·蓝珍珠',
      '忧郁鲜萃·海洋之心',
      '静谧鲜味·冷萃松露',
      '深蓝海味·冰鲜量子'
    ]
  },
  excited: {
    sweet: [
      '能量爆发·熔岩蜜糖',
      '激情甜焰·火山布丁',
      '狂热甜蜜·岩浆星云',
      '炽热蜜糖·等离子甜点'
    ],
    spicy: [
      '烈焰奇点·地狱辣椒',
      '激情燃烧·核弹麻辣',
      '狂热辣意·火山爆发',
      '炽热熔岩·死神辣椒'
    ],
    sour: [
      '电击柠檬酸·能量酸爆',
      '激情果酸·闪电酸雾',
      '狂热酸意·等离子柠檬',
      '能量酸爆·雷霆酸晶'
    ],
    umami: [
      '能量鲜爆·雷霆松露',
      '激情鲜萃·火山海味',
      '狂热鲜味·等离子鲜',
      '炽热鲜境·岩浆海鲜'
    ]
  },
  calm: {
    sweet: [
      '禅意甜蜜·抹茶星空',
      '静谧蜜糖·竹林清风',
      '平和甜韵·晨露花蜜',
      '自然甜境·森林布丁'
    ],
    spicy: [
      '温和辣意·山葵清风',
      '平静辣韵·绿茶辣椒',
      '和谐辣境·竹林麻辣',
      '自然辣意·薄荷火山'
    ],
    sour: [
      '平静酸柠·森林晨露',
      '禅意果酸·抹茶柠檬',
      '和谐酸韵·竹林酸雾',
      '自然酸境·青柠微风'
    ],
    umami: [
      '森林鲜萃·松露禅意',
      '平静鲜境·竹林海味',
      '和谐鲜味·自然鲜露',
      '自然鲜萃·山野量子'
    ]
  }
};

const ingredientIcons: Record<string, string> = {
  '分子泡沫': '🫧',
  '液氮冰晶': '❄️',
  '食用金箔': '✨',
  '香草精萃': '🌿',
  '焦糖分子': '🍯',
  '辣椒精油': '🌶️',
  '柠檬酸晶': '🍋',
  '海盐颗粒': '🧂',
  '松露油': '🍄',
  '玫瑰水': '🌹',
  '抹茶粉': '🍵',
  '可可脂': '🍫',
  '蜂蜜结晶': '🐝',
  '生姜分子': '🫚',
  '薄荷精油': '🌱',
  '椰奶泡沫': '🥥',
  '蓝莓分子': '🫐',
  '草莓晶球': '🍓',
  '芒果凝胶': '🥭',
  '海藻提取物': '🌊',
  '鱼子酱': '🐟',
  '鹅肝分子': '🦆',
  '白松露': '🍄',
  '黑松露': '🍄',
  '藏红花': '🌸',
  '香草荚': '🌿',
  '小豆蔻': '🫛',
  '肉桂粉': '🌰',
  '八角': '⭐',
  '丁香': '🌺'
};

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateId = (): string => {
  return `dish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getIngredientWithIcon = (name: string, amount: string) => {
  return {
    name,
    icon: ingredientIcons[name] || '🍽️',
    amount
  };
};

const generateIngredients = (emotion: Emotion, flavors: Flavor[]): { name: string; icon: string; amount: string }[] => {
  const baseIngredients = [
    getIngredientWithIcon('分子泡沫', '15ml'),
    getIngredientWithIcon('液氮冰晶', '5g'),
    getIngredientWithIcon('食用金箔', '2片')
  ];

  const flavorIngredients: Record<Flavor, { name: string; amount: string }[]> = {
    sweet: [
      getIngredientWithIcon('焦糖分子', '10g'),
      getIngredientWithIcon('蜂蜜结晶', '8g'),
      getIngredientWithIcon('香草精萃', '3ml')
    ],
    spicy: [
      getIngredientWithIcon('辣椒精油', '2ml'),
      getIngredientWithIcon('生姜分子', '5g'),
      getIngredientWithIcon('肉桂粉', '1g')
    ],
    sour: [
      getIngredientWithIcon('柠檬酸晶', '8g'),
      getIngredientWithIcon('薄荷精油', '2ml'),
      getIngredientWithIcon('蓝莓分子', '10g')
    ],
    umami: [
      getIngredientWithIcon('松露油', '3ml'),
      getIngredientWithIcon('海藻提取物', '5g'),
      getIngredientWithIcon('海盐颗粒', '2g')
    ]
  };

  const emotionIngredients: Record<Emotion, { name: string; amount: string }[]> = {
    happy: [
      getIngredientWithIcon('草莓晶球', '6颗'),
      getIngredientWithIcon('芒果凝胶', '12g'),
      getIngredientWithIcon('玫瑰水', '5ml')
    ],
    sad: [
      getIngredientWithIcon('椰奶泡沫', '20ml'),
      getIngredientWithIcon('蓝酶分子', '8g'),
      getIngredientWithIcon('海盐颗粒', '1g')
    ],
    excited: [
      getIngredientWithIcon('可可脂', '15g'),
      getIngredientWithIcon('辣椒精油', '3ml'),
      getIngredientWithIcon('藏红花', '3根')
    ],
    calm: [
      getIngredientWithIcon('抹茶粉', '4g'),
      getIngredientWithIcon('白松露', '2g'),
      getIngredientWithIcon('香草荚', '1/2根')
    ]
  };

  const ingredients = [...baseIngredients, ...emotionIngredients[emotion]];
  
  flavors.forEach(flavor => {
    ingredients.push(...flavorIngredients[flavor]);
  });

  return ingredients.slice(0, 8);
};

const generateSteps = (emotion: Emotion, flavors: Flavor[]): { number: number; description: string }[] => {
  const baseSteps = [
    { number: 1, description: '将分子基底置于真空旋转蒸发器中，以37°C精确加热30分钟，提取核心风味分子。' },
    { number: 2, description: '使用液氮快速冷冻食材，通过球化技术形成完美的晶球状结构，内部保留流质状态。' }
  ];

  const emotionSteps: Record<Emotion, { number: number; description: string }[]> = {
    happy: [
      { number: 3, description: '注入阳光般温暖的焦糖气体，在低压舱中让甜味分子充分渗透至每一个晶球。' },
      { number: 4, description: '运用离心技术分离快乐因子，确保每一口都能触发内啡肽的释放。' }
    ],
    sad: [
      { number: 3, description: '在零下196°C的液氮环境中，让深海蓝色素与忧郁分子完美结合，形成晶莹的蓝调结晶。' },
      { number: 4, description: '缓慢升温至5°C，让海洋的深邃气息在低温中缓缓释放，如同海浪轻拍心灵。' }
    ],
    excited: [
      { number: 3, description: '用等离子喷枪瞬间加热至1200°C，让辣味分子瞬间爆炸，释放极致的能量。' },
      { number: 4, description: '在高压反应釜中注入肾上腺素催化剂，使每一个分子都充满燃烧的激情。' }
    ],
    calm: [
      { number: 3, description: '在禅意恒温舱中以25°C静置48小时，让自然精华在时间中慢慢沉淀。' },
      { number: 4, description: '使用超声波振荡技术，使分子排列如同竹林般整齐有序，带来和谐的口感。' }
    ]
  };

  const flavorSteps: Record<Flavor, { number: number; description: string }[]> = {
    sweet: [
      { number: 5, description: '最后以蜂蜜喷雾进行分子包裹，形成一层薄薄的糖衣透镜，折射出幸福的光芒。' }
    ],
    spicy: [
      { number: 5, description: '注入辣椒精油纳米胶囊，入口后在舌尖次第爆开，释放层层递进的热辣快感。' }
    ],
    sour: [
      { number: 5, description: '喷洒柠檬酸雾，在表面形成微晶体结构，入口瞬间释放清爽的酸意，如同晨露。' }
    ],
    umami: [
      { number: 5, description: '在真空环境中让松露精油充分渗透，形成第五味觉的量子叠加态，鲜味悠长。' }
    ]
  };

  const steps = [...baseSteps, ...emotionSteps[emotion]];
  
  flavors.forEach((flavor, index) => {
    const flavorStep = flavorSteps[flavor][0];
    if (flavorStep) {
      steps.push({
        ...flavorStep,
        number: 5 + index
      });
    }
  });

  steps.push({
    number: steps.length + 1,
    description: '最终装盘：运用分子重力技术，让菜品悬浮于盘中，周围环绕食用干冰雾气，呈现量子态的视觉效果。'
  });

  return steps;
};

const generateExperience = (emotion: Emotion, flavors: Flavor[]): string => {
  const emotionExperiences: Record<Emotion, string> = {
    happy: '当第一缕阳光般的温暖在舌尖绽放，你会感觉到童年记忆中最纯粹的快乐。每一个分子都在跳跃起舞，如同夏日午后的萤火虫，在你的味蕾上编织出金色的梦境。内啡肽在血管中奔涌，时间仿佛凝固在这永恒的幸福瞬间，世界都变得柔软而明亮。',
    sad: '深邃的蓝色如同午夜的海洋，缓缓包裹着你的灵魂。咸咸的海风中带着一丝甜蜜的忧伤，每一口都是对过往的温柔告别。你会在静谧中与自己对话，让泪水在黑暗中悄然滑落，然后发现，悲伤也可以如此美丽，如此深邃，如此令人沉醉。',
    excited: '烈焰在舌尖瞬间爆发，如同火山喷发，每一个味蕾都在尖叫狂欢。肾上腺素飙升，心跳加速，你感觉到无穷的能量在体内奔涌，仿佛可以冲破一切束缚。辣味在口腔中层层递进，从舌尖燃烧到灵魂深处，让你在极致的刺激中体验生命最原始的狂喜。',
    calm: '清风拂过竹林，晨露从叶尖缓缓滴落。你会感觉到前所未有的宁静，所有的喧嚣都渐行渐远。每一口都是大自然的馈赠，让你在纷繁的世界中找到内心的平和。时间变得缓慢，呼吸变得深长，你与宇宙融为一体，在静谧中感受到生命最本真的美好。'
  };

  const flavorExperiences: Record<Flavor, string> = {
    sweet: '甜蜜如同初恋的吻，温柔地包裹着每一个味蕾，让你在幸福中融化。',
    spicy: '热辣的激情在口腔中爆炸，唤醒沉睡的灵魂，让每一个细胞都在燃烧。',
    sour: '清爽的酸意如同清晨的第一缕阳光，让你的精神为之一振，焕然一新。',
    umami: '深邃的鲜味在舌尖缓缓展开，如同大海般广阔，带给你无尽的回味与满足。'
  };

  let experience = emotionExperiences[emotion];
  
  if (flavors.length > 0) {
    experience += '\n\n';
    flavors.forEach((flavor, index) => {
      experience += flavorExperiences[flavor];
      if (index < flavors.length - 1) {
        experience += ' ';
      }
    });
  }

  return experience;
};

const calculateGradient = (emotion: Emotion, flavors: Flavor[]): { from: string; to: string } => {
  const emotionConfig = emotionConfigs[emotion];
  let from = emotionConfig.gradientFrom;
  let to = emotionConfig.gradientTo;

  if (flavors.length > 0) {
    const primaryFlavor = flavors[0];
    const flavorConfig = flavorConfigs[primaryFlavor];
    
    if (flavors.length === 1) {
      to = flavorConfig.color;
    } else if (flavors.length >= 2) {
      to = flavorConfigs[flavors[1]].color;
    }
  }

  return { from, to };
};

export const generateDish = (emotion: Emotion, flavors: Flavor[]): Dish => {
  const primaryFlavor = flavors.length > 0 ? flavors[0] : 'sweet';
  const nameArray = dishNameTemplates[emotion][primaryFlavor];
  const name = getRandomItem(nameArray);
  
  const gradient = calculateGradient(emotion, flavors);
  const emotionConfig = emotionConfigs[emotion];

  return {
    id: generateId(),
    name,
    emotion,
    emotionLabel: emotionConfig.label,
    flavors: [...flavors],
    ingredients: generateIngredients(emotion, flavors),
    steps: generateSteps(emotion, flavors),
    experience: generateExperience(emotion, flavors),
    gradientFrom: gradient.from,
    gradientTo: gradient.to,
    icon: emotionConfig.icon,
    createdAt: new Date().toISOString()
  };
};

export const getEmotionConfig = (emotion: Emotion): EmotionConfig => emotionConfigs[emotion];
export const getFlavorConfig = (flavor: Flavor): FlavorConfig => flavorConfigs[flavor];
export const getAllEmotionConfigs = (): EmotionConfig[] => Object.values(emotionConfigs);
export const getAllFlavorConfigs = (): FlavorConfig[] => Object.values(flavorConfigs);

export const generateRecommendedDishes = (): Dish[] => {
  const emotions: Emotion[] = ['happy', 'sad', 'excited', 'calm'];
  const flavorCombos: Flavor[][] = [
    ['sweet', 'umami'],
    ['spicy', 'sour'],
    ['sweet', 'sour'],
    ['umami', 'sweet'],
    ['spicy', 'umami'],
    ['sour', 'sweet']
  ];

  const dishes: Dish[] = [];
  const usedEmotions = new Set<Emotion>();
  
  while (dishes.length < 3) {
    const emotion = getRandomItem(emotions);
    if (usedEmotions.has(emotion)) continue;
    usedEmotions.add(emotion);
    
    const flavors = getRandomItem(flavorCombos);
    dishes.push(generateDish(emotion, flavors));
  }

  return dishes;
};
