import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Book, User, BorrowRecord, WeeklyReport } from '../src/types';

const app = express();
const PORT = 4000;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
];

const users: User[] = [
  { id: 'user1', username: 'admin', nickname: '小明妈妈' },
  { id: 'user2', username: 'test', nickname: '小红爸爸' },
  { id: 'user3', username: 'user3', nickname: '小华奶奶' },
  { id: 'user4', username: 'user4', nickname: '小丽阿姨' },
];

let currentUser: User = users[0];

const bookTitles = [
  { title: '小王子', author: '圣埃克苏佩里' },
  { title: '夏洛的网', author: 'E.B.怀特' },
  { title: '窗边的小豆豆', author: '黑柳彻子' },
  { title: '草房子', author: '曹文轩' },
  { title: '青铜葵花', author: '曹文轩' },
  { title: '了不起的狐狸爸爸', author: '罗尔德·达尔' },
  { title: '查理和巧克力工厂', author: '罗尔德·达尔' },
  { title: '绿野仙踪', author: '弗兰克·鲍姆' },
  { title: '木偶奇遇记', author: '科洛迪' },
  { title: '爱的教育', author: '亚米契斯' },
  { title: '海底两万里', author: '凡尔纳' },
  { title: '八十天环游地球', author: '凡尔纳' },
  { title: '柳林风声', author: '格雷厄姆' },
  { title: '彼得·潘', author: '巴里' },
  { title: '长袜子皮皮', author: '林格伦' },
  { title: '时代广场的蟋蟀', author: '塞尔登' },
  { title: '假话国历险记', author: '罗大里' },
  { title: '尼尔斯骑鹅旅行记', author: '拉格洛夫' },
  { title: '鲁滨逊漂流记', author: '笛福' },
  { title: '汤姆·索亚历险记', author: '马克·吐温' },
];

const books: Book[] = bookTitles.map((bt, index) => ({
  id: `book${index + 1}`,
  title: bt.title,
  author: bt.author,
  ownerId: users[index % users.length].id,
  ownerNickname: users[index % users.length].nickname,
  coverColor: '',
  coverGradient: gradients[index % gradients.length],
  isAvailable: index % 3 !== 0,
  borrowCount: Math.floor(Math.random() * 20) + 1,
  rating: 3.5 + Math.random() * 1.5,
  ratingCount: Math.floor(Math.random() * 15) + 1,
  description: `这是一本非常适合小朋友阅读的《${bt.title}》，由${bt.author}创作。故事生动有趣，寓教于乐，值得一读！`,
  waitQueue: index % 2 === 0 ? [users[(index + 1) % users.length].id] : [],
  createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
}));

const borrowRecords: BorrowRecord[] = [
  {
    id: 'rec1',
    bookId: 'book1',
    bookTitle: '小王子',
    borrowerId: 'user2',
    borrowerNickname: '小红爸爸',
    lenderId: 'user1',
    lenderNickname: '小明妈妈',
    borrowDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'overdue',
    overdueDays: 3,
  },
  {
    id: 'rec2',
    bookId: 'book3',
    bookTitle: '窗边的小豆豆',
    borrowerId: 'user3',
    borrowerNickname: '小华奶奶',
    lenderId: 'user1',
    lenderNickname: '小明妈妈',
    borrowDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'borrowing',
  },
  {
    id: 'rec3',
    bookId: 'book5',
    bookTitle: '青铜葵花',
    borrowerId: 'user2',
    borrowerNickname: '小红爸爸',
    lenderId: 'user4',
    lenderNickname: '小丽阿姨',
    borrowDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    returnDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'returned',
    rating: 5,
    review: '非常棒的书，孩子很喜欢！',
  },
  {
    id: 'rec4',
    bookId: 'book7',
    bookTitle: '查理和巧克力工厂',
    borrowerId: 'user1',
    borrowerNickname: '小明妈妈',
    lenderId: 'user3',
    lenderNickname: '小华奶奶',
    borrowDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    returnDate: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'returned',
    rating: 4,
    review: '故事很有趣，插图也很精美。',
  },
  {
    id: 'rec5',
    bookId: 'book2',
    bookTitle: '夏洛的网',
    borrowerId: 'user4',
    borrowerNickname: '小丽阿姨',
    lenderId: 'user2',
    lenderNickname: '小红爸爸',
    borrowDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'borrowing',
  },
];

function generateWeeklyReport(): WeeklyReport {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const topBooks = [...books]
    .sort((a, b) => b.borrowCount - a.borrowCount)
    .slice(0, 5)
    .map((b) => ({
      bookId: b.id,
      title: b.title,
      borrowCount: b.borrowCount,
      ownerNickname: b.ownerNickname,
    }));

  const borrowTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    borrowTrend.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      count: Math.floor(Math.random() * 10) + 3,
    });
  }

  const userRanking = users
    .map((u) => ({
      userId: u.id,
      nickname: u.nickname,
      readingMinutes: Math.floor(Math.random() * 500) + 100,
    }))
    .sort((a, b) => b.readingMinutes - a.readingMinutes);

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: today.toISOString().split('T')[0],
    topBooks,
    borrowTrend,
    userRanking,
    totalBorrows: borrowRecords.length + Math.floor(Math.random() * 50),
    totalUsers: users.length + Math.floor(Math.random() * 20),
  };
}

app.get('/api/books', (_req, res) => {
  setTimeout(() => res.json(books), 300);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

app.get('/api/books/owner/:ownerId', (req, res) => {
  const ownerBooks = books.filter((b) => b.ownerId === req.params.ownerId);
  res.json(ownerBooks);
});

app.patch('/api/books/:id/status', (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  book.isAvailable = req.body.isAvailable;
  res.json(book);
});

app.post('/api/books/:id/queue', (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const { userId } = req.body;
  if (!book.waitQueue.includes(userId)) {
    book.waitQueue.push(userId);
  }
  res.json(book);
});

app.post('/api/books/:id/favorite', (_req, res) => {
  res.json({ success: true });
});

app.get('/api/borrows', (_req, res) => {
  setTimeout(() => res.json(borrowRecords), 300);
});

app.get('/api/borrows/user/:userId', (req, res) => {
  const records = borrowRecords.filter(
    (r) => r.borrowerId === req.params.userId || r.lenderId === req.params.userId
  );
  res.json(records);
});

app.post('/api/borrows', (req, res) => {
  const { bookId, borrowerId } = req.body;
  const book = books.find((b) => b.id === bookId);
  const borrower = users.find((u) => u.id === borrowerId);
  if (!book || !borrower) return res.status(400).json({ error: 'Invalid data' });

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(borrowDate.getDate() + 7);

  const record: BorrowRecord = {
    id: uuidv4(),
    bookId,
    bookTitle: book.title,
    borrowerId,
    borrowerNickname: borrower.nickname,
    lenderId: book.ownerId,
    lenderNickname: book.ownerNickname,
    borrowDate: borrowDate.toISOString().split('T')[0],
    dueDate: dueDate.toISOString().split('T')[0],
    status: 'borrowing',
  };
  borrowRecords.unshift(record);
  book.borrowCount++;
  book.isAvailable = false;
  res.status(201).json(record);
});

app.patch('/api/borrows/:id/return', (req, res) => {
  const record = borrowRecords.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  record.returnDate = new Date().toISOString().split('T')[0];
  record.status = 'returned';
  const book = books.find((b) => b.id === record.bookId);
  if (book) book.isAvailable = true;
  res.json(record);
});

app.patch('/api/borrows/:id/review', (req, res) => {
  const record = borrowRecords.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  const { rating, review } = req.body;
  record.rating = rating;
  record.review = review;
  const book = books.find((b) => b.id === record.bookId);
  if (book) {
    const totalRating = book.rating * book.ratingCount + rating;
    book.ratingCount++;
    book.rating = totalRating / book.ratingCount;
  }
  res.json(record);
});

app.get('/api/report/weekly', (_req, res) => {
  setTimeout(() => res.json(generateWeeklyReport()), 400);
});

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  const user = users.find((u) => u.username === username) || users[0];
  currentUser = user;
  res.json(user);
});

app.get('/api/auth/me', (_req, res) => {
  res.json(currentUser);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
