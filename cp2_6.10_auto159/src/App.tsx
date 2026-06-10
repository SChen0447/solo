import { useState, useCallback } from 'react'
import Cake3DView from './components/Cake3DView'
import CustomizerPanel from './components/CustomizerPanel'
import {
  CakeConfig,
  DEFAULT_CAKE_CONFIG,
  SavedOrder,
  createSavedOrder,
  saveDraft,
  loadDrafts
} from './utils/cakeConfig'
import './styles/app.css'

function App() {
  const [cakeConfig, setCakeConfig] = useState<CakeConfig>(DEFAULT_CAKE_CONFIG)
  const [drafts, setDrafts] = useState<SavedOrder[]>(() => loadDrafts().slice(0, 3))
  const [isSaving, setIsSaving] = useState(false)
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)

  const handleConfigChange = useCallback((newConfig: CakeConfig) => {
    setCakeConfig(newConfig)
  }, [])

  const handleSave = useCallback(() => {
    setIsSaving(true)
    setTimeout(() => {
      const order = createSavedOrder(cakeConfig)
      saveDraft(order)
      setDrafts(loadDrafts().slice(0, 3))
      setIsSaving(false)
    }, 600)
  }, [cakeConfig])

  const handleRestoreDraft = useCallback((draft: SavedOrder) => {
    const { id, timestamp, ...config } = draft
    setCakeConfig(config as CakeConfig)
  }, [])

  const toggleMobilePanel = useCallback(() => {
    setIsMobilePanelOpen((prev) => !prev)
  }, [])

  return (
    <div className="app-container">
      <button
        className="mobile-menu-toggle"
        onClick={toggleMobilePanel}
        aria-label="打开定制面板"
      >
        ☰ 定制面板
      </button>

      <div className={`customizer-wrapper ${isMobilePanelOpen ? 'open' : ''}`}>
        <CustomizerPanel
          config={cakeConfig}
          onChange={handleConfigChange}
          onSave={handleSave}
          drafts={drafts}
          onRestoreDraft={handleRestoreDraft}
          isSaving={isSaving}
          onCloseMobile={() => setIsMobilePanelOpen(false)}
        />
      </div>

      <div className="preview-wrapper">
        <Cake3DView config={cakeConfig} />
      </div>
    </div>
  )
}

export default App
