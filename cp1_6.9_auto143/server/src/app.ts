import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============== Types ==============
type FlowerSpecies = 'rose' | 'iris' | 'sunflower';

interface Flower {
  _id: string;
  species: FlowerSpecies;
  name: string;
  meaning: string;
  color: string;
  progress: number;
  health: number;
  unlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
  ownerName: string;
}

interface Specimen {
  _id: string;
  flowerId: string;
  flowerName: string;
  flowerMeaning: string;
  flowerColor: string;
  serialNumber: string;
  imageBase64: string;
  favorite: boolean;
  shareToken: string;
  createdAt: string;
}

// ============== Seed Data ==============
const SEED_DATA: Record<FlowerSpecies, { name: string; meaning: string; color: string }> = {
  rose: { name: '红玫瑰', meaning: '热情与爱', color: '#FF3366' },
  iris: { name: '蓝鸢尾', meaning: '优雅与希望', color: '#5B8DEF' },
  sunflower: { name: '黄向日葵', meaning: '阳光与忠诚', color: '#FFC93C' },
};

// ============== In-Memory Storage (MongoDB fallback) ==============
let flowers: Flower[] = [];
let specimens: Specimen[] = [];
let latestUnlockedIds: string[] = [];

const genId = () => crypto.randomBytes(12).toString('hex');
const genSerial = () => 'SP-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
const genShareToken = () => crypto.randomBytes(8).toString('hex');

// ============== Specimen Image Generator (SVG -> Base64) ==============
function generateSpecimenImage(flower: Flower): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <filter id="paperTexture" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.93  0 0 0 0 0.85  0 0 0 0.08 0" in="noise"/>
    </filter>
    <pattern id="borderPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#D4A76A"/>
      <circle cx="10" cy="10" r="2" fill="#B8923F"/>
    </pattern>
  </defs>
  <rect width="400" height="560" fill="url(#borderPattern)"/>
  <rect x="14" y="14" width="372" height="532" fill="#FFF8E7"/>
  <rect x="24" y="24" width="352" height="512" fill="none" stroke="#D4A76A" stroke-width="2" stroke-dasharray="4,3"/>
  <rect x="14" y="14" width="372" height="532" fill="url(#paperTexture)"/>
  <g transform="translate(200, 220)">
    ${generateFlowerSVG(flower)}
  </g>
  <text x="200" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#5A3E1B" font-weight="bold">${flower.name}</text>
  <text x="200" y="420" text-anchor="middle" font-family="Georgia, serif" font-size="16" fill="#8B6F47" font-style="italic">"${flower.meaning}"</text>
  <line x1="100" y1="445" x2="300" y2="445" stroke="#D4A76A" stroke-width="1"/>
  <text x="200" y="475" text-anchor="middle" font-family="'Courier New', monospace" font-size="12" fill="#8B6F47">${flower.serialNumber || ''}</text>
  <text x="200" y="495" text-anchor="middle" font-family="'Courier New', monospace" font-size="11" fill="#A0826D">数字标本馆 · Digital Herbarium</text>
  <text x="200" y="520" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#A0826D">${new Date().toLocaleDateString('zh-CN')}</text>
</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function generateFlowerSVG(flower: Flower): string {
  const c = flower.color;
  if (flower.species === 'rose') {
    return `
      <ellipse cx="0" cy="60" rx="35" ry="10" fill="#3E7B2C" opacity="0.3"/>
      <rect x="-4" y="0" width="8" height="80" fill="#4A8B3A" rx="3"/>
      <path d="M -30 20 Q -60 -10 -40 -40 Q -10 -50 0 -20 Q 10 -50 40 -40 Q 60 -10 30 20 Q 15 35 0 30 Q -15 35 -30 20 Z" fill="${c}"/>
      <ellipse cx="0" cy="-10" rx="22" ry="18" fill="${c}" opacity="0.85"/>
      <ellipse cx="0" cy="-15" rx="14" ry="11" fill="${c}" opacity="0.7"/>
      <circle cx="0" cy="-18" r="6" fill="#FFE4B5"/>
      <path d="M -20 30 Q -40 50 -35 70" stroke="#4A8B3A" stroke-width="3" fill="none"/>
      <ellipse cx="-40" cy="55" rx="14" ry="7" fill="#5BA348" transform="rotate(-30 -40 55)"/>
    `;
  } else if (flower.species === 'iris') {
    return `
      <ellipse cx="0" cy="70" rx="30" ry="8" fill="#3E7B2C" opacity="0.3"/>
      <rect x="-3" y="0" width="6" height="85" fill="#4A8B3A" rx="2"/>
      <path d="M 0 -10 Q -50 -20 -55 10 Q -30 25 -10 10 Z" fill="${c}" opacity="0.9"/>
      <path d="M 0 -10 Q 50 -20 55 10 Q 30 25 10 10 Z" fill="${c}" opacity="0.9"/>
      <path d="M 0 -10 Q -25 -55 -5 -65 Q 10 -50 5 -25 Z" fill="${c}"/>
      <path d="M 0 -10 Q 25 -55 5 -65 Q -10 -50 -5 -25 Z" fill="${c}" opacity="0.85"/>
      <path d="M -10 5 Q -30 15 -25 35 Q -5 30 0 10 Z" fill="${c}" opacity="0.75"/>
      <path d="M 10 5 Q 30 15 25 35 Q 5 30 0 10 Z" fill="${c}" opacity="0.75"/>
      <ellipse cx="0" cy="-20" rx="8" ry="10" fill="#FFE4B5"/>
      <path d="M -15 15 Q -40 45 -30 65" stroke="#4A8B3A" stroke-width="2.5" fill="none"/>
      <path d="M 15 15 Q 40 45 30 65" stroke="#4A8B3A" stroke-width="2.5" fill="none"/>
    `;
  } else {
    return `
      <ellipse cx="0" cy="75" rx="35" ry="9" fill="#3E7B2C" opacity="0.3"/>
      <rect x="-4" y="5" width="8" height="80" fill="#4A8B3A" rx="3"/>
      ${Array.from({ length: 14 }, (_, i) => {
        const angle = (i * 360) / 14;
        const rad = (angle * Math.PI) / 180;
        const x1 = Math.cos(rad) * 18;
        const y1 = Math.sin(rad) * 18 - 10;
        const x2 = Math.cos(rad) * 50;
        const y2 = Math.sin(rad) * 50 - 10;
        return `<ellipse cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2}" rx="14" ry="8" fill="${c}" transform="rotate(${angle} ${(x1 + x2) / 2} ${(y1 + y2) / 2})"/>`;
      }).join('')}
      <circle cx="0" cy="-10" r="22" fill="#8B4513"/>
      <circle cx="0" cy="-10" r="17" fill="#A0522D"/>
      <circle cx="0" cy="-10" r="10" fill="#654321"/>
      <path d="M -25 40 Q -50 60 -40 80" stroke="#4A8B3A" stroke-width="3" fill="none"/>
      <ellipse cx="-45" cy="65" rx="18" ry="8" fill="#5BA348" transform="rotate(-25 -45 65)"/>
    `;
  }
}

// ============== Flower Routes ==============
app.get('/api/flowers', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const start = (page - 1) * limit;
  const paginated = flowers.slice(start, start + limit);
  res.json({
    data: paginated,
    total: flowers.length,
    page,
    limit,
    totalPages: Math.ceil(flowers.length / limit),
  });
});

app.get('/api/flowers/latest', (_req: Request, res: Response) => {
  const latest = flowers
    .filter((f) => f.unlocked && f.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
    .slice(0, 5);
  res.json(latest);
});

app.post('/api/flowers', (req: Request, res: Response) => {
  const { species, ownerName = '花语使者' } = req.body as { species: FlowerSpecies; ownerName?: string };
  if (!SEED_DATA[species]) {
    return res.status(400).json({ error: '无效的花种' });
  }
  const seed = SEED_DATA[species];
  const flower: Flower = {
    _id: genId(),
    species,
    name: seed.name,
    meaning: seed.meaning,
    color: seed.color,
    progress: 0,
    health: 100,
    unlocked: false,
    createdAt: new Date().toISOString(),
    ownerName,
  };
  flowers.push(flower);
  res.status(201).json(flower);
});

app.patch('/api/flowers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body as { action: 'water' | 'fertilize' | 'light' };
  const flower = flowers.find((f) => f._id === id);
  if (!flower) return res.status(404).json({ error: '花朵不存在' });
  if (flower.unlocked) return res.json(flower);

  let progressDelta = 0;
  let healthDelta = 0;

  switch (action) {
    case 'water':
      progressDelta = 10;
      break;
    case 'fertilize':
      progressDelta = 15;
      healthDelta = -5;
      break;
    case 'light':
      progressDelta = 5;
      healthDelta = 5;
      break;
    default:
      return res.status(400).json({ error: '无效操作' });
  }

  flower.progress = Math.min(100, flower.progress + progressDelta);
  flower.health = Math.max(0, Math.min(100, flower.health + healthDelta));

  if (flower.progress >= 100) {
    flower.unlocked = true;
    flower.unlockedAt = new Date().toISOString();
    latestUnlockedIds.unshift(flower._id);
  }

  res.json(flower);
});

// ============== Specimen Routes ==============
app.get('/api/specimens', (_req: Request, res: Response) => {
  res.json(specimens.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.post('/api/specimens', (req: Request, res: Response) => {
  const { flowerId } = req.body as { flowerId: string };
  const flower = flowers.find((f) => f._id === flowerId);
  if (!flower) return res.status(404).json({ error: '花朵不存在' });
  if (!flower.unlocked) return res.status(400).json({ error: '花朵尚未解锁，无法制作标本' });

  const serialNumber = genSerial();
  const specimen: Specimen = {
    _id: genId(),
    flowerId: flower._id,
    flowerName: flower.name,
    flowerMeaning: flower.meaning,
    flowerColor: flower.color,
    serialNumber,
    imageBase64: generateSpecimenImage({ ...flower, serialNumber } as Flower & { serialNumber: string }),
    favorite: false,
    shareToken: genShareToken(),
    createdAt: new Date().toISOString(),
  };
  specimens.push(specimen);
  res.status(201).json(specimen);
});

app.patch('/api/specimens/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { favorite } = req.body as { favorite?: boolean };
  const specimen = specimens.find((s) => s._id === id);
  if (!specimen) return res.status(404).json({ error: '标本不存在' });
  if (typeof favorite === 'boolean') specimen.favorite = favorite;
  res.json(specimen);
});

app.get('/api/specimens/:id/share', (req: Request, res: Response) => {
  const { id } = req.params;
  const specimen = specimens.find((s) => s._id === id);
  if (!specimen) return res.status(404).json({ error: '标本不存在' });
  res.json({
    shareUrl: `${req.protocol}://${req.get('host')}/specimen/${specimen.shareToken}`,
    shareToken: specimen.shareToken,
  });
});

// ============== Seed Demo Data ==============
function seedDemoData() {
  const demoOwner = '花语使者';
  const demoFlower1: Flower = {
    _id: genId(),
    species: 'rose',
    name: SEED_DATA.rose.name,
    meaning: SEED_DATA.rose.meaning,
    color: SEED_DATA.rose.color,
    progress: 100,
    health: 90,
    unlocked: true,
    unlockedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    ownerName: demoOwner,
  };
  flowers.push(demoFlower1);

  const demoFlower2: Flower = {
    _id: genId(),
    species: 'sunflower',
    name: SEED_DATA.sunflower.name,
    meaning: SEED_DATA.sunflower.meaning,
    color: SEED_DATA.sunflower.color,
    progress: 65,
    health: 85,
    unlocked: false,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    ownerName: demoOwner,
  };
  flowers.push(demoFlower2);
  latestUnlockedIds.unshift(demoFlower1._id);

  const demoSpecimen: Specimen = {
    _id: genId(),
    flowerId: demoFlower1._id,
    flowerName: demoFlower1.name,
    flowerMeaning: demoFlower1.meaning,
    flowerColor: demoFlower1.color,
    serialNumber: genSerial(),
    imageBase64: '',
    favorite: true,
    shareToken: genShareToken(),
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  };
  demoSpecimen.imageBase64 = generateSpecimenImage({ ...demoFlower1, serialNumber: demoSpecimen.serialNumber } as Flower & { serialNumber: string });
  specimens.push(demoSpecimen);
}
seedDemoData();

app.listen(PORT, () => {
  console.log(`🌸 花语密码服务已启动: http://localhost:${PORT}`);
});
