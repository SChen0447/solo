import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Bottle, CreateBottleRequest, ReplyBottleRequest, MAX_REPLIES } from './types';

const router = Router();

const bottles: Map<string, Bottle> = new Map();

export function getBottlesCount(): number {
  return bottles.size;
}

router.get('/', (_req: Request, res: Response) => {
  const activeBottles = Array.from(bottles.values()).filter(b => b.status === 'active');
  res.json(activeBottles);
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { content, emoji, mood, appearance } = req.body as CreateBottleRequest;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: '内容不能为空' });
    }
    if (content.length < 10 || content.length > 200) {
      return res.status(400).json({ error: '内容字数需在10-200字之间' });
    }
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: '请选择emoji' });
    }
    if (!mood || typeof mood !== 'string') {
      return res.status(400).json({ error: '请选择心情' });
    }
    if (!appearance || !appearance.color || !appearance.texture) {
      return res.status(400).json({ error: '请选择外观' });
    }

    const bottle: Bottle = {
      id: uuidv4(),
      content,
      emoji,
      mood,
      appearance,
      replies: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    bottles.set(bottle.id, bottle);
    res.status(201).json(bottle);
  } catch (error) {
    res.status(500).json({ error: '创建瓶子失败' });
  }
});

router.post('/random', (_req: Request, res: Response) => {
  try {
    const activeBottles = Array.from(bottles.values()).filter(b => b.status === 'active');

    if (activeBottles.length === 0) {
      return res.status(404).json({ error: '大海中暂无漂流瓶' });
    }

    const randomIndex = Math.floor(Math.random() * activeBottles.length);
    res.json(activeBottles[randomIndex]);
  } catch (error) {
    res.status(500).json({ error: '捞取瓶子失败' });
  }
});

router.patch('/:id/reply', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bottle = bottles.get(id);

    if (!bottle) {
      return res.status(404).json({ error: '瓶子不存在' });
    }

    if (bottle.status === 'sealed') {
      return res.status(400).json({ error: '瓶子已封存，无法回复', sealed: true });
    }

    if (bottle.replies.length >= MAX_REPLIES) {
      bottle.status = 'sealed';
      return res.status(400).json({ error: '瓶子回复已满，已沉入海底', sealed: true });
    }

    const { content, mood } = req.body as ReplyBottleRequest;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: '回复内容不能为空' });
    }
    if (content.length < 10 || content.length > 100) {
      return res.status(400).json({ error: '回复字数需在10-100字之间' });
    }
    if (!mood || typeof mood !== 'string') {
      return res.status(400).json({ error: '请选择心情' });
    }

    const reply = {
      id: uuidv4(),
      content,
      mood,
      createdAt: new Date().toISOString(),
    };

    bottle.replies.push(reply);

    if (bottle.replies.length >= MAX_REPLIES) {
      bottle.status = 'sealed';
    }

    res.json({ bottle, justSealed: bottle.status === 'sealed' });
  } catch (error) {
    res.status(500).json({ error: '回复瓶子失败' });
  }
});

export default router;
