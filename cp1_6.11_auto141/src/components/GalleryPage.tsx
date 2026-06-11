import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { api } from '@/api/mockApi'
import { GalleryWork } from '@/types'
import { loadWork, appState, setCurrentView } from '@/store/appState'
import { getFlowerById } from '@/data/flowerCatalog'
import './GalleryPage.css'

const GalleryPage = () => {
  const snap = useSnapshot(appState)
  const [works, setWorks] = useState<GalleryWork[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWork, setSelectedWork] = useState<GalleryWork | null>(null)

  useEffect(() => {
    loadGallery()
  }, [])

  const loadGallery = async () => {
    setLoading(true)
    try {
      const data = await api.getGalleryWorks()
      setWorks(data)
    } catch (error) {
      console.error('加载画廊失败:', error)
    }
    setLoading(false)
  }

  const handleWorkClick = (work: GalleryWork) => {
    setSelectedWork(work)
  }

  const handleLoadWork = (work: GalleryWork) => {
    loadWork(work.flowers, work.vaseType, work.name + '（副本）')
    setSelectedWork(null)
  }

  const handleEditCopy = (work: GalleryWork) => {
    loadWork(work.flowers, work.vaseType, work.name + '（二次创作）')
    setSelectedWork(null)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFlowerTags = (work: GalleryWork) => {
    const flowerTypes = [...new Set(work.flowers.map(f => f.flowerType))]
    return flowerTypes.slice(0, 4).map(type => getFlowerById(type)).filter(Boolean)
  }

  if (snap.currentView !== 'gallery') {
    return null
  }

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <button className="back-btn" onClick={() => setCurrentView('editor')}>
          ← 返回编辑器
        </button>
        <h1 className="gallery-title">🌺 作品画廊</h1>
        <button className="refresh-btn" onClick={loadGallery} disabled={loading}>
          🔄 刷新
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {works.map(work => (
            <div
              key={work.id}
              className="gallery-card"
              onClick={() => handleWorkClick(work)}
            >
              <div className="work-thumbnail">
                <div className="thumbnail-placeholder">
                  <div className="vase-preview">
                    {work.flowers.map((flower, idx) => {
                      const flowerData = getFlowerById(flower.flowerType)
                      return (
                        <div
                          key={idx}
                          className="mini-flower"
                          style={{
                            left: `${50 + flower.position.x * 30}%`,
                            bottom: `${30 + (flower.stemHeight / 50) * 50}%`,
                            backgroundColor: flowerData?.color || '#ccc'
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
              
              <div className="work-info">
                <h3 className="work-name">{work.name}</h3>
                <p className="work-author">作者: {work.author}</p>
                <p className="work-date">{formatDate(work.timestamp)}</p>
                <div className="flower-tags">
                  {getFlowerTags(work).map(flower => (
                    <span
                      key={flower!.id}
                      className="flower-tag"
                      style={{ backgroundColor: flower!.color + '30', color: flower!.color }}
                    >
                      {flower!.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWork && (
        <div className="work-modal-overlay" onClick={() => setSelectedWork(null)}>
          <div className="work-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedWork(null)}>×</button>
            
            <div className="modal-preview">
              <div className="modal-preview-inner">
                <div className="vase-preview large">
                  {selectedWork.flowers.map((flower, idx) => {
                    const flowerData = getFlowerById(flower.flowerType)
                    return (
                      <div
                        key={idx}
                        className="mini-flower"
                        style={{
                          left: `${50 + flower.position.x * 30}%`,
                          bottom: `${30 + (flower.stemHeight / 50) * 50}%`,
                          backgroundColor: flowerData?.color || '#ccc',
                          width: '16px',
                          height: '16px'
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="modal-content">
              <h2 className="modal-title">{selectedWork.name}</h2>
              <p className="modal-author">作者: {selectedWork.author}</p>
              <p className="modal-date">{formatDate(selectedWork.timestamp)}</p>
              
              <div className="modal-section">
                <h4>花材清单</h4>
                <div className="flower-list">
                  {selectedWork.flowers.map((flower, idx) => {
                    const flowerData = getFlowerById(flower.flowerType)
                    return (
                      <div key={idx} className="flower-list-item">
                        <div 
                          className="flower-dot"
                          style={{ backgroundColor: flowerData?.color || '#ccc' }}
                        />
                        <span>{flowerData?.name || flower.flowerType}</span>
                        <span className="flower-detail">{flower.stemHeight}cm</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="action-btn secondary"
                  onClick={() => handleLoadWork(selectedWork)}
                >
                  加载作品
                </button>
                <button 
                  className="action-btn primary"
                  onClick={() => handleEditCopy(selectedWork)}
                >
                  二次创作
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GalleryPage
