import { useState, useMemo } from 'react'
import type { Book } from '../types'

interface BookShelfProps {
  books: Book[]
  onSelectBook: (bookId: string) => void
}

function BookShelf({ books, onSelectBook }: BookShelfProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return books
    return books.filter(
      book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    )
  }, [books, searchQuery])

  return (
    <div className="bookshelf-container">
      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="搜索书名或作者..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bookshelf">
        {filteredBooks.length > 0 ? (
          <div className="books-grid">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="book-card"
                style={{ background: `linear-gradient(135deg, ${book.color} 0%, ${adjustColor(book.color, -20)} 100%)` }}
                onClick={() => onSelectBook(book.id)}
              >
                <span className="book-card-title">{book.title}</span>
                <span className="book-card-author">{book.author}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {searchQuery ? '未找到匹配的书籍' : '书架暂无书籍'}
          </div>
        )}
      </div>
    </div>
  )
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

export default BookShelf
