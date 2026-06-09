import { useState, useEffect } from 'react'
import DriftMap from '../components/DriftMap'
import Timeline from '../components/Timeline'
import { api } from '../api'
import type { Book } from '../types'

interface BookDetailPageProps {
  bookId: string
  onNavigate: (path: string) => void
}

const statusMap: Record<Book['status'], { label: string; color: string; bg: string }> = {
  available: { label: '可交换', color: '#F5E6CA', bg: '#5D8A4C' },
  drifting: { label: '在漂流中', color: '#FFF8E1', bg: '#B8860B' },
  exchanged: { label: '已交换', color: '#F5E6CA', bg: '#666' },
  borrow_only: { label: '只借不换', color: '#F5E6CA', bg: '#4A7BA6' },
}

const CURRENT_USER_ID = 'user-1'

export default function BookDetailPage({ bookId, onNavigate }: BookDetailPageProps) {
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [applying, setApplying] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadBook()
  }, [bookId])

  async function loadBook() {
    setLoading(true)
    try {
      const data = await api.getBook(bookId)
      setBook(data)
    } catch (err) {
      console.error('Failed to load book:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyExchange() {
    if (!book) return
    setApplying(true)

    const optimisticBook = { ...book, status: 'drifting' as const }
    setBook(optimisticBook)

    setTimeout(async () => {
      try {
        await api.createExchange({
          bookId: book.id,
          fromUserId: book.ownerId,
          toUserId: CURRENT_USER_ID,
          message: '我很喜欢这本书，希望能和你交换！',
        })
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } catch (err) {
        console.error('Failed to apply exchange:', err)
        setBook(book)
      } finally {
        setApplying(false)
      }
    }, 50)
  }

  async function handleToggleStatus() {
    if (!book) return
    const newStatus: Book['status'] = book.status === 'available' ? 'drifting' : 'available'
    const optimisticBook = { ...book, status: newStatus }
    setBook(optimisticBook)
    try {
      await api.updateBookStatus(book.id, newStatus)
    } catch (err) {
      console.error('Failed to update status:', err)
      setBook(book)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '100px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E8D5B7',
            borderTopColor: '#8B5E3C',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!book) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#8B5E3C' }}>
        <p style={{ fontSize: '18px' }}>未找到这本书</p>
        <button
          onClick={() => onNavigate('/')}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: '#8B5E3C',
            color: '#F5E6CA',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
        >
          返回书架
        </button>
      </div>
    )
  }

  const isOwner = book.ownerId === CURRENT_USER_ID
  const status = statusMap[book.status]
  const completedDrifts = book.driftHistory.filter((d) => d.status === 'completed')
  const totalReaders = completedDrifts.length + 1

  return (
    <div className="fade-in">
      {showSuccess && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: '#5D8A4C',
            color: '#F5E6CA',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(93, 138, 76, 0.4)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span style={{ fontWeight: 600 }}>交换申请已发送！</span>
        </div>
      )}

      <button
        onClick={() => onNavigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: 'transparent',
          border: '2px solid #E8D5B7',
          borderRadius: '8px',
          color: '#8B5E3C',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: 'inherit',
          marginBottom: '20px',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#E8D5B7'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        返回书架
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 400px) 1fr',
          gap: '32px',
          marginBottom: '32px',
        }}
      >
        <div>
          <div
            style={{
              aspectRatio: '3/4',
              background: '#E8D5B7',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #E8D5B7',
              boxShadow: '0 4px 16px rgba(107, 68, 35, 0.2)',
              marginBottom: '16px',
            }}
          >
            <img
              src={book.coverImages[activeImage]}
              alt={book.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {book.coverImages.length > 1 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {book.coverImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  style={{
                    width: '60px',
                    height: '80px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border:
                      idx === activeImage
                        ? '3px solid #8B5E3C'
                        : '2px solid transparent',
                    opacity: idx === activeImage ? 1 : 0.7,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <img
                    src={img}
                    alt={`封面${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: status.color,
              backgroundColor: status.bg,
              alignSelf: 'flex-start',
              marginBottom: '12px',
            }}
          >
            {status.label}
          </div>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#3E2723',
              marginBottom: '8px',
            }}
          >
            {book.title}
          </h1>
          <p style={{ fontSize: '17px', color: '#6B4423', marginBottom: '24px' }}>
            {book.author} 著
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px 24px',
              padding: '20px',
              background: 'rgba(232, 213, 183, 0.4)',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            <div>
              <p style={{ fontSize: '12px', color: '#8B5E3C', marginBottom: '4px' }}>
                出版社
              </p>
              <p style={{ fontSize: '15px', color: '#3E2723', fontWeight: 500 }}>
                {book.publisher}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#8B5E3C', marginBottom: '4px' }}>
                出版年份
              </p>
              <p style={{ fontSize: '15px', color: '#3E2723', fontWeight: 500 }}>
                {book.publishYear}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#8B5E3C', marginBottom: '4px' }}>
                当前持有者
              </p>
              <p style={{ fontSize: '15px', color: '#3E2723', fontWeight: 500 }}>
                {book.ownerName}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#8B5E3C', marginBottom: '4px' }}>
                当前位置
              </p>
              <p style={{ fontSize: '15px', color: '#3E2723', fontWeight: 500 }}>
                📍 {book.currentLocation.city}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#8B5E3C', marginBottom: '4px' }}>
                历经读者
              </p>
              <p style={{ fontSize: '15px', color: '#3E2723', fontWeight: 500 }}>
                👥 {totalReaders} 位
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#8B5E3C', marginBottom: '4px' }}>
                发布时间
              </p>
              <p style={{ fontSize: '15px', color: '#3E2723', fontWeight: 500 }}>
                {book.createdAt}
              </p>
            </div>
          </div>

          <p
            style={{
              fontSize: '15px',
              color: '#5D4037',
              lineHeight: 1.8,
              padding: '16px 20px',
              background: '#FFF8E7',
              borderRadius: '10px',
              borderLeft: '4px solid #D4A76A',
              marginBottom: '28px',
            }}
          >
            {book.description}
          </p>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
            {isOwner ? (
              <button
                onClick={handleToggleStatus}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%)',
                  color: '#F5E6CA',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(107, 68, 35, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(107, 68, 35, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 68, 35, 0.3)'
                }}
              >
                {book.status === 'available' ? '标记为漂流中' : '标记为可交换'}
              </button>
            ) : (
              <button
                onClick={handleApplyExchange}
                disabled={applying || book.status !== 'available'}
                style={{
                  padding: '14px 28px',
                  background:
                    book.status === 'available'
                      ? 'linear-gradient(135deg, #5D8A4C 0%, #4A7040 100%)'
                      : '#999',
                  color: '#F5E6CA',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: book.status === 'available' && !applying ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(93, 138, 76, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  if (book.status === 'available' && !applying) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {applying ? (
                  <>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(245, 230, 202, 0.3)',
                        borderTopColor: '#F5E6CA',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    申请中...
                  </>
                ) : book.status === 'available' ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    申请交换
                  </>
                ) : (
                  '暂不可交换'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <DriftMap driftHistory={book.driftHistory} currentCity={book.currentLocation} />
      </div>

      <Timeline
        driftHistory={book.driftHistory}
        originCity={
          completedDrifts.length > 0
            ? completedDrifts[0].fromLocation.city
            : book.currentLocation.city
        }
        originUser={book.ownerName}
        originDate={book.createdAt}
      />
    </div>
  )
}
