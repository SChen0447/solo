import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Ingredient {
  name: string;
  amount: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  cookTime: number;
  calories: number;
  cuisine: string;
  theme: string;
}

const recipeTemplates: Omit<Recipe, 'id'>[] = [
  {
    name: '番茄炒蛋',
    ingredients: [
      { name: '鸡蛋', amount: '3个' },
      { name: '番茄', amount: '2个' },
      { name: '洋葱', amount: '半个' },
      { name: '盐', amount: '适量' },
      { name: '糖', amount: '1小勺' }
    ],
    steps: [
      '鸡蛋打散，加少许盐搅拌均匀',
      '番茄切块，洋葱切丝备用',
      '热锅冷油，倒入蛋液炒至半凝固盛出',
      '锅中补少许油，下洋葱炒香',
      '加入番茄块翻炒出汁，加少许糖',
      '倒入炒好的鸡蛋，加盐调味翻炒均匀即可'
    ],
    cookTime: 20,
    calories: 380,
    cuisine: '中餐',
    theme: '番茄炒蛋'
  },
  {
    name: '香煎鸡胸肉配时蔬',
    ingredients: [
      { name: '鸡胸肉', amount: '200g' },
      { name: '洋葱', amount: '1个' },
      { name: '番茄', amount: '1个' },
      { name: '黑胡椒', amount: '适量' },
      { name: '橄榄油', amount: '2勺' }
    ],
    steps: [
      '鸡胸肉用刀背拍松，撒盐和黑胡椒腌制10分钟',
      '洋葱切圈，番茄切片备用',
      '平底锅加橄榄油，中火加热',
      '放入鸡胸肉，每面煎3-4分钟至金黄熟透',
      '加入洋葱圈和番茄片稍煎1分钟',
      '出锅摆盘，撒少许黑胡椒即可'
    ],
    cookTime: 25,
    calories: 420,
    cuisine: '西餐',
    theme: '鸡胸肉'
  },
  {
    name: '洋葱鸡蛋炒饭',
    ingredients: [
      { name: '鸡蛋', amount: '2个' },
      { name: '洋葱', amount: '1个' },
      { name: '隔夜米饭', amount: '2碗' },
      { name: '葱花', amount: '少许' },
      { name: '生抽', amount: '1勺' }
    ],
    steps: [
      '鸡蛋打散，洋葱切丁',
      '热锅加油，倒入蛋液炒散盛出',
      '锅中补油，下洋葱丁炒至透明',
      '加入米饭大火翻炒均匀',
      '倒入炒好的鸡蛋，加生抽调味',
      '撒葱花翻匀出锅'
    ],
    cookTime: 15,
    calories: 520,
    cuisine: '中餐',
    theme: '鸡蛋炒饭'
  },
  {
    name: '番茄鸡胸肉酱意面',
    ingredients: [
      { name: '鸡胸肉', amount: '150g' },
      { name: '番茄', amount: '2个' },
      { name: '洋葱', amount: '半个' },
      { name: '意面', amount: '100g' },
      { name: '番茄酱', amount: '2勺' }
    ],
    steps: [
      '意面按包装说明煮至八分熟，捞出备用',
      '鸡胸肉剁碎，番茄切块，洋葱切末',
      '热锅加油，炒香洋葱末',
      '加入鸡肉末炒至变色',
      '加入番茄和番茄酱，小火煮5分钟成酱',
      '倒入意面翻拌均匀，收汁即可'
    ],
    cookTime: 35,
    calories: 580,
    cuisine: '西餐',
    theme: '意面'
  },
  {
    name: '日式亲子丼',
    ingredients: [
      { name: '鸡蛋', amount: '2个' },
      { name: '鸡胸肉', amount: '100g' },
      { name: '洋葱', amount: '半个' },
      { name: '米饭', amount: '1碗' },
      { name: '日式酱油', amount: '2勺' }
    ],
    steps: [
      '鸡胸肉切小块，洋葱切丝',
      '小锅中加酱油、少许糖和水煮开',
      '放入鸡肉煮2分钟',
      '加入洋葱丝煮至变软',
      '鸡蛋稍微打散，淋入锅中',
      '盖盖焖30秒至蛋液半凝固，浇在米饭上'
    ],
    cookTime: 20,
    calories: 450,
    cuisine: '日料',
    theme: '亲子丼'
  },
  {
    name: '番茄洋葱浓汤',
    ingredients: [
      { name: '番茄', amount: '3个' },
      { name: '洋葱', amount: '1个' },
      { name: '鸡蛋', amount: '1个' },
      { name: '黄油', amount: '10g' },
      { name: '黑胡椒', amount: '适量' }
    ],
    steps: [
      '番茄去皮切块，洋葱切末',
      '锅中加黄油融化，炒香洋葱',
      '加入番茄翻炒出汁',
      '加适量清水煮开，小火炖10分钟',
      '用料理棒稍打至半糊状',
      '淋入打散的蛋液成蛋花，加盐和黑胡椒调味'
    ],
    cookTime: 25,
    calories: 220,
    cuisine: '西餐',
    theme: '浓汤'
  },
  {
    name: '香辣鸡丁',
    ingredients: [
      { name: '鸡胸肉', amount: '250g' },
      { name: '洋葱', amount: '1个' },
      { name: '干辣椒', amount: '5个' },
      { name: '花椒', amount: '少许' },
      { name: '生抽', amount: '1勺' }
    ],
    steps: [
      '鸡胸肉切丁，加生抽料酒淀粉腌制10分钟',
      '洋葱切块，干辣椒剪段',
      '热锅宽油，下鸡丁滑炒至变色盛出',
      '锅中留底油，爆香花椒和干辣椒',
      '下洋葱块翻炒至断生',
      '倒入鸡丁，加盐调味翻炒均匀出锅'
    ],
    cookTime: 30,
    calories: 480,
    cuisine: '中餐',
    theme: '鸡丁'
  },
  {
    name: '法式洋葱汤',
    ingredients: [
      { name: '洋葱', amount: '2个' },
      { name: '鸡蛋', amount: '1个' },
      { name: '黄油', amount: '15g' },
      { name: '白兰地', amount: '1勺' },
      { name: '面包片', amount: '2片' }
    ],
    steps: [
      '洋葱切丝，锅中加黄油小火慢炒15分钟至焦糖色',
      '淋入白兰地点燃增香',
      '加适量清水或高汤煮开，小火炖10分钟',
      '鸡蛋打散，慢慢淋入汤中成蛋花',
      '面包片烤至金黄',
      '汤盛入碗中，放上烤面包即可'
    ],
    cookTime: 40,
    calories: 320,
    cuisine: '西餐',
    theme: '洋葱汤'
  },
  {
    name: '日式照烧鸡肉饭',
    ingredients: [
      { name: '鸡胸肉', amount: '200g' },
      { name: '鸡蛋', amount: '1个' },
      { name: '洋葱', amount: '半个' },
      { name: '照烧酱', amount: '3勺' },
      { name: '米饭', amount: '1碗' }
    ],
    steps: [
      '鸡胸肉用刀背拍松，抹上照烧酱腌制15分钟',
      '洋葱切丝，鸡蛋煎成薄蛋皮切条',
      '平底锅煎鸡肉，每面3分钟至金黄',
      '剩余照烧酱加水煮开，收至浓稠',
      '鸡肉切片，摆在米饭上',
      '放上洋葱丝和蛋皮，淋上照烧汁'
    ],
    cookTime: 35,
    calories: 560,
    cuisine: '日料',
    theme: '照烧鸡肉'
  }
];

const substitutionMap: Record<string, string[]> = {
  '鸡蛋': ['豆腐（压碎替代鸡蛋炒）', '鹌鹑蛋（3-4个替代1个鸡蛋）'],
  '番茄': ['番茄酱（2勺替代1个番茄）', '红甜椒（切块）'],
  '洋葱': ['韭葱（切段替代）', '少量蒜末提味'],
  '鸡胸肉': ['鸡腿肉（去骨）', '猪里脊（切薄片）'],
  '米饭': ['糙米', '藜麦'],
  '意面': ['乌冬面', '荞麦面'],
  '黄油': ['橄榄油', '植物油'],
  '生抽': ['老抽（加少许糖）', '日式酱油'],
  '橄榄油': ['菜籽油', '玉米油'],
  '黑胡椒': ['白胡椒粉', '少许五香粉']
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pickRecipes(ingredients: string[]): Recipe[] {
  const lowerIngredients = ingredients.map(i => i.toLowerCase());
  const scored = recipeTemplates.map(r => {
    const recipeIngredients = r.ingredients.map(i => i.name.toLowerCase());
    let score = 0;
    lowerIngredients.forEach(ing => {
      if (recipeIngredients.some(ri => ri.includes(ing) || ing.includes(ri))) {
        score++;
      }
    });
    return { recipe: r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter(s => s.score > 0).slice(0, 3);
  let selected = top.length > 0 ? top.map(t => t.recipe) : recipeTemplates.slice(0, 3);
  if (selected.length < 3) {
    const remaining = recipeTemplates.filter(r => !selected.includes(r));
    selected = selected.concat(remaining.slice(0, 3 - selected.length));
  }
  return selected.map(r => ({
    ...r,
    id: Math.random().toString(36).substring(2, 10)
  }));
}

app.get('/api/generate', async (req: Request, res: Response) => {
  await delay(1000);
  const ingredientsParam = req.query.ingredients as string;
  const ingredients = ingredientsParam ? ingredientsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
  const recipes = pickRecipes(ingredients);
  res.json(recipes);
});

app.get('/api/suggest', async (req: Request, res: Response) => {
  await delay(1000);
  const ingredient = (req.query.ingredient as string) || '';
  const suggestions = substitutionMap[ingredient] || ['可根据口味选择相似风味的食材'];
  res.json({ ingredient, suggestions });
});

app.get('/api/cuisine-filter', async (req: Request, res: Response) => {
  await delay(1000);
  res.json({
    cookTime: [
      { label: '小于30分钟', value: '<30' },
      { label: '30-60分钟', value: '30-60' },
      { label: '大于60分钟', value: '>60' }
    ],
    cuisine: [
      { label: '中餐', value: '中餐' },
      { label: '西餐', value: '西餐' },
      { label: '日料', value: '日料' },
      { label: '其他', value: '其他' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Recipe server running on http://localhost:${PORT}`);
});
