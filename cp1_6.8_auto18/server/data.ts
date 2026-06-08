import { v4 as uuidv4 } from 'uuid';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  categoryId: string;
  status: 'read' | 'unread';
  rating: number;
  notes: string;
  position: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  position: number;
}

const warmColorPalette = [
  '#E07A5F',
  '#F2CC8F',
  '#E07A5F',
  '#81B29A',
  '#3D405B',
  '#F4A261',
  '#E76F51',
  '#D4A373',
  '#CCD5AE',
  '#FEFAE0',
  '#FFB4A2',
  '#E5989B',
  '#B5838D',
  '#6D6875',
  '#FFCDB2',
];

function getRandomColor(): string {
  return warmColorPalette[Math.floor(Math.random() * warmColorPalette.length)];
}

const defaultCategories: Category[] = [
  { id: 'all', name: '全部书籍', icon: '📚', position: 0 },
  { id: 'read', name: '已读', icon: '✅', position: 1 },
  { id: 'unread', name: '想读', icon: '📖', position: 2 },
  { id: 'scifi', name: '科幻', icon: '🚀', position: 3 },
  { id: 'history', name: '历史', icon: '🏛️', position: 4 },
];

const defaultBooks: Book[] = [
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    coverColor: getRandomColor(),
    categoryId: 'scifi',
    status: 'read',
    rating: 5,
    notes: '这是一部伟大的科幻小说，展现了人类文明与三体文明的碰撞。',
    position: 0,
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    coverColor: getRandomColor(),
    categoryId: 'history',
    status: 'read',
    rating: 4,
    notes: '从认知革命、农业革命到科学革命，讲述人类的发展历程。',
    position: 1,
  },
  {
    id: uuidv4(),
    title: '沙丘',
    author: '弗兰克·赫伯特',
    coverColor: getRandomColor(),
    categoryId: 'scifi',
    status: 'unread',
    rating: 0,
    notes: '',
    position: 2,
  },
  {
    id: uuidv4(),
    title: '明朝那些事儿',
    author: '当年明月',
    coverColor: getRandomColor(),
    categoryId: 'history',
    status: 'read',
    rating: 5,
    notes: '以幽默的笔调讲述明朝三百年历史，非常精彩。',
    position: 3,
  },
  {
    id: uuidv4(),
    title: '银河帝国',
    author: '艾萨克·阿西莫夫',
    coverColor: getRandomColor(),
    categoryId: 'scifi',
    status: 'unread',
    rating: 0,
    notes: '',
    position: 4,
  },
  {
    id: uuidv4(),
    title: '万历十五年',
    author: '黄仁宇',
    coverColor: getRandomColor(),
    categoryId: 'history',
    status: 'unread',
    rating: 0,
    notes: '',
    position: 5,
  },
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    coverColor: getRandomColor(),
    categoryId: 'read',
    status: 'read',
    rating: 5,
    notes: '讲述了福贵坎坷的一生，感人至深。',
    position: 6,
  },
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    coverColor: getRandomColor(),
    categoryId: 'unread',
    status: 'unread',
    rating: 0,
    notes: '',
    position: 7,
  },
];

class DataStore {
  private categories: Category[] = [...defaultCategories];
  private books: Book[] = [...defaultBooks];

  getCategories(): Category[] {
    return [...this.categories].sort((a, b) => a.position - b.position);
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories.find((c) => c.id === id);
  }

  addCategory(name: string, icon: string): Category {
    const newCategory: Category = {
      id: uuidv4(),
      name,
      icon,
      position: this.categories.length,
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  deleteCategory(id: string): boolean {
    if (['all', 'read', 'unread', 'scifi', 'history'].includes(id)) {
      return false;
    }
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.categories.splice(index, 1);
    this.books = this.books.filter((b) => b.categoryId !== id);
    return true;
  }

  getBooks(categoryId?: string): Book[] {
    let result = [...this.books];
    if (categoryId && categoryId !== 'all') {
      if (categoryId === 'read') {
        result = result.filter((b) => b.status === 'read');
      } else if (categoryId === 'unread') {
        result = result.filter((b) => b.status === 'unread');
      } else {
        result = result.filter((b) => b.categoryId === categoryId);
      }
    }
    return result.sort((a, b) => a.position - b.position);
  }

  getBookById(id: string): Book | undefined {
    return this.books.find((b) => b.id === id);
  }

  addBook(book: Omit<Book, 'id' | 'position' | 'coverColor'>): Book {
    const newBook: Book = {
      ...book,
      id: uuidv4(),
      coverColor: getRandomColor(),
      position: this.books.length,
    };
    this.books.push(newBook);
    return newBook;
  }

  updateBook(id: string, updates: Partial<Book>): Book | null {
    const index = this.books.findIndex((b) => b.id === id);
    if (index === -1) return null;
    this.books[index] = { ...this.books[index], ...updates };
    return this.books[index];
  }

  deleteBook(id: string): boolean {
    const index = this.books.findIndex((b) => b.id === id);
    if (index === -1) return false;
    this.books.splice(index, 1);
    return true;
  }

  updateBookPosition(bookId: string, newPosition: number, newCategoryId?: string): Book | null {
    const book = this.books.find((b) => b.id === bookId);
    if (!book) return null;

    const categoryId = newCategoryId || book.categoryId;
    let categoryBooks = this.books
      .filter((b) => b.categoryId === categoryId && b.id !== bookId)
      .sort((a, b) => a.position - b.position);

    if (newPosition < 0) newPosition = 0;
    if (newPosition > categoryBooks.length) newPosition = categoryBooks.length;

    categoryBooks.splice(newPosition, 0, book);
    categoryBooks.forEach((b, idx) => {
      b.position = idx;
    });

    if (newCategoryId && newCategoryId !== book.categoryId) {
      book.categoryId = newCategoryId;
    }

    return book;
  }

  swapBooks(bookId1: string, bookId2: string): boolean {
    const book1 = this.books.find((b) => b.id === bookId1);
    const book2 = this.books.find((b) => b.id === bookId2);
    if (!book1 || !book2) return false;

    const tempPosition = book1.position;
    const tempCategory = book1.categoryId;
    book1.position = book2.position;
    book1.categoryId = book2.categoryId;
    book2.position = tempPosition;
    book2.categoryId = tempCategory;

    return true;
  }
}

export const dataStore = new DataStore();
