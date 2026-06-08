import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BookShelf from './components/BookShelf';
import BookDetail from './components/BookDetail';

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

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  useEffect(() => {
    loadCategories();
    loadBooks();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      showToast('加载分类失败', 'error');
    }
  };

  const loadBooks = async (categoryId?: string) => {
    try {
      const res = await axios.get('/api/books', {
        params: { categoryId },
      });
      setBooks(res.data);
    } catch (err) {
      showToast('加载书籍失败', 'error');
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    loadBooks(categoryId === 'all' ? undefined : categoryId);
    setIsMobileMenuOpen(false);
  };

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => {
      setSelectedBook(null);
    }, 300);
  };

  const handleUpdateBook = async (id: string, updates: Partial<Book>) => {
    try {
      await axios.put(`/api/books/${id}`, updates);
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
      if (selectedBook && selectedBook.id === id) {
        setSelectedBook((prev) => (prev ? { ...prev, ...updates } : null));
      }
      showToast('保存成功', 'success');
    } catch (err) {
      showToast('保存失败', 'error');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('请输入分类名称', 'error');
      return;
    }
    try {
      const res = await axios.post('/api/categories', {
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
      });
      setCategories((prev) => [...prev, res.data]);
      setNewCategoryName('');
      setShowAddCategory(false);
      showToast('分类创建成功', 'success');
    } catch (err) {
      showToast('创建分类失败', 'error');
    }
  };

  const handleBookMove = async (bookId: string, position: number, categoryId?: string) => {
    try {
      await axios.post(`/api/books/${bookId}/move`, { position, categoryId });
      loadBooks(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (err) {
      showToast('移动书籍失败', 'error');
    }
  };

  const handleBookSwap = async (bookId1: string, bookId2: string) => {
    try {
      await axios.post('/api/books/swap', { bookId1, bookId2 });
      loadBooks(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (err) {
      showToast('交换书籍失败', 'error');
    }
  };

  const handleSaveNotes = () => {
    handleCloseDetail();
    loadBooks(selectedCategory === 'all' ? undefined : selectedCategory);
  };

  const emojiOptions = ['📁', '📚', '📖', '🚀', '🏛️', '🎨', '🎵', '💡', '❤️', '⭐'];

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">📚</span>
          我的虚拟书架
        </h1>
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </header>

      <div className="app-container">
        <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <h2>分类</h2>
            <button
              className="add-category-btn"
              onClick={() => setShowAddCategory(!showAddCategory)}
            >
              ＋
            </button>
          </div>

          {showAddCategory && (
            <div className="add-category-form slide-down">
              <input
                type="text"
                placeholder="分类名称"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <div className="emoji-picker">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    className={`emoji-btn ${newCategoryIcon === emoji ? 'active' : ''}`}
                    onClick={() => setNewCategoryIcon(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button className="confirm-btn" onClick={handleAddCategory}>
                确定
              </button>
            </div>
          )}

          <ul className="category-list">
            {categories.map((category) => (
              <li
                key={category.id}
                data-category-id={category.id}
                className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                <span className="category-count">
                  {category.id === 'all'
                    ? books.length
                    : category.id === 'read'
                    ? books.filter((b) => b.status === 'read').length
                    : category.id === 'unread'
                    ? books.filter((b) => b.status === 'unread').length
                    : books.filter((b) => b.categoryId === category.id).length}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main-content">
          <div className="category-dropdown">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryClick(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          <BookShelf
            books={books}
            categories={categories}
            selectedCategory={selectedCategory}
            onBookClick={handleBookClick}
            onBookMove={handleBookMove}
            onBookSwap={handleBookSwap}
            showToast={showToast}
          />
        </main>
      </div>

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onUpdate={handleUpdateBook}
          onSave={handleSaveNotes}
        />
      )}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} toast-enter`}>
            {toast.type === 'success' && '✓ '}
            {toast.type === 'error' && '✕ '}
            {toast.type === 'info' && 'ℹ '}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
