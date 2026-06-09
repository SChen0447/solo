import { useState, useCallback } from 'react'
import { ChargeItem } from './App'

interface ControlPanelProps {
  onCharge: (items: ChargeItem[]) => void
  onBlast: () => void
  onTap: () => void
  isBlasting: boolean
  canTap: boolean
  temperature: number
  isTapping: boolean
}

const chargeItems = [
  { type: 'ore' as const, name: '矿石', color: '#5c3d2e', icon: '⛏️', ratio: 6 },
  { type: 'coke' as const, name: '焦炭', color: '#2a2a2a', icon: '🔥', ratio: 4 },
  { type: 'limestone' as const, name: '石灰石', color: '#e8e8e8', icon: '💎', ratio: 1 }
]

function ControlPanel({
  onCharge,
  onBlast,
  onTap,
  isBlasting,
  canTap,
  temperature,
  isTapping
}: ControlPanelProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [isPressed, setIsPressed] = useState<'blast' | 'tap' | null>(null)
  const [dropHover, setDropHover] = useState(false)

  const handleDragStart = useCallback((type: string) => {
    setDraggedItem(type)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDropHover(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDropHover(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropHover(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDropHover(false)
    
    if (draggedItem) {
      const items: ChargeItem[] = chargeItems.map(item => ({
        type: item.type,
        count: item.type === draggedItem ? 3 : Math.round(item.ratio * 3 / chargeItems.find(i => i.type === draggedItem)!.ratio)
      }))
      onCharge(items)
      setDraggedItem(null)
    }
  }, [draggedItem, onCharge])

  const handleQuickCharge = useCallback(() => {
    const items: ChargeItem[] = [
      { type: 'ore', count: 6 },
      { type: 'coke', count: 4 },
      { type: 'limestone', count: 1 }
    ]
    onCharge(items)
  }, [onCharge])

  const handleButtonPress = (button: 'blast' | 'tap') => {
    setIsPressed(button)
    setTimeout(() => setIsPressed(null), 150)
  }

  const handleBlastClick = () => {
    handleButtonPress('blast')
    onBlast()
  }

  const handleTapClick = () => {
    if (canTap) {
      handleButtonPress('tap')
      onTap()
    }
  }

  const tempColor = temperature >= 1000 ? '#ff4400' : temperature >= 500 ? '#ff8800' : '#00ff88'
  const tempPercent = Math.min(temperature / 1200, 1) * 100

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3 className="section-title">布料操作</h3>
        
        <div
          className={`drop-zone ${dropHover ? 'hover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drop-zone-icon">⬇️</div>
          <div className="drop-zone-text">
            {dropHover ? '松开放料' : '拖拽物料到此处'}
          </div>
        </div>
        
        <div className="charge-items">
          {chargeItems.map(item => (
            <div
              key={item.type}
              className={`charge-item ${draggedItem === item.type ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(item.type)}
              onDragEnd={handleDragEnd}
            >
              <div
                className="charge-icon"
                style={{ backgroundColor: item.color }}
              >
                <span className="charge-emoji">{item.icon}</span>
              </div>
              <div className="charge-info">
                <div className="charge-name">{item.name}</div>
                <div className="charge-ratio">比例 {item.ratio}</div>
              </div>
            </div>
          ))}
        </div>
        
        <button className="quick-charge-btn" onClick={handleQuickCharge}>
          一键布料 (6:4:1)
        </button>
      </div>
      
      <div className="panel-section">
        <h3 className="section-title">温度监控</h3>
        
        <div className="temperature-gauge">
          <div className="gauge-outer">
            <div className="gauge-inner">
              <div
                className="gauge-fill"
                style={{
                  height: `${tempPercent}%`,
                  background: `linear-gradient(to top, ${tempColor}, ${tempColor}88)`
                }}
              />
            </div>
          </div>
          <div className="gauge-display">
            <span className="gauge-value" style={{ color: tempColor }}>
              {Math.round(temperature)}
            </span>
            <span className="gauge-unit">°C</span>
            <div className="gauge-label">炉膛温度</div>
          </div>
        </div>
        
        <div className="temp-scale">
          <span>25°C</span>
          <span>600°C</span>
          <span>1200°C</span>
        </div>
      </div>
      
      <div className="panel-section">
        <h3 className="section-title">操作控制</h3>
        
        <button
          className={`action-btn blast-btn ${isBlasting ? 'active' : ''} ${isPressed === 'blast' ? 'pressed' : ''}`}
          onClick={handleBlastClick}
        >
          <span className="btn-icon">{isBlasting ? '⏹' : '▶'}</span>
          <span className="btn-text">{isBlasting ? '停止送风' : '启动送风'}</span>
        </button>
        
        <button
          className={`action-btn tap-btn ${canTap ? 'enabled' : 'disabled'} ${isPressed === 'tap' ? 'pressed' : ''}`}
          onClick={handleTapClick}
          disabled={!canTap}
        >
          <span className="btn-icon">⚒️</span>
          <span className="btn-text">
            {isTapping ? '出铁中...' : canTap ? '出铁' : '铁水不足 (70%)'}
          </span>
        </button>
      </div>
      
      <div className="panel-section tips-section">
        <h3 className="section-title">操作提示</h3>
        <ul className="tips-list">
          <li>拖拽物料到炉顶进行布料</li>
          <li>料面达到80%时触发警告</li>
          <li>温度超过1000°C产生铁水</li>
          <li>铁水达到70%可出铁</li>
        </ul>
      </div>
    </div>
  )
}

export default ControlPanel
