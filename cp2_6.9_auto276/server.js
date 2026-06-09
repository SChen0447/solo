import express from 'express';
import cors from 'cors';
import { v4 as uuidv4} from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const bookLibrary = [
  {
    id: '1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    genre: '魔幻现实主义',
    pages: 360,
    emotion: '深刻',
    mood: '怀旧'
  },
  {
    id: '2',
    title: '小王子',
    author: '安托万·德·圣埃克苏佩里',
    genre: '童话',
    pages: 96,
    emotion: '温暖',
    mood: '治愈'
  },
  {
    id: '3',
    title: '追风筝的人',
    author: '卡勒德·胡赛尼',
    genre: '文学',
    pages: 372,
    emotion: '感动',
    mood: '深情'
  },
  {
    id: '4',
    title: '挪威的森林',
    author: '村上春树',
    genre: '文学',
    pages: 384,
    emotion: '忧郁',
    mood: '青春'
  },
  {
    id: '5',
    title: '活着',
    author: '余华',
    genre: '文学',
    pages: 192,
    emotion: '深沉',
    mood: '人生'
  },
  {
    id: '6',
    title: '解忧杂货店',
    author: '东野圭吾',
    genre: '治愈',
    pages: 291,
    emotion: '温暖',
    mood: '治愈'
  },
  {
    id: '7',
    title: '三体',
    author: '刘慈欣',
    genre: '科幻',
    pages: 302,
    emotion: '震撼',
    mood: '思考'
  },
  {
    id: '8',
    title: '月亮与六便士',
    author: '威廉·萨默塞特·毛姆',
    genre: '文学',
    pages: 280,
    emotion: '追寻',
    mood: '理想'
  },
  {
    id: '9',
    title: '瓦尔登湖',
    author: '亨利·戴维·梭罗',
    genre: '散文',
    pages: 304,
    emotion: '宁静',
    mood: '自然'
  },
  {
    id: '10',
    title: '傲慢与偏见',
    author: '简·奥斯汀',
    genre: '经典',
    pages: 432,
    emotion: '浪漫',
    mood: '爱情'
  },
  {
    id: '11',
    title: '局外人',
    author: '阿尔贝·加缪',
    genre: '哲学',
    pages: 154,
    emotion: '荒诞',
    mood: '存在'
  },
  {
    id: '12',
    title: '浮生六记',
    author: '沈复',
    genre: '古典',
    pages: 180,
    emotion: '雅致',
    mood: '生活'
  }
];

const messages = [
  '这本书像雨后的泥土味，适合你今晚读',
  '愿你在字里行间找到久违的感动',
  '这是一本翻到哪页都能读下去的书',
  '读这本书的时候，记得泡一杯热茶',
  '或许你会在某一页停下来，想起某个人',
  '这本书的最后一页会让你合上书发呆',
  '愿这本书陪你度过一个安静的下午',
  '翻开第一页你就知道这是对的书',
  '有些书是为你此刻的心情而写',
  '这本书会带你去一个你想去的地方',
  '读它像和一位老朋友聊天',
  '这本书的香气会留在你记忆里很久'
];

const sessionFavorites = new Map();

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function recommendBook(preferences) {
  let candidates = [...bookLibrary];

  if (preferences.mood) {
    const moodMatch = candidates.filter(b => b.mood === preferences.mood || b.emotion === preferences.mood);
    if (moodMatch.length > 0) {
      candidates = moodMatch;
    }
  }

  if (preferences.pages) {
    if (preferences.pages === 'light') {
      candidates = candidates.filter(b => b.pages < 200);
    } else if (preferences.pages === 'heavy') {
      candidates = candidates.filter(b => b.pages > 400);
    }
    if (candidates.length === 0) {
      candidates = [...bookLibrary];
    }
  }

  const book = pickRandom(candidates.length > 0 ? candidates : bookLibrary);
  const message = pickRandom(messages);

  return {
    ...book,
    message,
    recommendationId: uuidv4()
  };
}

app.post('/api/recommend', (req, res) => {
  try {
    const preferences = req.body || {};
    const result = recommendBook(preferences);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '推荐失败，请稍后再试' });
  }
});

app.post('/api/favorites', (req, res) => {
  try {
    const { sessionId, book } = req.body || {};
    if (!sessionId || !book) {
      return res.status(400).json({ error: '参数不完整' });
    }
    if (!sessionFavorites.has(sessionId)) {
      sessionFavorites.set(sessionId, []);
    }
    const favorites = sessionFavorites.get(sessionId);
    const exists = favorites.find(f => f.id === book.id);
    if (!exists) {
      favorites.push({ ...book, addedAt: new Date().toISOString() });
    }
    res.json({ success: true, count: favorites.length });
  } catch (error) {
    res.status(500).json({ error: '收藏失败' });
  }
});

app.get('/api/favorites/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const favorites = sessionFavorites.get(sessionId) || [];
    res.json({ favorites });
  } catch (error) {
    res.status(500).json({ error: '获取收藏失败' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`盲书奇遇后端服务已启动: http://localhost:${PORT}`);
});
