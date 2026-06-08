import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3001;
const DATA_FILE = join(__dirname, 'sticky-notes.json');

interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  zIndex: number;
}

interface ClientMessage {
  type: string;
  [key: string]: unknown;
}

interface ServerMessage {
  type: string;
  [key: string]: unknown;
}

let notes: Map<string, StickyNote> = new Map();
let nextZIndex = 1;
let clientIdCounter = 0;
const clients = new Map<string, WebSocket>();

function loadNotes(): void {
  if (existsSync(DATA_FILE)) {
    try {
      const data = readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data) as StickyNote[];
      notes.clear();
      nextZIndex = 1;
      for (const note of parsed) {
        notes.set(note.id, note);
        if (note.zIndex >= nextZIndex) {
          nextZIndex = note.zIndex + 1;
        }
      }
      console.log(`Loaded ${notes.size} notes from ${DATA_FILE}`);
    } catch (err) {
      console.error('Failed to load notes:', err);
      notes = new Map();
    }
  } else {
    console.log('No data file found, starting with empty board');
  }
}

function saveNotes(): void {
  const notesArray = Array.from(notes.values());
  try {
    writeFileSync(DATA_FILE, JSON.stringify(notesArray, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save notes:', err);
  }
}

function broadcast(message: ServerMessage, excludeId?: string): void {
  const data = JSON.stringify(message);
  for (const [id, ws] of clients) {
    if (id === excludeId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function handleMessage(clientId: string, ws: WebSocket, messageStr: string): void {
  try {
    const message = JSON.parse(messageStr) as ClientMessage;

    switch (message.type) {
      case 'create': {
        const noteData = message.note as Partial<StickyNote>;
        const id = noteData.id || generateId();
        const note: StickyNote = {
          id,
          x: noteData.x || 100,
          y: noteData.y || 100,
          width: noteData.width || 200,
          height: noteData.height || 180,
          content: noteData.content || '',
          color: noteData.color || '#FFF9C4',
          zIndex: nextZIndex++,
        };
        notes.set(id, note);
        saveNotes();
        broadcast({ type: 'create', note }, clientId);
        sendToClient(ws, { type: 'create-ack', noteId: id, zIndex: note.zIndex });
        break;
      }

      case 'move': {
        const { id, x, y } = message as unknown as { id: string; x: number; y: number };
        const note = notes.get(id);
        if (note) {
          note.x = x;
          note.y = y;
          saveNotes();
          broadcast({ type: 'move', id, x, y }, clientId);
        }
        break;
      }

      case 'delete': {
        const { id } = message as unknown as { id: string };
        if (notes.has(id)) {
          notes.delete(id);
          saveNotes();
          broadcast({ type: 'delete', id }, clientId);
        }
        break;
      }

      case 'color': {
        const { id, color } = message as unknown as { id: string; color: string };
        const note = notes.get(id);
        if (note) {
          note.color = color;
          saveNotes();
          broadcast({ type: 'color', id, color }, clientId);
        }
        break;
      }

      case 'content': {
        const { id, content } = message as unknown as { id: string; content: string };
        const note = notes.get(id);
        if (note) {
          note.content = content;
          saveNotes();
          broadcast({ type: 'content', id, content }, clientId);
        }
        break;
      }

      case 'zindex': {
        const { id } = message as unknown as { id: string };
        const note = notes.get(id);
        if (note) {
          note.zIndex = nextZIndex++;
          saveNotes();
          broadcast({ type: 'zindex', id, zIndex: note.zIndex }, clientId);
        }
        break;
      }

      case 'resize': {
        const { id, width, height } = message as unknown as { id: string; width: number; height: number };
        const note = notes.get(id);
        if (note) {
          note.width = width;
          note.height = height;
          saveNotes();
          broadcast({ type: 'resize', id, width, height }, clientId);
        }
        break;
      }
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
}

loadNotes();

const server = createServer((req: IncomingMessage, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  const clientId = `client_${++clientIdCounter}`;
  clients.set(clientId, ws);
  console.log(`Client connected: ${clientId} (total: ${clients.size})`);

  sendToClient(ws, {
    type: 'init',
    notes: Array.from(notes.values()),
    onlineCount: clients.size,
    clientId,
  });

  broadcast({ type: 'online-count', count: clients.size }, clientId);

  ws.on('message', (data) => {
    handleMessage(clientId, ws, data.toString());
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId} (total: ${clients.size})`);
    broadcast({ type: 'online-count', count: clients.size });
  });

  ws.on('error', (err) => {
    console.error(`Client ${clientId} error:`, err);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
