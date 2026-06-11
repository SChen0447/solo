import { useSnapshot } from 'valtio'
import { useState } from 'react'
import { 
  appState, 
  undo, 
  redo, 
  setVaseType, 
  setViewMode,
  canUndo,
  canRedo,
  setWorkName,
  setCurrentView
} from '@/store/appState'
import { vaseTypes } from '@/data/flowerCatalog'
import { api } from '@/api/mockApi'
import type { PlacedFlower } from '@/types'
import html2canvas from 'html2canvas'
import './Toolbar.css'

const Toolbar = () => {
  const snap = useSnapshot(appState)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const handleSave = async () => {
    if (isSaving) return
    
    setIsSaving(true)
    setSaveMessage('')

    try {
      const sceneContainer = document.querySelector('.scene-container') as HTMLElement
      if (!sceneContainer) {
        setSaveMessage('保存失败：找不到场景')
        setIsSaving(false)
        return
      }

      const canvas = await html2canvas(sceneContainer, {
        width: 1920,
        height: 1080,
        scale: 1,
        useCORS: true,
        backgroundColor: '#faf3e0'
      })

      const thumbnail = canvas.toDataURL('image/png')

      const result = await api.saveWork(
        snap.workName,
        [...snap.flowers] as PlacedFlower[],
        snap.vaseType,
        thumbnail
      )

      if (result.success) {
        setSaveMessage(`保存成功！作品ID: ${result.id}`)
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('保存失败，请重试')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    } catch (error) {
      console.error('保存失败:', error)
      setSaveMessage('保存失败，请重试')
      setTimeout(() => setSaveMessage(''), 3000)
    }

    setIsSaving(false)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="logo">🌸 虚拟插花</div>
        <input
          type="text"
          className="work-name-input"
          value={snap.workName}
          onChange={(e) => setWorkName(e.target.value)}
          placeholder="作品名称"
        />
      </div>

      <div className="toolbar-center">
        <div className="vase-selector">
          <span className="selector-label">花瓶:</span>
          {vaseTypes.map(vase => (
            <button
              key={vase.id}
              className={`vase-btn ${snap.vaseType === vase.id ? 'active' : ''}`}
              onClick={() => setVaseType(vase.id)}
            >
              {vase.name}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-right">
        <button
          className="tool-btn"
          onClick={() => setViewMode(snap.viewMode === 'normal' ? 'top' : 'normal')}
          title={snap.viewMode === 'normal' ? '切换到俯视视角' : '切换到正常视角'}
        >
          {snap.viewMode === 'normal' ? '📐 俯视' : '👁️ 正常'}
        </button>
        
        <button
          className="tool-btn"
          onClick={undo}
          disabled={!canUndo()}
          title="撤销 (Ctrl+Z)"
        >
          ↩️ 撤销
        </button>
        
        <button
          className="tool-btn"
          onClick={redo}
          disabled={!canRedo()}
          title="重做 (Ctrl+Shift+Z)"
        >
          ↪️ 重做
        </button>

        <button
          className="tool-btn"
          onClick={() => setCurrentView(snap.currentView === 'editor' ? 'gallery' : 'editor')}
        >
          {snap.currentView === 'editor' ? '🖼️ 画廊' : '✏️ 编辑'}
        </button>

        <button
          className={`save-btn ${isSaving ? 'saving' : ''}`}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '💾 保存作品'}
        </button>
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('成功') ? 'success' : 'error'}`}>
          {saveMessage}
        </div>
      )}
    </div>
  )
}

export default Toolbar
