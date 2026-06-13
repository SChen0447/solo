import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

interface User {
  id: string;
  nickname: string;
  avatar: string;
  groupId: string;
  points: number;
  online: boolean;
  lastActive: Date;
  weeklyPracticeMinutes: number;
  checkedInToday: boolean;
  lastCheckInDate: string;
}

interface Group {
  id: string;
  memberIds: string[];
  maxMembers: number;
}

interface Recording {
  id: string;
  userId: string;
  groupId: string;
  topicId: string;
  duration: number;
  score: number;
  pronunciation: number;
  fluency: number;
  vocabulary: number;
  createdAt: Date;
  audioBuffer?: Buffer;
}

interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
  addedAt: Date;
}

interface UserVocabulary {
  userId: string;
  words: VocabularyWord[];
}

const MAX_GROUP_SIZE = 6;

const groups: Group[] = [];
const users: Map<string, User> = new Map();
const recordings: Recording[] = [];
const userVocabularies: Map<string, UserVocabulary> = new Map();
const wsConnections: Map<string, WebSocket> = new Map();

const dailyTopics = [
  { id: '1', title: '描述你最喜欢的季节', prompt: '请用30秒描述你最喜欢的季节以及为什么喜欢它。' },
  { id: '2', title: '介绍你的一个爱好', prompt: '分享你的一个爱好，以及你是如何开始的。' },
  { id: '3', title: '描述你理想中的假期', prompt: '如果你有一周的假期，你会去哪里？做什么？' },
  { id: '4', title: '谈谈你最喜欢的食物', prompt: '描述你最喜欢的一道菜，以及你喜欢它的原因。' },
  { id: '5', title: '介绍一位对你有影响的人', prompt: '说说谁对你影响最大，以及为什么。' },
  { id: '6', title: '描述你的家乡', prompt: '请描述你的家乡，它有什么特别之处？' },
  { id: '7', title: '谈谈你的一天', prompt: '描述你典型的一天是如何度过的。' },
];

const avatars = [
  '🐱', '🐶', '🐼', '🦊', '🐰', '🐸',
  '🐻', '🦁', '🐯', '🐨', '🐵', '🦄',
];

const sampleVocabulary: Omit<VocabularyWord, 'id' | 'addedAt'>[] = [
  { word: 'serendipity', meaning: '意外发现美好事物的运气', example: 'Finding that book was pure serendipity.' },
  { word: 'ephemeral', meaning: '短暂的，转瞬即逝的', example: 'Fame in the modern world is ephemeral.' },
  { word: 'ubiquitous', meaning: '无处不在的', example: 'Smartphones have become ubiquitous in daily life.' },
  { word: 'eloquent', meaning: '雄辩的，有说服力的', example: 'She gave an eloquent speech about climate change.' },
  { word: 'resilient', meaning: '有弹性的，适应力强的', example: 'Children are remarkably resilient.' },
];

function getTodayTopic() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return dailyTopics[dayOfYear % dailyTopics.length];
}

function findOrCreateGroup(): Group {
  let group = groups.find(g => g.memberIds.length < MAX_GROUP_SIZE);
  if (!group) {
    group = { id: uuidv4(), memberIds: [], maxMembers: MAX_GROUP_SIZE };
    groups.push(group);
  }
  return group;
}

function simulateScore(): { score: number; pronunciation: number; fluency: number; vocabulary: number } {
  const pronunciation = Math.floor(Math.random() * 30) + 65;
  const fluency = Math.floor(Math.random() * 30) + 65;
  const vocabulary = Math.floor(Math.random() * 30) + 65;
  const score = Math.floor((pronunciation + fluency + vocabulary) / 3);
  return { score, pronunciation, fluency, vocabulary };
}

function broadcastGroupUpdate(groupId: string) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  const members = group.memberIds
    .map(id => users.get(id))
    .filter(u => u !== undefined) as User[];

  const message = JSON.stringify({
    type: 'group_update',
    members: members.map(m => ({
      id: m.id,
      nickname: m.nickname,
      avatar: m.avatar,
      online: m.online,
      points: m.points,
      weeklyPracticeMinutes: m.weeklyPracticeMinutes,
    })),
  });

  group.memberIds.forEach(userId => {
    const ws = wsConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

app.post('/api/register', (req, res) => {
  const { nickname } = req.body;

  if (!nickname || nickname.trim().length === 0) {
    return res.status(400).json({ error: '昵称不能为空' });
  }

  const group = findOrCreateGroup();
  const userId = uuidv4();
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];

  const user: User = {
    id: userId,
    nickname: nickname.trim(),
    avatar,
    groupId: group.id,
    points: 0,
    online: true,
    lastActive: new Date(),
    weeklyPracticeMinutes: 0,
    checkedInToday: false,
    lastCheckInDate: '',
  };

  users.set(userId, user);
  group.memberIds.push(userId);

  const words: VocabularyWord[] = sampleVocabulary.slice(0, 3).map(v => ({
    ...v,
    id: uuidv4(),
    addedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  }));
  userVocabularies.set(userId, { userId, words });

  setTimeout(() => broadcastGroupUpdate(group.id), 100);

  res.json({
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      groupId: user.groupId,
      points: user.points,
    },
    topic: getTodayTopic(),
  });
});

app.post('/api/checkin', (req, res) => {
  const { userId } = req.body;
  const user = users.get(userId);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const today = getTodayDateString();
  if (user.lastCheckInDate === today) {
    return res.json({ success: true, alreadyCheckedIn: true, points: user.points });
  }

  user.checkedInToday = true;
  user.lastCheckInDate = today;
  user.points += 10;
  user.lastActive = new Date();

  broadcastGroupUpdate(user.groupId);

  res.json({ success: true, alreadyCheckedIn: false, points: user.points });
});

app.get('/api/group/:groupId', (req, res) => {
  const group = groups.find(g => g.id === req.params.groupId);
  if (!group) {
    return res.status(404).json({ error: '小组不存在' });
  }

  const members = group.memberIds
    .map(id => users.get(id))
    .filter(u => u !== undefined)
    .map(u => ({
      id: u!.id,
      nickname: u!.nickname,
      avatar: u!.avatar,
      online: u!.online,
      points: u!.points,
      weeklyPracticeMinutes: u!.weeklyPracticeMinutes,
    }));

  res.json({
    group: { id: group.id, memberCount: group.memberIds.length, maxMembers: group.maxMembers },
    members,
    topic: getTodayTopic(),
  });
});

app.get('/api/topic/today', (req, res) => {
  res.json({ topic: getTodayTopic() });
});

app.post('/api/recordings', upload.single('audio'), (req, res) => {
  const userId = req.body.userId;
  const topicId = req.body.topicId;
  const duration = parseFloat(req.body.duration || '0');

  const user = users.get(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  setTimeout(() => {
    const { score, pronunciation, fluency, vocabulary } = simulateScore();

    const recording: Recording = {
      id: uuidv4(),
      userId,
      groupId: user.groupId,
      topicId,
      duration,
      score,
      pronunciation,
      fluency,
      vocabulary,
      createdAt: new Date(),
      audioBuffer: req.file?.buffer,
    };

    recordings.push(recording);

    let pointsEarned = 5;
    if (score > 80) pointsEarned += 3;

    user.points += pointsEarned;
    user.weeklyPracticeMinutes += Math.ceil(duration / 60);
    user.lastActive = new Date();

    broadcastGroupUpdate(user.groupId);

    res.json({
      recording: {
        id: recording.id,
        score,
        pronunciation,
        fluency,
        vocabulary,
        duration,
        pointsEarned,
      },
    });
  }, 800 + Math.random() * 600);
});

app.get('/api/group/:groupId/recordings/:topicId', (req, res) => {
  const { groupId, topicId } = req.params;
  const groupRecordings = recordings.filter(r => r.groupId === groupId && r.topicId === topicId);

  const result = groupRecordings.map(r => {
    const user = users.get(r.userId);
    return {
      id: r.id,
      userId: r.userId,
      nickname: user?.nickname || '未知用户',
      avatar: user?.avatar || '👤',
      score: r.score,
      duration: r.duration,
      createdAt: r.createdAt,
    };
  });

  res.json({ recordings: result });
});

app.get('/api/vocabulary/:userId', (req, res) => {
  const { userId } = req.params;
  const vocab = userVocabularies.get(userId);

  if (!vocab) {
    return res.json({ words: [] });
  }

  const filter = req.query.filter as string;
  const now = new Date();
  let filteredWords = vocab.words;

  if (filter === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filteredWords = vocab.words.filter(w => new Date(w.addedAt) >= today);
  } else if (filter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredWords = vocab.words.filter(w => new Date(w.addedAt) >= weekAgo);
  }

  res.json({ words: filteredWords.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()) });
});

app.post('/api/vocabulary', (req, res) => {
  const { userId, word, meaning, example } = req.body;
  const user = users.get(userId);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  let vocab = userVocabularies.get(userId);
  if (!vocab) {
    vocab = { userId, words: [] };
    userVocabularies.set(userId, vocab);
  }

  const newWord: VocabularyWord = {
    id: uuidv4(),
    word,
    meaning,
    example,
    addedAt: new Date(),
  };

  vocab.words.push(newWord);

  user.points += 1;
  broadcastGroupUpdate(user.groupId);

  res.json({ word: newWord, points: user.points });
});

app.post('/api/vocabulary/review', (req, res) => {
  const { userId, wordId } = req.body;
  const user = users.get(userId);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  user.points += 1;
  broadcastGroupUpdate(user.groupId);

  res.json({ success: true, points: user.points });
});

app.get('/api/leaderboard/:groupId', (req, res) => {
  const group = groups.find(g => g.id === req.params.groupId);
  if (!group) {
    return res.status(404).json({ error: '小组不存在' });
  }

  const leaderboard = group.memberIds
    .map(id => {
      const user = users.get(id);
      if (!user) return null;
      return {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        points: user.points,
        online: user.online,
      };
    })
    .filter(u => u !== null)
    .sort((a, b) => b!.points - a!.points)
    .map((u, index) => ({ ...u!, rank: index + 1 }));

  res.json({ leaderboard });
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const userId = url.searchParams.get('userId');

  if (!userId || !users.has(userId)) {
    ws.close();
    return;
  }

  const user = users.get(userId)!;
  user.online = true;
  wsConnections.set(userId, ws);

  broadcastGroupUpdate(user.groupId);

  ws.on('close', () => {
    wsConnections.delete(userId);
    const u = users.get(userId);
    if (u) {
      u.online = false;
      u.lastActive = new Date();
      broadcastGroupUpdate(u.groupId);
    }
  });

  ws.on('error', () => {
    wsConnections.delete(userId);
    const u = users.get(userId);
    if (u) {
      u.online = false;
      u.lastActive = new Date();
      broadcastGroupUpdate(u.groupId);
    }
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      // Ignore parse errors
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
