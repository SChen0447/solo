import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const LUCKY_FILE = path.join(DATA_DIR, 'lucky.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LUCKY_FILE)) {
    fs.writeFileSync(LUCKY_FILE, JSON.stringify({ draws: [] }, null, 2));
  }
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify({ posts: [] }, null, 2));
  }
}
ensureFiles();

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return file.includes('lucky') ? { draws: [] } : { posts: [] };
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const ASPECT_TYPES = [
  { angle: 0, type: 'conjunction', tolerance: 8 },
  { angle: 90, type: 'square', tolerance: 6 },
  { angle: 120, type: 'trine', tolerance: 6 },
  { angle: 180, type: 'opposition', tolerance: 6 },
];

function calcAspects(starPositions) {
  const stars = Object.entries(starPositions);
  const aspects = [];
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const [s1, h1] = stars[i];
      const [s2, h2] = stars[j];
      const diff = Math.abs(h1 - h2) * 30;
      const angles = [diff, 360 - diff];
      for (const at of ASPECT_TYPES) {
        for (const a of angles) {
          if (Math.abs(a - at.angle) <= at.tolerance) {
            aspects.push({
              star1: s1,
              star2: s2,
              angle: at.angle,
              type: at.type,
            });
            break;
          }
        }
      }
    }
  }
  return aspects;
}

const LEVELS = ['上上', '上吉', '中平', '中下', '下下'];
const KEYWORDS_POOL = ['财运', '事业', '情感', '健康', '学业', '远行', '人际', '贵人'];

const SIGN_TEMPLATES = [
  '紫气东来照命宫，吉星高照运亨通。前程似锦鹏程远，一举成名天下同。',
  '月照寒潭水映空，浮云飘散见清风。劝君守旧莫妄动，静待花开月正浓。',
  '太阳当空照九州，阴霾散尽现光明。贵人相助前程广，万事如意乐无忧。',
  '金木相合喜气盈，家和业兴福满门。求财得利皆如意，笑看春风满画堂。',
  '火星冲位事多磨，口舌是非慎风波。劝君忍耐方为福，守得云开见月明。',
  '土星守命运迟开，少年辛苦老来财。风霜历尽梅花放，苦尽甘来福自来。',
  '水星得位智慧生，文章锦绣冠群英。金榜题名终有日，青云直上赴蓬瀛。',
  '金星高照姻缘至，彩凤和鸣乐意融。千里姻缘一线牵，洞房花烛喜重逢。',
  '罗睺临位事多艰，逆水行舟步步难。但存方寸仁慈念，自有神明暗里援。',
  '计都守照祸殃消，转祸为祥喜气招。积善之家有余庆，灾星退散福星朝。',
  '三合拱照贵人扶，名利双收福满途。更有阴功相庇佑，儿孙代代耀门闾。',
  '刑冲破害事难成，且待时来运渐亨。凡事三思方举步，小心驶得万年程。',
  '对冲之位主分离，南北东西去路迷。莫叹鸳鸯两处宿，终须有日会佳期。',
  '合相临身喜气浓，所求如愿福无穷。婚姻财利皆成就，坐享荣华白发翁。',
  '命宫得月性聪明，女貌男才迥出群。更有贵人相接引，管教平步上青云。',
  '财帛宫中有福星，金玉满堂富贵荣。出入经营多吉利，财源滚滚似川盈。',
  '兄弟宫中遇贵星，怡怡手足乐芳名。他年定遂凌云志，万里鹏程翼断金。',
  '田宅宫中有吉星，门庭兴旺福来并。祖宗基业多开拓，世代荣华享太平。',
  '子女宫中喜气临，麒麟天上送双生。满堂兰桂森森茂，富贵荣华享万金。',
  '奴仆宫中得吉星，家奴仆妾尽心诚。更兼牛马多蕃盛，富贵荣华享晚成。',
  '夫妻宫中有贵人，夫荣妻贵乐长春。鸳鸯交颈情和睦，偕老齐眉百岁身。',
  '疾厄宫中福曜临，身体安康少病侵。更有寿星相照应，管教福寿享恩深。',
  '迁移宫中有贵星，出门到处得芳名。经营买卖多获利，往返通达事事亨。',
  '官禄宫中有吉星，高迁禄位享恩荣。名扬四海人人羡，金殿当头谒帝京。',
  '福德宫中喜气盈，平生享福保安宁。贵人接引多财利，晚景荣华乐太平。',
  '相貌宫中遇吉星，形容端正众人称。更兼八字根基好，一世荣华事事亨。',
];

function pickSignTemplate(starPositions, aspects) {
  const hash = Object.values(starPositions).reduce((a, b) => a + b, 0) * 37 +
    aspects.reduce((a, b) => a + b.angle, 0) * 17 +
    Object.keys(starPositions).length * 11;
  return SIGN_TEMPLATES[hash % SIGN_TEMPLATES.length];
}

function pickLevel(aspects) {
  const good = aspects.filter(a => a.type === 'conjunction' || a.type === 'trine').length;
  const bad = aspects.filter(a => a.type === 'square' || a.type === 'opposition').length;
  const diff = good - bad;
  if (diff >= 2) return '上上';
  if (diff >= 1) return '上吉';
  if (diff === 0) return '中平';
  if (diff === -1) return '中下';
  return '下下';
}

function pickKeywords(aspects, count = 3) {
  const shuffled = [...KEYWORDS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

app.post('/api/draw', (req, res) => {
  const { starPositions } = req.body || {};
  if (!starPositions || Object.keys(starPositions).length === 0) {
    return res.status(400).json({ error: '请先放置星曜' });
  }

  const aspects = calcAspects(starPositions);
  const text = pickSignTemplate(starPositions, aspects);
  const level = pickLevel(aspects);
  const keywords = pickKeywords(aspects);
  const signNumber = Math.floor(Math.random() * 500) + 1;
  const id = uuidv4();
  const createdAt = Date.now();

  const signText = `第${signNumber}签·${level}：${text}`;

  const result = {
    id,
    signNumber,
    text: signText,
    level,
    keywords,
    starPositions,
    aspects,
    createdAt,
  };

  const data = readJSON(LUCKY_FILE);
  data.draws.push(result);
  writeJSON(LUCKY_FILE, data);

  res.json(result);
});

app.get('/api/posts', (req, res) => {
  const data = readJSON(POSTS_FILE);
  const posts = data.posts.map(p => ({
    id: p.id,
    signNumber: p.signNumber,
    text: p.text,
    summary: p.summary,
    level: p.level,
    keywords: p.keywords,
    image: p.image,
    likes: (p.likedUsers || []).length,
    comments: (p.comments || []).length,
    createdAt: p.createdAt,
  })).sort((a, b) => b.createdAt - a.createdAt);
  res.json(posts);
});

app.get('/api/posts/:id', (req, res) => {
  const data = readJSON(POSTS_FILE);
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: '未找到' });
  res.json({
    id: post.id,
    signNumber: post.signNumber,
    text: post.text,
    summary: post.summary,
    level: post.level,
    keywords: post.keywords,
    image: post.image,
    likes: (post.likedUsers || []).length,
    comments: post.comments || [],
    starPositions: post.starPositions,
    aspects: post.aspects,
    createdAt: post.createdAt,
  });
});

app.post('/api/posts', (req, res) => {
  const { signNumber, text, level, keywords, starPositions, aspects, image } = req.body;
  const id = uuidv4();
  const lines = text.replace(/第\d+签·[^：]+：/, '').split(/[，。？！]/).filter(Boolean);
  const summary = (lines[0] || '') + '，' + (lines[1] || '') + '。';
  const post = {
    id,
    signNumber,
    text,
    summary: summary.slice(0, 40),
    level,
    keywords,
    image: image || null,
    likedUsers: [],
    comments: [],
    starPositions,
    aspects,
    createdAt: Date.now(),
  };
  const data = readJSON(POSTS_FILE);
  data.posts.push(post);
  writeJSON(POSTS_FILE, data);
  res.json({ id, success: true });
});

app.post('/api/posts/:id/like', (req, res) => {
  const { userId } = req.body || {};
  const uid = userId || 'anon-' + (req.ip || '');
  const data = readJSON(POSTS_FILE);
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: '未找到' });
  if (!post.likedUsers) post.likedUsers = [];
  const idx = post.likedUsers.indexOf(uid);
  let liked;
  if (idx >= 0) {
    post.likedUsers.splice(idx, 1);
    liked = false;
  } else {
    post.likedUsers.push(uid);
    liked = true;
  }
  writeJSON(POSTS_FILE, data);
  res.json({ likes: post.likedUsers.length, liked });
});

app.post('/api/posts/:id/comment', (req, res) => {
  const { content } = req.body || {};
  if (!content || content.length > 200) {
    return res.status(400).json({ error: '评论无效' });
  }
  const data = readJSON(POSTS_FILE);
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: '未找到' });
  if (!post.comments) post.comments = [];
  const comment = { id: uuidv4(), content, createdAt: Date.now() };
  post.comments.push(comment);
  writeJSON(POSTS_FILE, data);
  res.json({ comment, comments: post.comments });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
