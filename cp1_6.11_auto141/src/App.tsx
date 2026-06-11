import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { appState, initHistory, undo, redo } from '@/store/appState'
import Toolbar from '@/components/Toolbar'
import FlowerPanel from '@/components/FlowerPanel'
import PropertyPanel from '@/components/PropertyPanel'
import Scene from '@/components/Scene'
import GalleryPage from '@/components/GalleryPage'
import './App.css'

const App = () => {
  const snap = useSnapshot(appState)
  const [isMobile, setIsMobile] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    initHistory()
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-container">
      <Toolbar />
      
      {snap.currentView === 'editor' ? (
        <div className="editor-layout">
          {!isMobile && (
            <div className="left-panel">
              <FlowerPanel />
            </div>
          )}

          <div className="scene-container">
            <Scene />
            <PropertyPanel />
          </div>

          {isMobile && (
            <>
              <div 
                className={`drawer-overlay ${drawerOpen ? 'open' : ''}`}
                onClick={() => setDrawerOpen(false)}
              />
              <div className={`bottom-drawer ${drawerOpen ? 'open' : ''}`}>
                <div className="drawer-handle" onClick={() => setDrawerOpen(!drawerOpen)}>
                  <div className="handle-bar" />
                </div>
                <div className="drawer-content">
                  <FlowerPanel />
                </div>
              </div>
              
              {!drawerOpen && (
                <button 
                  className="mobile-flower-btn"
                  onClick={() => setDrawerOpen(true)}
                >
                  🌸 选择花材
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <GalleryPage />
      )}
    </div>
  )
}

export default App
