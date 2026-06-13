import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

interface User {
  id: string;
  username: string;
  password: string;
}

interface Taste {
  spicy: number;
  sour: number;
  sweet: number;
  salty: number;
  umami: number;
  fatty: number;
}

interface Recipe {
  id: string;
  name: string;
  province: string;
  description: string;
  imageUrl: string;
  taste: Taste;
  ingredients: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

const users: User[] = [
  { id: '1', username: '美食家', password: '123456' }
];

const provinces = [
  '北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
  '广东', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海', '台湾',
  '内蒙古', '广西', '西藏', '宁夏', '新疆', '香港', '澳门'
];

const generateMockTaste = (baseSpicy: number): Taste => ({
  spicy: Math.min(10, Math.max(0, baseSpicy + (Math.random() - 0.5) * 2)),
  sour: Math.random() * 10,
  sweet: Math.random() * 10,
  salty: Math.random() * 10,
  umami: Math.random() * 10,
  fatty: Math.random() * 10
});

const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: '麻婆豆腐',
    province: '四川',
    description: '经典川菜，麻辣鲜香，豆腐嫩滑',
    imageUrl: '',
    taste: { spicy: 8.5, sour: 2, sweet: 1, salty: 6, umami: 7, fatty: 5 },
    ingredients: '豆腐、牛肉末、豆瓣酱、花椒、辣椒、葱姜蒜',
    createdAt: '2024-01-15',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '2',
    name: '宫保鸡丁',
    province: '四川',
    description: '香辣可口，花生酥脆，鸡肉嫩滑',
    imageUrl: '',
    taste: { spicy: 7, sour: 4, sweet: 5, salty: 5, umami: 6, fatty: 4 },
    ingredients: '鸡胸肉、花生米、干辣椒、花椒、葱姜蒜、酱油',
    createdAt: '2024-01-20',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '3',
    name: '糖醋排骨',
    province: '江苏',
    description: '酸甜可口，外酥里嫩',
    imageUrl: '',
    taste: { spicy: 0, sour: 6, sweet: 8, salty: 3, umami: 5, fatty: 4 },
    ingredients: '猪排骨、白糖、醋、酱油、料酒、葱姜',
    createdAt: '2024-02-01',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '4',
    name: '红烧肉',
    province: '湖南',
    description: '肥而不腻，入口即化',
    imageUrl: '',
    taste: { spicy: 2, sour: 1, sweet: 5, salty: 6, umami: 8, fatty: 9 },
    ingredients: '五花肉、冰糖、酱油、料酒、八角、桂皮',
    createdAt: '2024-02-10',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '5',
    name: '白切鸡',
    province: '广东',
    description: '皮爽肉滑，原汁原味',
    imageUrl: '',
    taste: { spicy: 0, sour: 1, sweet: 1, salty: 4, umami: 9, fatty: 3 },
    ingredients: '三黄鸡、姜葱、酱油、花生油',
    createdAt: '2024-02-15',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '6',
    name: '酸辣土豆丝',
    province: '贵州',
    description: '酸辣爽脆，开胃下饭',
    imageUrl: '',
    taste: { spicy: 6, sour: 7, sweet: 1, salty: 5, umami: 4, fatty: 2 },
    ingredients: '土豆、干辣椒、醋、花椒、葱姜蒜',
    createdAt: '2024-02-20',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '7',
    name: '北京烤鸭',
    province: '北京',
    description: '皮脆肉嫩，香气四溢',
    imageUrl: '',
    taste: { spicy: 0, sour: 1, sweet: 3, salty: 4, umami: 8, fatty: 7 },
    ingredients: '北京填鸭、荷叶饼、甜面酱、葱丝、黄瓜条',
    createdAt: '2024-03-01',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '8',
    name: '水煮鱼',
    province: '重庆',
    description: '麻辣鲜香，鱼肉嫩滑',
    imageUrl: '',
    taste: { spicy: 9, sour: 2, sweet: 0, salty: 6, umami: 8, fatty: 6 },
    ingredients: '草鱼、豆芽、干辣椒、花椒、豆瓣酱、葱姜蒜',
    createdAt: '2024-03-05',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '9',
    name: '西湖醋鱼',
    province: '浙江',
    description: '酸甜鲜嫩，鱼肉细腻',
    imageUrl: '',
    taste: { spicy: 0, sour: 7, sweet: 5, salty: 3, umami: 6, fatty: 2 },
    ingredients: '草鱼、醋、白糖、酱油、料酒、葱姜',
    createdAt: '2024-03-10',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '10',
    name: '佛跳墙',
    province: '福建',
    description: '山珍海味，浓郁鲜香',
    imageUrl: '',
    taste: { spicy: 0, sour: 1, sweet: 2, salty: 5, umami: 10, fatty: 6 },
    ingredients: '鲍鱼、海参、鱼翅、干贝、鸽蛋、花胶',
    createdAt: '2024-03-15',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '11',
    name: '羊肉泡馍',
    province: '陕西',
    description: '汤浓肉烂，馍筋道',
    imageUrl: '',
    taste: { spicy: 1, sour: 0, sweet: 0, salty: 7, umami: 8, fatty: 5 },
    ingredients: '羊肉、烙饼、粉丝、木耳、黄花菜、葱姜蒜',
    createdAt: '2024-03-20',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '12',
    name: '螺蛳粉',
    province: '广西',
    description: '酸辣鲜爽，味道独特',
    imageUrl: '',
    taste: { spicy: 7, sour: 6, sweet: 1, salty: 6, umami: 8, fatty: 3 },
    ingredients: '螺蛳、米粉、酸笋、腐竹、花生米、木耳',
    createdAt: '2024-03-25',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '13',
    name: '大盘鸡',
    province: '新疆',
    description: '麻辣鲜香，分量十足',
    imageUrl: '',
    taste: { spicy: 8, sour: 1, sweet: 2, salty: 6, umami: 7, fatty: 5 },
    ingredients: '土鸡、土豆、青椒、皮带面、干辣椒、花椒',
    createdAt: '2024-04-01',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '14',
    name: '锅包肉',
    province: '黑龙江',
    description: '外酥里嫩，酸甜可口',
    imageUrl: '',
    taste: { spicy: 0, sour: 6, sweet: 8, salty: 2, umami: 5, fatty: 6 },
    ingredients: '猪里脊肉、土豆淀粉、白糖、醋、番茄酱、葱姜',
    createdAt: '2024-04-05',
    authorId: '1',
    authorName: '美食家'
  },
  {
    id: '15',
    name: '汽锅鸡',
    province: '云南',
    description: '汤清味醇，鸡肉鲜嫩',
    imageUrl: '',
    taste: { spicy: 0, sour: 0, sweet: 1, salty: 4, umami: 9, fatty: 3 },
    ingredients: '土鸡、三七、虫草花、枸杞、姜片',
    createdAt: '2024-04-10',
    authorId: '1',
    authorName: '美食家'
  }
];

let recipes: Recipe[] = [...mockRecipes];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const user: User = {
    id: uuidv4(),
    username,
    password
  };
  users.push(user);
  res.json({ id: user.id, username: user.username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ id: user.id, username: user.username });
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }
    const filename = `${uuidv4()}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    let quality = 80;
    let compressedBuffer = await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    while (compressedBuffer.length > 200 * 1024 && quality > 20) {
      quality -= 10;
      compressedBuffer = await sharp(req.file.buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
    }

    fs.writeFileSync(filepath, compressedBuffer);
    res.json({ imageUrl: `/uploads/${filename}` });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

app.get('/api/recipes', (req, res) => {
  const { province, search, spicy, sour, sweet, salty, umami, fatty } = req.query;
  let filtered = [...recipes];

  if (province) {
    filtered = filtered.filter(r => r.province === province);
  }

  if (search) {
    const keyword = (search as string).toLowerCase();
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(keyword) ||
      r.description.toLowerCase().includes(keyword) ||
      r.ingredients.toLowerCase().includes(keyword)
    );
  }

  const filterTaste = (key: keyof Taste, value: string | undefined) => {
    if (value) {
      const num = parseFloat(value);
      filtered = filtered.filter(r => r.taste[key] >= num);
    }
  };

  filterTaste('spicy', spicy as string);
  filterTaste('sour', sour as string);
  filterTaste('sweet', sweet as string);
  filterTaste('salty', salty as string);
  filterTaste('umami', umami as string);
  filterTaste('fatty', fatty as string);

  res.json(filtered);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '菜谱不存在' });
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const { name, province, description, imageUrl, taste, ingredients, authorId, authorName } = req.body;

  if (!name || !province || !taste) {
    return res.status(400).json({ error: '请填写必要信息' });
  }

  const recipe: Recipe = {
    id: uuidv4(),
    name,
    province,
    description: description || '',
    imageUrl: imageUrl || '',
    taste,
    ingredients: ingredients || '',
    createdAt: new Date().toISOString().split('T')[0],
    authorId: authorId || '',
    authorName: authorName || '匿名用户'
  };

  recipes.unshift(recipe);
  res.status(201).json(recipe);
});

app.get('/api/taste-map', (req, res) => {
  const provinceData: Record<string, { count: number; avgSpicy: number; avgTaste: Taste }> = {};

  for (const province of provinces) {
    const provinceRecipes = recipes.filter(r => r.province === province);
    if (provinceRecipes.length > 0) {
      const avgTaste: Taste = {
        spicy: 0,
        sour: 0,
        sweet: 0,
        salty: 0,
        umami: 0,
        fatty: 0
      };
      for (const recipe of provinceRecipes) {
        avgTaste.spicy += recipe.taste.spicy;
        avgTaste.sour += recipe.taste.sour;
        avgTaste.sweet += recipe.taste.sweet;
        avgTaste.salty += recipe.taste.salty;
        avgTaste.umami += recipe.taste.umami;
        avgTaste.fatty += recipe.taste.fatty;
      }
      for (const key of Object.keys(avgTaste) as (keyof Taste)[]) {
        avgTaste[key] = parseFloat((avgTaste[key] / provinceRecipes.length).toFixed(2));
      }
      provinceData[province] = {
        count: provinceRecipes.length,
        avgSpicy: avgTaste.spicy,
        avgTaste
      };
    } else {
      provinceData[province] = {
        count: 0,
        avgSpicy: 0,
        avgTaste: { spicy: 0, sour: 0, sweet: 0, salty: 0, umami: 0, fatty: 0 }
      };
    }
  }

  res.json(provinceData);
});

app.get('/api/provinces', (req, res) => {
  res.json(provinces);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
