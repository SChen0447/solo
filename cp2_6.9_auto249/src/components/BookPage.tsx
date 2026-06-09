import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Book, Note } from '../types'

interface BookPageProps {
  book: Book
  notes: Note[]
  onBack: () => void
  onNotesChange: (notes: Note[]) => void
  bookId: string
}

type SortMode = 'time' | 'likes'

function BookPage({ book, notes, onBack, onNotesChange, bookId }: BookPageProps) {
  const [newNoteContent, setNewNoteContent] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [bouncingLikes, setBouncingLikes] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const draggingRef = useRef<{
    noteId: string
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
  } | null>(null)

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortMode === 'time') {
      return b.createdAt - a.createdAt
    }
    return b.likes - a.likes
  })

  const handleSubmitNote = async () => {
    const content = newNoteContent.trim()
    if (!content || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/books/${bookId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        const newNote = await res.json()
        onNotesChange([...notes, newNote])
        setNewNoteContent('')
      }
    } catch (err) {
      console.error('Failed to create note:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return

    const newLikes = note.likes + 1
    onNotesChange(notes.map(n => n.id === noteId ? { ...n, likes: newLikes } : n))

    setBouncingLikes(prev => new Set(prev).add(noteId))
    setTimeout(() => {
      setBouncingLikes(prev => {
        const next = new Set(prev)
        next.delete(noteId)
        return next
      })
    }, 300)

    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes: newLikes })
      })
    } catch (err) {
      console.error('Failed to update likes:', err)
    }
  }

  const handleDragStart = useCallback((e: React.MouseEvent, note: Note) => {
    e.preventDefault()
    draggingRef.current = {
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: note.offsetX,
      startOffsetY: note.offsetY
    }
    document.body.style.cursor = 'grabbing'
  }, [])

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return

    const { noteId, startX, startY, startOffsetX, startOffsetY } = draggingRef.current
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    const newOffsetX = Math.max(-15, Math.min(15, startOffsetX + deltaX))
    const newOffsetY = Math.max(-15, Math.min(15, startOffsetY + deltaY))

    onNotesChange(notes.map(n =>
      n.id === noteId ? { ...n, offsetX: newOffsetX, offsetY: newOffsetY } : n
    ))
  }, [notes, onNotesChange])

  const handleDragEnd = useCallback(async () => {
    if (!draggingRef.current) return

    const note = notes.find(n => n.id === draggingRef.current!.noteId)
    draggingRef.current = null
    document.body.style.cursor = ''

    if (note) {
      try {
        await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offsetX: note.offsetX, offsetY: note.offsetY })
        })
      } catch (err) {
        console.error('Failed to update position:', err)
      }
    }
  }, [notes])

  useEffect(() => {
    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [handleDragMove, handleDragEnd])

  const formatTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true, locale: zhCN })
    } catch {
      return '刚刚'
    }
  }

  return (
    <div className="bookpage-container">
      <button className="back-button" onClick={onBack}>
        ← 返回书架
      </button>

      <div className="book-info">
        <img
          src={book.coverUrl}
          alt={book.title}
          className="book-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/220x330/${book.color.slice(1)}/ffffff?text=${encodeURIComponent(book.title)}`
          }}
        />
        <div className="book-meta">
          <h2 className="book-title">{book.title}</h2>
          <p className="book-author">{book.author}</p>
          <p className="book-description">{book.description}</p>
        </div>
      </div>

      <div className="guestbook-section">
        <div className="guestbook-header">
          <h3 className="guestbook-title">📖 留言簿</h3>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortMode === 'time' ? 'active' : ''}`}
              onClick={() => setSortMode('time')}
            >
              按时间
            </button>
            <button
              className={`sort-btn ${sortMode === 'likes' ? 'active' : ''}`}
              onClick={() => setSortMode('likes')}
            >
              按热度
            </button>
          </div>
        </div>

        <div className="notes-canvas">
          {sortedNotes.length > 0 ? (
            sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`note-card ${draggingRef.current?.noteId === note.id ? 'dragging' : ''}`}
                style={{
                  transform: `rotate(${note.rotation}deg) translate(${note.offsetX}px, ${note.offsetY}px)`
                }}
                onMouseDown={(e) => handleDragStart(e, note)}
              >
                <p className="note-content">{note.content}</p>
                <div className="note-actions">
                  <button
                    className={`like-btn ${bouncingLikes.has(note.id) ? 'bouncing' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(note.id)
                    }}
                  >
                    ❤️ {note.likes}
                  </button>
                  <button
                    className="menu-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedNote(note)
                    }}
                  >
                    ⋯
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">暂无笔记，来写下第一条吧~</div>
          )}
        </div>

        <div className="note-form">
          <div className="note-form-wrapper">
            <textarea
              className="note-textarea"
              placeholder="写下你的阅读感想（最多200字）..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value.slice(0, 200))}
              maxLength={200}
            />
            <span className="char-count">{newNoteContent.length}/200</span>
            <button
              className="note-submit"
              onClick={handleSubmitNote}
              disabled={!newNoteContent.trim() || submitting}
            >
              留下笔记
            </button>
          </div>
        </div>
      </div>

      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedNote(null)}>
              ×
            </button>
            <p className="modal-note-content">{selectedNote.content}</p>
            <div className="modal-note-meta">
              <span>❤️ {selectedNote.likes} 赞</span>
              <span>{formatTime(selectedNote.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookPage
