import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 JPG/PNG 格式的图片'));
    }
  }
});

const ingredientsPool = [
  { name: '牛肉', icon: '🥩', category: '肉类' },
  { name: '鸡肉', icon: '🍗', category: '肉类' },
  { name: '猪肉', icon: '🥓', category: '肉类' },
  { name: '鱼肉', icon: '🐟', category: '海鲜' },
  { name: '虾', icon: '🦐', category: '海鲜' },
  { name: '鸡蛋', icon: '🥚', category: '蛋类' },
  { name: '豆腐', icon: '🧈', category: '豆制品' },
  { name: '青菜', icon: '🥬', category: '蔬菜' },
  { name: '番茄', icon: '🍅', category: '蔬菜' },
  { name: '土豆', icon: '🥔', category: '蔬菜' },
  { name: '胡萝卜', icon: '🥕', category: '蔬菜' },
  { name: '茄子', icon: '🍆', category: '蔬菜' },
  { name: '辣椒', icon: '🌶️', category: '调料' },
  { name: '大蒜', icon: '🧄', category: '调料' },
  { name: '葱', icon: '🧅', category: '调料' },
  { name: '生姜', icon: '🫚', category: '调料' },
  { name: '米饭', icon: '🍚', category: '主食' },
  { name: '面条', icon: '🍜', category: '主食' },
  { name: '蘑菇', icon: '🍄', category: '蔬菜' },
  { name: '玉米', icon: '🌽', category: '谷物' },
];

const cuisinesPool = [
  { name: '川菜', description: '麻辣鲜香', icon: '🌶️' },
  { name: '粤菜', description: '清淡鲜美', icon: '🥢' },
  { name: '日料', description: '精致新鲜', icon: '🍣' },
  { name: '意餐', description: '浓郁芝士', icon: '🍝' },
  { name: '法餐', description: '优雅精致', icon: '🥐' },
  { name: '韩餐', description: '辣甜可口', icon: '🥘' },
  { name: '泰餐', description: '酸辣开胃', icon: '🍛' },
  { name: '家常菜', description: '温馨可口', icon: '🏠' },
];

function getRandomItems<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

router.post('/', upload.single('image'), (req: Request, res: Response) => {
  const delay = Math.floor(Math.random() * 500) + 1500;

  setTimeout(() => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请上传图片文件' });
      }

      const ingredients = getRandomItems(ingredientsPool, 3, 5);
      const cuisine = cuisinesPool[Math.floor(Math.random() * cuisinesPool.length)];

      res.json({
        success: true,
        imageUrl: `/uploads/${req.file.filename}`,
        ingredients: ingredients,
        cuisine: cuisine,
        confidence: (Math.random() * 0.15 + 0.85).toFixed(2),
        processingTime: delay + 'ms'
      });
    } catch (error) {
      res.status(500).json({ error: '图片处理失败' });
    }
  }, delay);
});

export default router;
