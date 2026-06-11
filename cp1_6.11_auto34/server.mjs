import { WebSocketServer } from 'ws';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

const clients = new Map();

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2, 10);
  clients.set(ws, { id });

  console.log(`[+] Client connected: ${id} (total: ${clients.size})`);

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (data.type === 'PING') {
      ws.send(JSON.stringify({ type: 'PONG' }));
      return;
    }

    const senderId = clients.get(ws)?.id;

    for (const [client] of clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(raw.toString());
      }
    }

    if (data.type === 'CURSOR_MOVE' && data.payload) {
      data.payload.userId = data.payload.userId || senderId;
    }
  });

  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    clients.delete(ws);
    console.log(`[-] Client disconnected: ${clientInfo?.id} (total: ${clients.size})`);

    for (const [client] of clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'USER_LEFT',
          payload: { userId: clientInfo?.id },
        }));
      }
    }
  });
});

console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
