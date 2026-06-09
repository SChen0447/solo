import React, { useCallback } from 'react'
import type { IntersectionState, PhasePlan, VehicleType } from '../utils/SimulationEngine'
import { SimulationEngine } from '../utils/SimulationEngine'

interface ControlPanelProps {
  intersection: IntersectionState | undefined
  phasePlan: PhasePlan
  onPhasePlanChange: (plan: PhasePlan) => void
  activeTab: 'traffic' | 'phase'
  onTabChange: (tab: 'traffic' | 'phase') => void
}

const VEHICLE_LABELS: Record<VehicleType, { label: string; icon: string }> = {
  car: { label: '轿车', icon: '🚗' },
  bus: { label: '公交', icon: '🚌' },
  truck: { label: '货车', icon: '🚚' },
  motorcycle: { label: '摩托', icon: '🏍️' },
  bicycle: { label: '自行车', icon: '🚲' },
}

const PHASE_PLANS: { id: PhasePlan; name: string; desc: string }[] = [
  { id: 'balanced', name: '均衡模式', desc: '各方向配时均匀，适用于常规路况' },
  { id: 'trunkPriority', name: '主干优先', desc: '主干道绿灯延长，支路短时通行' },
  { id: 'tidalLane', name: '潮汐车道', desc: '错峰交替放行，缓解双向拥堵' },
]

const SIGNAL_COLORS: Record<IntersectionState['signal'], { label: string; color: string }> = {
  red: { label: '红灯', color: 'red' },
  yellow: { label: '黄灯', color: 'yellow' },
  green: { label: '绿灯', color: 'green' },
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  intersection,
  phasePlan,
  onPhasePlanChange,
  activeTab,
  onTabChange,
}) => {
  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const circle = document.createElement('span')
    const diameter = Math.max(button.clientWidth, button.clientHeight)
    const radius = diameter / 2

    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`
    circle.classList.add('ripple')

    const existing = button.getElementsByClassName('ripple')[0]
    if (existing) {
      existing.remove()
    }

    button.appendChild(circle)

    setTimeout(() => {
      circle.remove()
    }, 600)
  }, [])

  const handleTabClick = (tab: 'traffic' | 'phase', e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e)
    onTabChange(tab)
  }

  const handlePhaseClick = (plan: PhasePlan, e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e)
    onPhasePlanChange(plan)
  }

  const renderTrafficTab = () => {
    if (!intersection) {
      return (
        <div className="no-selection">
          请点击地图上的路口图标查看实时车流量数据
        </div>
      )
    }

    const signal = SIGNAL_COLORS[intersection.signal]
    const vehicleTypes: VehicleType[] = ['car', 'bus', 'truck', 'motorcycle', 'bicycle']
    const maxValue = Math.max(...Object.values(intersection.trafficData), 1)

    return (
      <>
        <div className="panel-section">
          <div className="panel-section-title">路口信息</div>
          <div className="intersection-info">
            <div className="info-header">
              <span className="info-name">{intersection.name}</span>
              <div className="signal-display">
                <span className={`signal-dot ${signal.color}`}></span>
                <span className="signal-text">{signal.label}</span>
              </div>
            </div>
            <div className="phase-info">
              当前方案：{SimulationEngine.getPhasePlanName(phasePlan)}
            </div>
            <div className="phase-info">
              等待时长：{intersection.waitTime.toFixed(1)}s
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-title">实时车流量</div>
          <div className="traffic-chart">
            <div className="chart-title">各类车辆数量统计（每3秒刷新）</div>
            <div className="bar-chart">
              {vehicleTypes.map((type) => {
                const value = intersection.trafficData[type]
                const percent = (value / maxValue) * 100
                const info = VEHICLE_LABELS[type]

                return (
                  <div key={type} className="bar-item">
                    <span className="bar-label">{info.label}</span>
                    <span className="bar-icon">{info.icon}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${Math.max(percent, 3)}%` }}
                      >
                        <span className="bar-value">{value}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderPhaseTab = () => {
    return (
      <div className="panel-section">
        <div className="panel-section-title">相位方案</div>
        <div className="phase-buttons">
          {PHASE_PLANS.map((plan) => (
            <button
              key={plan.id}
              className={`phase-btn ${phasePlan === plan.id ? 'active' : ''}`}
              onClick={(e) => handlePhaseClick(plan.id, e)}
            >
              <div className="phase-btn-content">
                <span className="phase-name">{plan.name}</span>
                <span className="phase-desc">{plan.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="control-panel">
      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'traffic' ? 'active' : ''}`}
          onClick={(e) => handleTabClick('traffic', e)}
        >
          📊 车流量监控
        </button>
        <button
          className={`panel-tab ${activeTab === 'phase' ? 'active' : ''}`}
          onClick={(e) => handleTabClick('phase', e)}
        >
          ⚙️ 相位方案
        </button>
      </div>
      <div className="panel-content">
        {activeTab === 'traffic' ? renderTrafficTab() : renderPhaseTab()}
      </div>
    </div>
  )
}

export default ControlPanel
