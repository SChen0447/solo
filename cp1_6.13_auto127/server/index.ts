import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { generateDish, generateRecommendedDishes } from './generator';
import type { GenerateRequest, FavoriteRequest, Dish, FavoriteItem } from './types';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

const favoritesStore: Map<string, FavoriteItem> = new Map();

app.post('/api/generate', (req: Request, res: Response) => {
  try {
    const { emotion, flavors } = req.body as GenerateRequest;

    if (!emotion) {
      return res.status(400).json({ error: '请选择情绪' });
    }

    if (!flavors || flavors.length === 0) {
      return res.status(400).json({ error: '请选择至少一种口味' });
    }

    const dish = generateDish(emotion, flavors);
    
    setTimeout(() => {
      res.json(dish);
    }, 800 + Math.random() * 400);
  } catch (error) {
    console.error('生成菜品失败:', error);
    res.status(500).json({ error: '生成菜品失败，请重试' });
  }
});

app.get('/api/recommended', (_req: Request, res: Response) => {
  try {
    const dishes = generateRecommendedDishes();
    res.json(dishes);
  } catch (error) {
    console.error('获取推荐菜品失败:', error);
    res.status(500).json({ error: '获取推荐菜品失败' });
  }
});

app.post('/api/favorite', (req: Request, res: Response) => {
  try {
    const { dish } = req.body as FavoriteRequest;

    if (!dish || !dish.id) {
      return res.status(400).json({ error: '菜品信息不完整' });
    }

    if (favoritesStore.has(dish.id)) {
      favoritesStore.delete(dish.id);
      res.json({ 
        success: true, 
        message: '已取消收藏',
        favorited: false 
      });
    } else {
      favoritesStore.set(dish.id, {
        dish,
        favoritedAt: new Date().toISOString()
      });
      res.json({ 
        success: true, 
        message: '收藏成功',
        favorited: true 
      });
    }
  } catch (error) {
    console.error('收藏操作失败:', error);
    res.status(500).json({ error: '收藏操作失败，请重试' });
  }
});

app.get('/api/favorites', (_req: Request, res: Response) => {
  try {
    const favorites = Array.from(favoritesStore.values()).sort((a, b) => 
      new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime()
    );
    res.json(favorites);
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

app.delete('/api/favorite/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (favoritesStore.has(id)) {
      favoritesStore.delete(id);
      res.json({ success: true, message: '已删除收藏' });
    } else {
      res.status(404).json({ error: '未找到该收藏' });
    }
  } catch (error) {
    console.error('删除收藏失败:', error);
    res.status(500).json({ error: '删除收藏失败' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 量子菜单后端服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔌 API 前缀: http://localhost:${PORT}/api`);
  console.log(`💫 准备好接收量子生成请求...\n`);
});
