import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

type BloomStatus = 'blooming' | 'budding' | 'fading' | 'dormant';

interface Plant {
  id: string;
  gardenId: string;
  name: string;
  latinName: string;
  lat: number;
  lng: number;
  bloomStatus: BloomStatus;
  bloomPeriod: string;
  caretaker: string;
}

interface Garden {
  id: string;
  name: string;
  color: string;
  center: [number, number];
  bounds: [number, number][];
  description: string;
  thumbnail: string;
}

interface Observation {
  id: string;
  plantId: string;
  description: string;
  mood: string;
  photo: string;
  timestamp: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

const GARDENS: Garden[] = [
  {
    id: 'rainforest',
    name: '热带雨林区',
    color: '#2ECC71',
    center: [39.9920, 116.2810],
    bounds: [
      [39.9930, 116.2790],
      [39.9935, 116.2825],
      [39.9905, 116.2830],
      [39.9900, 116.2795]
    ],
    description: '模拟热带雨林气候，展示热带、亚热带植物',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&h=160&fit=crop'
  },
  {
    id: 'desert',
    name: '沙漠植物区',
    color: '#E67E22',
    center: [39.9940, 116.2860],
    bounds: [
      [39.9950, 116.2840],
      [39.9955, 116.2875],
      [39.9925, 116.2880],
      [39.9920, 116.2845]
    ],
    description: '干旱半干旱气候区，展示仙人掌、多肉植物',
    thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=200&h=160&fit=crop'
  },
  {
    id: 'alpine',
    name: '高山花卉区',
    color: '#3498DB',
    center: [39.9895, 116.2850],
    bounds: [
      [39.9905, 116.2830],
      [39.9910, 116.2865],
      [39.9880, 116.2870],
      [39.9875, 116.2835]
    ],
    description: '高海拔气候模拟，展示耐寒高山花卉',
    thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=200&h=160&fit=crop'
  },
  {
    id: 'aquatic',
    name: '水生植物区',
    color: '#1ABC9C',
    center: [39.9910, 116.2905],
    bounds: [
      [39.9920, 116.2885],
      [39.9925, 116.2920],
      [39.9895, 116.2925],
      [39.9890, 116.2890]
    ],
    description: '水生环境展示，荷花、睡莲等水生花卉',
    thumbnail: 'https://images.unsplash.com/photo-1474557157379-8aa74a6ef541?w=200&h=160&fit=crop'
  },
  {
    id: 'medicinal',
    name: '药用植物区',
    color: '#9B59B6',
    center: [39.9950, 116.2915],
    bounds: [
      [39.9960, 116.2895],
      [39.9965, 116.2930],
      [39.9935, 116.2935],
      [39.9930, 116.2900]
    ],
    description: '中草药及药用植物展示区',
    thumbnail: 'https://images.unsplash.com/photo-1512428813838-8886e3f04134?w=200&h=160&fit=crop'
  }
];

const PLANT_NAMES = [
  { cn: '绿萝', latin: 'Epipremnum aureum' },
  { cn: '龟背竹', latin: 'Monstera deliciosa' },
  { cn: '蝴蝶兰', latin: 'Phalaenopsis amabilis' },
  { cn: '红掌', latin: 'Anthurium andraeanum' },
  { cn: '滴水观音', latin: 'Alocasia odora' },
  { cn: '仙人掌', latin: 'Opuntia dillenii' },
  { cn: '金琥', latin: 'Echinocactus grusonii' },
  { cn: '龙舌兰', latin: 'Agave americana' },
  { cn: '芦荟', latin: 'Aloe vera' },
  { cn: '雪莲', latin: 'Saussurea involucrata' },
  { cn: '高山杜鹃', latin: 'Rhododendron lapponicum' },
  { cn: '报春花', latin: 'Primula malacoides' },
  { cn: '龙胆花', latin: 'Gentiana scabra' },
  { cn: '荷花', latin: 'Nelumbo nucifera' },
  { cn: '睡莲', latin: 'Nymphaea tetragona' },
  { cn: '芦苇', latin: 'Phragmites australis' },
  { cn: '香蒲', latin: 'Typha orientalis' },
  { cn: '人参', latin: 'Panax ginseng' },
  { cn: '当归', latin: 'Angelica sinensis' },
  { cn: '枸杞', latin: 'Lycium chinense' },
  { cn: '金银花', latin: 'Lonicera japonica' },
  { cn: '菊花', latin: 'Chrysanthemum morifolium' },
  { cn: '牡丹', latin: 'Paeonia suffruticosa' },
  { cn: '芍药', latin: 'Paeonia lactiflora' }
];

const CARETAKERS = ['李明园艺师', '王芳博士', '张伟主任', '陈静研究员', '刘洋主管'];
const BLOOM_PERIODS = ['3月-5月', '4月-6月', '5月-8月', '6月-9月', '7月-10月', '全年'];
const STATUSES: BloomStatus[] = ['blooming', 'budding', 'fading', 'dormant'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generatePlants(): Plant[] {
  const plants: Plant[] = [];
  let counter = 0;

  GARDENS.forEach((garden) => {
    const rand = seededRandom(counter + 42);
    const lats = garden.bounds.map((b) => b[0]);
    const lngs = garden.bounds.map((b) => b[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const plantCount = Math.floor(rand() * 31) + 20;

    for (let i = 0; i < plantCount; i++) {
      const lat = minLat + rand() * (maxLat - minLat);
      const lng = minLng + rand() * (maxLng - minLng);
      const plantInfo = PLANT_NAMES[Math.floor(rand() * PLANT_NAMES.length)];
      plants.push({
        id: `${garden.id}-${i}`,
        gardenId: garden.id,
        name: plantInfo.cn,
        latinName: plantInfo.latin,
        lat,
        lng,
        bloomStatus: STATUSES[Math.floor(rand() * STATUSES.length)],
        bloomPeriod: BLOOM_PERIODS[Math.floor(rand() * BLOOM_PERIODS.length)],
        caretaker: CARETAKERS[Math.floor(rand() * CARETAKERS.length)]
      });
      counter++;
    }
  });

  return plants;
}

const ALL_PLANTS = generatePlants();
const observations: Observation[] = [];

function generateHeatmap(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  GARDENS.forEach((garden, idx) => {
    const rand = seededRandom(Date.now() + idx);
    const count = 8 + Math.floor(rand() * 8);
    const lats = garden.bounds.map((b) => b[0]);
    const lngs = garden.bounds.map((b) => b[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    for (let i = 0; i < count; i++) {
      points.push({
        lat: minLat + rand() * (maxLat - minLat),
        lng: minLng + rand() * (maxLng - minLng),
        intensity: rand()
      });
    }
  });
  return points;
}

app.get('/api/gardens', (_req: Request, res: Response) => {
  const result = GARDENS.map((g) => ({
    ...g,
    bloomingCount: ALL_PLANTS.filter((p) => p.gardenId === g.id && p.bloomStatus === 'blooming').length,
    totalCount: ALL_PLANTS.filter((p) => p.gardenId === g.id).length
  }));
  setTimeout(() => res.json(result), 80);
});

app.get('/api/gardens/:id/plants', (req: Request, res: Response) => {
  const { id } = req.params;
  const plants = ALL_PLANTS.filter((p) => p.gardenId === id);
  res.json(plants);
});

app.get('/api/plants', (_req: Request, res: Response) => {
  res.json(ALL_PLANTS);
});

app.get('/api/heatmap', (_req: Request, res: Response) => {
  res.json(generateHeatmap());
});

app.post('/api/observations', (req: Request, res: Response) => {
  const { plantId, description, mood, photo } = req.body;
  if (!plantId || !description) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const obs: Observation = {
    id: uuidv4(),
    plantId,
    description,
    mood: mood || '',
    photo: photo || '',
    timestamp: new Date().toISOString()
  };
  observations.push(obs);
  res.status(201).json(obs);
});

app.listen(PORT, () => {
  console.log(`Digital Garden Server running on http://localhost:${PORT}`);
});
