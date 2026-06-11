import { useSnapshot } from 'valtio'
import { store, resetStore } from './store'
import EngravingPanel from './components/EngravingPanel'
import InkingPanel from './components/InkingPanel'
import PrintingPanel from './components/PrintingPanel'
import PrintAndAging from './components/PrintAndAging'
import { useEffect, useState } from 'react'

export const StrokeSettingsContext: { strokeWidth: number; color: string } = {
  strokeWidth: 3,
  color: '#1a1a1a'
}

const STEPS = [
  { name: '绘稿', label: '雕版绘图' },
  { name: '研墨', label: '研墨上墨' },
  { name: '拓印', label: '拓印转印' },
  { name: '装帧', label: '装帧老化' },
]

export default function App() {
  const snap = useSnapshot(store)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth
      if (w >= 1024) setViewMode('desktop')
      else if (w >= 768) setViewMode('tablet')
      else setViewMode('mobile')
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const canAdvance = (): boolean => {
    switch (snap.step) {
      case 0: return snap.drawingPaths.length > 0
      case 1: return snap.inkConcentration >= 40 && snap.inkingCoverage !== null
      case 2: return snap.printImage !== null
      default: return true
    }
  }

  const nextStep = () => {
    if (snap.step < 3 && canAdvance()) {
      store.step = snap.step + 1
    }
  }

  const prevStep = () => {
    if (snap.step > 0) {
      store.step = snap.step - 1
    }
  }

  const isReadOnly = snap.artworkId !== null

  const renderStepContent = () => {
    switch (snap.step) {
      case 0: return <EngravingPanel />
      case 1: return <InkingPanel />
      case 2: return <PrintingPanel />
      case 3: return <PrintAndAging />
      default: return null
    }
  }

  return (
    <div className="app-container">
      <div className="cloud-bar"></div>

      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <div key={s.name} className="step-item">
            <div
              className={`step-dot ${snap.step === i ? 'active' : ''} ${snap.step > i ? 'done' : ''}`}
            >
              {i + 1}
            </div>
            <div className="step-label letterpress-text">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="main-layout">
        <div className="left-panel panel">
          <h2 className="panel-title letterpress-text">操作指南</h2>
          <div className="tool-section">
            <p className="hint-text letterpress-text">
              {snap.step === 0 && '使用鼠标在梨木雕版上绘制反写文字或图形，调整笔触粗细后点击"刻版"按钮生成刻痕效果。'}
              {snap.step === 1 && '按住砚台旋转模拟研墨动作，浓度达到要求后用墨刷在雕版上涂刷上墨。'}
              {snap.step === 2 && '将宣纸拖拽至雕版上方，点击"按压拓印"按钮完成墨迹转印。'}
              {snap.step === 3 && '选择装帧样式，调整老化参数，实时预览效果后保存作品。'}
            </p>
          </div>
          {!isReadOnly && (
            <div className="tool-section">
              <h3 style={{ fontSize: '16px', color: '#5c3a21', marginBottom: '10px' }} className="letterpress-text">流程控制</h3>
              <div className="tools-row">
                <button className="seal-btn" onClick={prevStep} disabled={snap.step === 0}>
                  上一步
                </button>
                <button className="seal-btn" onClick={nextStep} disabled={!canAdvance() || snap.step === 3}>
                  下一步
                </button>
              </div>
              <div className="tools-row">
                <button className="seal-btn" onClick={resetStore}>
                  重置工坊
                </button>
              </div>
            </div>
          )}
          {isReadOnly && (
            <div className="tool-section">
              <p className="hint-text letterpress-text" style={{ color: '#c0392b' }}>
                当前为浏览模式，无法编辑作品。
              </p>
              <div className="tools-row">
                <button className="seal-btn" onClick={() => { resetStore(); window.location.hash = '' }}>
                  开始创作
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="center-panel panel">
          <div className="workspace">
            {renderStepContent()}
          </div>
        </div>

        <div className="right-panel panel">
          <h2 className="panel-title letterpress-text">属性设置</h2>
          {snap.step === 0 && <EngravingControls />}
          {snap.step === 1 && <InkingControls />}
          {snap.step === 2 && <PrintingControls />}
          {snap.step === 3 && <AgingControls />}
        </div>
      </div>

      <div className="fish-tail-footer">
        <span className="fish-tail-text">雕 版 印 刷 工 坊</span>
      </div>
    </div>
  )
}

function EngravingControls() {
  const snap = useSnapshot(store)
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [color, setColor] = useState('#1a1a1a')

  useEffect(() => {
    StrokeSettingsContext.strokeWidth = strokeWidth
    StrokeSettingsContext.color = color
  }, [strokeWidth, color])

  return (
    <div>
      <div className="tool-section">
        <h3 style={{ fontSize: '16px', color: '#5c3a21', marginBottom: '10px' }} className="letterpress-text">笔触设置</h3>
        <div className="slider-label">
          <span>粗细</span>
          <span>{strokeWidth}px</span>
        </div>
        <input
          type="range"
          className="wood-slider"
          min="1"
          max="6"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
        />
        <div className="slider-label">
          <span>墨色</span>
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: '100%', height: '36px', cursor: 'pointer', border: '2px solid #8b7355', borderRadius: '2px' }}
        />
      </div>
      <div className="tool-section">
        <div className="tools-row">
          <button
            className="seal-btn"
            onClick={() => {
              if (window.confirm('确定清空所有绘制内容？')) {
                store.drawingPaths = []
                store.engravingDepth = null
              }
            }}
          >
            清空绘稿
          </button>
        </div>
      </div>
    </div>
  )
}

export const StrokeSettingsContext: { strokeWidth: number; color: string } = {
  strokeWidth: 3,
  color: '#1a1a1a'
}

function InkingControls() {
  const snap = useSnapshot(store)
  return (
    <div>
      <div className="tool-section">
        <h3 style={{ fontSize: '16px', color: '#5c3a21', marginBottom: '10px' }} className="letterpress-text">墨汁状态</h3>
        <div className="concentration-display letterpress-text">
          墨汁浓度：{Math.round(snap.inkConcentration)}%
        </div>
        <div style={{
          width: '100%',
          height: '16px',
          background: 'repeating-linear-gradient(90deg, #8b7355 0px, #6d4c41 2px, #8b7355 4px)',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid #5c3a21'
        }}>
          <div style={{
            height: '100%',
            width: `${snap.inkConcentration}%`,
            background: `linear-gradient(90deg, #4a4a4a ${100 - snap.inkConcentration}%, #0a0a0a 100%)`,
            transition: 'width 0.2s ease'
          }} />
        </div>
        <p className="hint-text letterpress-text" style={{ marginTop: '12px' }}>
          按住砚台并移动鼠标进行研墨，建议浓度达到60%以上再进行上墨。
        </p>
      </div>
    </div>
  )
}

function PrintingControls() {
  const snap = useSnapshot(store)
  return (
    <div>
      <div className="tool-section">
        <h3 style={{ fontSize: '16px', color: '#5c3a21', marginBottom: '10px' }} className="letterpress-text">拓印说明</h3>
        <p className="hint-text letterpress-text">
          1. 将左侧宣纸拖拽至中央雕版上方<br/>
          2. 对齐后点击"按压拓印"按钮<br/>
          3. 等待2秒完成墨迹转印
        </p>
      </div>
    </div>
  )
}

function AgingControls() {
  const snap = useSnapshot(store)

  const updateAging = (key: keyof typeof store.agingParams, value: number) => {
    store.agingParams = { ...store.agingParams, [key]: value }
  }

  return (
    <div>
      <div className="tool-section">
        <h3 style={{ fontSize: '16px', color: '#5c3a21', marginBottom: '10px' }} className="letterpress-text">装帧样式</h3>
        <div className="binding-options">
          {(['scroll', 'booklet', 'mirror'] as const).map((style) => (
            <div
              key={style}
              className={`binding-option ${snap.bindingStyle === style ? 'active' : ''}`}
              onClick={() => { store.bindingStyle = style }}
            >
              {style === 'scroll' ? '卷轴式' : style === 'booklet' ? '册页式' : '镜心式'}
            </div>
          ))}
        </div>
      </div>

      <div className="tool-section">
        <h3 style={{ fontSize: '16px', color: '#5c3a21', marginBottom: '10px' }} className="letterpress-text">老化效果</h3>

        <div className="slider-label">
          <span>纸张泛黄</span>
          <span>{snap.agingParams.yellowing}</span>
        </div>
        <input
          type="range"
          className="wood-slider"
          min="0"
          max="100"
          value={snap.agingParams.yellowing}
          onChange={(e) => updateAging('yellowing', Number(e.target.value))}
        />

        <div className="slider-label">
          <span>虫蛀孔洞</span>
          <span>{snap.agingParams.wormholes}个</span>
        </div>
        <input
          type="range"
          className="wood-slider"
          min="0"
          max="20"
          value={snap.agingParams.wormholes}
          onChange={(e) => updateAging('wormholes', Number(e.target.value))}
        />

        <div className="slider-label">
          <span>水渍斑点</span>
          <span>{snap.agingParams.waterStains}个</span>
        </div>
        <input
          type="range"
          className="wood-slider"
          min="0"
          max="15"
          value={snap.agingParams.waterStains}
          onChange={(e) => updateAging('waterStains', Number(e.target.value))}
        />

        <div className="slider-label">
          <span>墨迹褪色</span>
          <span>{snap.agingParams.inkFading}</span>
        </div>
        <input
          type="range"
          className="wood-slider"
          min="0"
          max="100"
          value={snap.agingParams.inkFading}
          onChange={(e) => updateAging('inkFading', Number(e.target.value))}
        />
      </div>
    </div>
  )
}
