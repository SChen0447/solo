import { useState, useEffect, useCallback } from 'react'
import PlantUploader from './components/PlantUploader'
import HybridSimulator from './components/HybridSimulator'
import CommunityRanking from './components/CommunityRanking'
import HistoryTimeline from './components/HistoryTimeline'
import type { Plant, HybridResult, HistoryItem } from './types'
import { getPlants, getRankings } from './services/api'
import './styles/App.css'

type TabType = 'workshop' | 'ranking' | 'history'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('workshop')
  const [plants, setPlants] = useState<Plant[]>([])
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [hybridResult, setHybridResult] = useState<HybridResult | null>(null)
  const [rankings, setRankings] = useState<HybridResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPlants()
    loadRankings()
  }, [])

  useEffect(() => {
    if (activeTab !== 'ranking') return
    
    const interval = setInterval(() => {
      loadRankings()
    }, 10000)

    return () => clearInterval(interval)
  }, [activeTab])

  const loadPlants = async () => {
    try {
      const data = await getPlants()
      setPlants(data)
    } catch (error) {
      console.error('Failed to load plants:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRankings = async () => {
    try {
      const data = await getRankings()
      setRankings(data)
    } catch (error) {
      console.error('Failed to load rankings:', error)
    }
  }

  const handlePlantUploaded = useCallback((plant: Plant) => {
    setPlants(prev => [plant, ...prev])
    addToHistory({
      id: `history-${Date.now()}`,
      type: 'upload',
      plantId: plant.id,
      imageUrl: plant.thumbnailUrl,
      name: plant.name,
      date: new Date().toISOString()
    })
  }, [])

  const handlePlantSelect = useCallback((plantId: string) => {
    setSelectedPlants(prev => {
      if (prev.includes(plantId)) {
        return prev.filter(id => id !== plantId)
      }
      if (prev.length >= 2) {
        return [prev[1], plantId]
      }
      return [...prev, plantId]
    })
  }, [])

  const handleHybridComplete = useCallback((result: HybridResult) => {
    setHybridResult(result)
    addToHistory({
      id: `history-${Date.now()}`,
      type: 'hybrid',
      hybridId: result.id,
      imageUrl: result.hybridImageUrl,
      name: `${result.parent1Name} × ${result.parent2Name}`,
      date: new Date().toISOString()
    })
    loadRankings()
  }, [])

  const addToHistory = (item: HistoryItem) => {
    const history = getHistory()
    history.unshift(item)
    if (history.length > 30) {
      history.pop()
    }
    localStorage.setItem('greenMirrorHistory', JSON.stringify(history))
  }

  const getHistory = (): HistoryItem[] => {
    const stored = localStorage.getItem('greenMirrorHistory')
    return stored ? JSON.parse(stored) : []
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🌿 绿镜·杂交工坊</h1>
          <p className="app-subtitle">探索植物虚拟杂交社区</p>
        </div>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'workshop' ? 'active' : ''}`}
            onClick={() => handleTabChange('workshop')}
          >
            🔬 杂交工坊
          </button>
          <button
            className={`nav-tab ${activeTab === 'ranking' ? 'active' : ''}`}
            onClick={() => handleTabChange('ranking')}
          >
            🏆 社区排行
          </button>
          <button
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            📜 历史记录
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'workshop' && (
          <div className="workshop-layout fade-in">
            <div className="left-panel">
              <PlantUploader
                plants={plants}
                selectedPlants={selectedPlants}
                onPlantUploaded={handlePlantUploaded}
                onPlantSelect={handlePlantSelect}
                isLoading={isLoading}
              />
            </div>
            <div className="right-panel">
              <HybridSimulator
                selectedPlants={selectedPlants}
                plants={plants}
                onHybridComplete={handleHybridComplete}
                hybridResult={hybridResult}
              />
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <CommunityRanking
            rankings={rankings}
            onVote={loadRankings}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTimeline />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2024 绿镜·杂交工坊 - 让创意生长</p>
      </footer>
    </div>
  )
}

export default App
