import express, { Request, Response } from 'express';
import cors from 'cors';

interface ColorHsl {
  h: number;
  s: number;
  l: number;
}

interface MoodRecord {
  id: string;
  date: string;
  colorHsl: ColorHsl;
  note: string;
  timestamp: number;
}

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const moodStore = new Map<string, MoodRecord[]>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

app.post('/api/mood', (req: Request, res: Response) => {
  try {
    const { date, colorHsl, note } = req.body as {
      date: string;
      colorHsl: ColorHsl;
      note: string;
    };

    if (!date || !colorHsl) {
      return res.status(400).json({ error: 'date and colorHsl are required' });
    }

    const record: MoodRecord = {
      id: generateId(),
      date,
      colorHsl,
      note: note || '',
      timestamp: Date.now(),
    };

    const existing = moodStore.get(date) || [];
    if (existing.length >= 3) {
      return res.status(400).json({ error: 'Maximum 3 records per day' });
    }

    existing.push(record);
    moodStore.set(date, existing);

    return res.status(201).json(record);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mood/:date', (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const records = moodStore.get(date) || [];
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mood/week', (req: Request, res: Response) => {
  try {
    const { start } = req.query as { start: string };
    if (!start) {
      return res.status(400).json({ error: 'start date is required' });
    }

    const startDate = new Date(start);
    const weekData: { date: string; records: MoodRecord[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      weekData.push({
        date: dateStr,
        records: moodStore.get(dateStr) || [],
      });
    }

    return res.json(weekData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Mood diary server running on http://localhost:${PORT}`);
});
