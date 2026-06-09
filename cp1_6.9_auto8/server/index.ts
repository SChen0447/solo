import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Recipe } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const DATA_FILE = path.join(__dirname, '..', 'data.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  const sampleRecipes: Recipe[] = [
    {
      id: uuidv4(),
      title: '番茄炒蛋',
      description: '经典家常菜，简单美味',
      ingredients: [
        { id: uuidv4(), name: '番茄', quantity: '2个' },
        { id: uuidv4(), name: '鸡蛋', quantity: '3个' },
        { id: uuidv4(), name: '葱花', quantity: '适量' },
        { id: uuidv4(), name: '盐', quantity: '少许' },
      ],
      steps: ['番茄切块，鸡蛋打散', '热锅下油，炒鸡蛋盛出', '下番茄翻炒出汁', '加入鸡蛋调味炒匀', '撒上葱花出锅'],
      tags: ['午餐', '晚餐', '快手菜'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: uuidv4(),
      title: '牛奶燕麦粥',
      description: '营养健康的早餐选择',
      ingredients: [
        { id: uuidv4(), name: '燕麦片', quantity: '50g' },
        { id: uuidv4(), name: '牛奶', quantity: '250ml' },
        { id: uuidv4(), name: '蜂蜜', quantity: '适量' },
      ],
      steps: ['燕麦片放入碗中', '加入热牛奶浸泡3分钟', '搅拌均匀，加蜂蜜调味'],
      tags: ['早餐', '素食'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: uuidv4(),
      title: '巧克力蛋糕',
      description: '浓郁丝滑的巧克力甜点',
      ingredients: [
        { id: uuidv4(), name: '低筋面粉', quantity: '100g' },
        { id: uuidv4(), name: '可可粉', quantity: '30g' },
        { id: uuidv4(), name: '鸡蛋', quantity: '4个' },
        { id: uuidv4(), name: '白砂糖', quantity: '80g' },
        { id: uuidv4(), name: '黄油', quantity: '50g' },
      ],
      steps: ['蛋白蛋黄分离', '打发蛋白至硬性发泡', '蛋黄加糖黄油打发', '筛入粉类拌匀', '混合蛋白糊入模烘烤'],
      tags: ['甜点'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  fs.writeFileSync(DATA_FILE, JSON.stringify(sampleRecipes, null, 2));
}

app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  },
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG 和 PNG 格式图片'));
    }
  },
});

function readRecipes(): Recipe[] {
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeRecipes(recipes: Recipe[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2));
}

app.get('/api/recipes', (req, res) => {
  try {
    const recipes = readRecipes();
    const query = (req.query.q as string)?.toLowerCase() || '';
    const tagsParam = req.query.tags as string;
    const selectedTags = tagsParam ? tagsParam.split(',') : [];

    let filtered = recipes;

    if (query) {
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(query))
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((r) =>
        selectedTags.every((tag) => r.tags.includes(tag))
      );
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: '获取食谱列表失败' });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const recipes = readRecipes();
    const recipe = recipes.find((r) => r.id === req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: '获取食谱详情失败' });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const recipes = readRecipes();
    const newRecipe: Recipe = {
      id: uuidv4(),
      ...req.body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    recipes.unshift(newRecipe);
    writeRecipes(recipes);
    res.status(201).json(newRecipe);
  } catch (error) {
    res.status(500).json({ error: '创建食谱失败' });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  try {
    const recipes = readRecipes();
    const index = recipes.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    recipes[index] = {
      ...recipes[index],
      ...req.body,
      id: recipes[index].id,
      createdAt: recipes[index].createdAt,
      updatedAt: Date.now(),
    };
    writeRecipes(recipes);
    res.json(recipes[index]);
  } catch (error) {
    res.status(500).json({ error: '更新食谱失败' });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  try {
    const recipes = readRecipes();
    const filtered = recipes.filter((r) => r.id !== req.params.id);
    if (filtered.length === recipes.length) {
      return res.status(404).json({ error: '食谱不存在' });
    }
    writeRecipes(filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除食谱失败' });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传图片' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/recommendations', (req, res) => {
  try {
    const recipes = readRecipes();
    const recentTagsParam = req.query.tags as string;
    const recentTags = recentTagsParam ? recentTagsParam.split(',') : [];

    let candidates: Recipe[];
    if (recentTags.length > 0) {
      candidates = recipes.filter((r) => r.tags.some((tag) => recentTags.includes(tag)));
    }
    if (!candidates || candidates.length < 3) {
      candidates = recipes;
    }

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const unique = shuffled.filter(
      (recipe, index, self) => index === self.findIndex((r) => r.id === recipe.id)
    );
    res.json(unique.slice(0, 3));
  } catch (error) {
    res.status(500).json({ error: '获取推荐失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
