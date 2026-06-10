import { memo, useState, useRef, useEffect, useCallback } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { theme, NOTE_COLORS } from '@/styles/global'
import type { StickyNoteData } from '@/App'

interface Props {
  data: StickyNoteData
  isEditing: boolean
  isHighlighted: boolean
  onEditStart: () => void
  onEditEnd: () => void
  onUpdate: (patch: Partial<StickyNoteData>) => void
  onDelete: () => void
  snapToGrid: (value: number) => number
}

const renderMarkdown = (text: string): string => {
  let html = text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>')

  if (html.includes('<li>')) {
    html = html.replace(/((?:<li>[^<]+<\/li><br\/?>+)+)/g, '<ul>$1</ul>')
    html = html.replace(/<\/li><br\/?>/g, '</li>')
  }

  return html
}

const formatTime = (ts: number): string => {
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const StickyNote = memo(function StickyNote({
  data,
  isEditing,
  isHighlighted,
  onEditStart,
  onEditEnd,
  onUpdate,
  onDelete,
  snapToGrid,
}: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isNewlyCreated, setIsNewlyCreated] = useState(true)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [localPos, setLocalPos] = useState({ x: data.x, y: data.y })
  const dragStartPos = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null)
  const rafId = useRef<number | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentInputRef = useRef<HTMLTextAreaElement>(null)
  const assigneeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isDragging) {
      setLocalPos({ x: data.x, y: data.y })
    }
  }, [data.x, data.y, isDragging])

  useEffect(() => {
    const timer = window.setTimeout(() => setIsNewlyCreated(false), 400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isEditing) {
      window.setTimeout(() => {
        if (!data.title && titleInputRef.current) {
          titleInputRef.current.focus()
        } else if (contentInputRef.current) {
          contentInputRef.current.focus()
          contentInputRef.current.setSelectionRange(
            contentInputRef.current.value.length,
            contentInputRef.current.value.length,
          )
        }
      }, 50)
    }
  }, [isEditing, data.title])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return

    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragStartPos.current = {
      mx: e.clientX,
      my: e.clientY,
      nx: localPos.x,
      ny: localPos.y,
    }
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsDragging(true)

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragStartPos.current || rafId.current !== null) return
      rafId.current = requestAnimationFrame(() => {
        if (!dragStartPos.current) return
        const dx = ev.clientX - dragStartPos.current.mx
        const dy = ev.clientY - dragStartPos.current.my
        setLocalPos({
          x: dragStartPos.current.nx + dx,
          y: dragStartPos.current.ny + dy,
        })
        rafId.current = null
      })
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      if (dragStartPos.current) {
        const finalX = snapToGrid(localPos.x)
        const finalY = snapToGrid(localPos.y)
        onUpdate({ x: finalX, y: finalY })
      }
      dragStartPos.current = null
      setIsDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [isEditing, localPos.x, localPos.y, onUpdate, snapToGrid])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    onEditStart()
  }, [onEditStart])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ title: e.target.value })
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ content: e.target.value })
  }

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ assignee: e.target.value })
  }

  const handleColorChange = (color: string) => {
    onUpdate({ color })
  }

  const toggleComplete = () => {
    onUpdate({ completed: !data.completed })
  }

  const handleBlur = () => {
    onEditEnd()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEditEnd()
    }
  }

  const hasContent = data.title.trim() || data.content.trim()

  return (
    <NoteCard
      style={{
        transform: `translate(${localPos.x}px, ${localPos.y}px)`,
        backgroundColor: data.color,
        transition: isDragging
          ? 'none'
          : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.4s ease, box-shadow 0.3s ease',
      }}
      dragging={isDragging}
      editing={isEditing}
      highlighted={isHighlighted}
      isNew={isNewlyCreated}
      completed={data.completed}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      dragOffsetX={dragOffset.x}
      dragOffsetY={dragOffset.y}
    >
      {isEditing && (
        <ActionBar data-no-drag>
          <IconButton title="删除" onClick={onDelete}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </IconButton>
          <IconButton title={data.completed ? '标记未完成' : '标记完成'} onClick={toggleComplete} active={data.completed}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={data.completed ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </IconButton>
          <ColorPicker data-no-drag>
            {NOTE_COLORS.map(c => (
              <ColorDot
                key={c}
                color={c}
                selected={c === data.color}
                onClick={() => handleColorChange(c)}
              />
            ))}
          </ColorPicker>
        </ActionBar>
      )}

      <ContentArea>
        {isEditing ? (
          <EditFields>
            <TitleInput
              ref={titleInputRef}
              value={data.title}
              onChange={handleTitleChange}
              onBlur={handleBlur}
              placeholder="便签标题..."
              data-no-drag
            />
            <ContentInput
              ref={contentInputRef}
              value={data.content}
              onChange={handleContentChange}
              onBlur={handleBlur}
              placeholder="输入便签内容，支持 **粗体**、- 列表、[链接](url)"
              rows={6}
              data-no-drag
            />
            <AssigneeRow data-no-drag>
              <span>负责人：</span>
              <AssigneeInput
                ref={assigneeInputRef}
                value={data.assignee}
                onChange={handleAssigneeChange}
                onBlur={handleBlur}
                placeholder="负责人"
              />
            </AssigneeRow>
          </EditFields>
        ) : (
          <DisplayFields>
            {data.completed && <CompletedBadge>已完成</CompletedBadge>}
            <NoteTitle completed={data.completed}>
              {data.title || <EmptyHint>双击编辑标题</EmptyHint>}
            </NoteTitle>
            <NoteContent
              completed={data.completed}
              dangerouslySetInnerHTML={{
                __html: hasContent ? renderMarkdown(data.content) : '<span style="opacity:0.4">双击添加内容，支持 Markdown</span>',
              }}
            />
            <MetaRow>
              <TimeLabel>{formatTime(data.createdAt)}</TimeLabel>
              <AssigneeLabel>{data.assignee || '未指派'}</AssigneeLabel>
            </MetaRow>
          </DisplayFields>
        )}
      </ContentArea>
    </NoteCard>
  )
})

export default StickyNote

interface CardProps {
  dragging: boolean
  editing: boolean
  highlighted: boolean
  isNew: boolean
  completed: boolean
  dragOffsetX: number
  dragOffsetY: number
}

const NoteCard = styled.div<CardProps>`
  position: absolute;
  width: ${theme.noteWidth}px;
  min-height: 180px;
  border-radius: ${theme.radius};
  box-shadow: ${theme.shadow};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  cursor: grab;
  user-select: none;
  will-change: transform;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 1;

  ${p => p.dragging && css`
    cursor: grabbing;
    z-index: 100;
    box-shadow: ${theme.shadowDragging};
    transform-origin: ${p.dragOffsetX}px ${p.dragOffsetY}px;
    animation: none;
  `}

  ${p => p.editing && css`
    cursor: default;
    z-index: 50;
    box-shadow: ${theme.shadowHover};
  `}

  ${p => p.highlighted && css`
    z-index: 60;
    animation: pulseHighlight 1.2s ease-in-out 2;
  `}

  ${p => p.isNew && css`
    animation: scaleIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
  `}

  &:hover {
    box-shadow: ${p => p.dragging ? theme.shadowDragging : theme.shadowHover};
  }

  a {
    color: #3182ce;
    text-decoration: underline;
  }
`

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
`

const IconButton = styled.button<{ active?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.active ? '#38a169' : '#4a5568'};
  transition: background 0.15s, color 0.15s, transform 0.1s;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    ${p => p.active ? '' : 'color: #2d3748;'}
  }

  &:active {
    transform: scale(0.92);
  }
`

const ColorPicker = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 2px 4px;
`

const ColorDot = styled.button<{ color: string; selected: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${p => p.color};
  border: ${p => p.selected ? '2px solid #4a5568' : '2px solid rgba(0,0,0,0.1)'};
  transition: transform 0.15s, border-color 0.15s;

  &:hover {
    transform: scale(1.15);
  }
`

const ContentArea = styled.div`
  flex: 1;
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const EditFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`

const TitleInput = styled.input`
  width: 100%;
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.5);
  padding: 6px 8px;
  border-radius: 5px;
  color: ${theme.text};

  &::placeholder {
    color: ${theme.textMuted};
    opacity: 0.6;
  }
`

const ContentInput = styled.textarea`
  width: 100%;
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.5);
  padding: 6px 8px;
  border-radius: 5px;
  color: ${theme.text};
  min-height: 90px;

  &::placeholder {
    color: ${theme.textMuted};
    opacity: 0.6;
  }
`

const AssigneeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${theme.textMuted};
`

const AssigneeInput = styled.input`
  flex: 1;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.5);
  padding: 4px 6px;
  border-radius: 4px;
  color: ${theme.text};

  &::placeholder {
    color: ${theme.textMuted};
    opacity: 0.5;
  }
`

const DisplayFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  position: relative;
`

const CompletedBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #38a169;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  letter-spacing: 0.3px;
`

const NoteTitle = styled.h3<{ completed: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${theme.text};
  line-height: 1.4;
  word-break: break-word;
  ${p => p.completed && 'text-decoration: line-through; opacity: 0.6;'}
`

const NoteContent = styled.div<{ completed: boolean }>`
  font-size: 13px;
  color: ${theme.text};
  line-height: 1.55;
  word-break: break-word;
  flex: 1;
  opacity: 0.9;

  ul {
    margin: 4px 0 4px 18px;
    padding: 0;
  }

  li {
    margin: 2px 0;
  }

  strong {
    font-weight: 700;
  }

  ${p => p.completed && 'text-decoration: line-through; opacity: 0.55;'}
`

const EmptyHint = styled.span`
  color: ${theme.textMuted};
  opacity: 0.45;
  font-weight: 400;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 6px;
  gap: 8px;
`

const TimeLabel = styled.span`
  font-size: 11px;
  color: ${theme.textMuted};
  opacity: 0.75;
`

const AssigneeLabel = styled.span`
  font-size: 11px;
  padding: 2px 7px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  color: ${theme.text};
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
