import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Capsule, CreateCapsuleDto, ApiResponse, Emotion, EMOTION_LIST } from './types';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const capsules: Map<string, Capsule> = new Map();

const createSeedData = (): void => {
  const seeds: Array<{ text: string; image: string; emotion: Emotion }> = [
    {
      text: '那个夏天的午后，阳光透过树叶洒在操场上，我们一起笑着追逐蝴蝶。',
      image: '',
      emotion: 'yellow',
    },
    {
      text: '第一次独自旅行，站在山顶看日出，心中满是对未来的憧憬。',
      image: '',
      emotion: 'orange',
    },
    {
      text: '深夜的咖啡馆，一杯热咖啡和一本好书，时光静静流淌。',
      image: '',
      emotion: 'blue',
    },
    {
      text: '海边的黄昏，海浪拍打着礁石，世界只剩下宁静与我。',
      image: '',
      emotion: 'green',
    },
    {
      text: '毕业典礼那天，我们相拥而泣，那些青春的每一刻都值得珍藏。',
      image: '',
      emotion: 'red',
    },
    {
      text: '星空下的许愿，每一颗星星都承载着一个美好的梦。',
      image: '',
      emotion: 'purple',
    },
  ];

  seeds.forEach((seed) => {
    const id = uuidv4();
    capsules.set(id, {
      id,
      ...seed,
      createdAt: new Date().toISOString(),
    });
  });
};

createSeedData();

const sendResponse = <T>(res: Response, data: T | null, error?: string): void => {
  const response: ApiResponse<T> = {
    success: !error,
    data,
    ...(error ? { error } : {}),
  };
  res.json(response);
};

const isValidEmotion = (emotion: string): emotion is Emotion => {
  return EMOTION_LIST.includes(emotion as Emotion);
};

app.get('/api/capsules', (_req: Request, res: Response): void => {
  const capsuleList = Array.from(capsules.values());
  sendResponse(res, capsuleList);
});

app.post('/api/capsules', (req: Request, res: Response): void => {
  try {
    const { text, image, emotion } = req.body as CreateCapsuleDto;

    if (!text || text.trim().length === 0) {
      res.status(400);
      sendResponse(res, null, '文字内容不能为空');
      return;
    }

    if (!emotion || !isValidEmotion(emotion)) {
      res.status(400);
      sendResponse(res, null, '无效的情绪标签');
      return;
    }

    const id = uuidv4();
    const capsule: Capsule = {
      id,
      text: text.trim(),
      image: image || '',
      emotion,
      createdAt: new Date().toISOString(),
    };

    capsules.set(id, capsule);
    res.status(201);
    sendResponse(res, capsule);
  } catch (err) {
    res.status(500);
    sendResponse(res, null, '创建胶囊失败');
  }
});

app.get('/api/capsules/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const capsule = capsules.get(id);

  if (!capsule) {
    res.status(404);
    sendResponse(res, null, '胶囊不存在');
    return;
  }

  sendResponse(res, capsule);
});

app.delete('/api/capsules/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const deleted = capsules.delete(id);

  if (!deleted) {
    res.status(404);
    sendResponse(res, null, '胶囊不存在');
    return;
  }

  sendResponse(res, { id });
});

app.listen(PORT, (): void => {
  console.log(`Memory Prism Gallery server running on http://localhost:${PORT}`);
});
