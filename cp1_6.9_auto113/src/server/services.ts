import { db } from './db.js';
import { Book, BorrowHistory, BorrowRequest, Activity, User } from '../shared/types.js';

function rowToBook(row: any): Book {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url,
    status: row.status,
    borrowerId: row.borrower_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function rowToHistory(row: any): BorrowHistory {
  return {
    id: row.id,
    bookId: row.book_id,
    borrowerId: row.borrower_id,
    ownerId: row.owner_id,
    action: row.action,
    note: row.note,
    createdAt: row.created_at,
  };
}

function rowToRequest(row: any): BorrowRequest {
  return {
    id: row.id,
    bookId: row.book_id,
    requesterId: row.requester_id,
    ownerId: row.owner_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function rowToActivity(row: any): Activity {
  return {
    id: row.id,
    userId: row.user_id,
    userNickname: row.user_nickname,
    avatarColor: row.avatar_color,
    bookTitle: row.book_title,
    actionType: row.action_type,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function getUserBooks(userId: number): Book[] {
  const rows = db.prepare(
    'SELECT * FROM books WHERE owner_id = ? ORDER BY sort_order ASC, id ASC'
  ).all(userId);
  return rows.map(rowToBook);
}

export function getBorrowedBooks(userId: number): Book[] {
  const rows = db.prepare(
    'SELECT * FROM books WHERE borrower_id = ? ORDER BY created_at DESC'
  ).all(userId);
  return rows.map(rowToBook);
}

export function getAllPublicBooks(): Book[] {
  const rows = db.prepare('SELECT * FROM books ORDER BY created_at DESC LIMIT 100').all();
  return rows.map(rowToBook);
}

export function getBookById(bookId: number): Book | undefined {
  const row = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  return row ? rowToBook(row) : undefined;
}

export function addBook(
  ownerId: number,
  title: string,
  author: string,
  coverUrl: string,
  user: { nickname: string; avatarColor: string }
): Book {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM books WHERE owner_id = ?').get(ownerId) as { max_order: number };
  const sortOrder = maxOrder.max_order + 1;
  const stmt = db.prepare(
    'INSERT INTO books (owner_id, title, author, cover_url, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(ownerId, title, author, coverUrl, sortOrder);
  addActivity(ownerId, user.nickname, user.avatarColor, title, 'book_added');
  return getBookById(result.lastInsertRowid as number)!;
}

export function removeBook(bookId: number, ownerId: number): boolean {
  const book = getBookById(bookId);
  if (!book || book.ownerId !== ownerId || book.status === 'borrowed') return false;
  db.prepare('DELETE FROM borrow_history WHERE book_id = ?').run(bookId);
  db.prepare('DELETE FROM borrow_requests WHERE book_id = ?').run(bookId);
  const result = db.prepare('DELETE FROM books WHERE id = ? AND owner_id = ?').run(bookId, ownerId);
  return result.changes > 0;
}

export function reorderBooks(ownerId: number, bookOrder: number[]): void {
  const updateStmt = db.prepare('UPDATE books SET sort_order = ? WHERE id = ? AND owner_id = ?');
  const tx = db.transaction(() => {
    bookOrder.forEach((bookId, index) => {
      updateStmt.run(index, bookId, ownerId);
    });
  });
  tx();
}

export function createBorrowRequest(bookId: number, requesterId: number): BorrowRequest | null {
  const book = getBookById(bookId);
  if (!book || book.status !== 'available' || book.ownerId === requesterId) return null;
  const existing = db.prepare(
    "SELECT id FROM borrow_requests WHERE book_id = ? AND requester_id = ? AND status = 'pending'"
  ).get(bookId, requesterId);
  if (existing) return null;
  const stmt = db.prepare(
    'INSERT INTO borrow_requests (book_id, requester_id, owner_id) VALUES (?, ?, ?)'
  );
  const result = stmt.run(bookId, requesterId, book.ownerId);
  return db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(result.lastInsertRowid) as BorrowRequest;
}

export function handleBorrowRequest(
  requestId: number,
  ownerId: number,
  approved: boolean,
  user: { nickname: string; avatarColor: string }
): { request: BorrowRequest; book?: Book } | null {
  const req = db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(requestId) as any;
  if (!req || req.owner_id !== ownerId || req.status !== 'pending') return null;

  db.prepare("UPDATE borrow_requests SET status = ? WHERE id = ?").run(
    approved ? 'approved' : 'rejected',
    requestId
  );

  let book: Book | undefined;
  if (approved) {
    db.prepare("UPDATE books SET status = 'borrowed', borrower_id = ? WHERE id = ?").run(
      req.requester_id,
      req.book_id
    );
    db.prepare(
      'INSERT INTO borrow_history (book_id, borrower_id, owner_id, action) VALUES (?, ?, ?, ?)'
    ).run(req.book_id, req.requester_id, ownerId, 'borrowed');
    const bookRow = db.prepare('SELECT * FROM books WHERE id = ?').get(req.book_id);
    book = rowToBook(bookRow);
    const borrower = db.prepare('SELECT nickname, avatar_color FROM users WHERE id = ?').get(req.requester_id) as User;
    addActivity(req.requester_id, borrower.nickname, borrower.avatar_color, book.title, 'borrowed');
  }

  const updatedReq = rowToRequest(db.prepare('SELECT * FROM borrow_requests WHERE id = ?').get(requestId));
  return { request: updatedReq, book };
}

export function returnBook(bookId: number, borrowerId: number, user: { nickname: string; avatarColor: string }): Book | null {
  const book = getBookById(bookId);
  if (!book || book.borrowerId !== borrowerId) return null;
  db.prepare("UPDATE books SET status = 'available', borrower_id = NULL WHERE id = ?").run(bookId);
  db.prepare(
    'INSERT INTO borrow_history (book_id, borrower_id, owner_id, action) VALUES (?, ?, ?, ?)'
  ).run(bookId, borrowerId, book.ownerId, 'returned');
  addActivity(borrowerId, user.nickname, user.avatarColor, book.title, 'returned');
  return getBookById(bookId)!;
}

export function addReadingNote(
  bookId: number,
  borrowerId: number,
  note: string,
  user: { nickname: string; avatarColor: string }
): BorrowHistory | null {
  const book = getBookById(bookId);
  if (!book || book.borrowerId !== borrowerId) return null;
  const stmt = db.prepare(
    'INSERT INTO borrow_history (book_id, borrower_id, owner_id, action, note) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(bookId, borrowerId, book.ownerId, 'note_added', note);
  addActivity(borrowerId, user.nickname, user.avatarColor, book.title, 'note_added', note);
  return rowToHistory(db.prepare('SELECT * FROM borrow_history WHERE id = ?').get(result.lastInsertRowid));
}

export function getBookHistory(bookId: number): BorrowHistory[] {
  const rows = db.prepare(
    'SELECT * FROM borrow_history WHERE book_id = ? ORDER BY created_at DESC'
  ).all(bookId);
  return rows.map(rowToHistory);
}

export function getPendingRequests(ownerId: number): BorrowRequest[] {
  const rows = db.prepare(
    "SELECT * FROM borrow_requests WHERE owner_id = ? AND status = 'pending' ORDER BY created_at DESC"
  ).all(ownerId);
  return rows.map(rowToRequest);
}

export function getRecentActivities(limit: number = 50): Activity[] {
  const rows = db.prepare(
    'SELECT * FROM activities ORDER BY created_at DESC LIMIT ?'
  ).all(limit);
  return rows.map(rowToActivity);
}

export function addActivity(
  userId: number,
  userNickname: string,
  avatarColor: string,
  bookTitle: string,
  actionType: Activity['actionType'],
  note?: string
): void {
  db.prepare(
    'INSERT INTO activities (user_id, user_nickname, avatar_color, book_title, action_type, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, userNickname, avatarColor, bookTitle, actionType, note || null);
}

export function getAllUsers(): Pick<User, 'id' | 'nickname' | 'avatarColor'>[] {
  const rows = db.prepare('SELECT id, nickname, avatar_color as avatarColor FROM users').all();
  return rows as Pick<User, 'id' | 'nickname' | 'avatarColor'>[];
}
