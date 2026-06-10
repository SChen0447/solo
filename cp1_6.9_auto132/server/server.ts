import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

interface Ingredient {
  name: string;
  color: string;
  ratio: number;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  moodTag: string;
  isFavorite: boolean;
  createdAt: string;
}

let recipes: Recipe[] = [
  {
    id: '1',
    name: '宁静花园',
    ingredients: [
      { name: '玫瑰', color: '#ff88aa', ratio: 40 },
      { name: '茉莉', color: '#ffbbdd', ratio: 30 },
      { name: '薰衣草', color: '#aa88dd', ratio: 30 },
    ],
    moodTag: 'calm',
    isFavorite: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '幻梦森林',
    ingredients: [
      { name: '雪松', color: '#88aa55', ratio: 50 },
      { name: '琥珀', color: '#cc8844', ratio: 30 },
      { name: '薄荷', color: '#88ddcc', ratio: 20 },
    ],
    moodTag: 'dreamy',
    isFavorite: false,
    createdAt: new Date().toISOString(),
  },
];

const generateId = () => Math.random().toString(36).substring(2, 11);

app.get('/recipes', (req: Request, res: Response) => {
  const mood = req.query.mood as string;
  if (mood) {
    const filtered = recipes.filter((r) => r.moodTag === mood);
    return res.json(filtered);
  }
  res.json(recipes);
});

app.get('/recipes/:id', (req: Request, res: Response) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '配方未找到' });
  }
  res.json(recipe);
});

app.post('/recipes', (req: Request, res: Response) => {
  const { name, ingredients, moodTag } = req.body;
  if (!name || !ingredients || !moodTag) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  if (name.length > 20) {
    return res.status(400).json({ error: '名称最多20个字符' });
  }
  const newRecipe: Recipe = {
    id: generateId(),
    name,
    ingredients,
    moodTag,
    isFavorite: false,
    createdAt: new Date().toISOString(),
  };
  recipes.push(newRecipe);
  res.status(201).json(newRecipe);
});

app.patch('/recipes/:id/favorite', (req: Request, res: Response) => {
  const recipe = recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '配方未找到' });
  }
  recipe.isFavorite = !recipe.isFavorite;
  res.json(recipe);
});

app.delete('/recipes/:id', (req: Request, res: Response) => {
  const index = recipes.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '配方未找到' });
  }
  recipes.splice(index, 1);
  res.json({ message: '配方已删除' });
});

app.listen(PORT, () => {
  console.log(`梦境调香后端服务器运行在 http://localhost:${PORT}`);
});
