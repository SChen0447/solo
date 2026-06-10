import { useState, useEffect, useCallback } from 'react'
import SignWall from './components/SignWall'
import LuckyDraw from './components/LuckyDraw'
import HistoryPanel from './components/HistoryPanel'
import { loadSigns, saveSigns, loadDraws, saveDraws } from './utils/storage'
import type { SignItem, DrawRecord } from './types'

const App = () => {
  const [signs, setSigns] = useState<SignItem[]>([])
  const [draws, setDraws] = useState<DrawRecord[]>([])
  const [showDraw, setShowDraw] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setSigns(loadSigns())
    setDraws(loadDraws())
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    saveSigns(signs)
  }, [signs])

  useEffect(() => {
    saveDraws(draws)
  }, [draws])

  const handleAddSign = useCallback((sign: SignItem) => {
    setSigns(prev => {
      const next = [...prev, sign]
      return next.length > 60 ? next.slice(-60) : next
    })
  }, [])

  const handleDrawComplete = useCallback((record: DrawRecord) => {
    setDraws(prev => [record, ...prev])
  }, [])

  const handleClearSigns = useCallback(() => {
    if (confirm('确定要清空所有签到记录吗？')) {
      setSigns([])
    }
  }, [])

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <SignWall
        signs={signs}
        onAddSign={handleAddSign}
        isMobile={isMobile}
      />

      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 50,
        display: 'flex',
        gap: 12
      }}>
        <button
          onClick={handleClearSigns}
          style={{
            padding: '10px 20px',
            borderRadius: 20,
            border: '1px solid #555',
            background: 'rgba(40, 40, 60, 0.9)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            transition: 'all 0.2s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.background = 'rgba(60, 60, 80, 0.9)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.background = 'rgba(40, 40, 60, 0.9)'
          }}
        >
          清空记录
        </button>
        <button
          onClick={() => setShowDraw(true)}
          disabled={signs.length === 0}
          style={{
            padding: '12px 28px',
            borderRadius: 20,
            border: 'none',
            background: signs.length === 0 ? '#888' : '#ff6b6b',
            color: '#fff',
            cursor: signs.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseOver={e => {
            if (signs.length > 0) {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.filter = 'brightness(1.15)'
            }
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.filter = 'brightness(1)'
          }}
        >
          🎁 开始抽奖
        </button>
      </div>

      <HistoryPanel
        draws={draws}
        expanded={showHistory}
        onToggle={() => setShowHistory(v => !v)}
        isMobile={isMobile}
      />

      {showDraw && (
        <LuckyDraw
          signs={signs}
          onClose={() => setShowDraw(false)}
          onComplete={handleDrawComplete}
        />
      )}
    </div>
  )
}

export default App
