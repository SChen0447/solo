import { useState, useCallback, useRef, useEffect } from 'react'
import styled from '@emotion/styled'
import { theme } from '@/styles/global'
import StickyNote from '@/components/StickyNote'
import Sidebar from '@/components/Sidebar'

export interface StickyNoteData {
  id: string
  title: string
  content: string
  color: string
  x: number
  y: number
  createdAt: number
  assignee: string
  completed: boolean
}

const SAMPLE_NOTES: StickyNoteData[] = [
  {
    id: 'n1',
    title: '设计评审会议',
    content: '**今日下午3点**\n\n- 审核新功能原型\n- 讨论UI改进方案\n- 确认迭代时间表',
    color: '#FFE0B2',
    x: 80,
    y: 80,
    createdAt: Date.now() - 3600000,
    assignee: '张三',
    completed: false,
  },
  {
    id: 'n2',
    title: 'API 接口开发',
    content: '完成用户模块接口:\n1. 登录/注册\n2. 信息更新\n3. [接口文档](https://example.com/api)',
    color: '#D1C4E9',
    x: 380,
    y: 120,
    createdAt: Date.now() - 7200000,
    assignee: '李四',
    completed: true,
  },
  {
    id: 'n3',
    title: 'Bug 修复',
    content: '**紧急**：修复登录页面在Safari下的样式问题',
    color: '#FFCCBC',
    x: 680,
    y: 80,
    createdAt: Date.now() - 1800000,
    assignee: '王五',
    completed: false,
  },
  {
    id: 'n4',
    title: '每周站会',
    content: '- 昨天完成的工作\n- 今天计划\n- 遇到的问题',
    color: '#B2DFDB',
    x: 200,
    y: 340,
    createdAt: Date.now() - 86400000,
    assignee: '全体',
    completed: false,
  },
  {
    id: 'n5',
    title: '技术方案评审',
    content: '讨论数据缓存方案的**技术选型**',
    color: '#F8BBD0',
    x: 520,
    y: 360,
    createdAt: Date.now() - 5400000,
    assignee: '技术组',
    completed: false,
  },
]

const App = () => {
  const [notes, setNotes] = useState<StickyNoteData[]>(SAMPLE_NOTES)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const snapToGrid = useCallback((value: number): number => {
    const size = theme.gridSize
    return Math.round(value / size) * size
  }, [])

  const updateNote = useCallback((id: string, patch: Partial<StickyNoteData>) => {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...patch } : n)))
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    if (editingId === id) setEditingId(null)
    if (highlightId === id) setHighlightId(null)
  }, [editingId, highlightId])

  const addNote = useCallback(() => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const centerX = snapToGrid(rect.width / 2 - theme.noteWidth / 2 - viewOffset.x)
    const centerY = snapToGrid(rect.height / 2 - 100 - viewOffset.y)

    const colors = ['#FFE0B2', '#FFCCBC', '#F8BBD0', '#D1C4E9', '#C5CAE9', '#B2DFDB']
    const newNote: StickyNoteData = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: '',
      content: '',
      color: colors[Math.floor(Math.random() * colors.length)],
      x: centerX,
      y: centerY,
      createdAt: Date.now(),
      assignee: '我',
      completed: false,
    }
    setNotes(prev => [newNote, ...prev])
    setEditingId(newNote.id)
  }, [snapToGrid, viewOffset])

  const focusNote = useCallback((id: string) => {
    const note = notes.find(n => n.id === id)
    if (!note || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const targetX = rect.width / 2 - theme.noteWidth / 2 - note.x
    const targetY = rect.height / 2 - 120 - note.y

    setViewOffset({ x: targetX, y: targetY })
    setHighlightId(id)
    setEditingId(null)

    window.setTimeout(() => setHighlightId(null), 1800)
  }, [notes])

  return (
    <Container>
      <Sidebar
        notes={notes}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
        onSelect={focusNote}
        highlightId={highlightId}
      />

      <CanvasArea sidebarOpen={sidebarOpen}>
        <TopBar>
          <HamburgerBtn onClick={() => setSidebarOpen(v => !v)}>
            <span />
            <span />
            <span />
          </HamburgerBtn>
          <PageTitle>团队即时贴墙</PageTitle>
          <AddButton onClick={addNote}>
            <PlusIcon>+</PlusIcon>
            新增便签
          </AddButton>
        </TopBar>

        <Canvas ref={canvasRef}>
          <NotesLayer
            style={{
              transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`,
              transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {notes.map(note => (
              <StickyNote
                key={note.id}
                data={note}
                isEditing={editingId === note.id}
                isHighlighted={highlightId === note.id}
                onEditStart={() => setEditingId(note.id)}
                onEditEnd={() => setEditingId(null)}
                onUpdate={patch => updateNote(note.id, patch)}
                onDelete={() => deleteNote(note.id)}
                snapToGrid={snapToGrid}
              />
            ))}
          </NotesLayer>
        </Canvas>
      </CanvasArea>
    </Container>
  )
}

export default App

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  background: ${theme.bg};
`

const CanvasArea = styled.div<{ sidebarOpen: boolean }>`
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
`

const TopBar = styled.div`
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid ${theme.border};
  flex-shrink: 0;
`

const HamburgerBtn = styled.button`
  display: none;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: background 0.2s;

  &:hover {
    background: ${theme.border};
  }

  span {
    width: 18px;
    height: 2px;
    background: ${theme.text};
    border-radius: 1px;
  }

  @media (max-width: 1024px) {
    display: flex;
  }
`

const PageTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: ${theme.text};
  flex: 1;
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.35);
  transition: transform 0.15s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.45);
  }

  &:active {
    transform: scale(0.97);
  }
`

const PlusIcon = styled.span`
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
`

const Canvas = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  background-image:
    radial-gradient(circle, #d1d5db 1px, transparent 1px);
  background-size: ${theme.gridSize}px ${theme.gridSize}px;
  background-position: 0 0;
`

const NotesLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
`
