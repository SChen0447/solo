import React, { useState, useEffect, useCallback } from 'react'
import TrafficMap from './components/TrafficMap'
import ControlPanel from './components/ControlPanel'
import { SimulationEngine } from './utils/SimulationEngine'
import type { IntersectionState, GlobalStats, PhasePlan } from './utils/SimulationEngine'

const App: React.FC = () => {
  const [intersections, setIntersections] = useState<Map<string, IntersectionState>>(new Map())
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalVehicles: 0,
    avgWaitTime: 0,
    congestionIndex: 0,
  })
  const [selectedId, setSelectedId] = useState<string | null>('A')
  const [phasePlan, setPhasePlan] = useState<PhasePlan>('balanced')
  const [activePanelTab, setActivePanelTab] = useState<'traffic' | 'phase'>('traffic')

  const handleIntersectionClick = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handlePhasePlanChange = useCallback((plan: PhasePlan) => {
    setPhasePlan(plan)
    SimulationEngine.setPhasePlan(plan)
  }, [])

  useEffect(() => {
    SimulationEngine.init()
    SimulationEngine.setPhasePlan(phasePlan)

    const stateInterval = setInterval(() => {
      const states = SimulationEngine.getIntersectionStates()
      setIntersections(new Map(states))
    }, 100)

    const statsInterval = setInterval(() => {
      setGlobalStats(SimulationEngine.getGlobalStats())
    }, 2000)

    return () => {
      clearInterval(stateInterval)
      clearInterval(statsInterval)
      SimulationEngine.stop()
    }
  }, [phasePlan])

  const selectedIntersection = selectedId ? intersections.get(selectedId) : null

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <span className="header-icon">🚦</span>
          <h1>城市交通信号灯调度看板</h1>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">总车辆数</span>
            <span className="stat-value">{globalStats.totalVehicles}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">平均等待时间</span>
            <span className="stat-value">{globalStats.avgWaitTime.toFixed(1)}s</span>
          </div>
          <div className={`stat-item ${globalStats.congestionIndex > 70 ? 'danger-blink' : ''}`}>
            <span className="stat-label">拥堵指数</span>
            <span className="stat-value">{globalStats.congestionIndex.toFixed(0)}</span>
          </div>
        </div>
      </header>

      <div className="app-body">
        <div className="map-container">
          <TrafficMap
            intersections={intersections}
            selectedId={selectedId}
            onIntersectionClick={handleIntersectionClick}
          />
        </div>

        <ControlPanel
          intersection={selectedIntersection}
          phasePlan={phasePlan}
          onPhasePlanChange={handlePhasePlanChange}
          activeTab={activePanelTab}
          onTabChange={setActivePanelTab}
        />
      </div>
    </div>
  )
}

export default App
