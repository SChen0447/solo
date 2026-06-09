import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const COLORS = [
  '#E91E63', '#3F51B5', '#009688', '#FF9800',
  '#9C27B0', '#2196F3', '#4CAF50', '#F44336',
  '#673AB7', '#00BCD4', '#8BC34A', '#FFC107'
];

let books = [
  {
    id: uuidv4(),
    name: '三体',
    author: '刘慈欣',
    color: '#3F51B5',
    totalPages: 302,
    currentPage: 150,
    createdAt: Date.now() - 86400000 * 7
  },
  {
    id: uuidv4(),
    name: '活着',
    author: '余华',
    color: '#E91E63',
    totalPages: 191,
    currentPage: 191,
    createdAt: Date.now() - 86400000 * 14
  },
  {
    id: uuidv4(),
    name: '人类简史',
    author: '尤瓦尔·赫拉利',
    color: '#009688',
    totalPages: 440,
    currentPage: 220,
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: uuidv4(),
    name: '百年孤独',
    author: '加西亚·马尔克斯',
    color: '#FF9800',
    totalPages: 360,
    currentPage: 50,
    createdAt: Date.now() - 86400000 * 1
  },
  {
    id: uuidv4(),
    name: '围城',
    author: '钱钟书',
    color: '#9C27B0',
    totalPages: 280,
    currentPage: 140,
    createdAt: Date.now() - 86400000 * 5
  }
];

let cards = [
  {
    id: uuidv4(),
    bookId: books[0].id,
    bookName: '三体',
    excerpt: '弱小和无知不是生存的障碍，傲慢才是。',
    note: '这句话在现实生活中同样适用，保持谦逊非常重要。',
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: uuidv4(),
    bookId: books[0].id,
    bookName: '三体',
    excerpt: '给岁月以文明，而不是给文明以岁月。',
    note: '',
    createdAt: Date.now() - 3600000 * 5
  },
  {
    id: uuidv4(),
    bookId: books[1].id,
    bookName: '活着',
    excerpt: '人是为活着本身而活着，而不是为了活着之外的任何事物所活着。',
    note: '这句话道出了生命的本质，简单却深刻。',
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: uuidv4(),
    bookId: books[1].id,
    bookName: '活着',
    excerpt: '少年去游荡，中年想掘藏，老年做和尚。',
    note: '人生的三个阶段，概括得如此精炼。',
    createdAt: Date.now() - 86400000 * 3
  },
  {
    id: uuidv4(),
    bookId: books[2].id,
    bookName: '人类简史',
    excerpt: '我们的语言发展成为一种八卦的工具。',
    note: '有趣的观点，人类社会的构建确实离不开信息交流。',
    createdAt: Date.now() - 180000
  },
  {
    id: uuidv4(),
    bookId: books[2].id,
    bookName: '人类简史',
    excerpt: '金钱是有史以来最普遍也最有效的互信系统。',
    note: '',
    createdAt: Date.now() - 3600000
  },
  {
    id: uuidv4(),
    bookId: books[3].id,
    bookName: '百年孤独',
    excerpt: '生命中曾经有过的所有灿烂，原来终究，都需要用寂寞来偿还。',
    note: '马尔克斯的文字总是带着淡淡的忧伤。',
    createdAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    bookId: books[3].id,
    bookName: '百年孤独',
    excerpt: '过去都是假的，回忆是一条没有归途的路。',
    note: '',
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: uuidv4(),
    bookId: books[4].id,
    bookName: '围城',
    excerpt: '婚姻是一座围城，城外的人想进去，城里的人想出来。',
    note: '经典名句，道尽了人生的种种矛盾。',
    createdAt: Date.now() - 7200000
  },
  {
    id: uuidv4(),
    bookId: books[4].id,
    bookName: '围城',
    excerpt: '对于丑人，细看是一种残忍。',
    note: '钱锺书的讽刺总是一针见血。',
    createdAt: Date.now() - 86400000 * 6
  }
];

app.get('/api/books', (req, res) => {
  const sortedBooks = [...books].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sortedBooks);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '书籍不存在' });
  }
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { name, author, color, totalPages } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '书籍名称不能为空' });
  }
  if (name.length > 50) {
    return res.status(400).json({ error: '书籍名称不能超过50字' });
  }
  if (!author || !author.trim()) {
    return res.status(400).json({ error: '作者不能为空' });
  }
  if (!color || !COLORS.includes(color)) {
    return res.status(400).json({ error: '请选择有效的封面颜色' });
  }
  const pages = parseInt(totalPages);
  if (isNaN(pages) || pages < 10 || pages > 1000) {
    return res.status(400).json({ error: '总页数必须在10-1000之间' });
  }

  const newBook = {
    id: uuidv4(),
    name: name.trim(),
    author: author.trim(),
    color,
    totalPages: pages,
    currentPage: 0,
    createdAt: Date.now()
  };

  books.push(newBook);
  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const bookIndex = books.findIndex(b => b.id === req.params.id);
  if (bookIndex === -1) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  const { currentPage } = req.body;
  if (currentPage !== undefined) {
    const page = parseInt(currentPage);
    if (isNaN(page) || page < 0 || page > books[bookIndex].totalPages) {
      return res.status(400).json({ error: '页码无效' });
    }
    books[bookIndex].currentPage = page;
  }

  res.json(books[bookIndex]);
});

app.delete('/api/books/:id', (req, res) => {
  const bookIndex = books.findIndex(b => b.id === req.params.id);
  if (bookIndex === -1) {
    return res.status(404).json({ error: '书籍不存在' });
  }

  books.splice(bookIndex, 1);
  cards = cards.filter(c => c.bookId !== req.params.id);
  res.json({ message: '删除成功' });
});

app.get('/api/cards', (req, res) => {
  const { bookId, limit = 50, offset = 0 } = req.query;
  let filteredCards = [...cards];

  if (bookId) {
    filteredCards = filteredCards.filter(c => c.bookId === bookId);
  }

  filteredCards.sort((a, b) => b.createdAt - a.createdAt);

  const start = parseInt(offset) || 0;
  const count = parseInt(limit) || 50;
  const paginatedCards = filteredCards.slice(start, start + count);

  res.json({
    cards: paginatedCards,
    total: filteredCards.length
  });
});

app.post('/api/cards', (req, res) => {
  const { bookId, excerpt, note } = req.body;

  if (!bookId) {
    return res.status(400).json({ error: '书籍ID不能为空' });
  }
  const book = books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).json({ error: '关联书籍不存在' });
  }
  if (!excerpt || !excerpt.trim()) {
    return res.status(400).json({ error: '摘录内容不能为空' });
  }
  if (excerpt.length > 120) {
    return res.status(400).json({ error: '摘录内容不能超过120字' });
  }
  if (note && note.length > 200) {
    return res.status(400).json({ error: '批注内容不能超过200字' });
  }

  const newCard = {
    id: uuidv4(),
    bookId,
    bookName: book.name,
    excerpt: excerpt.trim(),
    note: note ? note.trim() : '',
    createdAt: Date.now()
  };

  cards.push(newCard);
  res.status(201).json(newCard);
});

app.delete('/api/cards/:id', (req, res) => {
  const cardIndex = cards.findIndex(c => c.id === req.params.id);
  if (cardIndex === -1) {
    return res.status(404).json({ error: '卡片不存在' });
  }

  cards.splice(cardIndex, 1);
  res.json({ message: '删除成功' });
});

app.get('/api/colors', (req, res) => {
  res.json(COLORS);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
