import React, { useState, useEffect, useCallback } from 'react'
import GalleryRing from './components/GalleryRing'

export interface StampCounts {
  star: number
  flame: number
}

export interface Painting {
  id: string
  title: string
  artist: string
  thumbnail: string
  dominantColor: string
  secondaryColor: string
  accentColor: string
  description: string
  stamps: StampCounts
}

export interface StampResponse {
  success: boolean
  stamp: {
    id: string
    paintingId: string
    type: 'star' | 'flame'
    timestamp: number
  }
  counts: StampCounts
}

const App: React.FC = () => {
  const [paintings, setPaintings] = useState<Painting[]>([])
  const [selectedPainting, setSelectedPainting] = useState<Painting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPaintings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/paintings')
      if (!response.ok) {
        throw new Error('Failed to fetch paintings')
      }
      const data: Painting[] = await response.json()
      setPaintings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPaintings()
  }, [fetchPaintings])

  const updateStamps = useCallback((paintingId: string, newCounts: StampCounts) => {
    setPaintings(prev =>
      prev.map(p =>
        p.id === paintingId
          ? { ...p, stamps: newCounts }
          : p
      )
    )
    if (selectedPainting?.id === paintingId) {
      setSelectedPainting(prev =>
        prev ? { ...prev, stamps: newCounts } : null
      )
    }
  }, [selectedPainting])

  const handleSelectPainting = useCallback((painting: Painting) => {
    setSelectedPainting(painting)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedPainting(null)
  }, [])

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">加载画廊中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div style={{ color: '#ff6b6b', fontSize: '16px', fontWeight: 500 }}>加载失败</div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>{error}</div>
          <button
            onClick={fetchPaintings}
            style={{
              marginTop: '16px',
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="grid-background" />
      <header className="app-header">
        <div className="app-title">环光 · 画廊</div>
        <div className="app-subtitle">Halo Gallery · 拖拽浏览 · 点击欣赏</div>
      </header>
      <div className="gallery-wrapper">
        <GalleryRing
          paintings={paintings}
          selectedPainting={selectedPainting}
          onSelectPainting={handleSelectPainting}
          onCloseDetail={handleCloseDetail}
          onUpdateStamps={updateStamps}
        />
      </div>
    </div>
  )
}

export default App
