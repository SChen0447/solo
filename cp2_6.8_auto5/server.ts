import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Bookmark {
  id: string;
  chapter: number;
  note: string;
  tags: string[];
  createdAt: string;
}

interface ProgressHistory {
  date: string;
  chaptersRead: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  totalChapters: number;
  currentChapter: number;
  coverColor: string;
  bookmarks: Bookmark[];
  progressHistory: ProgressHistory[];
  createdAt: string;
}

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const coverColors = [
  '#8B4513', '#A0522D', '#CD853F', '#D2691E', '#B8860B',
  '#6B4423', '#8B5A2B', '#996515', '#704214', '#654321'
];

let books: Book[] = [
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    totalChapters: 30,
    currentChapter: 12,
    coverColor: '#8B4513',
    bookmarks: [
      { id: uuidv4(), chapter: 5, note: '古筝计划太震撼了', tags: ['精彩情节'], createdAt: new Date().toISOString() },
      { id: uuidv4(), chapter: 10, note: '三体游戏的设定很有意思', tags: ['设定'], createdAt: new Date().toISOString() }
    ],
    progressHistory: [
      { date: getDateStr(-6), chaptersRead: 2 },
      { date: getDateStr(-5), chaptersRead: 3 },
      { date: getDateStr(-4), chaptersRead: 1 },
      { date: getDateStr(-3), chaptersRead: 2 },
      { date: getDateStr(-2), chaptersRead: 3 },
      { date: getDateStr(-1), chaptersRead: 1 },
      { date: getDateStr(0), chaptersRead: 0 }
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    title: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    totalChapters: 12,
    currentChapter: 4,
    coverColor: '#6B4423',
    bookmarks: [
      { id: uuidv4(), chapter: 2, note: '信息的表示和处理', tags: ['重点', '复习'], createdAt: new Date().toISOString() }
    ],
    progressHistory: [
      { date: getDateStr(-6), chaptersRead: 0 },
      { date: getDateStr(-5), chaptersRead: 1 },
      { date: getDateStr(-4), chaptersRead: 0 },
      { date: getDateStr(-3), chaptersRead: 1 },
      { date: getDateStr(-2), chaptersRead: 0 },
      { date: getDateStr(-1), chaptersRead: 1 },
      { date: getDateStr(0), chaptersRead: 1 }
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    totalChapters: 10,
    currentChapter: 10,
    coverColor: '#CD853F',
    bookmarks: [],
    progressHistory: [
      { date: getDateStr(-20), chaptersRead: 2 },
      { date: getDateStr(-19), chaptersRead: 2 },
      { date: getDateStr(-18), chaptersRead: 2 },
      { date: getDateStr(-17), chaptersRead: 2 },
      { date: getDateStr(-16), chaptersRead: 2 }
    ],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }
];

function getDateStr(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAgo);
  return date.toISOString().split('T')[0];
}

app.get('/api/books', (req: Request, res: Response) => {
  res.json(books);
});

app.post('/api/books', (req: Request, res: Response) => {
  const { title, author, totalChapters } = req.body;
  
  if (!title || !author || !totalChapters) {
    return res.status(400).json({ error: '请填写完整的书籍信息' });
  }

  const newBook: Book = {
    id: uuidv4(),
    title,
    author,
    totalChapters: parseInt(totalChapters),
    currentChapter: 0,
    coverColor: coverColors[Math.floor(Math.random() * coverColors.length)],
    bookmarks: [],
    progressHistory: [],
    createdAt: new Date().toISOString()
  };

  books.push(newBook);
  res.status(201).json(newBook);
});

app.put('/api/books/:id/progress', (req: Request, res: Response) => {
  const { id } = req.params;
  const { currentChapter } = req.body;
  
  const book = books.find(b => b.id === id);
  
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  if (currentChapter < 0 || currentChapter > book.totalChapters) {
    return res.status(400).json({ error: '章节数无效' });
  }

  const today = getDateStr(0);
  const todayHistory = book.progressHistory.find(h => h.date === today);
  const chaptersDiff = currentChapter - book.currentChapter;
  
  if (chaptersDiff > 0) {
    if (todayHistory) {
      todayHistory.chaptersRead += chaptersDiff;
    } else {
      book.progressHistory.push({ date: today, chaptersRead: chaptersDiff });
    }
  }

  book.currentChapter = currentChapter;
  res.json(book);
});

app.post('/api/books/:id/bookmarks', (req: Request, res: Response) => {
  const { id } = req.params;
  const { chapter, note, tags } = req.body;
  
  const book = books.find(b => b.id === id);
  
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  const newBookmark: Bookmark = {
    id: uuidv4(),
    chapter: parseInt(chapter),
    note: note || '',
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  book.bookmarks.push(newBookmark);
  res.status(201).json(newBookmark);
});

app.delete('/api/books/:id/bookmarks/:bookmarkId', (req: Request, res: Response) => {
  const { id, bookmarkId } = req.params;
  
  const book = books.find(b => b.id === id);
  
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  const bookmarkIndex = book.bookmarks.findIndex(b => b.id === bookmarkId);
  
  if (bookmarkIndex === -1) {
    return res.status(404).json({ error: '书签不存在' });
  }

  book.bookmarks.splice(bookmarkIndex, 1);
  res.json({ message: '删除成功' });
});

app.get('/api/stats', (req: Request, res: Response) => {
  const today = new Date();
  
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    
    let chaptersRead = 0;
    books.forEach(book => {
      const history = book.progressHistory.find(h => h.date === dateStr);
      if (history) {
        chaptersRead += history.chaptersRead;
      }
    });
    
    weeklyData.push({ day: dayName, chapters: chaptersRead });
  }

  const monthlyData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    let chaptersRead = 0;
    books.forEach(book => {
      const history = book.progressHistory.find(h => h.date === dateStr);
      if (history) {
        chaptersRead += history.chaptersRead;
      }
    });
    
    monthlyData.push({ date: dateStr.slice(5), chapters: chaptersRead });
  }

  const bookCompletion = books.map(book => ({
    name: book.title,
    progress: Math.round((book.currentChapter / book.totalChapters) * 100),
    current: book.currentChapter,
    total: book.totalChapters
  }));

  const totalBooks = books.length;
  const completedBooks = books.filter(b => b.currentChapter === b.totalChapters).length;
  const totalBookmarks = books.reduce((sum, b) => sum + b.bookmarks.length, 0);
  
  const weeklyTotal = weeklyData.reduce((sum, d) => sum + d.chapters, 0);
  const monthlyTotal = monthlyData.reduce((sum, d) => sum + d.chapters, 0);

  res.json({
    weeklyData,
    monthlyData,
    bookCompletion,
    summary: {
      totalBooks,
      completedBooks,
      totalBookmarks,
      weeklyChapters: weeklyTotal,
      monthlyChapters: monthlyTotal
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
