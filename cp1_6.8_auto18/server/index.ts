import express from 'express';
import cors from 'cors';
import { dataStore, Book, Category } from './data';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Virtual Bookshelf API is running' });
});

app.get('/api/categories', (req, res) => {
  const categories = dataStore.getCategories();
  res.json(categories);
});

app.get('/api/categories/:id', (req, res) => {
  const category = dataStore.getCategoryById(req.params.id);
  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.json(category);
});

app.post('/api/categories', (req, res) => {
  const { name, icon } = req.body;
  if (!name || !icon) {
    res.status(400).json({ error: 'Name and icon are required' });
    return;
  }
  const category = dataStore.addCategory(name, icon);
  res.status(201).json(category);
});

app.delete('/api/categories/:id', (req, res) => {
  const success = dataStore.deleteCategory(req.params.id);
  if (!success) {
    res.status(400).json({ error: 'Cannot delete default category or category not found' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/books', (req, res) => {
  const { categoryId } = req.query;
  const books = dataStore.getBooks(categoryId as string | undefined);
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const book = dataStore.getBookById(req.params.id);
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, categoryId, status, rating, notes } = req.body;
  if (!title || !author || !categoryId) {
    res.status(400).json({ error: 'Title, author, and categoryId are required' });
    return;
  }
  const book = dataStore.addBook({
    title,
    author,
    categoryId,
    status: status || 'unread',
    rating: rating || 0,
    notes: notes || '',
  });
  res.status(201).json(book);
});

app.put('/api/books/:id', (req, res) => {
  const updates: Partial<Book> = req.body;
  const book = dataStore.updateBook(req.params.id, updates);
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
  const success = dataStore.deleteBook(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/books/:id/move', (req, res) => {
  const { position, categoryId } = req.body;
  const book = dataStore.updateBookPosition(req.params.id, position, categoryId);
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  res.json(book);
});

app.post('/api/books/swap', (req, res) => {
  const { bookId1, bookId2 } = req.body;
  if (!bookId1 || !bookId2) {
    res.status(400).json({ error: 'bookId1 and bookId2 are required' });
    return;
  }
  const success = dataStore.swapBooks(bookId1, bookId2);
  if (!success) {
    res.status(404).json({ error: 'One or both books not found' });
    return;
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoints:
  GET    /api/health
  GET    /api/categories
  POST   /api/categories
  DELETE /api/categories/:id
  GET    /api/books
  GET    /api/books/:id
  POST   /api/books
  PUT    /api/books/:id
  DELETE /api/books/:id
  POST   /api/books/:id/move
  POST   /api/books/swap
  `);
});
