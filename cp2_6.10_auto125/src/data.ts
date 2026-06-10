import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';

export type BookStatus = 'available' | 'borrowed' | 'reserved';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverColor: string;
  stock: number;
  status: BookStatus;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  readerName: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
}

export const SOFT_COLORS = [
  '#a0d2eb',
  '#ffd3b4',
  '#d5aaff',
  '#b5ead7',
  '#ffc3a0',
  '#c7ceea',
  '#ffdac1',
  '#e2f0cb',
];

export const STATUS_LABELS: Record<BookStatus, string> = {
  available: '可借',
  borrowed: '已借出',
  reserved: '预约中',
};

export const STATUS_COLORS: Record<BookStatus, string> = {
  available: '#8bc34a',
  borrowed: '#e57373',
  reserved: '#ffb74d',
};

const createInitialBooks = (): Map<string, Book> => {
  const books = new Map<string, Book>();
  const initialBooks: Omit<Book, 'id'>[] = [
    {
      title: '百年孤独',
      author: '加西亚·马尔克斯',
      isbn: '978-75-44223',
      coverColor: '#a0d2eb',
      stock: 5,
      status: 'available',
    },
    {
      title: '活着',
      author: '余华',
      isbn: '978-75-06123',
      coverColor: '#ffd3b4',
      stock: 3,
      status: 'borrowed',
    },
    {
      title: '三体',
      author: '刘慈欣',
      isbn: '978-75-30121',
      coverColor: '#d5aaff',
      stock: 4,
      status: 'available',
    },
    {
      title: '小王子',
      author: '圣埃克苏佩里',
      isbn: '978-70-20256',
      coverColor: '#b5ead7',
      stock: 6,
      status: 'reserved',
    },
    {
      title: '围城',
      author: '钱钟书',
      isbn: '978-70-20017',
      coverColor: '#ffc3a0',
      stock: 2,
      status: 'available',
    },
    {
      title: '平凡的世界',
      author: '路遥',
      isbn: '978-75-30226',
      coverColor: '#c7ceea',
      stock: 4,
      status: 'borrowed',
    },
  ];
  initialBooks.forEach((b) => {
    const id = uuidv4();
    books.set(id, { ...b, id });
  });
  return books;
};

const createInitialRecords = (bookIds: string[]): Map<string, BorrowRecord> => {
  const records = new Map<string, BorrowRecord>();
  if (bookIds.length < 2) return records;
  const initialRecords: Omit<BorrowRecord, 'id'>[] = [
    {
      bookId: bookIds[1],
      readerName: '张三',
      borrowDate: '2026-06-01',
      expectedReturnDate: '2026-06-15',
    },
    {
      bookId: bookIds[5],
      readerName: '李四',
      borrowDate: '2026-06-05',
      expectedReturnDate: '2026-06-20',
    },
    {
      bookId: bookIds[0],
      readerName: '王五',
      borrowDate: '2026-05-10',
      expectedReturnDate: '2026-05-25',
      actualReturnDate: '2026-05-23',
    },
    {
      bookId: bookIds[2],
      readerName: '赵六',
      borrowDate: '2026-05-20',
      expectedReturnDate: '2026-06-04',
      actualReturnDate: '2026-06-02',
    },
  ];
  initialRecords.forEach((r) => {
    records.set(uuidv4(), { ...r, id: uuidv4() });
  });
  return records;
};

export function useBookStore() {
  const [books, setBooks] = useState<Map<string, Book>>(() => {
    const m = createInitialBooks();
    return m;
  });

  const [records, setRecords] = useState<Map<string, BorrowRecord>>(() => {
    const bookIds = Array.from(createInitialBooks().keys());
    return createInitialRecords(bookIds);
  });

  const bookList = useMemo(() => Array.from(books.values()), [books]);

  const getBook = useCallback(
    (id: string) => books.get(id),
    [books]
  );

  const addBook = useCallback(
    (data: Omit<Book, 'id' | 'status'>) => {
      const id = uuidv4();
      const newBook: Book = {
        ...data,
        id,
        status: 'available',
      };
      setBooks((prev) => {
        const next = new Map(prev);
        next.set(id, newBook);
        return next;
      });
      return newBook;
    },
    []
  );

  const updateBookStatus = useCallback((id: string, status: BookStatus) => {
    setBooks((prev) => {
      const next = new Map(prev);
      const book = next.get(id);
      if (book) {
        next.set(id, { ...book, status });
      }
      return next;
    });
  }, []);

  const getBookRecords = useCallback(
    (bookId: string) => {
      return Array.from(records.values())
        .filter((r) => r.bookId === bookId)
        .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate));
    },
    [records]
  );

  const borrowBook = useCallback(
    (bookId: string, readerName: string, expectedReturnDate: string) => {
      const id = uuidv4();
      const now = new Date().toISOString().slice(0, 10);
      const record: BorrowRecord = {
        id,
        bookId,
        readerName,
        borrowDate: now,
        expectedReturnDate,
      };
      setRecords((prev) => {
        const next = new Map(prev);
        next.set(id, record);
        return next;
      });
      setBooks((prev) => {
        const next = new Map(prev);
        const book = next.get(bookId);
        if (book) {
          next.set(bookId, { ...book, status: 'borrowed' });
        }
        return next;
      });
      return record;
    },
    []
  );

  const returnBook = useCallback((bookId: string, recordId: string) => {
    const now = new Date().toISOString().slice(0, 10);
    setRecords((prev) => {
      const next = new Map(prev);
      const rec = next.get(recordId);
      if (rec) {
        next.set(recordId, { ...rec, actualReturnDate: now });
      }
      return next;
    });
    setBooks((prev) => {
      const next = new Map(prev);
      const book = next.get(bookId);
      if (book) {
        next.set(bookId, { ...book, status: 'available' });
      }
      return next;
    });
  }, []);

  const filterBooks = useMemo(() => {
    return debounce((query: string, list: Book[]): Book[] => {
      if (!query.trim()) return list;
      const q = query.trim().toLowerCase();
      return list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }, 50);
  }, []);

  const stats = useMemo(() => {
    const list = Array.from(books.values());
    const totalStock = list.reduce((sum, b) => sum + b.stock, 0);
    const borrowedCount = list.filter((b) => b.status === 'borrowed').length;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyBorrows = Array.from(records.values()).filter((r) =>
      r.borrowDate.startsWith(thisMonth)
    ).length;
    return { totalStock, borrowedCount, monthlyBorrows };
  }, [books, records]);

  return {
    books,
    bookList,
    records,
    getBook,
    addBook,
    updateBookStatus,
    getBookRecords,
    borrowBook,
    returnBook,
    filterBooks,
    stats,
  };
}
