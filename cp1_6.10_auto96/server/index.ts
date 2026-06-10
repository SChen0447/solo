import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Room, type ClientMessage, type ServerMessage, type DrawOperation, type ChatMessage } from './room';

const PORT = 3001;
const rooms: Map<string, Room> = new Map();

function generateRoomId(): string {
  return uuidv4().slice(0, 8);
}

function getRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Room(roomId);
    rooms.set(roomId, room);
  }
  return room;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/') {
    const roomId = generateRoomId();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ roomId }));
    return;
  }

  const roomMatch = url.pathname.match(/^\/room\/([a-zA-Z0-9-]+)$/);
  if (roomMatch) {
    const roomId = roomMatch[1];
    getRoom(roomId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ roomId, exists: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId') || generateRoomId();
  const room = getRoom(roomId);

  let userId: string | null = null;

  ws.on('message', (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'join': {
          userId = message.userId || uuidv4();
          const user = room.addUser(userId, message.userName || '匿名用户', ws);

          room.sendTo(userId, {
            type: 'welcome',
            userId: user.id,
            color: user.color,
            users: room.getUsers()
          });

          room.sendTo(userId, {
            type: 'history',
            operations: room.getHistory()
          });

          room.broadcast(
            {
              type: 'userJoined',
              user: {
                id: user.id,
                name: user.name,
                color: user.color,
                strokeWidth: user.strokeWidth,
                tool: user.tool
              }
            },
            userId
          );
          break;
        }

        case 'draw': {
          if (!userId) return;
          const op: DrawOperation = {
            ...message,
            userId
          };
          room.addHistory(op);
          room.broadcast(op, userId);
          break;
        }

        case 'chat': {
          if (!userId) return;
          const user = room.getUser(userId);
          if (!user) return;

          const chatMsg: ChatMessage = {
            type: 'chat',
            id: uuidv4(),
            userId,
            userName: user.name,
            color: user.color,
            text: message.text,
            timestamp: Date.now()
          };

          room.addHistory(chatMsg);
          room.broadcast(chatMsg);
          break;
        }

        case 'toolChange': {
          if (!userId) return;
          room.updateUserTool(userId, message.tool, message.strokeWidth);
          room.broadcast({
            type: 'toolChanged',
            userId,
            tool: message.tool,
            strokeWidth: message.strokeWidth
          });
          break;
        }

        case 'requestHistory': {
          if (!userId) return;
          room.sendTo(userId, {
            type: 'history',
            operations: room.getHistory()
          });
          break;
        }

        case 'leave': {
          if (userId) {
            room.removeUser(userId);
            room.broadcast({ type: 'userLeft', userId });
            userId = null;
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    if (userId) {
      room.removeUser(userId);
      room.broadcast({ type: 'userLeft', userId });
      if (room.isEmpty()) {
        rooms.delete(roomId);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`Whiteboard server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});
