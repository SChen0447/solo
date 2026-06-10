import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { addDays, differenceInDays, format, isAfter } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

const app = express();
app.use(cors());
app.use(express.json());

function readData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data || '[]');
}

function writeData(filename, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/books', (req, res) => {
  const books = readData('books.json');
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const books = readData('books.json');
  const newBook = {
    id: uuidv4(),
    title: req.body.title,
    author: req.body.author,
    year: req.body.year,
    isbn: req.body.isbn || '',
    status: req.body.status || 'available',
    coverUrl: req.body.coverUrl || '',
    notes: req.body.notes || '',
    createdAt: format(new Date(), 'yyyy-MM-dd HH:mm'),
  };
  books.push(newBook);
  writeData('books.json', books);
  res.json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const books = readData('books.json');
  const index = books.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '书籍不存在' });
  }
  books[index] = { ...books[index], ...req.body, id: req.params.id };
  writeData('books.json', books);
  res.json(books[index]);
});

app.delete('/api/books/:id', (req, res) => {
  let books = readData('books.json');
  books = books.filter((b) => b.id !== req.params.id);
  writeData('books.json', books);
  res.json({ success: true });
});

app.get('/api/readers', (req, res) => {
  const readers = readData('readers.json');
  const borrowRecords = readData('borrowRecords.json');
  readers.forEach((reader) => {
    const overdueRecords = borrowRecords.filter(
      (r) =>
        r.readerId === reader.id &&
        r.status === 'borrowed' &&
        isAfter(new Date(), new Date(r.expectedReturnDate))
    );
    overdueRecords.forEach((record) => {
      const overdueDays = differenceInDays(new Date(), new Date(record.expectedReturnDate));
      const penalty = overdueDays * 2;
      reader.credit = Math.max(0, 100 - penalty);
    });
  });
  writeData('readers.json', readers);
  readers.sort((a, b) => b.credit - a.credit);
  res.json(readers);
});

app.post('/api/readers', (req, res) => {
  const readers = readData('readers.json');
  const newReader = {
    id: uuidv4(),
    name: req.body.name,
    phone: req.body.phone,
    registerDate: format(new Date(), 'yyyy-MM-dd'),
    avatarUrl: req.body.avatarUrl || '',
    points: 0,
    credit: 100,
    exchangeCredit: 0,
  };
  readers.push(newReader);
  writeData('readers.json', readers);
  res.json(newReader);
});

app.put('/api/readers/:id', (req, res) => {
  const readers = readData('readers.json');
  const index = readers.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '读者不存在' });
  }
  readers[index] = { ...readers[index], ...req.body, id: req.params.id };
  writeData('readers.json', readers);
  res.json(readers[index]);
});

app.get('/api/borrow', (req, res) => {
  const borrowRecords = readData('borrowRecords.json');
  const books = readData('books.json');
  const readers = readData('readers.json');
  const enriched = borrowRecords.map((record) => {
    const book = books.find((b) => b.id === record.bookId);
    const reader = readers.find((r) => r.id === record.readerId);
    const overdueDays = record.status === 'borrowed' && isAfter(new Date(), new Date(record.expectedReturnDate))
      ? differenceInDays(new Date(), new Date(record.expectedReturnDate))
      : 0;
    return {
      ...record,
      bookTitle: book ? book.title : '未知书籍',
      readerName: reader ? reader.name : '未知读者',
      overdueDays,
    };
  });
  res.json(enriched);
});

app.post('/api/borrow', (req, res) => {
  const borrowRecords = readData('borrowRecords.json');
  const books = readData('books.json');
  const bookIndex = books.findIndex((b) => b.id === req.body.bookId);
  if (bookIndex === -1) {
    return res.status(404).json({ error: '书籍不存在' });
  }
  if (books[bookIndex].status !== 'available') {
    return res.status(400).json({ error: '书籍不在可借状态' });
  }
  const borrowDate = new Date();
  const expectedReturnDate = addDays(borrowDate, 14);
  const newRecord = {
    id: uuidv4(),
    bookId: req.body.bookId,
    readerId: req.body.readerId,
    borrowDate: format(borrowDate, 'yyyy-MM-dd HH:mm'),
    expectedReturnDate: format(expectedReturnDate, 'yyyy-MM-dd'),
    returnDate: null,
    status: 'borrowed',
  };
  borrowRecords.push(newRecord);
  writeData('borrowRecords.json', borrowRecords);
  books[bookIndex].status = 'borrowed';
  writeData('books.json', books);
  res.json(newRecord);
});

app.put('/api/borrow/:id', (req, res) => {
  const borrowRecords = readData('borrowRecords.json');
  const readers = readData('readers.json');
  const books = readData('books.json');
  const index = borrowRecords.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '借阅记录不存在' });
  }
  const record = borrowRecords[index];
  const readerIndex = readers.findIndex((r) => r.id === record.readerId);
  const bookIndex = books.findIndex((b) => b.id === record.bookId);
  const returnDate = new Date();
  const overdueDays = isAfter(returnDate, new Date(record.expectedReturnDate))
    ? differenceInDays(returnDate, new Date(record.expectedReturnDate))
    : 0;
  const isOnTime = overdueDays <= 0;
  if (readerIndex !== -1) {
    readers[readerIndex].points += isOnTime ? 5 : 2;
    if (overdueDays > 0) {
      readers[readerIndex].credit = Math.max(0, readers[readerIndex].credit - overdueDays * 2);
    }
  }
  if (bookIndex !== -1) {
    books[bookIndex].status = 'available';
  }
  borrowRecords[index] = {
    ...record,
    returnDate: format(returnDate, 'yyyy-MM-dd HH:mm'),
    status: 'returned',
    overdueDays,
  };
  writeData('borrowRecords.json', borrowRecords);
  writeData('readers.json', readers);
  writeData('books.json', books);
  res.json(borrowRecords[index]);
});

app.get('/api/exchanges', (req, res) => {
  const exchanges = readData('exchangeRequests.json');
  const readers = readData('readers.json');
  const enriched = exchanges.map((ex) => {
    const reader = readers.find((r) => r.id === ex.readerId);
    return {
      ...ex,
      readerName: reader ? reader.name : '未知读者',
      currentExchangeCredit: reader ? reader.exchangeCredit : 0,
    };
  });
  enriched.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
  res.json(enriched);
});

app.post('/api/exchanges', (req, res) => {
  const exchanges = readData('exchangeRequests.json');
  const readers = readData('readers.json');
  const readerIndex = readers.findIndex((r) => r.id === req.body.readerId);
  const newExchange = {
    id: uuidv4(),
    readerId: req.body.readerId,
    bookTitle: req.body.bookTitle,
    author: req.body.author,
    bookCondition: req.body.bookCondition,
    requestDate: format(new Date(), 'yyyy-MM-dd HH:mm'),
    status: 'pending',
  };
  exchanges.push(newExchange);
  writeData('exchangeRequests.json', exchanges);
  res.json(newExchange);
});

app.put('/api/exchanges/:id', (req, res) => {
  const exchanges = readData('exchangeRequests.json');
  const readers = readData('readers.json');
  const books = readData('books.json');
  const index = exchanges.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '换书请求不存在' });
  }
  exchanges[index] = { ...exchanges[index], ...req.body, id: req.params.id };
  if (req.body.status === 'accepted') {
    const readerIndex = readers.findIndex((r) => r.id === exchanges[index].readerId);
    if (readerIndex !== -1) {
      readers[readerIndex].exchangeCredit += 10;
      readers[readerIndex].points += 10;
    }
    const newBook = {
      id: uuidv4(),
      title: exchanges[index].bookTitle,
      author: exchanges[index].author,
      year: '',
      isbn: '',
      status: 'available',
      coverUrl: '',
      notes: `换书入库 - ${exchanges[index].bookCondition}`,
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm'),
    };
    books.push(newBook);
    writeData('books.json', books);
  }
  writeData('exchangeRequests.json', exchanges);
  writeData('readers.json', readers);
  res.json(exchanges[index]);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('书站后端运行于端口3001');
});
