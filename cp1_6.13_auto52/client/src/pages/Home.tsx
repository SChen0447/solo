import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types';
import { bookApi, matchApi } from '../services/api';
import SearchBar from '../components/SearchBar';
import CardList from '../components/CardList';
import type { ToastType } from '../components/Toast';
import './Home.css';

interface HomeProps {
  showToast: (message: string, type?: ToastType) => void;
}

function Home({ showToast }: HomeProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<{
    title?: string;
    author?: string;
    year?: number;
  }>({});

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookApi.getBooks(searchParams);
      setBooks(res.data);
    } catch (error) {
      console.error('获取书籍列表失败', error);
      showToast('获取书籍列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchParams, showToast]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSearch = (params: { title?: string; author?: string; year?: number }) => {
    setSearchParams(params);
  };

  const handleExchange = async (targetBook: Book, fromBookId: string) => {
    try {
      await matchApi.createMatch({
        toUserId: targetBook.ownerId,
        fromBookId,
        toBookId: targetBook.id,
      });
      showToast('交换请求已发送，等待对方确认');
    } catch (error) {
      console.error('发起交换失败', error);
      showToast('发起交换失败，请重试', 'error');
    }
  };

  return (
    <div className="home-page">
      <div className="page-container">
        <div className="hero-section">
          <h1 className="hero-title">书香流转</h1>
          <p className="hero-subtitle">让闲置的书籍找到新的读者，让知识在流转中延续价值</p>
        </div>
        
        <SearchBar onSearch={handleSearch} />
        
        <div className="section-header">
          <h2 className="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            可交换书籍
          </h2>
          <span className="book-count">共 {books.length} 本</span>
        </div>
        
        <CardList 
          books={books} 
          loading={loading} 
          onExchange={handleExchange}
        />
      </div>
    </div>
  );
}

export default Home;
