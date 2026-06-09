import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

const votes = new Map();
const votedSessions = new Map();

function generateEditToken() {
  return crypto.randomBytes(16).toString('hex');
}

function getTotalVotes(vote) {
  return vote.options.reduce((sum, opt) => sum + opt.votes, 0);
}

function sanitizeVote(vote) {
  return {
    id: vote.id,
    title: vote.title,
    options: vote.options,
    createdAt: vote.createdAt,
    totalVotes: getTotalVotes(vote)
  };
}

app.post('/api/votes', (req, res) => {
  const { title, options } = req.body;

  if (!title || title.length > 50) {
    return res.status(400).json({ error: '主题不能为空且不超过50字符' });
  }
  if (!options || options.length < 2 || options.length > 8) {
    return res.status(400).json({ error: '选项数量必须在2到8之间' });
  }
  if (options.some(opt => !opt || opt.length > 30)) {
    return res.status(400).json({ error: '每个选项不能为空且不超过30字符' });
  }

  const id = uuidv4();
  const editToken = generateEditToken();
  const vote = {
    id,
    title,
    options: options.map(text => ({ text, votes: 0 })),
    createdAt: Date.now(),
    editToken
  };

  votes.set(id, vote);
  votedSessions.set(id, new Set());

  res.json({ id, editToken, vote: sanitizeVote(vote) });
  io.emit('vote:created', sanitizeVote(vote));
});

app.get('/api/votes', (_req, res) => {
  const allVotes = Array.from(votes.values()).map(sanitizeVote);
  res.json(allVotes);
});

app.get('/api/votes/:id', (req, res) => {
  const vote = votes.get(req.params.id);
  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }
  res.json(sanitizeVote(vote));
});

app.post('/api/votes/:id/vote', (req, res) => {
  const { sessionId, optionIndex } = req.body;
  const vote = votes.get(req.params.id);

  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }
  if (optionIndex < 0 || optionIndex >= vote.options.length) {
    return res.status(400).json({ error: '无效的选项' });
  }

  const sessionSet = votedSessions.get(req.params.id);
  if (sessionSet.has(sessionId)) {
    return res.status(400).json({ error: '您已经投过票了' });
  }

  sessionSet.add(sessionId);
  vote.options[optionIndex].votes += 1;

  const sanitized = sanitizeVote(vote);
  res.json(sanitized);
  io.emit('vote:updated', sanitized);
});

app.delete('/api/votes/:id', (req, res) => {
  const { editToken } = req.body;
  const vote = votes.get(req.params.id);

  if (!vote) {
    return res.status(404).json({ error: '投票不存在' });
  }
  if (vote.editToken !== editToken) {
    return res.status(403).json({ error: '无效的编辑令牌' });
  }

  votes.delete(req.params.id);
  votedSessions.delete(req.params.id);

  res.json({ success: true });
  io.emit('vote:deleted', req.params.id);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
