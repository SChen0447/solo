import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { StoryGraph, StoryNode, StoryConnection } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let storyGraph: StoryGraph = createDefaultGraph();

function createDefaultGraph(): StoryGraph {
  const rootId = uuidv4();
  const node1Id = uuidv4();
  const node2Id = uuidv4();
  const choice1Id = uuidv4();
  const choice2Id = uuidv4();
  const conn1Id = uuidv4();
  const conn2Id = uuidv4();

  const rootNode: StoryNode = {
    id: rootId,
    type: 'dialog',
    title: '开场',
    content: '你在一片迷雾笼罩的森林中醒来，记忆一片模糊...',
    x: 100,
    y: 100,
  };

  const node1: StoryNode = {
    id: node1Id,
    type: 'choice',
    title: '第一次选择',
    content: '前方出现了两条岔路，你该如何选择？',
    x: 400,
    y: 50,
    choices: [
      { id: choice1Id, label: '走向左边的小路', nextNodeId: null },
      { id: choice2Id, label: '走向右边的大路', nextNodeId: null },
    ],
  };

  const node2: StoryNode = {
    id: node2Id,
    type: 'event',
    title: '神秘事件',
    content: '你发现了一个发光的古老符文...',
    x: 400,
    y: 280,
    eventData: '获得神秘物品：星光碎片',
  };

  const conn1: StoryConnection = {
    id: conn1Id,
    fromNodeId: rootId,
    toNodeId: node1Id,
    label: '继续',
  };

  const conn2: StoryConnection = {
    id: conn2Id,
    fromNodeId: rootId,
    toNodeId: node2Id,
    label: '探索周围',
  };

  return {
    nodes: [rootNode, node1, node2],
    connections: [conn1, conn2],
    rootNodeId: rootId,
  };
}

app.get('/api/graph', (_req, res) => {
  res.json(storyGraph);
});

app.post('/api/save', (req, res) => {
  const body = req.body as Partial<StoryGraph>;

  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.connections)) {
    return res.status(400).json({
      error: 'Invalid graph structure. Expected nodes and connections arrays.',
    });
  }

  const hasValidNodes = body.nodes.every(
    (n) => n && typeof n.id === 'string' && typeof n.type === 'string'
  );
  if (!hasValidNodes) {
    return res.status(400).json({
      error: 'Invalid node data. Each node must have id and type.',
    });
  }

  const hasValidConnections = body.connections.every(
    (c) => c && typeof c.fromNodeId === 'string' && typeof c.toNodeId === 'string'
  );
  if (!hasValidConnections) {
    return res.status(400).json({
      error: 'Invalid connection data. Each connection must have fromNodeId and toNodeId.',
    });
  }

  storyGraph = {
    nodes: body.nodes,
    connections: body.connections,
    rootNodeId: body.rootNodeId ?? storyGraph.rootNodeId,
  };

  res.json({ success: true, message: '剧情树已保存' });
});

app.listen(PORT, () => {
  console.log(`剧情编织者服务器运行在 http://localhost:${PORT}`);
});
