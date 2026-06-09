import { useState, useEffect } from 'react'
import BookCard from '../components/BookCard'
import { api } from '../api'
import type { Book, User } from '../types'

interface ProfilePageProps {
  userId: string
  onNavigate: (path: string) => void
}

type TabType = 'published' | 'exchanged'

export default function ProfilePage({ userId, onNavigate }: ProfilePageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [publishedBooks, setPublishedBooks] = useState<Book[]>([])
  const [exchangedBooks, setExchangedBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('published')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Book['status']>('all')
  const [tabKey, setTabKey] = useState(0)

  useEffect(() => {
    loadData()
  }, [userId])

  async function loadData() {
    setLoading(true)
    try {
      const [userData, booksData] = await Promise.all([
        api.getUser(userId),
        api.getUserBooks(userId),
      ])
      setUser(userData)
      setPublishedBooks(booksData.published)
      setExchangedBooks(booksData.exchanged)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      setActiveTab(tab)
      setTabKey((k) => k + 1)
      setSearch('')
      setFilter('all')
    }
  }

  const currentBooks = activeTab === 'published' ? publishedBooks : exchangedBooks

  const filteredBooks = currentBooks.filter((book) => {
    const matchFilter = filter === 'all' || book.status === filter
    const matchSearch =
      search === '' ||
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const registeredDays = user
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(user.registeredAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0

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

  if (!user) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#8B5E3C' }}>
        <p style={{ fontSize: '18px' }}>未找到用户信息</p>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px' }}>
      <div
        style={{
          background: '#FFF8E7',
          borderRadius: '16px',
          padding: '28px 20px',
          border: '1px solid #E8D5B7',
          boxShadow: '0 2px 12px rgba(107, 68, 35, 0.1)',
          height: 'fit-content',
          position: 'sticky',
          top: '100px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '24px',
            borderBottom: '1px solid #E8D5B7',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid #D4A76A',
              boxShadow: '0 4px 12px rgba(212, 167, 106, 0.4)',
              marginBottom: '16px',
              background: '#F5E6CA',
            }}
          >
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#3E2723',
              marginBottom: '4px',
            }}
          >
            {user.name}
          </h2>
          <p style={{ fontSize: '13px', color: '#8B5E3C' }}>
            📍 {user.location.city}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(232, 213, 183, 0.4)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: '#8B5E3C',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              注册天数
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#3E2723' }}>
              {registeredDays} 天
            </p>
          </div>

          <div
            style={{
              background: 'rgba(93, 138, 76, 0.1)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: '#5D8A4C',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              完成交换
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#5D8A4C' }}>
              {user.exchangeCount} 次
            </p>
          </div>

          <div
            style={{
              background: 'rgba(184, 134, 11, 0.1)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: '#B8860B',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
              </svg>
              拥有藏书
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#B8860B' }}>
              {publishedBooks.length} 本
            </p>
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            background: '#FFF8E7',
            borderRadius: '12px',
            border: '1px solid #E8D5B7',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #E8D5B7',
              background: '#F5E6CA',
            }}
          >
            {(['published', 'exchanged'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  flex: 1,
                  padding: '16px 24px',
                  background: activeTab === tab ? '#FFF8E7' : 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === tab ? '3px solid #8B5E3C' : '3px solid transparent',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? '#3E2723' : '#8B5E3C',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s ease',
                }}
              >
                {tab === 'published'
                  ? `📚 我发布的书 (${publishedBooks.length})`
                  : `📖 我交换到的书 (${exchangedBooks.length})`}
              </button>
            ))}
          </div>

          <div style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <svg
                  width="16"
                  height="16"
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
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    border: '2px solid #E8D5B7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: '#F5E6CA',
                    color: '#3E2723',
                    outline: 'none',
                    transition: 'border-color 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#8B5E3C')}
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
                  background: '#F5E6CA',
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

            <div key={tabKey} className="fade-in">
              {filteredBooks.length === 0 ? (
                <div
                  style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: '#8B5E3C',
                  }}
                >
                  <svg
                    width="56"
                    height="56"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ opacity: 0.4, marginBottom: '12px' }}
                  >
                    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
                  </svg>
                  <p style={{ fontSize: '16px' }}>
                    {activeTab === 'published'
                      ? '还没有发布任何书籍'
                      : '还没有交换到任何书籍'}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '20px',
                  }}
                >
                  {filteredBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onClick={() => onNavigate(`/book/${book.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
