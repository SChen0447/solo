import express, { Request, Response } from 'express';
import cors from 'cors';

interface VoteOption {
  text: string;
  count: number;
}

interface Vote {
  id: string;
  title: string;
  options: VoteOption[];
  createdAt: number;
  durationHours: number;
  status: 'active' | 'closed';
}

const app = express();
app.use(cors());
app.use(express.json());

const votes = new Map<string, Vote>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function checkAndUpdateStatus(vote: Vote): Vote {
  const now = Date.now();
  const expiresAt = vote.createdAt + vote.durationHours * 60 * 60 * 1000;
  if (now >= expiresAt && vote.status === 'active') {
    vote.status = 'closed';
  }
  return vote;
}

function getTotalVotes(vote: Vote): number {
  return vote.options.reduce((sum, opt) => sum + opt.count, 0);
}

app.post('/api/vote', (req: Request, res: Response) => {
  const startTime = Date.now();
  const { title, options, durationHours = 24 } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '投票标题不能为空' });
  }

  const validOptions = (options as string[])
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  if (validOptions.length < 2 || validOptions.length > 6) {
    return res.status(400).json({ error: '选项数量必须在2到6个之间' });
  }

  const validDurations = [1, 6, 12, 24, 48];
  if (!validDurations.includes(durationHours)) {
    return res.status(400).json({ error: '有效期必须是1/6/12/24/48小时之一' });
  }

  const id = generateId();
  const vote: Vote = {
    id,
    title: title.trim(),
    options: validOptions.map((text) => ({ text, count: 0 })),
    createdAt: Date.now(),
    durationHours,
    status: 'active',
  };

  votes.set(id, vote);

  const elapsed = Date.now() - startTime;
  if (elapsed < 50) {
    setTimeout(() => {
      res.json({ id });
    }, 50 - elapsed);
  } else {
    res.json({ id });
  }
});

app.get('/api/vote/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const vote = votes.get(id);

  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }

  checkAndUpdateStatus(vote);
  const totalVotes = getTotalVotes(vote);

  res.json({
    ...vote,
    totalVotes,
  });
});

app.post('/api/vote/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { optionIndex } = req.body;
  const vote = votes.get(id);

  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }

  checkAndUpdateStatus(vote);

  if (vote.status === 'closed') {
    return res.status(400).json({ error: '投票已结束' });
  }

  if (
    typeof optionIndex !== 'number' ||
    optionIndex < 0 ||
    optionIndex >= vote.options.length
  ) {
    return res.status(400).json({ error: '无效的选项索引' });
  }

  vote.options[optionIndex].count++;
  const totalVotes = getTotalVotes(vote);

  res.json({
    ...vote,
    totalVotes,
  });
});

app.get('/api/votes', (req: Request, res: Response) => {
  const startTime = Date.now();
  const { page = '1', pageSize = '10', filter = 'all' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const pageSizeNum = parseInt(pageSize as string, 10);

  const allVotes = Array.from(votes.values()).map((v) => {
    checkAndUpdateStatus(v);
    return v;
  });

  let filtered = allVotes;
  if (filter === 'active') {
    filtered = allVotes.filter((v) => v.status === 'active');
  } else if (filter === 'closed') {
    filtered = allVotes.filter((v) => v.status === 'closed');
  }

  filtered.sort((a, b) => b.createdAt - a.createdAt);

  const total = filtered.length;
  const start = (pageNum - 1) * pageSizeNum;
  const end = start + pageSizeNum;
  const paged = filtered.slice(start, end).map((v) => ({
    id: v.id,
    title: v.title,
    createdAt: v.createdAt,
    status: v.status,
    totalVotes: getTotalVotes(v),
  }));

  const elapsed = Date.now() - startTime;
  const minDelay = 0;
  const delay = Math.max(0, minDelay - elapsed);

  setTimeout(() => {
    res.json({
      items: paged,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  }, delay);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Vote API server running on http://localhost:${PORT}`);
});
