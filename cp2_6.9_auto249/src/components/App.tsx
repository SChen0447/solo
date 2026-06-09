import { useState, useEffect, useCallback } from 'react'
import type { Book, Note } from '../types'
import BookShelf from './BookShelf'
import BookPage from './BookPage'

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [currentBookId, setCurrentBookId] = useState<string | null>(null)
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [loading, setLoading] = useState(true)

  const parseHash = useCallback((): string | null => {
    const hash = window.location.hash.slice(1)
    const match = hash.match(/^\/book\/(.+)$/)
    return match ? match[1] : null
  }, [])

  useEffect(() => {
    fetchBooks()
    setCurrentBookId(parseHash())
    window.addEventListener('hashchange', () => setCurrentBookId(parseHash()))
    return () => window.removeEventListener('hashchange', () => setCurrentBookId(parseHash()))
  }, [parseHash])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/books')
      const data = await res.json()
      setBooks(data)
    } catch (err) {
      console.error('Failed to fetch books:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}/notes`)
      const data = await res.json()
      setNotes(data)
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    }
  }

  const navigateToBook = (bookId: string) => {
    window.location.hash = `#/book/${bookId}`
    setCurrentBookId(bookId)
    fetchNotes(bookId)
  }

  const navigateHome = () => {
    window.location.hash = ''
    setCurrentBookId(null)
    setNotes([])
  }

  const currentBook = books.find(b => b.id === currentBookId) || null

  return (
    <div className={`app ${isDarkTheme ? 'dark' : ''}`}>
      <header className="app-header">
        <h1 className="app-title" onClick={navigateHome}>書 事</h1>
        <button
          className="theme-toggle"
          onClick={() => setIsDarkTheme(!isDarkTheme)}
        >
          {isDarkTheme ? '☀️ 日间' : '🌙 夜间'}
        </button>
      </header>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : currentBook ? (
        <BookPage
          book={currentBook}
          notes={notes}
          onBack={navigateHome}
          onNotesChange={setNotes}
          bookId={currentBook.id}
        />
      ) : (
        <BookShelf books={books} onSelectBook={navigateToBook} />
      )}
    </div>
  )
}

export default App
