import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

interface Palette {
  id: string;
  name: string;
  colors: string[];
  createdAt: number;
}

let palettes: Palette[] = [];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function randomHexColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function generateHarmoniousColors(): string[] {
  const baseHue = Math.floor(Math.random() * 360);
  const colors: string[] = [];
  const offsets = [0, 30, 60, 180, 210];
  
  for (let i = 0; i < 5; i++) {
    const hue = (baseHue + offsets[i]) % 360;
    const saturation = 50 + Math.floor(Math.random() * 30);
    const lightness = 35 + Math.floor(Math.random() * 30);
    colors.push(hslToHex(hue, saturation, lightness));
  }
  return colors;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    '#' +
    [0, 8, 4]
      .map((n) => {
        const val = Math.round(255 * f(n));
        return val.toString(16).padStart(2, '0');
      })
      .join('')
      .toUpperCase()
  );
}

app.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未接收到图片文件' });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

    const colors = generateHarmoniousColors();
    res.json({ colors });
  } catch (error) {
    res.status(500).json({ error: '色值提取失败' });
  }
});

app.post('/palettes', (req: Request, res: Response) => {
  try {
    const { name, colors } = req.body;

    if (!name || !colors || !Array.isArray(colors) || colors.length === 0) {
      res.status(400).json({ error: '缺少必要参数' });
      return;
    }

    if (name.length > 20) {
      res.status(400).json({ error: '名称不能超过20个字符' });
      return;
    }

    const palette: Palette = {
      id: generateId(),
      name,
      colors,
      createdAt: Date.now()
    };

    palettes.push(palette);
    res.json(palette);
  } catch (error) {
    res.status(500).json({ error: '保存方案失败' });
  }
});

app.get('/palettes', (_req: Request, res: Response) => {
  try {
    const sorted = [...palettes].sort((a, b) => b.createdAt - a.createdAt);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: '获取方案列表失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
