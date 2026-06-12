import { Book } from '../types';
import '../styles/Bookshelf.css';

interface BookshelfProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
}

function Bookshelf({ books, onSelectBook }: BookshelfProps) {
  return (
    <div className="bookshelf-container">
      <h1 className="bookshelf-title">我的书架</h1>
      <p className="bookshelf-subtitle">选择一本书，开始你的阅读之旅</p>
      <div className="books-grid">
        {books.map(book => (
          <div
            key={book.id}
            className="book-card"
            onClick={() => onSelectBook(book)}
          >
            <div
              className="book-cover"
              style={{ background: book.coverGradient }}
            >
              <div className="book-cover-inner">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>
              </div>
            </div>
            <div className="book-info">
              <span className="book-icon">📖</span>
              <span className="book-status">点击阅读</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Bookshelf;
