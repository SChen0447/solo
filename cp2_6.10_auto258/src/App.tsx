import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import InventoryPanel from './InventoryPanel'
import ColorPalette from './ColorPalette'
import SavedPalettes from './SavedPalettes'
import { mockYarns } from './mockData'
import type { Yarn, Palette } from './types'

type LayoutMode = 'desktop' | 'tablet' | 'mobile'

function getLayoutMode(): LayoutMode {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w > 1280) return 'desktop'
  if (w >= 768) return 'tablet'
  return 'mobile'
}

export default function App() {
  const [yarns] = useState<Yarn[]>(mockYarns)
  const [selectedColors, setSelectedColors] = useState<Yarn[]>([])
  const [savedPalettes, setSavedPalettes] = useState<Palette[]>([])
  const [layout, setLayout] = useState<LayoutMode>(getLayoutMode())

  useEffect(() => {
    const handleResize = () => setLayout(getLayoutMode())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSelectYarn = useCallback(
    (yarn: Yarn) => {
      setSelectedColors((prev) => {
        if (prev.find((y) => y.id === yarn.id)) return prev
        if (prev.length >= 4) return prev
        return [...prev, yarn]
      })
    },
    []
  )

  const handleRemoveColor = useCallback((id: string) => {
    setSelectedColors((prev) => prev.filter((y) => y.id !== id))
  }, [])

  const handleReorder = useCallback((colors: Yarn[]) => {
    setSelectedColors(colors)
  }, [])

  const handleAddFromDrop = useCallback((yarn: Yarn) => {
    setSelectedColors((prev) => {
      if (prev.find((y) => y.id === yarn.id)) return prev
      if (prev.length >= 4) return prev
      return [...prev, yarn]
    })
  }, [])

  const handleSave = useCallback((name: string, note: string) => {
    setSelectedColors((colors) => {
      if (colors.length === 0) return colors
      const palette: Palette = {
        id: uuidv4(),
        name,
        note,
        colors: [...colors],
        createdAt: Date.now()
      }
      setSavedPalettes((prev) => [palette, ...prev])
      return colors
    })
  }, [])

  const handleLoadPalette = useCallback((palette: Palette) => {
    setSelectedColors([...palette.colors])
  }, [])

  const handleDeletePalette = useCallback((id: string) => {
    setSavedPalettes((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const renderDesktop = () => (
    <div className="layout-desktop">
      <aside className="panel-left">
        <ColorPalette
          colors={selectedColors}
          onRemoveColor={handleRemoveColor}
          onReorder={handleReorder}
          onAddFromDrop={handleAddFromDrop}
          onSave={handleSave}
        />
      </aside>
      <main className="panel-center">
        <div className="app-header">
          <h1 className="app-title">
            <span className="logo-yarn">🧶</span>
            织色 · 毛线配色工坊
          </h1>
          <div className="app-subtitle">管理你的毛线库存，探索无限配色灵感</div>
        </div>
        <InventoryPanel yarns={yarns} onSelectYarn={handleSelectYarn} />
      </main>
      <aside className="panel-right">
        <SavedPalettes
          palettes={savedPalettes}
          onLoad={handleLoadPalette}
          onDelete={handleDeletePalette}
        />
      </aside>
    </div>
  )

  const renderTablet = () => (
    <div className="layout-tablet">
      <div className="tablet-top">
        <div className="app-header tablet-header">
          <h1 className="app-title">
            <span className="logo-yarn">🧶</span>
            织色 · 毛线配色工坊
          </h1>
        </div>
        <ColorPalette
          colors={selectedColors}
          onRemoveColor={handleRemoveColor}
          onReorder={handleReorder}
          onAddFromDrop={handleAddFromDrop}
          onSave={handleSave}
        />
      </div>
      <div className="tablet-bottom">
        <div className="tablet-col">
          <InventoryPanel yarns={yarns} onSelectYarn={handleSelectYarn} />
        </div>
        <div className="tablet-col">
          <SavedPalettes
            palettes={savedPalettes}
            onLoad={handleLoadPalette}
            onDelete={handleDeletePalette}
          />
        </div>
      </div>
    </div>
  )

  const renderMobile = () => (
    <div className="layout-mobile">
      <div className="app-header mobile-header">
        <h1 className="app-title">
          <span className="logo-yarn">🧶</span>
          织色
        </h1>
      </div>
      <section className="mobile-section">
        <ColorPalette
          colors={selectedColors}
          onRemoveColor={handleRemoveColor}
          onReorder={handleReorder}
          onAddFromDrop={handleAddFromDrop}
          onSave={handleSave}
        />
      </section>
      <section className="mobile-section">
        <InventoryPanel yarns={yarns} onSelectYarn={handleSelectYarn} />
      </section>
      <section className="mobile-section">
        <SavedPalettes
          palettes={savedPalettes}
          onLoad={handleLoadPalette}
          onDelete={handleDeletePalette}
        />
      </section>
    </div>
  )

  return (
    <div className="app-root">
      {layout === 'desktop' && renderDesktop()}
      {layout === 'tablet' && renderTablet()}
      {layout === 'mobile' && renderMobile()}

      <style>{`
        .app-root {
          width: 100%;
          height: 100vh;
          background: #f5f0e8;
          overflow: hidden;
        }

        .app-header {
          padding: 20px 24px 12px;
          text-align: center;
          background: linear-gradient(180deg, #f5f0e8 0%, #efe8dc 100%);
          border-bottom: 1px solid rgba(138, 121, 104, 0.15);
        }
        .app-title {
          font-size: 22px;
          font-weight: 700;
          color: #4a3f35;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .logo-yarn {
          font-size: 26px;
        }
        .app-subtitle {
          font-size: 13px;
          color: #8a7968;
          margin-top: 4px;
        }

        .layout-desktop {
          display: grid;
          grid-template-columns: 360px 1fr 300px;
          height: 100vh;
          gap: 0;
        }
        .panel-left, .panel-right {
          height: 100vh;
          overflow: hidden;
          border-right: 1px solid rgba(138, 121, 104, 0.12);
        }
        .panel-right {
          border-right: none;
          border-left: 1px solid rgba(138, 121, 104, 0.12);
        }
        .panel-center {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }
        .panel-center > :last-child {
          flex: 1;
          overflow: hidden;
        }

        .layout-tablet {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }
        .tablet-top {
          border-bottom: 1px solid rgba(138, 121, 104, 0.12);
        }
        .tablet-header {
          padding: 14px 20px 8px;
        }
        .tablet-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          flex: 1;
          overflow: hidden;
        }
        .tablet-col {
          height: 100%;
          overflow: hidden;
        }
        .tablet-col:first-child {
          border-right: 1px solid rgba(138, 121, 104, 0.12);
        }

        .layout-mobile {
          height: 100vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .mobile-header {
          padding: 12px 16px 8px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .mobile-header .app-title {
          font-size: 18px;
        }
        .mobile-section {
          border-bottom: 6px solid rgba(138, 121, 104, 0.08);
        }
        .mobile-section:last-child {
          border-bottom: none;
        }
        .layout-mobile > .mobile-section > div {
          max-height: none;
          height: auto;
        }

        @media (max-width: 1280px) {
          .layout-desktop { display: none; }
          .layout-mobile { display: none; }
        }
        @media (min-width: 768px) and (max-width: 1280px) {
          .layout-mobile { display: none; }
        }
        @media (max-width: 767px) {
          .layout-desktop { display: none; }
          .layout-tablet { display: none; }
        }
      `}</style>
    </div>
  )
}
