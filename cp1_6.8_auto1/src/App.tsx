import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { HistoryRecord, ThemeId } from '@/types'
import { Editor } from './components/Editor'
import type { EditorHandle } from './components/Editor'
import { HistoryPanel } from './components/HistoryPanel'

const THEME_NAMES: Record<ThemeId, string> = {
  retro: '复古红蓝',
  cyber: '赛博紫绿',
  classic: '经典黑白'
}

const HISTORY_STORAGE_KEY = 'pixel-avatar-history'
const MAX_HISTORY_RECORDS = 5

const BrushIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.06 11.9l8.07-8.06 2.83 2.83-8.07 8.07-3.54.7-2.12-2.12.83-3.54z"/>
    <path d="M7 17L3 21l4-4"/>
  </svg>
)

const EraserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H9L3 14a2 2 0 010-3l9-9a2 2 0 013 0l6 6a2 2 0 010 3l-7 7"/>
    <path d="M18 13.3L7.7 3"/>
  </svg>
)

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/>
    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-9 9"/>
  </svg>
)

const RedoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/>
    <path d="M3 17a9 9 0 019-9 9 9 0 019 9"/>
  </svg>
)

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const RotateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
)

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5"/>
    <circle cx="17.5" cy="10.5" r=".5"/>
    <circle cx="8.5" cy="7.5" r=".5"/>
    <circle cx="6.5" cy="12.5" r=".5"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.5-.7-.5-1.2 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.4-4.5-8-10-8z"/>
  </svg>
)

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeId>('retro')
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null)
  const [toolbarState, setToolbarState] = useState({
    tool: 'brush' as 'brush' | 'eraser',
    canUndo: false,
    canRedo: false,
    hasImage: false
  })

  const editorRef = useRef<EditorHandle | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (stored) {
        const records = JSON.parse(stored)
        setHistoryRecords(records)
      }
    } catch (e) {
      console.error('Failed to load history from localStorage:', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyRecords))
    } catch (e) {
      console.error('Failed to save history to localStorage:', e)
    }
  }, [historyRecords])

  useEffect(() => {
    const interval = setInterval(() => {
      if (editorRef.current) {
        const tool = editorRef.current.getTool()
        const canUndo = editorRef.current.canUndo()
        const canRedo = editorRef.current.canRedo()
        const hasImage = editorRef.current.hasImage()

        setToolbarState(prev => {
          if (prev.tool === tool && prev.canUndo === canUndo && prev.canRedo === canRedo && prev.hasImage === hasImage) {
            return prev
          }
          return { tool, canUndo, canRedo, hasImage }
        })
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const handleSaveToHistory = useCallback((record: HistoryRecord) => {
    setHistoryRecords(prev => {
      const newRecords = [record, ...prev]
      if (newRecords.length > MAX_HISTORY_RECORDS) {
        return newRecords.slice(0, MAX_HISTORY_RECORDS)
      }
      return newRecords
    })
  }, [])

  const handleSelectHistory = useCallback((record: HistoryRecord) => {
    setSelectedRecord(record)
  }, [])

  const handleThemeChange = useCallback((newTheme: ThemeId) => {
    setTheme(newTheme)
  }, [])

  const handleToolChange = useCallback((tool: 'brush' | 'eraser') => {
    editorRef.current?.setTool(tool)
  }, [])

  const handleUndo = useCallback(() => {
    editorRef.current?.undo()
  }, [])

  const handleRedo = useCallback(() => {
    editorRef.current?.redo()
  }, [])

  const handleUpload = useCallback(() => {
    editorRef.current?.triggerUpload()
  }, [])

  const handleExport = useCallback(() => {
    editorRef.current?.exportPNG()
  }, [])

  const handleRotate = useCallback(() => {
    editorRef.current?.rotate()
  }, [])

  const handleSave = useCallback(() => {
    editorRef.current?.saveToHistory()
  }, [])

  const setEditorRef = useCallback((ref: EditorHandle | null) => {
    editorRef.current = ref
  }, [])

  return (
    <div className="app-container" data-theme={theme}>
      <div className="toolbar">
        <button
          className={`toolbar-button ${toolbarState.tool === 'brush' ? 'active' : ''}`}
          onClick={() => handleToolChange('brush')}
          title="画笔工具"
        >
          <BrushIcon />
          <span>画笔</span>
        </button>
        <button
          className={`toolbar-button ${toolbarState.tool === 'eraser' ? 'active' : ''}`}
          onClick={() => handleToolChange('eraser')}
          title="橡皮擦工具"
        >
          <EraserIcon />
          <span>橡皮擦</span>
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-button"
          onClick={handleUndo}
          disabled={!toolbarState.canUndo}
          title="撤销"
        >
          <UndoIcon />
          <span>撤销</span>
        </button>
        <button
          className="toolbar-button"
          onClick={handleRedo}
          disabled={!toolbarState.canRedo}
          title="重做"
        >
          <RedoIcon />
          <span>重做</span>
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-button"
          onClick={handleUpload}
          title="上传图片"
        >
          <UploadIcon />
          <span>上传</span>
        </button>
        <button
          className="toolbar-button"
          onClick={handleExport}
          disabled={!toolbarState.hasImage}
          title="导出PNG"
        >
          <DownloadIcon />
          <span>导出</span>
        </button>
        <button
          className="toolbar-button"
          onClick={handleRotate}
          title="旋转90°"
        >
          <RotateIcon />
          <span>旋转</span>
        </button>
        <button
          className="toolbar-button"
          onClick={handleSave}
          disabled={!toolbarState.hasImage}
          title="保存到历史"
        >
          <SaveIcon />
          <span>保存</span>
        </button>

        <div className="toolbar-divider" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px' }}>
          <div style={{ width: '20px', height: '20px', color: 'var(--text-secondary)' }}>
            <PaletteIcon />
          </div>
          <div className="theme-selector" style={{ flexDirection: 'column', gap: '6px' }}>
            {(Object.keys(THEME_NAMES) as ThemeId[]).map(t => (
              <button
                key={t}
                className={`theme-option theme-${t} ${theme === t ? 'active' : ''}`}
                onClick={() => handleThemeChange(t)}
                title={THEME_NAMES[t]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="main-content">
        <Editor
          ref={setEditorRef}
          theme={theme}
          onSaveToHistory={handleSaveToHistory}
          savedGrid={selectedRecord?.grid || null}
          savedPalette={selectedRecord?.palette || null}
        />
      </div>

      <HistoryPanel
        records={historyRecords}
        onSelect={handleSelectHistory}
      />
    </div>
  )
}

export default App
