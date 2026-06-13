import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

export interface Base {
  id: string;
  name: string;
  color: string;
}

export interface Syrup {
  id: string;
  name: string;
  color: string;
}

export interface Topping {
  id: string;
  name: string;
  type: 'pearl' | 'cream' | 'ice';
  color: string;
  count: number;
}

export interface DrinkCombination {
  bases: Base[];
  syrups: Syrup[];
  toppings: Topping[];
}

export interface PresetDrink {
  id: string;
  name: string;
  combination: DrinkCombination;
}

export interface SharedCard {
  id: string;
  nickname: string;
  drinkName: string;
  imageData: string;
  combination: DrinkCombination;
  createdAt: string;
  borderColor: string;
}

const BASES: Base[] = [
  { id: 'dark-roast', name: '深烘焙', color: '#3e2723' },
  { id: 'light-roast', name: '浅烘焙', color: '#8d6e63' },
  { id: 'cold-brew', name: '冷萃', color: '#4fc3f7' }
];

const SYRUPS: Syrup[] = [
  { id: 'caramel', name: '焦糖', color: '#f9a825' },
  { id: 'vanilla', name: '香草', color: '#e8f5e9' }
];

const TOPPINGS_META = [
  { id: 'pearl', name: '珍珠', type: 'pearl' as const, color: '#6d4c41' },
  { id: 'cream', name: '奶盖', type: 'cream' as const, color: '#fff8e7' },
  { id: 'ice', name: '冰块', type: 'ice' as const, color: '#b3e5fc' }
];

const PRESET_DRINKS: PresetDrink[] = [
  {
    id: 'preset-1',
    name: '焦糖冷萃珍珠',
    combination: {
      bases: [BASES[2]],
      syrups: [SYRUPS[0]],
      toppings: [{ ...TOPPINGS_META[0], count: 12 }]
    }
  },
  {
    id: 'preset-2',
    name: '香草浅烘焙奶盖',
    combination: {
      bases: [BASES[1]],
      syrups: [SYRUPS[1]],
      toppings: [{ ...TOPPINGS_META[1], count: 1 }]
    }
  },
  {
    id: 'preset-3',
    name: '深烘焙冰美式',
    combination: {
      bases: [BASES[0]],
      syrups: [],
      toppings: [{ ...TOPPINGS_META[2], count: 15 }]
    }
  },
  {
    id: 'preset-4',
    name: '双焙焦糖冰拿铁',
    combination: {
      bases: [BASES[0], BASES[1]],
      syrups: [SYRUPS[0]],
      toppings: [{ ...TOPPINGS_META[2], count: 10 }]
    }
  },
  {
    id: 'preset-5',
    name: '冷萃香草珍珠奶盖',
    combination: {
      bases: [BASES[2]],
      syrups: [SYRUPS[1]],
      toppings: [
        { ...TOPPINGS_META[0], count: 8 },
        { ...TOPPINGS_META[1], count: 1 }
      ]
    }
  },
  {
    id: 'preset-6',
    name: '三色极光特调',
    combination: {
      bases: [BASES[0], BASES[1], BASES[2]],
      syrups: [SYRUPS[0], SYRUPS[1]],
      toppings: [{ ...TOPPINGS_META[2], count: 8 }]
    }
  },
  {
    id: 'preset-7',
    name: '浅烘焙焦糖珍珠',
    combination: {
      bases: [BASES[1]],
      syrups: [SYRUPS[0]],
      toppings: [{ ...TOPPINGS_META[0], count: 15 }]
    }
  },
  {
    id: 'preset-8',
    name: '双酱冷萃奶盖',
    combination: {
      bases: [BASES[2]],
      syrups: [SYRUPS[0], SYRUPS[1]],
      toppings: [{ ...TOPPINGS_META[1], count: 1 }]
    }
  },
  {
    id: 'preset-9',
    name: '深烘香草冰饮',
    combination: {
      bases: [BASES[0]],
      syrups: [SYRUPS[1]],
      toppings: [{ ...TOPPINGS_META[2], count: 18 }]
    }
  },
  {
    id: 'preset-10',
    name: '浅冷双萃珍珠冰',
    combination: {
      bases: [BASES[1], BASES[2]],
      syrups: [],
      toppings: [
        { ...TOPPINGS_META[0], count: 10 },
        { ...TOPPINGS_META[2], count: 10 }
      ]
    }
  },
  {
    id: 'preset-11',
    name: '全家福特调',
    combination: {
      bases: [BASES[0], BASES[1], BASES[2]],
      syrups: [SYRUPS[0], SYRUPS[1]],
      toppings: [
        { ...TOPPINGS_META[0], count: 8 },
        { ...TOPPINGS_META[1], count: 1 },
        { ...TOPPINGS_META[2], count: 8 }
      ]
    }
  }
];

let sharedCards: SharedCard[] = [
  {
    id: 'sample-1',
    nickname: '咖啡达人',
    drinkName: '星辰冷萃',
    imageData: '',
    combination: PRESET_DRINKS[5].combination,
    createdAt: new Date().toISOString(),
    borderColor: '#ff6b6b'
  },
  {
    id: 'sample-2',
    nickname: '甜蜜时光',
    drinkName: '焦糖云朵',
    imageData: '',
    combination: PRESET_DRINKS[7].combination,
    createdAt: new Date().toISOString(),
    borderColor: '#48dbfb'
  },
  {
    id: 'sample-3',
    nickname: '夜行诗人',
    drinkName: '午夜深焙',
    imageData: '',
    combination: PRESET_DRINKS[2].combination,
    createdAt: new Date().toISOString(),
    borderColor: '#feca57'
  },
  {
    id: 'sample-4',
    nickname: '冰爽一夏',
    drinkName: '冰川浅烘',
    imageData: '',
    combination: PRESET_DRINKS[8].combination,
    createdAt: new Date().toISOString(),
    borderColor: '#ff9ff3'
  }
];

const BORDER_COLORS = [
  '#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3',
  '#667eea', '#00d2d3', '#54a0ff', '#5f27cd'
];

app.get('/api/bases', (_req, res) => {
  res.json(BASES);
});

app.get('/api/syrups', (_req, res) => {
  res.json(SYRUPS);
});

app.get('/api/toppings-meta', (_req, res) => {
  res.json(TOPPINGS_META);
});

app.get('/api/presets', (_req, res) => {
  res.json(PRESET_DRINKS);
});

app.get('/api/presets/random', (_req, res) => {
  const randomIndex = Math.floor(Math.random() * PRESET_DRINKS.length);
  res.json(PRESET_DRINKS[randomIndex]);
});

app.get('/api/cards', (_req, res) => {
  res.json(sharedCards);
});

app.get('/api/cards/:id', (req, res) => {
  const card = sharedCards.find(c => c.id === req.params.id);
  if (!card) {
    res.status(404).json({ error: '卡片不存在' });
    return;
  }
  res.json(card);
});

app.post('/api/cards', (req, res) => {
  const { nickname, drinkName, imageData, combination } = req.body;
  
  if (!nickname || !drinkName || !combination) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  const newCard: SharedCard = {
    id: uuidv4(),
    nickname: String(nickname).slice(0, 8),
    drinkName: String(drinkName),
    imageData: imageData || '',
    combination,
    createdAt: new Date().toISOString(),
    borderColor: BORDER_COLORS[Math.floor(Math.random() * BORDER_COLORS.length)]
  };

  sharedCards.unshift(newCard);
  
  if (sharedCards.length > 50) {
    sharedCards = sharedCards.slice(0, 50);
  }

  res.json({
    success: true,
    card: newCard,
    shareUrl: `/card/${newCard.id}`
  });
});

app.listen(PORT, () => {
  console.log(`光饮·调色工坊 后端服务已启动: http://localhost:${PORT}`);
});
