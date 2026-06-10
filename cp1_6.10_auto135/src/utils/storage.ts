export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  coverColor: string;
  progress: number;
  createdAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  page: number;
  content: string;
  createdAt: string;
}

export interface ReadingLog {
  id: string;
  bookId: string;
  date: string;
  pagesRead: number;
}

const DB_NAME = 'ReadingTrackerDB';
const DB_VERSION = 1;
const STORE_BOOKS = 'books';
const STORE_NOTES = 'notes';
const STORE_LOGS = 'readingLogs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        const store = db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const store = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        store.createIndex('bookId', 'bookId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        const store = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
        store.createIndex('bookId', 'bookId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const req = fn(store) as IDBRequest<T>;
    transaction.oncomplete = () => resolve(req ? req.result : undefined as unknown as T);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllBooks(): Promise<Book[]> {
  return tx<Book[]>(STORE_BOOKS, 'readonly', (store) => store.getAll());
}

export async function addBook(book: Book): Promise<void> {
  return tx<void>(STORE_BOOKS, 'readwrite', (store) => store.add(book));
}

export async function updateBook(book: Book): Promise<void> {
  return tx<void>(STORE_BOOKS, 'readwrite', (store) => store.put(book));
}

export async function deleteBook(id: string): Promise<void> {
  return tx<void>(STORE_BOOKS, 'readwrite', (store) => store.delete(id));
}

export async function getNotesByBookId(bookId: string): Promise<Note[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const transaction = db.transaction(STORE_NOTES, 'readonly');
    const store = transaction.objectStore(STORE_NOTES);
    const index = store.index('bookId');
    const req = index.getAll(bookId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addNote(note: Note): Promise<void> {
  return tx<void>(STORE_NOTES, 'readwrite', (store) => store.add(note));
}

export async function deleteNote(id: string): Promise<void> {
  return tx<void>(STORE_NOTES, 'readwrite', (store) => store.delete(id));
}

export async function getAllLogs(): Promise<ReadingLog[]> {
  return tx<ReadingLog[]>(STORE_LOGS, 'readonly', (store) => store.getAll());
}

export async function addLog(log: ReadingLog): Promise<void> {
  return tx<void>(STORE_LOGS, 'readwrite', (store) => store.add(log));
}

export async function getLogsByDate(date: string): Promise<ReadingLog[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const transaction = db.transaction(STORE_LOGS, 'readonly');
    const store = transaction.objectStore(STORE_LOGS);
    const index = store.index('date');
    const req = index.getAll(date);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
