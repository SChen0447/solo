import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { authMiddleware, AuthRequest, registerUser, loginUser, getUserById, verifyToken } from './auth.js';
import {
  getUserBooks,
  getBorrowedBooks,
  getAllPublicBooks,
  addBook,
  removeBook,
  reorderBooks,
  createBorrowRequest,
  handleBorrowRequest,
  returnBook,
  addReadingNote,
  getBookHistory,
  getPendingRequests,
  getRecentActivities,
  getAllUsers,
  getBookById,
} from './services.js';
import { BorrowRequest } from '../shared/types.js';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
});

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const userSockets = new Map<number, string>();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    next(new Error('未授权'));
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    next(new Error('令牌无效'));
    return;
  }
  (socket as any).user = payload;
  next();
});

io.on('connection', (socket) => {
  const user = (socket as any).user;
  userSockets.set(user.userId, socket.id);

  socket.on('disconnect', () => {
    userSockets.delete(user.userId);
  });
});

function notifyUser(userId: number, event: string, data: unknown) {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
}

function broadcast(event: string, data: unknown) {
  io.emit(event, data);
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    if (!nickname || !password) {
      res.status(400).json({ error: '昵称和密码不能为空' });
      return;
    }
    const user = await registerUser(nickname, password);
    const token = (await import('./auth.js')).generateToken(user);
    res.json({
      user: { id: user.id, nickname: user.nickname, avatarColor: user.avatarColor },
      token,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { nickname, password } = req.body;
  const result = await loginUser(nickname, password);
  if (!result) {
    res.status(401).json({ error: '昵称或密码错误' });
    return;
  }
  res.json({
    user: { id: result.user.id, nickname: result.user.nickname, avatarColor: result.user.avatarColor },
    token: result.token,
  });
});

app.get('/api/books/mine', authMiddleware, (req: AuthRequest, res) => {
  const books = getUserBooks(req.user!.userId);
  const borrowed = getBorrowedBooks(req.user!.userId);
  res.json({ owned: books, borrowed });
});

app.get('/api/books/public', (_req, res) => {
  const books = getAllPublicBooks();
  res.json(books);
});

app.get('/api/books/:id', (_req, res) => {
  const book = getBookById(parseInt(_req.params.id));
  if (!book) {
    res.status(404).json({ error: '书籍不存在' });
    return;
  }
  const history = getBookHistory(book.id);
  res.json({ book, history });
});

app.post('/api/books', authMiddleware, (req: AuthRequest, res) => {
  const { title, author, coverUrl } = req.body;
  if (!title || !author) {
    res.status(400).json({ error: '书名和作者不能为空' });
    return;
  }
  const user = getUserById(req.user!.userId)!;
  const book = addBook(
    req.user!.userId,
    title,
    author,
    coverUrl || 'https://picsum.photos/seed/book' + Date.now() + '/240/320',
    { nickname: user.nickname, avatarColor: user.avatarColor }
  );
  broadcast('shelf:update', { userId: req.user!.userId, book });
  broadcast('activity:new', getRecentActivities(1)[0]);
  res.json(book);
});

app.delete('/api/books/:id', authMiddleware, (req: AuthRequest, res) => {
  const ok = removeBook(parseInt(req.params.id), req.user!.userId);
  if (!ok) {
    res.status(400).json({ error: '无法删除该书' });
    return;
  }
  broadcast('shelf:remove', { userId: req.user!.userId, bookId: parseInt(req.params.id) });
  res.json({ ok: true });
});

app.post('/api/books/reorder', authMiddleware, (req: AuthRequest, res) => {
  const { order } = req.body;
  reorderBooks(req.user!.userId, order);
  broadcast('shelf:reorder', { userId: req.user!.userId, order });
  res.json({ ok: true });
});

app.post('/api/borrow/request/:bookId', authMiddleware, (req: AuthRequest, res) => {
  const request = createBorrowRequest(parseInt(req.params.bookId), req.user!.userId);
  if (!request) {
    res.status(400).json({ error: '无法发起借阅请求' });
    return;
  }
  const requester = getUserById(req.user!.userId)!;
  const book = getBookById(request.bookId)!;
  notifyUser(request.ownerId, 'borrow:request', {
    ...request,
    requesterNickname: requester.nickname,
    requesterAvatarColor: requester.avatarColor,
    bookTitle: book.title,
  });
  res.json(request);
});

app.post('/api/borrow/handle/:requestId', authMiddleware, (req: AuthRequest, res) => {
  const { approved } = req.body;
  const user = getUserById(req.user!.userId)!;
  const result = handleBorrowRequest(
    parseInt(req.params.requestId),
    req.user!.userId,
    approved,
    { nickname: user.nickname, avatarColor: user.avatarColor }
  );
  if (!result) {
    res.status(400).json({ error: '无法处理请求' });
    return;
  }
  const requester = getUserById(result.request.requesterId)!;
  notifyUser(result.request.requesterId, 'borrow:response', {
    request: result.request,
    book: result.book,
    ownerNickname: user.nickname,
  });
  if (result.book) {
    broadcast('shelf:update', { userId: result.book.ownerId, book: result.book });
    broadcast('shelf:update', { userId: requester.id, book: result.book, asBorrower: true });
    broadcast('activity:new', getRecentActivities(1)[0]);
  }
  res.json(result);
});

app.post('/api/borrow/return/:bookId', authMiddleware, (req: AuthRequest, res) => {
  const user = getUserById(req.user!.userId)!;
  const book = returnBook(parseInt(req.params.bookId), req.user!.userId, {
    nickname: user.nickname,
    avatarColor: user.avatarColor,
  });
  if (!book) {
    res.status(400).json({ error: '无法归还' });
    return;
  }
  notifyUser(book.ownerId, 'borrow:returned', { book, borrowerNickname: user.nickname });
  broadcast('shelf:update', { userId: book.ownerId, book });
  broadcast('shelf:removeBorrowed', { userId: req.user!.userId, bookId: book.id });
  broadcast('activity:new', getRecentActivities(1)[0]);
  res.json(book);
});

app.post('/api/books/:id/note', authMiddleware, (req: AuthRequest, res) => {
  const { note } = req.body;
  if (!note || !note.trim()) {
    res.status(400).json({ error: '笔记不能为空' });
    return;
  }
  const user = getUserById(req.user!.userId)!;
  const history = addReadingNote(parseInt(req.params.id), req.user!.userId, note, {
    nickname: user.nickname,
    avatarColor: user.avatarColor,
  });
  if (!history) {
    res.status(400).json({ error: '无法添加笔记' });
    return;
  }
  const book = getBookById(parseInt(req.params.id))!;
  notifyUser(book.ownerId, 'note:new', { history, bookTitle: book.title, borrowerNickname: user.nickname });
  broadcast('activity:new', getRecentActivities(1)[0]);
  res.json(history);
});

app.get('/api/requests/pending', authMiddleware, (req: AuthRequest, res) => {
  const requests = getPendingRequests(req.user!.userId);
  const enriched = requests.map((r: BorrowRequest & { requesterNickname?: string; requesterAvatarColor?: string; bookTitle?: string }) => {
    const requester = getUserById(r.requesterId);
    const book = getBookById(r.bookId);
    return {
      ...r,
      requesterNickname: requester?.nickname,
      requesterAvatarColor: requester?.avatarColor,
      bookTitle: book?.title,
    };
  });
  res.json(enriched);
});

app.get('/api/activities', (_req, res) => {
  res.json(getRecentActivities(50));
});

app.get('/api/users', (_req, res) => {
  res.json(getAllUsers());
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`读者书架漂流服务已启动: http://localhost:${PORT}`);
});
