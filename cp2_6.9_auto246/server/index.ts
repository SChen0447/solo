import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Reply {
  id: string;
  content: string;
  type: 'continue' | 'refute';
  likes: number;
  createdAt: number;
}

interface Idea {
  id: string;
  content: string;
  replies: Reply[];
  createdAt: number;
}

const mockReplies1: Reply[] = [
  {
    id: uuidv4(),
    content: '时间是最公平的裁判，它会证明一切。',
    type: 'continue',
    likes: 12,
    createdAt: Date.now() - 3600000,
  },
  {
    id: uuidv4(),
    content: '但有时候我们往往忽略了当下的感受才是最真实的。',
    type: 'refute',
    likes: 8,
    createdAt: Date.now() - 7200000,
  },
  {
    id: uuidv4(),
    content: '或许两者兼得才是完美的人生。',
    type: 'continue',
    likes: 5,
    createdAt: Date.now() - 10800000,
  },
];

const mockReplies2: Reply[] = [
  {
    id: uuidv4(),
    content: '正是这些碎片拼凑成了我们的记忆长河。',
    type: 'continue',
    likes: 20,
    createdAt: Date.now() - 1800000,
  },
  {
    id: uuidv4(),
    content: '可碎片太多反而让人迷失方向。',
    type: 'refute',
    likes: 3,
    createdAt: Date.now() - 5400000,
  },
];

const mockIdeas: Idea[] = [
  {
    id: uuidv4(),
    content:
      '每一个当下都是时间长河中的一粒沙，渺小却真实存在过。',
    replies: mockReplies1,
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    content:
      '生活从来都不是我们想象的那样，但又恰恰是我们经历的这样。',
    replies: mockReplies2,
    createdAt: Date.now() - 172800000,
  },
  {
    id: uuidv4(),
    content:
      '灵感就像闪电，转瞬即逝，但留下的光亮却能照亮很久。',
    replies: [],
    createdAt: Date.now() - 259200000,
  },
  {
    id: uuidv4(),
    content:
      '我们追逐的不是终点，其实是一路上的风景和陪伴我们的人。',
    replies: [
      {
        id: uuidv4(),
        content: '终点只是一个坐标，过程才是生命的意义。',
        type: 'continue',
        likes: 15,
        createdAt: Date.now() - 3600000,
      },
    ],
    createdAt: Date.now() - 345600000,
  },
  {
    id: uuidv4(),
    content:
      '沉默有时候比语言更有力量，因为它包含了所有未说出口的话。',
    replies: [],
    createdAt: Date.now() - 432000000,
  },
  {
    id: uuidv4(),
    content:
      '梦想不会逃跑，逃跑的永远是自己。',
    replies: [
      {
        id: uuidv4(),
        content: '所以勇敢迈出第一步，梦想就在前方。',
        type: 'continue',
        likes: 25,
        createdAt: Date.now() - 7200000,
      },
      {
        id: uuidv4(),
        content: '但有时候学会放弃也是一种智慧。',
        type: 'refute',
        likes: 7,
        createdAt: Date.now() - 14400000,
      },
    ],
    createdAt: Date.now() - 518400000,
  },
  {
    id: uuidv4(),
    content:
      '孤独是一个人的狂欢，狂欢是一群人的孤独。',
    replies: [],
    createdAt: Date.now() - 604800000,
  },
  {
    id: uuidv4(),
    content:
      '文字是灵魂的出口，也是心灵的归宿。',
    replies: [
      {
        id: uuidv4(),
        content: '每一个字都承载着作者的温度。',
        type: 'continue',
        likes: 18,
        createdAt: Date.now() - 10800000,
      },
    ],
    createdAt: Date.now() - 691200000,
  },
];

const ideas: Idea[] = [...mockIdeas];

app.get('/api/ideas', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || '';

  let filteredIdeas = ideas;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredIdeas = ideas.filter(
      (idea) =>
        idea.content.toLowerCase().includes(searchLower) ||
        idea.replies.some((r) => r.content.toLowerCase().includes(searchLower))
    );
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedIdeas = filteredIdeas.slice(startIndex, endIndex);

  res.json({
    data: paginatedIdeas,
    total: filteredIdeas.length,
    hasMore: endIndex < filteredIdeas.length,
  });
});

app.get('/api/ideas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    res.status(404).json({ error: '灵感不存在' });
    return;
  }
  res.json({ data: idea });
});

app.post('/api/ideas', (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: '内容不能为空' });
    return;
  }
  const newIdea: Idea = {
    id: uuidv4(),
    content: content.trim(),
    replies: [],
    createdAt: Date.now(),
  };
  ideas.unshift(newIdea);
  res.status(201).json({ data: newIdea });
});

app.post('/api/ideas/:id/reply', (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, type } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: '内容不能为空' });
    return;
  }
  if (type !== 'continue' && type !== 'refute') {
    res.status(400).json({ error: '类型必须是 continue 或 refute' });
    return;
  }

  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    res.status(404).json({ error: '灵感不存在' });
    return;
  }

  const newReply: Reply = {
    id: uuidv4(),
    content: content.trim(),
    type,
    likes: 0,
    createdAt: Date.now(),
  };

  idea.replies.push(newReply);
  res.status(201).json({ data: newReply });
});

app.post('/api/ideas/:ideaId/reply/:replyId/like', (req: Request, res: Response) => {
  const { ideaId, replyId } = req.params;
  const idea = ideas.find((i) => i.id === ideaId);
  if (!idea) {
    res.status(404).json({ error: '灵感不存在' });
    return;
  }
  const reply = idea.replies.find((r) => r.id === replyId);
  if (!reply) {
    res.status(404).json({ error: '续写不存在' });
    return;
  }
  reply.likes += 1;
  res.json({ data: reply });
});

app.listen(PORT, () => {
  console.log(`灵感画廊后端服务已启动: http://localhost:${PORT}`);
});
