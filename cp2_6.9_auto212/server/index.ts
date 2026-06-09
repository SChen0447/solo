import express, { Request, Response } from 'express';
import cors from 'cors';

interface FlavorProfile {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  cleanliness: number;
}

interface Tasting {
  id: string;
  coffeeName: string;
  roastLevel: string;
  flavors: FlavorProfile;
  score: number;
  date: string;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let tastings: Tasting[] = [];

const calculateScore = (flavors: FlavorProfile): number => {
  return Number(
    (
      flavors.acidity * 0.2 +
      flavors.bitterness * 0.15 +
      flavors.sweetness * 0.25 +
      flavors.body * 0.2 +
      flavors.cleanliness * 0.2
    ).toFixed(2)
  );
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

app.get('/api/tastings', (_req: Request, res: Response<Tasting[]>) => {
  res.json(tastings);
});

app.post('/api/tastings', (req: Request, res: Response<Tasting>) => {
  const { coffeeName, roastLevel, flavors } = req.body;

  if (!coffeeName || !roastLevel || !flavors) {
    res.status(400).json({} as Tasting);
    return;
  }

  const newTasting: Tasting = {
    id: generateId(),
    coffeeName,
    roastLevel,
    flavors: {
      acidity: Math.max(0, Math.min(10, Math.round(flavors.acidity))),
      bitterness: Math.max(0, Math.min(10, Math.round(flavors.bitterness))),
      sweetness: Math.max(0, Math.min(10, Math.round(flavors.sweetness))),
      body: Math.max(0, Math.min(10, Math.round(flavors.body))),
      cleanliness: Math.max(0, Math.min(10, Math.round(flavors.cleanliness)))
    },
    score: 0,
    date: new Date().toISOString()
  };

  newTasting.score = calculateScore(newTasting.flavors);
  tastings.unshift(newTasting);
  res.status(201).json(newTasting);
});

app.delete('/api/tastings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = tastings.findIndex(t => t.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Tasting not found' });
    return;
  }

  tastings.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
