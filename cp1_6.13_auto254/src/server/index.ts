import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { DiaryEntry, DiaryCreateInput, DiaryUpdateInput, EmotionType } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'diaries.json');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
}

function readDiaries(): DiaryEntry[] {
  ensureDataFile();
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data) as DiaryEntry[];
  } catch {
    return [];
  }
}

function writeDiaries(diaries: DiaryEntry[]): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(diaries, null, 2));
}

app.get('/api/diaries', (_req, res): void => {
  try {
    const diaries = readDiaries().sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, data: diaries });
  } catch (error) {
    res.status(500).json({ success: false, error: '读取日记列表失败' });
  }
});

app.get('/api/diaries/:id', (req, res): void => {
  try {
    const { id } = req.params;
    const diaries = readDiaries();
    const diary = diaries.find((d) => d.id === id);
    if (!diary) {
      res.status(404).json({ success: false, error: '日记不存在' });
      return;
    }
    res.json({ success: true, data: diary });
  } catch (error) {
    res.status(500).json({ success: false, error: '读取日记失败' });
  }
});

app.post('/api/diaries', (req, res): void => {
  try {
    const { content, emotion } = req.body as DiaryCreateInput;
    if (!content || !content.trim()) {
      res.status(400).json({ success: false, error: '日记内容不能为空' });
      return;
    }
    const validEmotions: EmotionType[] = ['joy', 'melancholy', 'fantasy', 'serenity', 'passion'];
    if (!emotion || !validEmotions.includes(emotion)) {
      res.status(400).json({ success: false, error: '无效的情绪类型' });
      return;
    }

    const now = Date.now();
    const newDiary: DiaryEntry = {
      id: uuidv4(),
      content: content.trim(),
      emotion,
      createdAt: now,
      updatedAt: now,
    };

    const diaries = readDiaries();
    diaries.push(newDiary);
    writeDiaries(diaries);

    res.status(201).json({ success: true, data: newDiary });
  } catch (error) {
    res.status(500).json({ success: false, error: '创建日记失败' });
  }
});

app.put('/api/diaries/:id', (req, res): void => {
  try {
    const { id } = req.params;
    const { content, emotion } = req.body as DiaryUpdateInput;
    const diaries = readDiaries();
    const index = diaries.findIndex((d) => d.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: '日记不存在' });
      return;
    }

    if (content !== undefined) {
      if (!content.trim()) {
        res.status(400).json({ success: false, error: '日记内容不能为空' });
        return;
      }
      diaries[index].content = content.trim();
    }

    if (emotion !== undefined) {
      const validEmotions: EmotionType[] = ['joy', 'melancholy', 'fantasy', 'serenity', 'passion'];
      if (!validEmotions.includes(emotion)) {
        res.status(400).json({ success: false, error: '无效的情绪类型' });
        return;
      }
      diaries[index].emotion = emotion;
    }

    diaries[index].updatedAt = Date.now();
    writeDiaries(diaries);

    res.json({ success: true, data: diaries[index] });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新日记失败' });
  }
});

app.delete('/api/diaries/:id', (req, res): void => {
  try {
    const { id } = req.params;
    const diaries = readDiaries();
    const index = diaries.findIndex((d) => d.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, error: '日记不存在' });
      return;
    }

    diaries.splice(index, 1);
    writeDiaries(diaries);

    res.json({ success: true, message: '日记已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除日记失败' });
  }
});

app.get('/api/share/:id', (req, res): void => {
  try {
    const { id } = req.params;
    const diaries = readDiaries();
    const diary = diaries.find((d) => d.id === id);
    if (!diary) {
      res.status(404).json({ success: false, error: '日记不存在' });
      return;
    }
    res.json({ success: true, data: diary, shareUrl: `/share/${id}` });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取分享信息失败' });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] 织言·光影日记后端服务已启动: http://localhost:${PORT}`);
});
