import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';

const app = express();
const PORT = 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

type Genre = '爵士' | '电子' | '民谣' | '古典' | '摇滚';

interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  coverColors: [string, string, string];
  audioUrl: string;
  genre: Genre;
  year: number;
  description: string;
}

interface User {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  unlockedStickers: Sticker[];
  tradePackages: TradePackage[];
}

interface Sticker {
  id: string;
  albumId: string;
  albumTitle: string;
  genre: Genre;
  unlockedAt: number;
  colors: [string, string];
}

interface TradePackage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  stickers: Sticker[];
  createdAt: number;
  status: 'open' | 'trading' | 'completed';
  selectedBy?: string;
}

interface LeaderboardEntry {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  rank: number;
}

const GENRES: Genre[] = ['爵士', '电子', '民谣', '古典', '摇滚'];

const COVER_COLORS: [string, string, string][] = [
  ['#2d5016', '#8b4513', '#ffd700'],
  ['#1a237e', '#4a148c', '#ff6f00'],
  ['#b71c1c', '#880e4f', '#ffab00'],
  ['#004d40', '#1b5e20', '#ffeb3b'],
  ['#3e2723', '#311b92', '#ff5722'],
  ['#01579b', '#006064', '#ff9800'],
  ['#e65100', '#bf360c', '#ffc107'],
  ['#4527a0', '#283593', '#e91e63'],
  ['#2e7d32', '#558b2f', '#ffca28'],
  ['#ad1457', '#880e4f', '#00bcd4'],
  ['#1565c0', '#0d47a1', '#ffb300'],
  ['#4e342e', '#5d4037', '#f44336'],
];

const ALBUM_TITLES = [
  { title: 'Midnight Session', artist: 'Blue Note Trio', genre: '爵士' as Genre },
  { title: 'Neon Dreams', artist: 'Synthwave Collective', genre: '电子' as Genre },
  { title: 'Whispering Pines', artist: 'Mountain String', genre: '民谣' as Genre },
  { title: 'Symphony No.7', artist: 'Vienna Chamber', genre: '古典' as Genre },
  { title: 'Thunder Road', artist: 'Iron Horse', genre: '摇滚' as Genre },
  { title: 'Smoke & Mirrors', artist: 'Jazz Fusion Lab', genre: '爵士' as Genre },
  { title: 'Digital Rain', artist: 'Cyber Prophet', genre: '电子' as Genre },
  { title: 'Old Country Road', artist: 'Maple Creek Band', genre: '民谣' as Genre },
  { title: 'Moonlight Sonata', artist: 'Classical Ensemble', genre: '古典' as Genre },
  { title: 'Revolution Radio', artist: 'The Distortions', genre: '摇滚' as Genre },
  { title: 'Cool Breeze', artist: 'Smooth Jazz Allstars', genre: '爵士' as Genre },
  { title: 'Electric Soul', artist: 'Techno Wizards', genre: '电子' as Genre },
];

function createCoverSVG(colors: [string, string, string], seed: number): string {
  const patterns = [
    `<circle cx="150" cy="150" r="80" fill="${colors[0]}" opacity="0.8"/>
     <circle cx="250" cy="100" r="60" fill="${colors[1]}" opacity="0.7"/>
     <circle cx="100" cy="250" r="50" fill="${colors[2]}" opacity="0.6"/>
     <path d="M0,300 Q150,${100 + seed * 20} 300,300 Z" fill="${colors[0]}" opacity="0.4"/>`,
    `<rect x="30" y="30" width="240" height="240" fill="${colors[0]}" opacity="0.3" rx="8"/>
     <polygon points="150,40 260,250 40,250" fill="${colors[1]}" opacity="0.6"/>
     <circle cx="150" cy="180" r="50" fill="${colors[2]}" opacity="0.8"/>`,
    `<rect x="0" y="${80 + seed * 10}" width="300" height="40" fill="${colors[0]}" opacity="0.8"/>
     <rect x="0" y="${160 + seed * 5}" width="300" height="30" fill="${colors[1]}" opacity="0.7"/>
     <circle cx="150" cy="150" r="90" fill="${colors[2]}" opacity="0.25"/>
     <line x1="0" y1="200" x2="300" y2="${80 + seed * 30}" stroke="${colors[1]}" stroke-width="3" opacity="0.5"/>`,
  ];
  const pattern = patterns[seed % patterns.length];
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <linearGradient id="bg-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors[0]}"/>
      <stop offset="100%" stop-color="${colors[1]}"/>
    </linearGradient>
    <filter id="noise-${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
      <feBlend in="SourceGraphic" in2="noise" mode="overlay" opacity="0.15"/>
    </filter>
  </defs>
  <rect width="300" height="300" fill="url(#bg-${seed})" filter="url(#noise-${seed})"/>
  ${pattern}
  <rect x="0" y="0" width="300" height="300" fill="none" stroke="${colors[2]}" stroke-width="4" opacity="0.3"/>
</svg>`.trim();
}

function createAudioData(seed: number): string {
  const freq = 220 + seed * 30;
  const duration = 30;
  const sampleRate = 2;
  const points: string[] = [];
  for (let i = 0; i < duration * sampleRate; i++) {
    const t = i / sampleRate;
    const wave1 = Math.sin((2 * Math.PI * freq / 100) * t) * 40;
    const wave2 = Math.sin((2 * Math.PI * freq / 50) * t + seed) * 20;
    const wave3 = Math.sin((2 * Math.PI * freq / 25) * t + seed * 0.5) * 10;
    const env = Math.exp(-t * 0.05) * 0.8 + 0.2;
    const y = 100 - (wave1 + wave2 + wave3) * env;
    points.push(`${(i / (duration * sampleRate - 1)) * 600},${Math.max(10, Math.min(190, y))}`);
  }
  return points.join(' ');
}

const ALBUMS: Album[] = ALBUM_TITLES.map((info, i) => {
  const coverColors = COVER_COLORS[i % COVER_COLORS.length];
  const coverSvg = encodeURIComponent(createCoverSVG(coverColors, i));
  const audioPoints = createAudioData(i);
  const audioSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200">
  <rect width="600" height="200" fill="#0a0a1a"/>
  <polyline points="${audioPoints}" fill="none" stroke="#e94560" stroke-width="1.5" opacity="0.9"/>
  <polyline points="${audioPoints}" fill="none" stroke="#ff7b99" stroke-width="0.8" opacity="0.5" transform="translate(0,2)"/>
</svg>`);
  return {
    id: `album-${String(i + 1).padStart(3, '0')}`,
    title: info.title,
    artist: info.artist,
    coverUrl: `data:image/svg+xml;charset=utf-8,${coverSvg}`,
    coverColors,
    audioUrl: `data:image/svg+xml;charset=utf-8,${audioSvg}`,
    genre: info.genre,
    year: 1965 + i * 5,
    description: `一张经典的${info.genre}专辑，收录${info.artist}最具代表性的作品。`,
  };
});

const CURRENT_USER_ID = 'user-001';

const USERS: User[] = [
  {
    id: CURRENT_USER_ID,
    nickname: '黑胶猎人',
    avatar: '🔴',
    score: 320,
    unlockedStickers: [
      {
        id: 'sticker-001',
        albumId: 'album-001',
        albumTitle: 'Midnight Session',
        genre: '爵士',
        unlockedAt: Date.now() - 86400000 * 3,
        colors: ['#2d5016', '#ffd700'],
      },
      {
        id: 'sticker-002',
        albumId: 'album-002',
        albumTitle: 'Neon Dreams',
        genre: '电子',
        unlockedAt: Date.now() - 86400000 * 2,
        colors: ['#1a237e', '#ff6f00'],
      },
      {
        id: 'sticker-003',
        albumId: 'album-003',
        albumTitle: 'Whispering Pines',
        genre: '民谣',
        unlockedAt: Date.now() - 86400000,
        colors: ['#b71c1c', '#ffab00'],
      },
    ],
    tradePackages: [],
  },
  {
    id: 'user-002',
    nickname: '爵士老饕',
    avatar: '🟢',
    score: 580,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-003',
    nickname: '电波少女',
    avatar: '🔵',
    score: 475,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-004',
    nickname: '古典守望者',
    avatar: '🟡',
    score: 620,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-005',
    nickname: '民谣旅人',
    avatar: '🟠',
    score: 390,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-006',
    nickname: '摇滚不死',
    avatar: '⚫',
    score: 710,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-007',
    nickname: '午夜唱片',
    avatar: '🟣',
    score: 445,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-008',
    nickname: '唱针飞舞',
    avatar: '⚪',
    score: 380,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-009',
    nickname: '发烧玩家',
    avatar: '🔶',
    score: 560,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-010',
    nickname: '声纳探索家',
    avatar: '🔷',
    score: 525,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-011',
    nickname: 'B面收藏家',
    avatar: '🟤',
    score: 290,
    unlockedStickers: [],
    tradePackages: [],
  },
  {
    id: 'user-012',
    nickname: '密纹守护者',
    avatar: '🟩',
    score: 365,
    unlockedStickers: [],
    tradePackages: [],
  },
];

const MARKET_PACKAGES: TradePackage[] = [
  {
    id: 'pkg-001',
    userId: 'user-002',
    userName: '爵士老饕',
    userAvatar: '🟢',
    stickers: [
      {
        id: 'ms-001',
        albumId: 'album-006',
        albumTitle: 'Smoke & Mirrors',
        genre: '爵士',
        unlockedAt: Date.now() - 86400000 * 5,
        colors: ['#4527a0', '#ffc107'],
      },
      {
        id: 'ms-002',
        albumId: 'album-011',
        albumTitle: 'Cool Breeze',
        genre: '爵士',
        unlockedAt: Date.now() - 86400000 * 4,
        colors: ['#1565c0', '#ffb300'],
      },
    ],
    createdAt: Date.now() - 3600000 * 5,
    status: 'open',
  },
  {
    id: 'pkg-002',
    userId: 'user-003',
    userName: '电波少女',
    userAvatar: '🔵',
    stickers: [
      {
        id: 'ms-003',
        albumId: 'album-007',
        albumTitle: 'Digital Rain',
        genre: '电子',
        unlockedAt: Date.now() - 86400000 * 6,
        colors: ['#4527a0', '#e91e63'],
      },
      {
        id: 'ms-004',
        albumId: 'album-012',
        albumTitle: 'Electric Soul',
        genre: '电子',
        unlockedAt: Date.now() - 86400000 * 3,
        colors: ['#4e342e', '#f44336'],
      },
      {
        id: 'ms-005',
        albumId: 'album-002',
        albumTitle: 'Neon Dreams',
        genre: '电子',
        unlockedAt: Date.now() - 86400000 * 7,
        colors: ['#1a237e', '#ff6f00'],
      },
    ],
    createdAt: Date.now() - 3600000 * 8,
    status: 'open',
  },
  {
    id: 'pkg-003',
    userId: 'user-004',
    userName: '古典守望者',
    userAvatar: '🟡',
    stickers: [
      {
        id: 'ms-006',
        albumId: 'album-004',
        albumTitle: 'Symphony No.7',
        genre: '古典',
        unlockedAt: Date.now() - 86400000 * 10,
        colors: ['#004d40', '#ffeb3b'],
      },
      {
        id: 'ms-007',
        albumId: 'album-009',
        albumTitle: 'Moonlight Sonata',
        genre: '古典',
        unlockedAt: Date.now() - 86400000 * 8,
        colors: ['#283593', '#ffeb3b'],
      },
    ],
    createdAt: Date.now() - 3600000 * 12,
    status: 'open',
  },
  {
    id: 'pkg-004',
    userId: 'user-005',
    userName: '民谣旅人',
    userAvatar: '🟠',
    stickers: [
      {
        id: 'ms-008',
        albumId: 'album-008',
        albumTitle: 'Old Country Road',
        genre: '民谣',
        unlockedAt: Date.now() - 86400000 * 4,
        colors: ['#5d4037', '#ffca28'],
      },
    ],
    createdAt: Date.now() - 3600000 * 2,
    status: 'open',
  },
  {
    id: 'pkg-005',
    userId: 'user-006',
    userName: '摇滚不死',
    userAvatar: '⚫',
    stickers: [
      {
        id: 'ms-009',
        albumId: 'album-005',
        albumTitle: 'Thunder Road',
        genre: '摇滚',
        unlockedAt: Date.now() - 86400000 * 6,
        colors: ['#3e2723', '#ff5722'],
      },
      {
        id: 'ms-010',
        albumId: 'album-010',
        albumTitle: 'Revolution Radio',
        genre: '摇滚',
        unlockedAt: Date.now() - 86400000 * 5,
        colors: ['#ad1457', '#00bcd4'],
      },
      {
        id: 'ms-011',
        albumId: 'album-005',
        albumTitle: 'Thunder Road',
        genre: '摇滚',
        unlockedAt: Date.now() - 86400000 * 3,
        colors: ['#311b92', '#ff5722'],
      },
    ],
    createdAt: Date.now() - 3600000 * 20,
    status: 'open',
  },
  {
    id: 'pkg-006',
    userId: 'user-007',
    userName: '午夜唱片',
    userAvatar: '🟣',
    stickers: [
      {
        id: 'ms-012',
        albumId: 'album-001',
        albumTitle: 'Midnight Session',
        genre: '爵士',
        unlockedAt: Date.now() - 86400000 * 9,
        colors: ['#2d5016', '#ffd700'],
      },
      {
        id: 'ms-013',
        albumId: 'album-006',
        albumTitle: 'Smoke & Mirrors',
        genre: '爵士',
        unlockedAt: Date.now() - 86400000 * 5,
        colors: ['#e65100', '#ffc107'],
      },
    ],
    createdAt: Date.now() - 3600000 * 15,
    status: 'open',
  },
  {
    id: 'pkg-007',
    userId: 'user-008',
    userName: '唱针飞舞',
    userAvatar: '⚪',
    stickers: [
      {
        id: 'ms-014',
        albumId: 'album-009',
        albumTitle: 'Moonlight Sonata',
        genre: '古典',
        unlockedAt: Date.now() - 86400000 * 11,
        colors: ['#0d47a1', '#ffb300'],
      },
      {
        id: 'ms-015',
        albumId: 'album-003',
        albumTitle: 'Whispering Pines',
        genre: '民谣',
        unlockedAt: Date.now() - 86400000 * 7,
        colors: ['#558b2f', '#ffca28'],
      },
      {
        id: 'ms-016',
        albumId: 'album-011',
        albumTitle: 'Cool Breeze',
        genre: '爵士',
        unlockedAt: Date.now() - 86400000 * 2,
        colors: ['#006064', '#ff9800'],
      },
    ],
    createdAt: Date.now() - 3600000 * 30,
    status: 'open',
  },
  {
    id: 'pkg-008',
    userId: 'user-009',
    userName: '发烧玩家',
    userAvatar: '🔶',
    stickers: [
      {
        id: 'ms-017',
        albumId: 'album-012',
        albumTitle: 'Electric Soul',
        genre: '电子',
        unlockedAt: Date.now() - 86400000 * 6,
        colors: ['#5d4037', '#f44336'],
      },
    ],
    createdAt: Date.now() - 3600000 * 6,
    status: 'open',
  },
];

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/albums', (_req: Request, res: Response) => {
  const response = ALBUMS.map((album) => ({
    id: album.id,
    coverUrl: album.coverUrl,
    coverColors: album.coverColors,
    genre: album.genre,
  }));
  setTimeout(() => res.json({ data: response }), 40);
});

app.get('/api/album/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const album = ALBUMS.find((a) => a.id === id);
  if (!album) {
    return res.status(404).json({ error: 'Album not found' });
  }
  const otherGenres = GENRES.filter((g) => g !== album.genre);
  const shuffled = [...otherGenres].sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [...shuffled, album.genre].sort(() => Math.random() - 0.5);
  setTimeout(
    () =>
      res.json({
        data: {
          id: album.id,
          title: album.title,
          artist: album.artist,
          coverUrl: album.coverUrl,
          coverColors: album.coverColors,
          audioUrl: album.audioUrl,
          audioDuration: 30,
          options,
          correctGenre: album.genre,
          year: album.year,
          description: album.description,
        },
      }),
    30
  );
});

app.get('/api/user/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const user = USERS.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  setTimeout(
    () =>
      res.json({
        data: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          score: user.score,
          unlockedStickers: user.unlockedStickers,
          tradePackages: user.tradePackages,
        },
      }),
    25
  );
});

app.post('/api/user/:id/sticker', (req: Request, res: Response) => {
  const { id } = req.params;
  const { albumId, genre, correct } = req.body as {
    albumId: string;
    genre: Genre;
    correct: boolean;
  };
  const user = USERS.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const album = ALBUMS.find((a) => a.id === albumId);
  if (!album) {
    return res.status(404).json({ error: 'Album not found' });
  }
  const scoreChange = correct ? 10 : -5;
  user.score = Math.max(0, user.score + scoreChange);
  let sticker: Sticker | null = null;
  if (correct) {
    const existing = user.unlockedStickers.find((s) => s.albumId === albumId);
    if (!existing) {
      sticker = {
        id: uuidv4(),
        albumId: album.id,
        albumTitle: album.title,
        genre: album.genre,
        unlockedAt: Date.now(),
        colors: [album.coverColors[0], album.coverColors[2]],
      };
      user.unlockedStickers.push(sticker);
    } else {
      sticker = existing;
    }
  }
  setTimeout(
    () =>
      res.json({
        data: {
          score: user.score,
          scoreChange,
          correct,
          correctGenre: album.genre,
          sticker,
        },
      }),
    45
  );
});

app.get('/api/leaderboard', (_req: Request, res: Response) => {
  const sorted = [...USERS].sort((a, b) => b.score - a.score);
  const leaderboard: LeaderboardEntry[] = sorted.slice(0, 10).map((u, i) => ({
    id: u.id,
    nickname: u.nickname,
    avatar: u.avatar,
    score: u.score,
    rank: i + 1,
  }));
  setTimeout(() => res.json({ data: leaderboard, currentUserId: CURRENT_USER_ID }), 30);
});

app.get('/api/market', (_req: Request, res: Response) => {
  setTimeout(
    () =>
      res.json({
        data: MARKET_PACKAGES.filter((p) => p.status === 'open'),
      }),
    35
  );
});

app.post('/api/trade/create', (req: Request, res: Response) => {
  const { userId, stickerIds } = req.body as { userId: string; stickerIds: string[] };
  const user = USERS.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!stickerIds.length || stickerIds.length > 3) {
    return res.status(400).json({ error: 'Invalid sticker count' });
  }
  const stickers = user.unlockedStickers.filter((s) => stickerIds.includes(s.id));
  if (stickers.length !== stickerIds.length) {
    return res.status(400).json({ error: 'Some stickers not found' });
  }
  const pkg: TradePackage = {
    id: uuidv4(),
    userId: user.id,
    userName: user.nickname,
    userAvatar: user.avatar,
    stickers,
    createdAt: Date.now(),
    status: 'open',
  };
  MARKET_PACKAGES.unshift(pkg);
  user.tradePackages.push(pkg);
  setTimeout(
    () =>
      res.status(201).json({
        data: {
          packageId: pkg.id,
          stickers: pkg.stickers,
        },
      }),
    60
  );
});

app.post('/api/trade/execute', (req: Request, res: Response) => {
  const { requesterId, targetPackageId, requesterPackageId } = req.body as {
    requesterId: string;
    targetPackageId: string;
    requesterPackageId: string;
  };
  const requester = USERS.find((u) => u.id === requesterId);
  if (!requester) {
    return res.status(404).json({ error: 'Requester not found' });
  }
  const targetPkg = MARKET_PACKAGES.find((p) => p.id === targetPackageId);
  if (!targetPkg || targetPkg.status !== 'open') {
    return res.status(400).json({ error: 'Target package unavailable' });
  }
  const requesterPkg = MARKET_PACKAGES.find((p) => p.id === requesterPackageId);
  const targetOwner = USERS.find((u) => u.id === targetPkg.userId);
  const TRADE_COST = 5;
  if (requester.score < TRADE_COST) {
    return res.status(400).json({ error: '积分不足' });
  }
  requester.score -= TRADE_COST;
  if (targetOwner) {
    targetOwner.score = Math.max(0, targetOwner.score - TRADE_COST);
  }
  targetPkg.status = 'completed';
  if (requesterPkg) {
    requesterPkg.status = 'completed';
  }
  const receivedStickers = targetPkg.stickers.map((s) => ({
    ...s,
    id: uuidv4(),
    unlockedAt: Date.now(),
  }));
  requester.unlockedStickers.push(...receivedStickers);
  if (requesterPkg && targetOwner) {
    const sentStickers = requesterPkg.stickers.map((s) => ({
      ...s,
      id: uuidv4(),
      unlockedAt: Date.now(),
    }));
    targetOwner.unlockedStickers.push(...sentStickers);
  }
  setTimeout(
    () =>
      res.json({
        data: {
          success: true,
          newScore: requester.score,
          receivedStickers,
          fromUser: {
            id: targetPkg.userId,
            name: targetPkg.userName,
            avatar: targetPkg.userAvatar,
          },
        },
      }),
    120
  );
});

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`[声色·盲选] 后端服务已启动: http://localhost:${PORT}`);
  console.log(`  GET  /api/health        健康检查`);
  console.log(`  GET  /api/albums        唱片列表`);
  console.log(`  GET  /api/album/:id     唱片详情`);
  console.log(`  GET  /api/user/:id      用户信息`);
  console.log(`  POST /api/user/:id/sticker 解锁标签`);
  console.log(`  GET  /api/leaderboard   排行榜`);
  console.log(`  GET  /api/market        交换市场`);
  console.log(`  POST /api/trade/create  创建交换包`);
  console.log(`  POST /api/trade/execute 执行交换`);
});

export default app;
