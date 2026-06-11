import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const spicesData = [
  {
    id: 'cinnamon',
    name: '肉桂',
    nameEn: 'Cinnamon',
    color: '#e07a3c',
    description: '温暖甜辣，带有木质香气',
    baseFlavors: {
      spicy: 70,
      sweet: 60,
      warm: 85,
      woody: 50,
      floral: 20,
      herbaceous: 30
    }
  },
  {
    id: 'clove',
    name: '丁香',
    nameEn: 'Clove',
    color: '#4a2c6b',
    description: '浓郁芳香，带有辛辣暖感',
    baseFlavors: {
      spicy: 85,
      sweet: 40,
      warm: 75,
      woody: 45,
      floral: 55,
      herbaceous: 50
    }
  },
  {
    id: 'nutmeg',
    name: '肉豆蔻',
    nameEn: 'Nutmeg',
    color: '#b8860b',
    description: '温暖香甜，带有坚果气息',
    baseFlavors: {
      spicy: 55,
      sweet: 75,
      warm: 70,
      woody: 60,
      floral: 35,
      herbaceous: 45
    }
  },
  {
    id: 'cardamom',
    name: '小豆蔻',
    nameEn: 'Cardamom',
    color: '#6b8e23',
    description: '清新芳香，带有柠檬草香',
    baseFlavors: {
      spicy: 45,
      sweet: 55,
      warm: 50,
      woody: 35,
      floral: 65,
      herbaceous: 80
    }
  },
  {
    id: 'saffron',
    name: '藏红花',
    nameEn: 'Saffron',
    color: '#ffa500',
    description: '金黄花香，带有蜂蜜甜香',
    baseFlavors: {
      spicy: 30,
      sweet: 80,
      warm: 60,
      woody: 25,
      floral: 90,
      herbaceous: 40
    }
  }
];

let recipes = [];

app.get('/api/spices', (req, res) => {
  res.json(spicesData);
});

app.get('/api/recipes', (req, res) => {
  res.json(recipes.slice(0, 10));
});

app.post('/api/recipes', (req, res) => {
  const { name, spiceId, grindDuration, grindSpeed, flavorValues } = req.body;
  
  if (!name || !spiceId || !flavorValues) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  if (name.length > 20) {
    return res.status(400).json({ error: '配方名称不能超过20字' });
  }
  
  const newRecipe = {
    id: uuidv4(),
    name,
    spiceId,
    grindDuration: grindDuration || 0,
    grindSpeed: grindSpeed || 100,
    flavorValues,
    createdAt: new Date().toISOString()
  };
  
  recipes.unshift(newRecipe);
  
  if (recipes.length > 10) {
    recipes = recipes.slice(0, 10);
  }
  
  res.status(201).json(newRecipe);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '配方不存在' });
  }
  res.json(recipe);
});

app.listen(PORT, () => {
  console.log(`香料研磨实验室服务器运行在 http://localhost:${PORT}`);
});
