import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'dishes.json');

app.use(cors());
app.use(express.json());

interface RecipeStep {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  duration?: number;
}

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
  replies?: Comment[];
}

interface Version {
  version: string;
  timestamp: string;
  changelog?: string;
}

interface Dish {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  ingredientsHighlight: string[];
  steps: RecipeStep[];
  imageUrl?: string;
  rating: number;
  ratingCount: number;
  likes: number;
  comments: Comment[];
  versions: Version[];
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

function readDishes(): Dish[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data).dishes || [];
  } catch (err) {
    console.error('读取数据失败:', err);
    return [];
  }
}

function writeDishes(dishes: Dish[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ dishes }, null, 2), 'utf-8');
  } catch (err) {
    console.error('写入数据失败:', err);
  }
}

function generateVersion(): string {
  const now = new Date();
  const timestamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  return `v1.0_${timestamp}`;
}

function addCommentToTree(comments: Comment[], replyToId: string, newComment: Comment): boolean {
  for (let i = 0; i < comments.length; i++) {
    if (comments[i].id === replyToId) {
      if (!comments[i].replies) {
        comments[i].replies = [];
      }
      comments[i].replies!.unshift(newComment);
      return true;
    }
    if (comments[i].replies && comments[i].replies!.length > 0) {
      if (addCommentToTree(comments[i].replies!, replyToId, newComment)) {
        return true;
      }
    }
  }
  return false;
}

app.get('/api/dishes', (_req: Request, res: Response) => {
  const dishes = readDishes();
  res.json({ success: true, data: dishes });
});

app.get('/api/dishes/:id', (req: Request, res: Response) => {
  const dishes = readDishes();
  const dish = dishes.find((d) => d.id === req.params.id);
  if (!dish) {
    return res.status(404).json({ success: false, message: '菜谱不存在' });
  }
  res.json({ success: true, data: dish });
});

app.post('/api/dishes', (req: Request, res: Response) => {
  const dishes = readDishes();
  const body = req.body as Partial<Dish>;
  const now = new Date().toISOString();
  const version = generateVersion();

  const newDish: Dish = {
    id: uuidv4(),
    name: body.name || '未命名菜品',
    description: body.description || '',
    ingredients: body.ingredients || [],
    ingredientsHighlight: body.ingredientsHighlight || [],
    steps: body.steps || [],
    imageUrl: body.imageUrl,
    rating: 0,
    ratingCount: 0,
    likes: 0,
    comments: [],
    versions: [
      {
        version,
        timestamp: now,
        changelog: body.parentId ? '基于已有菜谱改进' : '初始版本',
      },
    ],
    parentId: body.parentId,
    createdAt: now,
    updatedAt: now,
  };

  dishes.unshift(newDish);
  writeDishes(dishes);
  res.json({ success: true, data: newDish });
});

app.post('/api/dishes/:id/like', (req: Request, res: Response) => {
  const dishes = readDishes();
  const dishIndex = dishes.findIndex((d) => d.id === req.params.id);
  if (dishIndex === -1) {
    return res.status(404).json({ success: false, message: '菜谱不存在' });
  }
  dishes[dishIndex].likes += 1;
  writeDishes(dishes);
  res.json({ success: true, data: { likes: dishes[dishIndex].likes } });
});

app.post('/api/dishes/:id/rating', (req: Request, res: Response) => {
  const dishes = readDishes();
  const dishIndex = dishes.findIndex((d) => d.id === req.params.id);
  if (dishIndex === -1) {
    return res.status(404).json({ success: false, message: '菜谱不存在' });
  }
  const { score } = req.body as { score: number };
  if (score < 1 || score > 5) {
    return res.status(400).json({ success: false, message: '评分必须在1-5之间' });
  }
  const dish = dishes[dishIndex];
  const newCount = dish.ratingCount + 1;
  const newRating = (dish.rating * dish.ratingCount + score) / newCount;
  dish.rating = Math.round(newRating * 10) / 10;
  dish.ratingCount = newCount;
  writeDishes(dishes);
  res.json({ success: true, data: { rating: dish.rating, ratingCount: dish.ratingCount } });
});

app.post('/api/dishes/:id/comment', (req: Request, res: Response) => {
  const dishes = readDishes();
  const dishIndex = dishes.findIndex((d) => d.id === req.params.id);
  if (dishIndex === -1) {
    return res.status(404).json({ success: false, message: '菜谱不存在' });
  }
  const { content, author, replyToId } = req.body as {
    content: string;
    author: string;
    replyToId?: string;
  };
  if (!content || !author) {
    return res.status(400).json({ success: false, message: '评论内容和作者必填' });
  }
  const newComment: Comment = {
    id: uuidv4(),
    author,
    content,
    createdAt: new Date().toISOString(),
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(author)}`,
  };
  if (replyToId) {
    addCommentToTree(dishes[dishIndex].comments, replyToId, newComment);
  } else {
    dishes[dishIndex].comments.unshift(newComment);
  }
  writeDishes(dishes);
  res.json({ success: true, data: newComment });
});

app.listen(PORT, () => {
  console.log(`虚拟厨房后端服务已启动: http://localhost:${PORT}`);
});
