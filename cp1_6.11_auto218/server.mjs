import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const tuneDatabase = new Map();

app.post('/api/tune', (req, res) => {
  try {
    const { strings, timestamp, recordedEvents } = req.body;

    if (!strings || !Array.isArray(strings) || strings.length !== 7) {
      return res.status(400).json({
        error: 'Invalid tuning data. Expected 7 strings.'
      });
    }

    const id = uuidv4();
    const data = {
      id,
      strings: strings.map(s => ({
        id: s.id,
        tension: Number(s.tension),
        note: s.note
      })),
      timestamp: timestamp || Date.now(),
      recordedEvents: recordedEvents || []
    };

    tuneDatabase.set(id, data);

    console.log(`[TUNE SAVED] ID: ${id}, Strings: ${strings.length}`);

    res.status(201).json({
      success: true,
      id,
      data
    });
  } catch (error) {
    console.error('[POST /api/tune] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tune/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = tuneDatabase.get(id);

    if (!data) {
      return res.status(404).json({
        error: `Tuning with ID "${id}" not found.`
      });
    }

    console.log(`[TUNE LOADED] ID: ${id}`);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[GET /api/tune/:id] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tunes', (_req, res) => {
  const allTunes = Array.from(tuneDatabase.values()).map(t => ({
    id: t.id,
    timestamp: t.timestamp,
    stringCount: t.strings.length
  }));
  res.json({
    success: true,
    count: allTunes.length,
    tunes: allTunes
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   古琴音律调校实验室 - 后端服务启动成功                      ║
║   服务地址: http://localhost:${PORT}                            ║
║   可用端点:                                                ║
║     POST /api/tune        - 保存调律数据                    ║
║     GET  /api/tune/:id    - 加载调律数据                    ║
║     GET  /api/tunes       - 列出所有调律                    ║
╚══════════════════════════════════════════════════════════╝
  `);
});
