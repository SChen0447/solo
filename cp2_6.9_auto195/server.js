import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_PATH = join(__dirname, 'src', 'data', 'books.json');

const loadBooks = () => {
  try {
    const data = readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load books data:', err);
    return [];
  }
};

const saveBooks = (books) => {
  try {
    writeFileSync(DATA_PATH, JSON.stringify(books, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save books data:', err);
    return false;
  }
};

app.get('/api/books', (req, res) => {
  const books = loadBooks();
  res.json(books);
});

app.post('/api/books/:id/progress', (req, res) => {
  const { id } = req.params;
  const { progress } = req.body;

  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return res.status(400).json({ error: 'Invalid progress value. Must be a number between 0 and 100.' });
  }

  const books = loadBooks();
  const bookIndex = books.findIndex((b) => b.id === id);

  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Book not found.' });
  }

  books[bookIndex].progress = Math.round(progress);
  const success = saveBooks(books);

  if (success) {
    res.json({ success: true, book: books[bookIndex] });
  } else {
    res.status(500).json({ error: 'Failed to update progress.' });
  }
});

app.listen(PORT, () => {
  console.log(`Reading Graph API server running on http://localhost:${PORT}`);
});
