import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import {
  initDB, createUser, findUserByEmail, verifyPassword,
  createCapsule, getCapsulesByUser, openCapsule,
  createNotebook, getNotebooksByUser, inviteCollaborator
} from './db';
import type { PageContent, EditingState } from '../shared/types';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface AuthRequest extends express.Request {
  userId?: string;
  user?: { id: string; username: string; email: string };
}

const authMiddleware: express.RequestHandler = (req: AuthRequest, res, next) => {
  const userId = req.headers['x-user-id'] as string;
  const username = req.headers['x-username'] as string;
  const email = req.headers['x-email'] as string;
  
  if (!userId) {
    res.status(401).json({ success: false, error: '未授权' });
    return;
  }
  
  req.userId = userId;
  req.user = { id: userId, username: username || '匿名用户', email: email || '' };
  next();
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: '请填写完整信息' });
      return;
    }
    
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ success: false, error: '邮箱已注册' });
      return;
    }
    
    const user = await createUser(username, email, password);
    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
      token: user.id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    
    if (!user || !(await verifyPassword(user, password))) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' });
      return;
    }
    
    res.json({
      success: true,
      user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
      token: user.id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/notebooks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const notebooks = await getNotebooksByUser(req.userId!);
    res.json({ success: true, notebooks });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/notebooks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, isShared } = req.body;
    const notebook = await createNotebook(req.userId!, title, isShared);
    res.json({ success: true, notebook });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/capsule', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { notebookId, title, content, openDate, isShared, sharedWith } = req.body;
    const capsule = await createCapsule(
      req.userId!,
      notebookId,
      title,
      content as PageContent,
      new Date(openDate),
      isShared || false,
      sharedWith || []
    );
    res.json({ success: true, capsule });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/capsule/list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const capsules = await getCapsulesByUser(req.userId!);
    res.json({ success: true, capsules });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/capsule/open/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await openCapsule(req.params.id, req.userId!);
    if (!result) {
      res.status(403).json({ 
        success: false, 
        error: '胶囊尚未到开启时间或无权限访问' 
      });
      return;
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/collaborators/invite', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { notebookId, username, email } = req.body;
    const collaborator = await inviteCollaborator(notebookId, email);
    res.json({ success: true, collaborator });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

const editingUsers = new Map<string, Map<string, EditingState>>();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('join-notebook', ({ notebookId, userId, username }: { notebookId: string; userId: string; username: string }) => {
    socket.join(notebookId);
    console.log(`用户 ${username} 加入手账 ${notebookId}`);
    
    if (!editingUsers.has(notebookId)) {
      editingUsers.set(notebookId, new Map());
    }
    
    const state: EditingState = {
      notebookId,
      pageNumber: 1,
      userId,
      username,
      isEditing: false
    };
    editingUsers.get(notebookId)!.set(userId, state);
    
    io.to(notebookId).emit('editing-users', Array.from(editingUsers.get(notebookId)!.values()));
  });

  socket.on('editing-state', (state: EditingState) => {
    const notebookEditors = editingUsers.get(state.notebookId);
    if (notebookEditors) {
      notebookEditors.set(state.userId, state);
      socket.to(state.notebookId).emit('editing-state', state);
    }
  });

  socket.on('page-update', ({ notebookId, pageNumber, content }: { notebookId: string; pageNumber: number; content: Partial<PageContent> }) => {
    socket.to(notebookId).emit('page-update', { pageNumber, content });
  });

  socket.on('leave-notebook', ({ notebookId, userId }: { notebookId: string; userId: string }) => {
    socket.leave(notebookId);
    const notebookEditors = editingUsers.get(notebookId);
    if (notebookEditors) {
      notebookEditors.delete(userId);
      io.to(notebookId).emit('editing-users', Array.from(notebookEditors.values()));
    }
  });

  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    for (const [notebookId, editors] of editingUsers) {
      let removed = false;
      for (const [userId, state] of editors) {
        if (state.userId === (socket as any).userId) {
          editors.delete(userId);
          removed = true;
          break;
        }
      }
      if (removed) {
        io.to(notebookId).emit('editing-users', Array.from(editors.values()));
      }
    }
  });
});

async function startServer() {
  await initDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
    console.log(`📡 Socket.IO 服务已启动`);
  });
}

startServer();
