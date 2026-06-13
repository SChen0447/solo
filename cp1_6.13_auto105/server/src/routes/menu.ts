import { Router, Request, Response } from 'express';

const router = Router();

interface Dish {
  id: number;
  name: string;
  icon: string;
  cookTime: number;
  calories: number;
  steps: string[];
  seasonTag: string;
  difficulty: string;
  description: string;
}

interface MenuItem {
  name: string;
  cookTime: number;
  calories: number;
  steps: string[];
  seasonTag: string;
}

const seasonalMenus: Record<string, Dish[]> = {
  spring: [
    {
      id: 1,
      name: '春笋炒腊肉',
      icon: '🎋',
      cookTime: 25,
      calories: 320,
      seasonTag: '春',
      difficulty: '简单',
      description: '春日限定，鲜嫩春笋配咸香腊肉',
      steps: [
        '春笋去壳切片，放入沸水中焯水2分钟去涩',
        '腊肉切薄片，用温水浸泡10分钟去咸味',
        '锅中放少许油，爆香蒜末和姜片',
        '放入腊肉煸炒至出油微卷',
        '加入春笋片大火翻炒2分钟',
        '加少许生抽、糖调味，撒葱花出锅'
      ]
    },
    {
      id: 2,
      name: '荠菜豆腐羹',
      icon: '🥣',
      cookTime: 20,
      calories: 150,
      seasonTag: '春',
      difficulty: '简单',
      description: '清香鲜美，春季养生佳品',
      steps: [
        '荠菜洗净切碎，嫩豆腐切小丁',
        '锅中加水烧开，放入豆腐丁煮1分钟',
        '加入荠菜末，搅拌均匀',
        '用水淀粉勾薄芡',
        '加盐、鸡精、香油调味',
        '撒上枸杞点缀，出锅装碗'
      ]
    },
    {
      id: 3,
      name: '油焖春笋',
      icon: '🥢',
      cookTime: 35,
      calories: 280,
      seasonTag: '春',
      difficulty: '中等',
      description: '甜咸适口，色泽红亮',
      steps: [
        '春笋剥壳，切滚刀块',
        '开水焯烫春笋5分钟，捞出沥干',
        '锅中放油烧热，下春笋煸炒2分钟',
        '加入生抽、老抽、冰糖、少许料酒',
        '加适量清水，大火烧开转小火焖15分钟',
        '大火收汁，淋香油出锅'
      ]
    },
    {
      id: 4,
      name: '香椿拌豆腐',
      icon: '🌿',
      cookTime: 15,
      calories: 120,
      seasonTag: '春',
      difficulty: '简单',
      description: '春日头鲜，清香扑鼻',
      steps: [
        '香椿洗净，入沸水焯烫至变色捞出',
        '香椿挤干水分，切成细末',
        '嫩豆腐切小块，摆盘',
        '香椿末放在豆腐上',
        '加入盐、生抽、香油调味',
        '吃时拌匀即可'
      ]
    },
    {
      id: 5,
      name: '马兰头拌香干',
      icon: '🥗',
      cookTime: 20,
      calories: 180,
      seasonTag: '春',
      difficulty: '简单',
      description: '清爽可口，江南春味',
      steps: [
        '马兰头洗净，开水焯烫1分钟捞出',
        '马兰头挤干水分，切碎',
        '香干切小丁',
        '将马兰头和香干混合',
        '加入盐、糖、生抽、香油拌匀',
        '整形装盘，撒上熟芝麻'
      ]
    },
    {
      id: 6,
      name: '春韭炒鸡蛋',
      icon: '🍳',
      cookTime: 15,
      calories: 250,
      seasonTag: '春',
      difficulty: '简单',
      description: '春韭鲜嫩，家常美味',
      steps: [
        '韭菜洗净切段，鸡蛋打散加少许盐',
        '热锅放油，倒入蛋液炒至凝固盛出',
        '锅中再放少许油，下韭菜梗煸炒',
        '加入韭菜叶快速翻炒',
        '倒入炒好的鸡蛋，加盐调味',
        '翻炒均匀即可出锅'
      ]
    }
  ],
  summer: [
    {
      id: 7,
      name: '凉拌黄瓜',
      icon: '🥒',
      cookTime: 10,
      calories: 50,
      seasonTag: '夏',
      difficulty: '简单',
      description: '清凉爽口，夏日必备',
      steps: [
        '黄瓜洗净，用刀拍碎切段',
        '加盐腌制5分钟，倒掉多余水分',
        '加入蒜末、生抽、香醋',
        '加少许糖和香油',
        '撒上干辣椒碎',
        '热油浇在辣椒上激发香气，拌匀即可'
      ]
    },
    {
      id: 8,
      name: '番茄鸡蛋汤',
      icon: '🍅',
      cookTime: 15,
      calories: 90,
      seasonTag: '夏',
      difficulty: '简单',
      description: '酸甜开胃，营养丰富',
      steps: [
        '番茄切块，鸡蛋打散',
        '锅中放油，炒香葱花',
        '加入番茄炒至出汁',
        '加适量清水，大火烧开',
        '淋入蛋液，形成蛋花',
        '加盐、鸡精调味，撒香菜出锅'
      ]
    },
    {
      id: 9,
      name: '冬瓜排骨汤',
      icon: '🍖',
      cookTime: 60,
      calories: 280,
      seasonTag: '夏',
      difficulty: '中等',
      description: '清热解暑，汤鲜味美',
      steps: [
        '排骨焯水去血沫，捞出洗净',
        '冬瓜去皮切大块，姜切片',
        '砂锅加水，放入排骨、姜片',
        '大火烧开转小火炖40分钟',
        '加入冬瓜，继续炖15分钟',
        '加盐调味，撒葱花即可'
      ]
    },
    {
      id: 10,
      name: '蒜蓉空心菜',
      icon: '🥬',
      cookTime: 12,
      calories: 120,
      seasonTag: '夏',
      difficulty: '简单',
      description: '蒜香浓郁，脆嫩爽口',
      steps: [
        '空心菜洗净切段，大蒜切末',
        '热锅放油，爆香一半蒜末',
        '下空心菜大火快速翻炒',
        '加少许生抽和盐调味',
        '出锅前加入剩下的蒜末',
        '翻炒均匀即可装盘'
      ]
    },
    {
      id: 11,
      name: '凉拌木耳',
      icon: '🫶',
      cookTime: 20,
      calories: 80,
      seasonTag: '夏',
      difficulty: '简单',
      description: 'Q弹爽口，降脂养颜',
      steps: [
        '木耳提前泡发，撕成小朵',
        '开水焯烫木耳2分钟，捞出过凉水',
        '沥干水分，加入蒜末、小米辣',
        '加生抽、香醋、糖、盐',
        '撒上香菜和熟芝麻',
        '淋上热油激发香气，拌匀即可'
      ]
    },
    {
      id: 12,
      name: '丝瓜炒蛋',
      icon: '🥒',
      cookTime: 15,
      calories: 180,
      seasonTag: '夏',
      difficulty: '简单',
      description: '清甜滑嫩，夏日小清新',
      steps: [
        '丝瓜去皮切滚刀块，鸡蛋打散',
        '热锅炒蛋，凝固后盛出备用',
        '锅中放少许油，下丝瓜翻炒',
        '加少许水焖煮2分钟至软',
        '倒入炒好的鸡蛋，加盐调味',
        '撒上枸杞，翻炒均匀出锅'
      ]
    }
  ],
  autumn: [
    {
      id: 13,
      name: '板栗烧鸡',
      icon: '🌰',
      cookTime: 45,
      calories: 420,
      seasonTag: '秋',
      difficulty: '中等',
      description: '秋栗飘香，鸡肉鲜嫩',
      steps: [
        '鸡肉切块焯水，板栗去壳',
        '锅中放油，爆香姜片、葱段',
        '下鸡块煸炒至金黄',
        '加料酒、生抽、老抽、冰糖',
        '加清水没过鸡肉，大火烧开转小火炖20分钟',
        '加入板栗，继续炖15分钟，大火收汁即可'
      ]
    },
    {
      id: 14,
      name: '桂花糖藕',
      icon: '🪷',
      cookTime: 90,
      calories: 350,
      seasonTag: '秋',
      difficulty: '困难',
      description: '软糯香甜，桂花飘香',
      steps: [
        '糯米提前浸泡2小时，莲藕去皮',
        '莲藕一头切开，将糯米灌入藕孔中',
        '用牙签将切下的藕盖固定回去',
        '锅中加水，放入红糖、冰糖、桂花',
        '大火烧开转小火煮1.5小时',
        '捞出切片，淋上糖桂花和蜂蜜即可'
      ]
    },
    {
      id: 15,
      name: '南瓜粥',
      icon: '🎃',
      cookTime: 30,
      calories: 180,
      seasonTag: '秋',
      difficulty: '简单',
      description: '香甜软糯，暖胃养生',
      steps: [
        '南瓜去皮切小块，大米淘洗干净',
        '锅中加水，放入大米大火烧开',
        '转小火煮20分钟至米粒开花',
        '加入南瓜块，继续煮10分钟',
        '用勺子将南瓜压碎，搅拌均匀',
        '加少许冰糖调味，煮至融化即可'
      ]
    },
    {
      id: 16,
      name: '山药排骨汤',
      icon: '🥘',
      cookTime: 50,
      calories: 310,
      seasonTag: '秋',
      difficulty: '简单',
      description: '健脾养胃，秋季进补',
      steps: [
        '排骨焯水去血沫，山药去皮切滚刀块',
        '砂锅加水，放入排骨、姜片',
        '大火烧开转小火炖30分钟',
        '加入山药和枸杞',
        '继续炖15分钟至山药软糯',
        '加盐调味，撒葱花即可'
      ]
    },
    {
      id: 17,
      name: '红烧茄子',
      icon: '🍆',
      cookTime: 25,
      calories: 260,
      seasonTag: '秋',
      difficulty: '简单',
      description: '软糯入味，酱香浓郁',
      steps: [
        '茄子切滚刀块，加少许盐腌制10分钟',
        '挤出茄子水分，裹上一层淀粉',
        '锅中放油，炸至金黄捞出',
        '锅中留底油，爆香蒜末',
        '加生抽、老抽、糖、醋调成酱汁',
        '倒入茄子，快速翻炒均匀，撒葱花出锅'
      ]
    },
    {
      id: 18,
      name: '芋艿桂花糖',
      icon: '🥔',
      cookTime: 35,
      calories: 200,
      seasonTag: '秋',
      difficulty: '简单',
      description: '软糯香甜，桂香四溢',
      steps: [
        '芋艿去皮切小块（戴手套防痒）',
        '锅中加水，放入芋艿',
        '大火烧开转小火煮20分钟至软糯',
        '加入冰糖煮至融化',
        '撒上干桂花',
        '关火焖5分钟，盛出即可食用'
      ]
    }
  ],
  winter: [
    {
      id: 19,
      name: '羊肉汤',
      icon: '🍲',
      cookTime: 120,
      calories: 380,
      seasonTag: '冬',
      difficulty: '中等',
      description: '暖身驱寒，汤鲜味醇',
      steps: [
        '羊肉切块，冷水下锅焯水去血沫',
        '捞出羊肉用温水洗净',
        '砂锅中加水，放入羊肉、姜片、葱段',
        '加料酒、花椒、八角',
        '大火烧开转小火炖2小时',
        '加盐、白胡椒粉调味，撒香菜和蒜叶'
      ]
    },
    {
      id: 20,
      name: '萝卜牛腩煲',
      icon: '🥘',
      cookTime: 90,
      calories: 450,
      seasonTag: '冬',
      difficulty: '中等',
      description: '软烂入味，冬日暖身',
      steps: [
        '牛腩切块焯水，萝卜切滚刀块',
        '锅中放油，爆香姜片、八角、桂皮',
        '下牛腩煸炒至表面微黄',
        '加料酒、生抽、老抽、豆瓣酱',
        '加开水没过牛腩，大火烧开转小火炖60分钟',
        '加入萝卜，继续炖20分钟，大火收汁即可'
      ]
    },
    {
      id: 21,
      name: '酸菜白肉',
      icon: '🥬',
      cookTime: 60,
      calories: 350,
      seasonTag: '冬',
      difficulty: '中等',
      description: '酸香开胃，暖身暖心',
      steps: [
        '五花肉加水煮熟，捞出晾凉切片',
        '酸菜切丝，粉丝泡软',
        '锅中放少许油，爆香葱花',
        '下酸菜煸炒出香味',
        '加入煮肉的原汤，放入五花肉片',
        '炖15分钟，加粉丝、盐、白胡椒粉调味'
      ]
    },
    {
      id: 22,
      name: '酒酿圆子',
      icon: '🍡',
      cookTime: 20,
      calories: 220,
      seasonTag: '冬',
      difficulty: '简单',
      description: '甜糯暖心，冬日甜品',
      steps: [
        '糯米粉加热水揉成光滑面团',
        '搓成小圆子，大小均匀',
        '锅中加水烧开，放入圆子',
        '煮至圆子浮起，加入酒酿',
        '加适量冰糖调味',
        '淋入水淀粉勾薄芡，撒桂花即可'
      ]
    },
    {
      id: 23,
      name: '红烧羊肉',
      icon: '🍖',
      cookTime: 80,
      calories: 480,
      seasonTag: '冬',
      difficulty: '中等',
      description: '软烂香浓，冬日进补',
      steps: [
        '羊肉切块，冷水焯水去血沫',
        '锅中放油，炒冰糖至枣红色',
        '下羊肉翻炒上色',
        '加生抽、老抽、料酒、姜片',
        '加开水没过羊肉，放八角、桂皮、香叶',
        '大火烧开转小火炖60分钟，大火收汁即可'
      ]
    },
    {
      id: 24,
      name: '冬笋炖鸡汤',
      icon: '🍗',
      cookTime: 90,
      calories: 280,
      seasonTag: '冬',
      difficulty: '简单',
      description: '清鲜滋补，温暖身心',
      steps: [
        '土鸡切块焯水，冬笋切片焯水',
        '砂锅中加水，放入鸡块、姜片',
        '大火烧开转小火炖60分钟',
        '加入冬笋片和火腿片',
        '继续炖20分钟',
        '加盐、枸杞调味，撒葱花即可'
      ]
    }
  ]
};

function getRandomItems<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

router.post('/', (req: Request, res: Response) => {
  const delay = Math.floor(Math.random() * 800) + 1000;
  
  setTimeout(() => {
    try {
      const { season = 'spring', ingredients = [], cuisine = null } = req.body;
      
      const seasonKey = season.toLowerCase();
      const seasonDishes = seasonalMenus[seasonKey] || seasonalMenus.spring;
      
      const selectedDishes = getRandomItems(seasonDishes, 4, 6);
      
      const menu = selectedDishes.map(dish => ({
        id: dish.id,
        name: dish.name,
        icon: dish.icon,
        cookTime: dish.cookTime,
        calories: dish.calories,
        steps: dish.steps,
        seasonTag: dish.seasonTag,
        difficulty: dish.difficulty,
        description: dish.description
      }));
      
      res.json({
        success: true,
        season: season,
        cuisine: cuisine || '家常菜',
        totalDishes: menu.length,
        totalCookTime: menu.reduce((sum, d) => sum + d.cookTime, 0),
        totalCalories: menu.reduce((sum, d) => sum + d.calories, 0),
        menu: menu
      });
    } catch (error) {
      res.status(500).json({ error: '菜单生成失败' });
    }
  }, delay);
});

export default router;
