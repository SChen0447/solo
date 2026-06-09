import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Recipe, Ingredient, Nutrition, NutritionDBItem } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const nutritionDB: NutritionDBItem[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'nutritionDB.json'), 'utf-8')
);

const recipes: Map<string, Recipe> = new Map();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function calculateNutrition(ingredients: Ingredient[], servings: number): Nutrition {
  const total: Nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };

  for (const ing of ingredients) {
    const dbItem = nutritionDB.find(item => item.name === ing.name);
    if (dbItem) {
      const factor = ing.amount / 100;
      total.calories += dbItem.calories * factor;
      total.protein += dbItem.protein * factor;
      total.fat += dbItem.fat * factor;
      total.carbs += dbItem.carbs * factor;
    }
  }

  return {
    calories: Math.round((total.calories / servings) * 10) / 10,
    protein: Math.round((total.protein / servings) * 10) / 10,
    fat: Math.round((total.fat / servings) * 10) / 10,
    carbs: Math.round((total.carbs / servings) * 10) / 10
  };
}

app.get('/api/ingredients', (_req, res) => {
  res.json(nutritionDB);
});

app.get('/api/ingredients/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase();
  if (!query) {
    return res.json([]);
  }
  const results = nutritionDB
    .filter(item => item.name.toLowerCase().includes(query))
    .slice(0, 5);
  res.json(results);
});

app.get('/api/recipes', (_req, res) => {
  res.json(Array.from(recipes.values()));
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱未找到' });
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const { name, description, cookTime, servings, ingredients } = req.body as Omit<Recipe, 'id' | 'nutritionPerServing'>;

  if (!name || !Array.isArray(ingredients) || !servings || !cookTime) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const id = generateId();
  const nutritionPerServing = calculateNutrition(ingredients, servings);
  const recipe: Recipe = {
    id,
    name,
    description: description || '',
    cookTime: Number(cookTime),
    servings: Number(servings),
    ingredients,
    nutritionPerServing
  };

  recipes.set(id, recipe);
  res.status(201).json(recipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const existing = recipes.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '食谱未找到' });
  }

  const { name, description, cookTime, servings, ingredients } = req.body as Omit<Recipe, 'id' | 'nutritionPerServing'>;

  if (!name || !Array.isArray(ingredients) || !servings || !cookTime) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const nutritionPerServing = calculateNutrition(ingredients, servings);
  const updated: Recipe = {
    id: req.params.id,
    name,
    description: description || '',
    cookTime: Number(cookTime),
    servings: Number(servings),
    ingredients,
    nutritionPerServing
  };

  recipes.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/recipes/:id', (req, res) => {
  const deleted = recipes.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: '食谱未找到' });
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`营养分析服务器运行在 http://localhost:${PORT}`);
  console.log(`已加载 ${nutritionDB.length} 种食材营养数据`);
});
