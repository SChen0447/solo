import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type {
  Material,
  Recipe,
  Potion,
  Bid,
  ExchangeOffer,
  User,
  BrewRequest,
  BrewResponse,
  ApiResponse,
} from '../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function readJSON<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJSON<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/materials', (_req: Request, res: Response<ApiResponse<Material[]>>) => {
  try {
    const data = readJSON<{ materials: Material[] }>('materials.json');
    res.json({ success: true, data: data.materials });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取材料数据失败' });
  }
});

app.get('/api/recipes', (_req: Request, res: Response<ApiResponse<Recipe[]>>) => {
  try {
    const data = readJSON<{ recipes: Recipe[] }>('recipes.json');
    res.json({ success: true, data: data.recipes });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取配方数据失败' });
  }
});

app.post('/api/brew', (req: Request<unknown, unknown, BrewRequest>, res: Response<BrewResponse>) => {
  try {
    const { materials, userId } = req.body;
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ success: false, message: '请添加材料' });
    }

    const recipesData = readJSON<{ recipes: Recipe[] }>('recipes.json');
    const usersData = readJSON<{ users: User[] }>('users.json');
    const user = usersData.users.find((u) => u.id === userId) || usersData.users[0];

    const sortedInput = [...materials].sort();
    const matchedRecipe = recipesData.recipes.find((r) => {
      const sortedRecipe = [...r.materials].sort();
      if (sortedInput.length !== sortedRecipe.length) return false;
      return sortedInput.every((m, i) => m === sortedRecipe[i]);
    });

    if (!matchedRecipe) {
      return res.json({ success: false, message: '材料组合不匹配任何配方' });
    }

    const potion: Potion = {
      id: uuidv4(),
      name: matchedRecipe.resultPotion.name,
      effect: matchedRecipe.resultPotion.effect,
      color: matchedRecipe.resultPotion.color,
      rarity: matchedRecipe.resultPotion.rarity,
      volume: Math.floor(Math.random() * 40) + 60,
      recipeId: matchedRecipe.id,
      ownerId: user.id,
      ownerName: user.name,
      createdAt: Date.now(),
      listed: false,
      bidHistory: [],
    };

    const potionsData = readJSON<{ potions: Potion[] }>('potions.json');
    potionsData.potions.push(potion);
    writeJSON('potions.json', potionsData);

    res.json({ success: true, potion, recipe: matchedRecipe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '酿造失败' });
  }
});

app.get('/api/potions', (_req: Request, res: Response<ApiResponse<Potion[]>>) => {
  try {
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const listed = data.potions.filter((p) => p.listed);
    res.json({ success: true, data: listed });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取魔药数据失败' });
  }
});

app.get('/api/potions/:id', (req: Request, res: Response<ApiResponse<Potion>>) => {
  try {
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const potion = data.potions.find((p) => p.id === req.params.id);
    if (!potion) {
      return res.status(404).json({ success: false, message: '魔药不存在' });
    }
    res.json({ success: true, data: potion });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取魔药详情失败' });
  }
});

app.get('/api/users/:userId/potions', (req: Request, res: Response<ApiResponse<Potion[]>>) => {
  try {
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const userPotions = data.potions.filter((p) => p.ownerId === req.params.userId);
    res.json({ success: true, data: userPotions });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取用户库存失败' });
  }
});

app.post('/api/potions/:id/list', (req: Request, res: Response<ApiResponse<Potion>>) => {
  try {
    const { price } = req.body;
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const idx = data.potions.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '魔药不存在' });
    }
    data.potions[idx].listed = true;
    data.potions[idx].price = price || data.potions[idx].price;
    writeJSON('potions.json', data);
    res.json({ success: true, data: data.potions[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: '上架失败' });
  }
});

app.post('/api/potions/:id/unlist', (req: Request, res: Response<ApiResponse<Potion>>) => {
  try {
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const idx = data.potions.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '魔药不存在' });
    }
    data.potions[idx].listed = false;
    writeJSON('potions.json', data);
    res.json({ success: true, data: data.potions[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: '下架失败' });
  }
});

app.post('/api/potions/:id/bid', (req: Request, res: Response<ApiResponse<Potion>>) => {
  try {
    const { price, bidderId, bidderName } = req.body;
    if (!price || price <= 0) {
      return res.status(400).json({ success: false, message: '请输入有效价格' });
    }
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const idx = data.potions.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '魔药不存在' });
    }
    const bid: Bid = {
      id: uuidv4(),
      bidderId: bidderId || 'local-user',
      bidderName: bidderName || '炼金学徒',
      price,
      timestamp: Date.now(),
    };
    data.potions[idx].bidHistory.push(bid);
    writeJSON('potions.json', data);
    res.json({ success: true, data: data.potions[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: '出价失败' });
  }
});

app.post('/api/potions/:id/rename', (req: Request, res: Response<ApiResponse<Potion>>) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: '请输入名称' });
    }
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const idx = data.potions.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '魔药不存在' });
    }
    data.potions[idx].name = name.trim();
    writeJSON('potions.json', data);
    res.json({ success: true, data: data.potions[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: '重命名失败' });
  }
});

app.delete('/api/potions/:id', (req: Request, res: Response<ApiResponse<null>>) => {
  try {
    const data = readJSON<{ potions: Potion[] }>('potions.json');
    const idx = data.potions.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '魔药不存在' });
    }
    data.potions.splice(idx, 1);
    writeJSON('potions.json', data);
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, message: '丢弃失败' });
  }
});

app.post('/api/exchange', (req: Request, res: Response<ApiResponse<ExchangeOffer>>) => {
  try {
    const { fromUserId, toUserId, offeredRecipeId, requestedRecipeId } = req.body;
    const exchangesData = readJSON<{ exchanges: ExchangeOffer[] }>('exchanges.json');
    const offer: ExchangeOffer = {
      id: uuidv4(),
      fromUserId,
      toUserId,
      offeredRecipeId,
      requestedRecipeId,
      status: 'pending',
      timestamp: Date.now(),
    };
    exchangesData.exchanges.push(offer);
    writeJSON('exchanges.json', exchangesData);
    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, message: '发起交换失败' });
  }
});

app.get('/api/users/:userId/exchanges', (req: Request, res: Response<ApiResponse<ExchangeOffer[]>>) => {
  try {
    const data = readJSON<{ exchanges: ExchangeOffer[] }>('exchanges.json');
    const exchanges = data.exchanges.filter(
      (e) => e.fromUserId === req.params.userId || e.toUserId === req.params.userId
    );
    res.json({ success: true, data: exchanges });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取交换邀请失败' });
  }
});

app.listen(PORT, () => {
  console.log(`魔药工坊后端服务运行在 http://localhost:${PORT}`);
});
