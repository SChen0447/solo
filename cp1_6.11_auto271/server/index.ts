import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { workerPool, TastingReport } from './fermentationWorker';
import { FermentationEngine, TeaVariety, FermentationParams } from '../src/FermentationEngine';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface StoredBatch {
  id: string;
  name: string;
  variety: TeaVariety;
  params: FermentationParams;
  speedMultiplier: number;
  createdAt: number;
  report?: TastingReport;
  completed: boolean;
}

const batchStorage = new Map<string, StoredBatch>();

const createBatchSchema = z.object({
  variety: z.enum(['puer_raw', 'minbei_oolong', 'qimen_black']),
  params: z.object({
    temperature: z.number().min(20).max(45),
    humidity: z.number().min(40).max(90),
    turnFrequency: z.union([z.literal(2), z.literal(4), z.literal(8)])
  }),
  name: z.string().optional(),
  speedMultiplier: z.number().min(0.1).max(100).optional()
});

const updateParamsSchema = z.object({
  temperature: z.number().min(20).max(45).optional(),
  humidity: z.number().min(40).max(90).optional(),
  turnFrequency: z.union([z.literal(2), z.literal(4), z.literal(8)]).optional()
});

app.get('/api/varieties', (req, res) => {
  const varieties = FermentationEngine.getVarieties().map(v => ({
    id: v.id,
    name: v.name,
    description: v.description,
    tempRange: v.tempRange,
    humidityRange: v.humidityRange,
    fermentationDays: v.fermentationDays,
    initialColor: v.initialColor,
    finalColor: v.finalColor
  }));
  res.json({ varieties });
});

app.get('/api/batches', (req, res) => {
  const batches = Array.from(batchStorage.values()).map(batch => {
    const task = workerPool.getTask(batch.id);
    return {
      id: batch.id,
      name: batch.name,
      variety: batch.variety,
      params: batch.params,
      speedMultiplier: batch.speedMultiplier,
      status: task?.status || (batch.completed ? 'completed' : 'idle'),
      currentDay: task?.currentDay || 0,
      totalDays: task?.totalDays || 0,
      currentState: task?.currentState || null,
      report: batch.report || null,
      createdAt: batch.createdAt
    };
  });
  res.json({ batches });
});

app.post('/api/batches', (req, res) => {
  const result = createBatchSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  if (batchStorage.size >= 5) {
    return res.status(400).json({ error: '最多只能创建5个批次' });
  }

  const { variety, params, name, speedMultiplier = 1 } = result.data;
  const id = uuidv4();
  const engine = new FermentationEngine(variety, params);
  const config = engine.getConfig();

  const batch: StoredBatch = {
    id,
    name: name || `${config.name} - 批次${batchStorage.size + 1}`,
    variety,
    params,
    speedMultiplier,
    createdAt: Date.now(),
    completed: false
  };

  batchStorage.set(id, batch);
  workerPool.createTask(id, variety, params, speedMultiplier);

  res.status(201).json({ batch: {
    id: batch.id,
    name: batch.name,
    variety: batch.variety,
    params: batch.params,
    speedMultiplier: batch.speedMultiplier,
    status: 'idle',
    currentDay: 0,
    totalDays: config.fermentationDays,
    currentState: engine.getStateAtDay(0),
    report: null,
    createdAt: batch.createdAt
  }});
});

app.get('/api/batches/:id', (req, res) => {
  const batch = batchStorage.get(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  const task = workerPool.getTask(batch.id);
  res.json({
    batch: {
      id: batch.id,
      name: batch.name,
      variety: batch.variety,
      params: batch.params,
      speedMultiplier: batch.speedMultiplier,
      status: task?.status || (batch.completed ? 'completed' : 'idle'),
      currentDay: task?.currentDay || 0,
      totalDays: task?.totalDays || 0,
      currentState: task?.currentState || null,
      history: task?.history || [],
      report: batch.report || null
    }
  });
});

app.put('/api/batches/:id/params', (req, res) => {
  const batch = batchStorage.get(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  const task = workerPool.getTask(batch.id);
  if (task?.status === 'running') {
    return res.status(400).json({ error: '运行中的批次不能修改参数' });
  }

  const result = updateParamsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }

  batch.params = { ...batch.params, ...result.data };
  workerPool.updateParams(batch.id, result.data);

  res.json({ success: true, params: batch.params });
});

app.put('/api/batches/:id/speed', (req, res) => {
  const batch = batchStorage.get(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  const { speedMultiplier } = req.body.speedMultiplier;
  if (typeof speedMultiplier !== 'number' || speedMultiplier < 0.1 || speedMultiplier > 100) {
    return res.status(400).json({ error: '无效的速度倍率' });
  }

  batch.speedMultiplier = speedMultiplier;
  workerPool.updateSpeed(batch.id, speedMultiplier);

  res.json({ success: true, speedMultiplier });
});

app.post('/api/batches/:id/start', (req, res) => {
  const batch = batchStorage.get(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  const success = workerPool.startTask(batch.id);
  if (!success) {
    return res.status(400).json({ error: '无法启动批次' });
  }

  const task = workerPool.getTask(batch.id);
  res.json({ success: true, status: task?.status });
});

app.post('/api/batches/:id/pause', (req, res) => {
  const batch = batchStorage.get(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  const success = workerPool.pauseTask(batch.id);
  if (!success) {
    return res.status(400).json({ error: '无法暂停批次' });
  }

  const task = workerPool.getTask(batch.id);
  res.json({ success: true, status: task?.status });
});

app.post('/api/batches/:id/reset', (req, res) => {
  const batch = batchStorage.get(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  workerPool.resetTask(batch.id);
  batch.completed = false;
  batch.report = undefined;

  res.json({ success: true });
});

app.delete('/api/batches/:id', (req, res) => {
  const batchId = req.params.id;
  if (!batchStorage.has(batchId)) {
    batchStorage.delete(batchId);
    workerPool.removeTask(batchId);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '批次不存在' });
  }
});

app.get('/api/batches/:id/report', (req, res) => {
  const batch = batchStorage.get(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  if (!batch.report) {
    const task = workerPool.getTask(batch.id);
    if (task?.status === 'completed' && task.report) {
      batch.report = task.report;
      batch.completed = true;
    } else {
      return res.status(400).json({ error: '报告尚未生成' });
    }
  }

  res.json({ report: batch.report });
});

app.get('/api/compare', (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) {
    return res.status(400).json({ error: '请提供批次ID' });
  }

  const ids = idsParam.split(',');
  const reports = ids
    .map(id => batchStorage.get(id))
    .filter((b): b is StoredBatch => b !== undefined && b.report !== undefined)
    .map(batch => ({
      batchId: batch.id,
      batchName: batch.name,
      variety: batch.variety,
      report: batch.report
    }));

  res.json({ comparisons: reports });
});

app.get('/api/simulate/:variety', (req, res) => {
  const { variety } = req.params;
  const { day = 0, temp, humidity, turn } = req.query;

  if (!['puer_raw', 'minbei_oolong', 'qimen_black'].includes(variety as TeaVariety)) {
    return res.status(400).json({ error: '无效的茶叶品种' });
  }

  const params: FermentationParams = {
    temperature: temp ? parseFloat(temp as string) : 28,
    humidity: humidity ? parseFloat(humidity as string) : 70,
    turnFrequency: (turn ? parseInt(turn as string) : 4) as 2 | 4 | 8
  };

  const engine = new FermentationEngine(variety as TeaVariety, params);
  const dayNum = parseInt(day as string);
  const state = engine.getStateAtDay(dayNum);
  const tasteScores = engine.getTasteScores(dayNum);
  const efficiency = engine.getEfficiencyFactor();

  res.json({
    state,
    tasteScores,
    efficiency,
    totalDays: engine.getTotalDays()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeTasks: workerPool.getAllTasks().length });
});

app.listen(PORT, () => {
  console.log(`茶叶发酵品鉴服务运行在 http://localhost:${PORT}`);
  console.log(`并发限制: ${workerPool.getMaxConcurrency()} 个批次`);
});

export default app;
