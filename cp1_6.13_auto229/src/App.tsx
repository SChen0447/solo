import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from './store'
import Card from './Card'
import {
  Plus,
  X,
  Image,
  FileText,
  Mic,
  Tag,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronsRight,
  LogOut,
} from 'lucide-react'

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setUser = useStore((s) => s.setUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.user, data.token)
      } else {
        setError(data.error || 'Operation failed')
      }
    } catch {
      setError('Network error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">虹纱·光影档案柜</h1>
        <p className="auth-subtitle">沉浸式创意素材归档空间</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-button">
            {isLogin ? '登录' : '注册'}
          </button>
          <p className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '没有账号？注册' : '已有账号？登录'}
          </p>
        </form>
      </div>
    </div>
  )
}

function CreateCardModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<'image' | 'text' | 'audio'>('text')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const token = useStore((s) => s.token)
  const addCard = useStore((s) => s.addCard)
  const setIsCreating = useStore((s) => s.setIsCreating)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          title: title || 'Untitled',
          content,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3),
          positionX: 100 + Math.random() * 400,
          positionY: 80 + Math.random() * 200,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          await fetch(`/api/cards/${data.card.id}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
          const cardRes = await fetch(`/api/cards?sort=time`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const cardData = await cardRes.json()
          if (cardData.success) {
            useStore.getState().setCards(cardData.cards)
          }
        } else {
          addCard(data.card)
        }
        setIsCreating(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0]
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        setType('image')
      } else if (['wav', 'mp3', 'ogg'].includes(ext)) {
        setType('audio')
      }
      setFile(f)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h2 className="create-modal-title">创建档案卡片</h2>
        <form onSubmit={handleSubmit} className="create-form">
          <div className="create-type-selector">
            {[
              { key: 'image' as const, icon: Image, label: '图片' },
              { key: 'text' as const, icon: FileText, label: '文字' },
              { key: 'audio' as const, icon: Mic, label: '录音' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                className={`type-btn ${type === key ? 'type-btn-active' : ''}`}
                onClick={() => setType(key)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="create-input"
          />

          {type === 'text' && (
            <textarea
              placeholder="输入内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="create-textarea"
              rows={4}
            />
          )}

          {(type === 'image' || type === 'audio') && (
            <div className="create-file-area">
              <input
                type="file"
                accept={type === 'image' ? 'image/*' : '.wav,.mp3,.ogg'}
                onChange={handleFileChange}
                className="create-file-input"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="create-file-label">
                {file ? file.name : type === 'image' ? '选择图片' : '选择音频文件'}
              </label>
            </div>
          )}

          <input
            type="text"
            placeholder="标签（逗号分隔，最多3个）"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="create-input"
          />

          <button type="submit" className="create-submit">
            创建卡片
          </button>
        </form>
      </div>
    </div>
  )
}

function DetailModal() {
  const selectedCard = useStore((s) => s.selectedCard)
  const setSelectedCard = useStore((s) => s.setSelectedCard)
  const token = useStore((s) => s.token)
  const removeCard = useStore((s) => s.removeCard)

  if (!selectedCard) return null

  const handleDelete = async () => {
    try {
      await fetch(`/api/cards/${selectedCard.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      removeCard(selectedCard.id)
      setSelectedCard(null)
    } catch (err) {
      console.error(err)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setSelectedCard(null)}>
          <X size={18} />
        </button>
        <div className="detail-header">
          <h2 className="detail-title">{selectedCard.title}</h2>
          <span className="detail-time">{formatTime(selectedCard.createdAt)}</span>
        </div>
        <div className="detail-tags">
          {selectedCard.tags.map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="detail-content">
          {selectedCard.type === 'image' && selectedCard.fileUrl && (
            <img src={selectedCard.fileUrl} alt={selectedCard.title} className="detail-image" />
          )}
          {selectedCard.type === 'audio' && selectedCard.fileUrl && (
            <audio src={selectedCard.fileUrl} controls className="detail-audio" />
          )}
          {selectedCard.type === 'text' && (
            <p className="detail-text">{selectedCard.content}</p>
          )}
        </div>
        <button className="detail-delete" onClick={handleDelete}>
          删除卡片
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const user = useStore((s) => s.user)
  const token = useStore((s) => s.token)
  const cards = useStore((s) => s.cards)
  const filterTag = useStore((s) => s.filterTag)
  const setCards = useStore((s) => s.setCards)
  const setFilterTag = useStore((s) => s.setFilterTag)
  const setSelectedCard = useStore((s) => s.setSelectedCard)
  const updateCard = useStore((s) => s.updateCard)
  const leftPanelOpen = useStore((s) => s.leftPanelOpen)
  const tagBarOpen = useStore((s) => s.tagBarOpen)
  const setLeftPanelOpen = useStore((s) => s.setLeftPanelOpen)
  const setTagBarOpen = useStore((s) => s.setTagBarOpen)
  const isCreating = useStore((s) => s.isCreating)
  const setIsCreating = useStore((s) => s.setIsCreating)
  const setUser = useStore((s) => s.setUser)

  const [allTags, setAllTags] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const desktopRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchCards = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/cards?sort=time', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setCards(data.cards)
    } catch (err) {
      console.error(err)
    }
  }, [token, setCards])

  const fetchTags = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/tags', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setAllTags(data.tags)
    } catch (err) {
      console.error(err)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchCards()
      fetchTags()
    }
  }, [token, fetchCards, fetchTags])

  useEffect(() => {
    if (token) fetchTags()
  }, [cards, token, fetchTags])

  const handleDragEnd = useCallback(
    async (id: string, x: number, y: number) => {
      updateCard(id, { positionX: x, positionY: y })
      try {
        await fetch(`/api/cards/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ positionX: x, positionY: y }),
        })
      } catch (err) {
        console.error(err)
      }
    },
    [updateCard, token]
  )

  const filteredCards = filterTag
    ? cards.filter((c) => c.tags.includes(filterTag))
    : cards

  const sortedCards = [...filteredCards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (!user) return <AuthPage />

  return (
    <div className="archive-room">
      <div className="room-header">
        <div className="header-left">
          {isMobile && (
            <button className="panel-toggle" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
              {leftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          )}
          <h1 className="room-title">虹纱·光影档案柜</h1>
        </div>
        <div className="header-right">
          <span className="header-user">{user.username}</span>
          <button className="header-logout" onClick={() => setUser(null, null)}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="room-body">
        <div className={`left-panel ${leftPanelOpen ? 'open' : 'closed'}`}>
          <div className="panel-header">
            <span className="panel-title">档案列表</span>
          </div>
          <div className="thumbnail-list">
            {sortedCards.map((card) => (
              <div
                key={card.id}
                className="thumbnail-item"
                onClick={() => {
                  const el = document.querySelector(`[data-card-id="${card.id}"]`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  setSelectedCard(card)
                }}
              >
                <div className="thumbnail-card">
                  {card.type === 'image' && card.fileUrl ? (
                    <img src={card.fileUrl} alt="" className="thumbnail-img" />
                  ) : (
                    <span className="thumbnail-placeholder">
                      {card.title.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="thumbnail-title">{card.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="desktop-area" ref={desktopRef}>
          <div className="archive-desktop">
            <div className="desktop-grid" />
            {filteredCards.map((card) => (
              <div key={card.id} data-card-id={card.id} className="card-wrapper">
                <Card
                  card={card}
                  onDragEnd={handleDragEnd}
                  onClick={setSelectedCard}
                />
              </div>
            ))}
            <button
              className="create-btn"
              onClick={() => setIsCreating(true)}
              title="创建新卡片"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className={`tag-bar ${tagBarOpen ? 'open' : 'closed'}`}>
          {isMobile && (
            <button className="panel-toggle tag-toggle" onClick={() => setTagBarOpen(!tagBarOpen)}>
              <Tag size={16} />
            </button>
          )}
          <div className="tag-bar-content">
            <button
              className={`tag-item ${!filterTag ? 'tag-item-active' : ''}`}
              onClick={() => setFilterTag(null)}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-item ${filterTag === tag ? 'tag-item-active' : ''}`}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isCreating && (
        <CreateCardModal onClose={() => setIsCreating(false)} />
      )}
      <DetailModal />
    </div>
  )
}
