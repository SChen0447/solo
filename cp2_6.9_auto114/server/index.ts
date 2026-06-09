import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface DiagramNode {
  id: string;
  type: 'rect' | 'diamond' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
}

interface DiagramEdge {
  id: string;
  type: 'edge';
  sourceId: string;
  targetId: string;
  label: string;
}

interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

interface WSMessage {
  type: string;
  payload: any;
  clientId?: string;
}

interface ClientInfo {
  id: string;
  name: string;
  color: string;
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;
const USER_NAMES = [
  '小熊猫', '小企鹅', '小猫咪', '小狗狗', '小兔子', '小狐狸',
  '小浣熊', '小松鼠', '小刺猬', '小考拉', '小水獭', '小海豚',
];
const USER_COLORS = [
  '#FF6B6B', '#48C9B0', '#FFD93D', '#6C5CE7', '#00B894',
  '#E17055', '#74B9FF', '#FD79A8', '#55EFC4', '#FAB1A0',
];

const store: { diagram: DiagramData; clients: Map<WebSocket, ClientInfo> } = {
  diagram: { nodes: [], edges: [] },
  clients: new Map(),
};

setInterval(() => {
  console.log('[AutoSave] Diagram state:', JSON.stringify(store.diagram).length, 'bytes');
}, 10000);

app.get('/api/diagram', (_req: Request, res: Response) => {
  res.json(store.diagram);
});

app.post('/api/diagram', (req: Request, res: Response) => {
  const data = req.body as DiagramData;
  if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    store.diagram = data;
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: 'Invalid data' });
  }
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(msg: WSMessage, excludeWs?: WebSocket) {
  const data = JSON.stringify(msg);
  store.clients.forEach((_info, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  const name = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
  const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  store.clients.set(ws, { id: clientId, name, color });

  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      diagram: store.diagram,
      clientId,
      name,
      color,
      users: Array.from(store.clients.entries()).map(([, info]) => info),
    },
  }));

  broadcast({
    type: 'user-join',
    payload: { id: clientId, name, color },
  }, ws);

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as WSMessage;
      const { type, payload } = msg;

      switch (type) {
        case 'node-add': {
          store.diagram.nodes.push(payload);
          break;
        }
        case 'node-update': {
          const idx = store.diagram.nodes.findIndex(n => n.id === payload.id);
          if (idx >= 0) store.diagram.nodes[idx] = { ...store.diagram.nodes[idx], ...payload };
          break;
        }
        case 'node-delete': {
          store.diagram.nodes = store.diagram.nodes.filter(n => n.id !== payload.id);
          store.diagram.edges = store.diagram.edges.filter(
            e => e.sourceId !== payload.id && e.targetId !== payload.id,
          );
          break;
        }
        case 'edge-add': {
          store.diagram.edges.push(payload);
          break;
        }
        case 'edge-update': {
          const idx = store.diagram.edges.findIndex(e => e.id === payload.id);
          if (idx >= 0) store.diagram.edges[idx] = { ...store.diagram.edges[idx], ...payload };
          break;
        }
        case 'edge-delete': {
          store.diagram.edges = store.diagram.edges.filter(e => e.id !== payload.id);
          break;
        }
        case 'clear': {
          store.diagram = { nodes: [], edges: [] };
          break;
        }
        case 'cursor':
        case 'user-update': {
          broadcast({ type, payload, clientId }, ws);
          return;
        }
        default:
          return;
      }

      broadcast({ type, payload, clientId }, ws);
    } catch (err) {
      console.error('WS parse error:', err);
    }
  });

  ws.on('close', () => {
    store.clients.delete(ws);
    broadcast({
      type: 'user-leave',
      payload: { id: clientId },
    });
  });
});

server.listen(PORT, () => {
  console.log(`[server] Server running on http://localhost:${PORT}`);
  console.log(`[server] WebSocket ready on ws://localhost:${PORT}`);
});
