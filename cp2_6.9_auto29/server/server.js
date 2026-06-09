import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_PATH = join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

function readData() {
  if (!existsSync(DATA_PATH)) {
    return { recipes: [], ingredients: [] };
  }
  const raw = readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/recipes', (req, res) => {
  const data = readData();
  res.json(data.recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const data = readData();
  const recipe = data.recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const data = readData();
  const newRecipe = {
    id: uuidv4(),
    favorite: false,
    coverImage: '',
    ...req.body
  };
  data.recipes.unshift(newRecipe);
  writeData(data);
  res.status(201).json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const data = readData();
  const idx = data.recipes.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  data.recipes[idx] = { ...data.recipes[idx], ...req.body, id: req.params.id };
  writeData(data);
  res.json(data.recipes[idx]);
});

app.delete('/api/recipes/:id', (req, res) => {
  const data = readData();
  const idx = data.recipes.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: '食谱不存在' });
  }
  const deleted = data.recipes.splice(idx, 1);
  writeData(data);
  res.json(deleted[0]);
});

app.post('/api/match', (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: '请提供食材列表' });
  }
  const data = readData();
  const userIngredients = ingredients.map((i) => i.trim().toLowerCase());

  const results = data.recipes.map((recipe) => {
    const recipeIngredients = recipe.ingredients.map((ing) => ing.name.trim().toLowerCase());
    const matched = recipeIngredients.filter((name) =>
      userIngredients.some((u) => name.includes(u) || u.includes(name))
    );
    const missing = recipeIngredients.filter(
      (name) => !userIngredients.some((u) => name.includes(u) || u.includes(name))
    );
    const matchRate = recipeIngredients.length === 0
      ? 0
      : Math.round((matched.length / recipeIngredients.length) * 100);
    return {
      recipe,
      matchRate,
      matchedCount: matched.length,
      totalCount: recipeIngredients.length,
      missingIngredients: missing
    };
  });

  results.sort((a, b) => b.matchRate - a.matchRate);
  res.json(results);
});

app.get('/api/ingredients', (req, res) => {
  const data = readData();
  res.json(data.ingredients);
});

app.listen(PORT, () => {
  console.log(`食谱 API 服务器运行在 http://localhost:${PORT}`);
});
