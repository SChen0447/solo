import { useState, useEffect, useRef } from 'react'
import BookCard from '../components/BookCard'
import { api } from '../api'
import type { Book } from '../types'

interface HomePageProps {
  onNavigate: (path: string) => void
}

const SHELF_BG = '#F5E6CA'
const WOOD_COLOR = '#8B5E3C'

export default function HomePage({ onNavigate }: HomePageProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | Book['status']>('all')
  const [search, setSearch] = useState('')
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadBooks()
    }
  }, [])

  async function loadBooks() {
    try {
      const data = await api.getBooks()
      setBooks(data)
    } catch (err) {
      console.error('Failed to load books:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredBooks = books.filter((book) => {
    const matchFilter = filter === 'all' || book.status === filter
    const matchSearch =
      search === '' ||
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const booksPerShelf = 5
  const shelves: Book[][] = []
  for (let i = 0; i < filteredBooks.length; i += booksPerShelf) {
    shelves.push(filteredBooks.slice(i, i + booksPerShelf))
  }

  return (
    <div className="fade-in" style={{ background: SHELF_BG, minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#3E2723',
                marginBottom: '8px',
              }}
            >
              温暖书架
            </h2>
            <p style={{ fontSize: '15px', color: '#6B4423' }}>
              每一本书都有它的故事，等待与你相遇 · 共 {filteredBooks.length} 本藏书
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="#8B5E3C"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="搜索书名或作者..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '10px 14px 10px 40px',
                  border: '2px solid #E8D5B7',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  background: '#FFF8E7',
                  color: '#3E2723',
                  outline: 'none',
                  width: '240px',
                  transition: 'border-color 0.3s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = WOOD_COLOR)}
                onBlur={(e) => (e.target.style.borderColor = '#E8D5B7')}
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              style={{
                padding: '10px 14px',
                border: '2px solid #E8D5B7',
                borderRadius: '10px',
                fontSize: '14px',
                fontFamily: 'inherit',
                background: '#FFF8E7',
                color: '#3E2723',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.3s ease',
              }}
            >
              <option value="all">全部状态</option>
              <option value="available">可交换</option>
              <option value="drifting">在漂流中</option>
              <option value="borrow_only">只借不换</option>
              <option value="exchanged">已交换</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '80px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #E8D5B7',
                borderTopColor: WOOD_COLOR,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : shelves.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#8B5E3C',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ opacity: 0.5, marginBottom: '16px' }}
            >
              <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
            </svg>
            <p style={{ fontSize: '18px' }}>书架上暂时没有符合条件的书...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {shelves.map((shelf, shelfIdx) => (
              <div key={shelfIdx} style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${booksPerShelf}, 1fr)`,
                    gap: '24px',
                    padding: '24px 24px 40px',
                    background:
                      'linear-gradient(180deg, rgba(139,94,60,0.05) 0%, rgba(139,94,60,0.15) 100%)',
                    borderLeft: `6px solid ${WOOD_COLOR}`,
                    borderRight: `6px solid ${WOOD_COLOR}`,
                  }}
                >
                  {shelf.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onClick={() => onNavigate(`/book/${book.id}`)}
                    />
                  ))}
                  {Array.from({ length: booksPerShelf - shelf.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                </div>
                <div
                  style={{
                    height: '12px',
                    background: `linear-gradient(180deg, ${WOOD_COLOR} 0%, #6B4423 100%)`,
                    boxShadow:
                      '0 4px 12px rgba(107, 68, 35, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                    borderRadius: '0 0 4px 4px',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
