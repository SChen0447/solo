import { useState, useRef, useEffect } from 'react'
import { StickyNote as StickyNoteType, MAX_NOTE_CHARS } from '../types'

interface StickyNoteProps {
  note: StickyNoteType
  viewScale: number
  viewOffsetX: number
  viewOffsetY: number
  onUpdate: (noteId: string, updates: Partial<StickyNoteType>) => void
  onDelete: (noteId: string) => void
}

function StickyNote({
  note,
  viewScale,
  viewOffsetX,
  viewOffsetY,
  onUpdate,
  onDelete,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 })
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsNew(false), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    e.preventDefault()
    e.stopPropagation()

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const isEdge =
      e.clientX - rect.left < 15 ||
      e.clientX - rect.left > rect.width - 15 ||
      e.clientY - rect.top < 15 ||
      e.clientY - rect.top > rect.height - 15

    if (isEdge) {
      longPressTimerRef.current = setTimeout(() => {
        setShowDelete(true)
      }, 600)
    }

    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      noteX: note.x,
      noteY: note.y,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging && !showDelete) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
        }
      }
      const dx = (moveEvent.clientX - dragStartRef.current.x) / viewScale
      const dy = (moveEvent.clientY - dragStartRef.current.y) / viewScale
      onUpdate(note.id, {
        x: dragStartRef.current.noteX + dx,
        y: dragStartRef.current.noteY + dy,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showDelete) {
      setIsEditing(true)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value.slice(0, MAX_NOTE_CHARS)
    onUpdate(note.id, { text: newText })
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  const handleDelete = () => {
    setIsRemoving(true)
    setTimeout(() => {
      onDelete(note.id)
    }, 200)
  }

  const screenX = note.x * viewScale + viewOffsetX
  const screenY = note.y * viewScale + viewOffsetY
  const size = 200 * viewScale

  const getAnimation = () => {
    if (isRemoving) return 'none'
    if (isNew) return 'stickyPop 0.3s ease-out forwards'
    return 'none'
  }

  const getBaseTransform = () => {
    if (isNew) return ''
    if (isRemoving) return `scale(0)`
    if (isDragging) return `scale(1.05)`
    return `scale(1)`
  }

  return (
    <div
      style={{
        ...styles.container,
        left: screenX,
        top: screenY,
        width: size,
        height: size,
        transform: getBaseTransform(),
        opacity: isRemoving ? 0 : 1,
        animation: getAnimation(),
        boxShadow: isDragging
          ? '3px 6px 18px rgba(0,0,0,0.4)'
          : '3px 6px 12px rgba(0,0,0,0.3)',
        zIndex: isDragging ? 500 : 10,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {showDelete && (
        <button
          style={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={note.text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          style={styles.textarea}
          maxLength={MAX_NOTE_CHARS}
        />
      ) : (
        <div style={styles.content}>
          <span style={styles.text}>{note.text || '双击编辑...'}</span>
          {note.text.length > 0 && (
            <span style={styles.charCount}>{note.text.length}/{MAX_NOTE_CHARS}</span>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    backgroundColor: '#ffd700',
    borderRadius: '4px',
    cursor: 'grab',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
    transformOrigin: 'top left',
    userSelect: 'none',
    overflow: 'hidden',
  },
  content: {
    width: '100%',
    height: '100%',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
  },
  text: {
    fontSize: '14px',
    color: '#1a1a2e',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    flex: 1,
    overflow: 'hidden',
  },
  charCount: {
    fontSize: '10px',
    color: 'rgba(26, 26, 46, 0.5)',
    textAlign: 'right',
  },
  textarea: {
    width: '100%',
    height: '100%',
    padding: '16px',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#1a1a2e',
    lineHeight: 1.5,
    resize: 'none',
    fontFamily: 'inherit',
    animation: 'caretBlink 0.5s step-end infinite',
  },
  deleteButton: {
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '2px solid #fff',
    backgroundColor: '#ff4444',
    color: '#fff',
    fontSize: '18px',
    lineHeight: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'all 0.2s ease',
  },
}

export default StickyNote
