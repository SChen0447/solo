import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LoomCanvas from './LoomCanvas'
import ControlPanel from './ControlPanel'
import ColorPalette from './ColorPalette'
import { useLoomStore } from './store'
import { getPreviewDataURL } from './LoomCanvas'
import type { FillMode } from './types'

export default function App() {
  const {
    loomState,
    setSelectedColor,
    setFillMode,
    fillIntersection,
    fillWarpLine,
    fillWeftLine,
    fillDragArea,
  } = useLoomStore()

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)

  const handleSelectColor = useCallback(
    (color: string) => {
      setSelectedColor(color)
    },
    [setSelectedColor]
  )

  const handleFillModeChange = useCallback(
    (mode: FillMode) => {
      setFillMode(mode)
    },
    [setFillMode]
  )

  const handlePreview = useCallback(() => {
    requestAnimationFrame(() => {
      const dataUrl = getPreviewDataURL()
      if (dataUrl) {
        setPreviewImage(dataUrl)
      }
    })
  }, [])

  return (
    <div
      className="app-root min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #f4e8d1 0%, #e0d4c0 100%)',
      }}
    >
      <header className="py-4 px-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-wide"
            style={{
              color: '#4e342e',
              fontFamily: 'Georgia, "Times New Roman", serif',
              textShadow: '0 1px 2px rgba(78,52,46,0.15)',
            }}
          >
            🧵 虚拟提花织机
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#8d6e63', fontFamily: 'Georgia, serif' }}>
            经纬交织模拟器 · Jacquard Loom Simulator
          </p>
        </div>
        <button
          className="lg:hidden px-3 py-1.5 rounded-lg text-sm font-medium text-amber-900"
          style={{ background: 'linear-gradient(135deg, #efe5d5, #d7ccc8)' }}
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        >
          {isMobileExpanded ? '收起' : '展开'}
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 px-4 pb-4 items-start justify-center">
        <motion.div
          className="color-palette-wrapper hidden lg:block"
          style={{ width: 180 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <ColorPalette
            selectedColor={loomState.selectedColor}
            onSelectColor={handleSelectColor}
            fillMode={loomState.fillMode}
            onFillModeChange={handleFillModeChange}
          />
        </motion.div>

        <motion.div
          className="loom-canvas-wrapper flex-shrink-0 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoomCanvas
            fillMode={loomState.fillMode}
            onFillPoint={fillIntersection}
            onFillWarp={fillWarpLine}
            onFillWeft={fillWeftLine}
            onFillDrag={fillDragArea}
          />
        </motion.div>

        <motion.div
          className="control-panel-wrapper hidden lg:block"
          style={{ width: 220 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <ControlPanel onPreview={handlePreview} previewImage={previewImage} />
        </motion.div>
      </main>

      <AnimatePresence>
        {isMobileExpanded && (
          <motion.div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 overflow-x-auto"
            style={{
              background: 'linear-gradient(180deg, #efe5d5 0%, #d7ccc8 100%)',
              boxShadow: '0 -4px 16px rgba(78,52,46,0.2)',
              height: 200,
            }}
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex gap-3 h-full">
              <div className="flex-shrink-0" style={{ width: 160 }}>
                <ColorPalette
                  selectedColor={loomState.selectedColor}
                  onSelectColor={handleSelectColor}
                  fillMode={loomState.fillMode}
                  onFillModeChange={handleFillModeChange}
                />
              </div>
              <div className="flex-shrink-0" style={{ width: 200 }}>
                <ControlPanel onPreview={handlePreview} previewImage={previewImage} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
