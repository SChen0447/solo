import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import { problems, getProblemById } from './problems.js';
import { judgeCode } from './judge.js';
import type { JudgeResult, SubmissionRecord } from './types.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

interface ClientMap {
  [clientId: string]: WebSocket;
}

const clients: ClientMap = {};

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients[clientId] = ws;

  ws.send(JSON.stringify({ type: 'connected', clientId }));

  ws.on('close', () => {
    delete clients[clientId];
  });

  ws.on('error', () => {
    delete clients[clientId];
  });
});

app.get('/api/problems', (_req, res) => {
  res.json(problems.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    template: p.template,
  })));
});

app.get('/api/problems/:id', (req, res) => {
  const problem = getProblemById(req.params.id);
  if (!problem) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  res.json({
    id: problem.id,
    title: problem.title,
    description: problem.description,
    template: problem.template,
  });
});

app.post('/api/submit', async (req, res) => {
  const { code, problemId, clientId } = req.body;

  if (!code || !problemId) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  const problem = getProblemById(problemId);
  if (!problem) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }

  const submissionId = uuidv4();
  const timestamp = Date.now();

  res.json({
    submissionId,
    status: 'judging',
    message: '正在评测中...',
  });

  (async () => {
    const result: JudgeResult = await judgeCode(code, problem);

    const record: SubmissionRecord = {
      id: submissionId,
      problemId,
      problemTitle: problem.title,
      timestamp,
      status: result.status,
      time: result.time,
      code,
      result,
    };

    if (clientId && clients[clientId] && clients[clientId].readyState === WebSocket.OPEN) {
      clients[clientId].send(JSON.stringify({
        type: 'result',
        submissionId,
        record,
      }));
    }
  })();
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 服务器运行在 ws://localhost:${PORT}/ws`);
});
