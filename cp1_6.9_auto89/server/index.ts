import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const BOOKS_FILE = path.join(__dirname, 'books.json');

interface Book {
  id: string;
  title: string;
  author: string;
  color: string;
  shelf: number;
  position: number;
  height: number;
  rating: number;
  ratings: number[];
  comments: Comment[];
  createdAt: number;
}

interface Comment {
  id: string;
  text: string;
  createdAt: number;
}

let onlineUsers = 0;

function readBooks(): Book[] {
  try {
    const data = fs.readFileSync(BOOKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeBooks(books: Book[]): void {
  fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
}

function findEmptySlot(books: Book[]): { shelf: number; position: number } | null {
  for (let shelf = 0; shelf < 5; shelf++) {
    for (let position = 0; position < 10; position++) {
      const occupied = books.some(b => b.shelf === shelf && b.position === position);
      if (!occupied) {
        return { shelf, position };
      }
    }
  }
  return null;
}

app.get('/api/books', (_req, res) => {
  const books = readBooks();
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const { title, author, color } = req.body;
  
  if (!title || !author || !color) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  if (title.length > 50) {
    return res.status(400).json({ error: '书名不能超过50字' });
  }
  
  if (author.length > 30) {
    return res.status(400).json({ error: '作者名不能超过30字' });
  }
  
  const books = readBooks();
  const slot = findEmptySlot(books);
  
  if (!slot) {
    return res.status(400).json({ error: '书架已满' });
  }
  
  const newBook: Book = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    title,
    author,
    color,
    shelf: slot.shelf,
    position: slot.position,
    height: 30 + Math.random() * 20,
    rating: 0,
    ratings: [],
    comments: [],
    createdAt: Date.now()
  };
  
  books.push(newBook);
  writeBooks(books);
  
  io.emit('book:added', newBook);
  res.status(201).json(newBook);
});

app.post('/api/books/:id/rating', (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }
  
  const books = readBooks();
  const book = books.find(b => b.id === id);
  
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }
  
  book.ratings.push(rating);
  book.rating = book.ratings.reduce((a, b) => a + b, 0) / book.ratings.length;
  
  writeBooks(books);
  io.emit('book:updated', { id: book.id, rating: book.rating });
  res.json(book);
});

app.post('/api/books/:id/comment', (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  
  if (!text || text.length > 200) {
    return res.status(400).json({ error: '评论不能为空且不能超过200字' });
  }
  
  const books = readBooks();
  const book = books.find(b => b.id === id);
  
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }
  
  const newComment: Comment = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    text,
    createdAt: Date.now()
  };
  
  book.comments.push(newComment);
  writeBooks(books);
  io.emit('book:updated', { id: book.id, comments: book.comments });
  res.json(book);
});

io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('users:update', onlineUsers);
  
  socket.on('disconnect', () => {
    onlineUsers--;
    io.emit('users:update', onlineUsers);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
