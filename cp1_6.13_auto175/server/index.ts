import express, { Request, Response } from 'express';
import cors from 'cors';

interface TentacleJoint {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
}

interface Tentacle {
  joints: TentacleJoint[];
}

interface JellyfishState {
  userId: string;
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  feedCount: number;
  mood: number;
  bodyColor: string;
  glowColor: string;
  velocityX: number;
  velocityY: number;
  directionTimer: number;
  tentacles: Tentacle[];
  lastSaved: number;
}

const app = express();
const PORT = 3001;

const storage = new Map<string, JellyfishState>();

app.use(cors());
app.use(express.json());

app.post('/api/save', (req: Request, res: Response) => {
  try {
    const { userId, state } = req.body as { userId: string; state: JellyfishState };
    if (!userId || !state) {
      res.status(400).json({ success: false, message: '缺少必要参数' });
      return;
    }
    state.lastSaved = Date.now();
    storage.set(userId, state);
    res.json({ success: true, message: '保存成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/load', (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId: string };
    if (!userId) {
      res.status(400).json({ success: false, message: '缺少userId参数' });
      return;
    }
    const state = storage.get(userId);
    res.json({ success: true, state: state || undefined });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] 流光水母后端服务器运行在 http://localhost:${PORT}`);
});
