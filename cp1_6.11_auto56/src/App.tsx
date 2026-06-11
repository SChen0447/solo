import { useState, useRef, useEffect, useCallback } from 'react'
import useDamCalculator, { type DamType } from './hooks/useDamCalculator'
import useCanvasRenderer from './hooks/useCanvasRenderer'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [animating, setAnimating] = useState(true)

  const [damHeight, setDamHeight] = useState(100)
  const [damTopWidth, setDamTopWidth] = useState(10)
  const [damBottomWidth, setDamBottomWidth] = useState(70)
  const [upstreamSlope, setUpstreamSlope] = useState(0.1)
  const [downstreamSlope, setDownstreamSlope] = useState(0.5)
  const [upstreamWaterLevel, setUpstreamWaterLevel] = useState(80)
  const [downstreamWaterLevel, setDownstreamWaterLevel] = useState(20)
  const [damType, setDamType] = useState<DamType>('gravity')
  const [buttressCount, setButtressCount] = useState(5)
  const [archRadius, setArchRadius] = useState(50)
  const [displacementScale, setDisplacementScale] = useState(1000)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const params = {
    damHeight,
    damTopWidth,
    damBottomWidth,
    upstreamSlope,
    downstreamSlope,
    upstreamWaterLevel,
    downstreamWaterLevel,
    damType,
    buttressCount,
    archRadius,
    displacementScale,
  }

  const calculationResult = useDamCalculator(params)

  useCanvasRenderer({
    canvasRef,
    calculationResult,
    darkMode,
    damType,
    animating,
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev)
  }, [])

  const applyPreset = useCallback((preset: DamType) => {
    setDamType(preset)

    if (preset === 'gravity') {
      setDamBottomWidth(damHeight * 0.7)
      setUpstreamSlope(0.1)
      setDownstreamSlope(0.5)
    } else if (preset === 'arch') {
      setDamBottomWidth(damHeight * 0.6)
      setArchRadius(60)
      setUpstreamSlope(0.05)
      setDownstreamSlope(0.4)
    } else if (preset === 'buttress') {
      setDamBottomWidth(damHeight * 0.8)
      setButtressCount(5)
      setUpstreamSlope(0.2)
      setDownstreamSlope(0.6)
    }
  }, [damHeight])

  const handleNumberInput = (
    value: string,
    setter: (val: number) => void,
    min: number,
    max: number
  ) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= min && num <= max) {
      setter(num)
    }
  }

  const stressGradientStyle = {
    background: darkMode
      ? 'linear-gradient(to right, #9C27B0, #4CAF50)'
      : 'linear-gradient(to right, #3498DB, #E74C3C)',
  }

  return (
    <>
      <header className="app-header">
        <h1>
          <svg className="header-icon" viewBox="0 0 32 32" fill="none">
            <path
              d="M4 26 L4 14 L12 12 L18 10 L26 8 L28 26 Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M4 26 L28 26"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M2 16 L6 16 M2 18 L7 18 M2 20 L5 20 M2 22 L7 22"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          混凝土重力坝应力可视化分析
        </h1>
        <button className="theme-toggle" onClick={toggleDarkMode}>
          {darkMode ? '☀️ 浅色模式' : '🌙 深色模式'}
        </button>
      </header>

      <div className="app-main">
        <aside className="control-panel">
          <div className="param-group">
            <div className="param-group-title">坝体几何参数</div>

            <div className="param-item">
              <div className="param-label">
                <span>坝高</span>
                <span className="param-value">{damHeight} m</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-blue"
                  min={50}
                  max={200}
                  step={5}
                  value={damHeight}
                  onChange={(e) => setDamHeight(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={50}
                  max={200}
                  step={5}
                  value={damHeight}
                  onChange={(e) => handleNumberInput(e.target.value, setDamHeight, 50, 200)}
                />
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">
                <span>坝顶宽</span>
                <span className="param-value">{damTopWidth} m</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-blue"
                  min={5}
                  max={20}
                  step={1}
                  value={damTopWidth}
                  onChange={(e) => setDamTopWidth(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={5}
                  max={20}
                  step={1}
                  value={damTopWidth}
                  onChange={(e) => handleNumberInput(e.target.value, setDamTopWidth, 5, 20)}
                />
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">
                <span>坝底宽</span>
                <span className="param-value">{damBottomWidth.toFixed(1)} m</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-blue"
                  min={20}
                  max={80}
                  step={2}
                  value={damBottomWidth}
                  onChange={(e) => setDamBottomWidth(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={20}
                  max={80}
                  step={2}
                  value={damBottomWidth}
                  onChange={(e) => handleNumberInput(e.target.value, setDamBottomWidth, 20, 80)}
                />
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">
                <span>上游面坡度</span>
                <span className="param-value">{upstreamSlope.toFixed(2)}</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-orange"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={upstreamSlope}
                  onChange={(e) => setUpstreamSlope(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={upstreamSlope}
                  onChange={(e) => handleNumberInput(e.target.value, setUpstreamSlope, 0, 0.8)}
                />
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">
                <span>下游面坡度</span>
                <span className="param-value">{downstreamSlope.toFixed(2)}</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-orange"
                  min={0}
                  max={0.6}
                  step={0.05}
                  value={downstreamSlope}
                  onChange={(e) => setDownstreamSlope(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  max={0.6}
                  step={0.05}
                  value={downstreamSlope}
                  onChange={(e) => handleNumberInput(e.target.value, setDownstreamSlope, 0, 0.6)}
                />
              </div>
            </div>
          </div>

          <div className="param-group">
            <div className="param-group-title">水位参数</div>

            <div className="param-item">
              <div className="param-label">
                <span>上游水位</span>
                <span className="param-value">{upstreamWaterLevel}%</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-blue"
                  min={20}
                  max={95}
                  step={1}
                  value={upstreamWaterLevel}
                  onChange={(e) => setUpstreamWaterLevel(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={20}
                  max={95}
                  step={1}
                  value={upstreamWaterLevel}
                  onChange={(e) => handleNumberInput(e.target.value, setUpstreamWaterLevel, 20, 95)}
                />
              </div>
            </div>

            <div className="param-item">
              <div className="param-label">
                <span>下游水位</span>
                <span className="param-value">{downstreamWaterLevel}%</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-blue"
                  min={0}
                  max={50}
                  step={1}
                  value={downstreamWaterLevel}
                  onChange={(e) => setDownstreamWaterLevel(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={downstreamWaterLevel}
                  onChange={(e) => handleNumberInput(e.target.value, setDownstreamWaterLevel, 0, 50)}
                />
              </div>
            </div>
          </div>

          <div className="param-group">
            <div className="param-group-title">预置坝型</div>
            <div className="preset-buttons">
              <button
                className={`preset-btn ${damType === 'gravity' ? 'active' : ''}`}
                onClick={() => applyPreset('gravity')}
              >
                重力坝（底高比0.7）
              </button>
              <button
                className={`preset-btn ${damType === 'arch' ? 'active' : ''}`}
                onClick={() => applyPreset('arch')}
              >
                拱形重力坝
              </button>
              <button
                className={`preset-btn ${damType === 'buttress' ? 'active' : ''}`}
                onClick={() => applyPreset('buttress')}
              >
                支墩坝
              </button>
            </div>
          </div>

          {damType === 'buttress' && (
            <div className="param-group">
              <div className="param-group-title">支墩参数</div>
              <div className="param-item">
                <div className="param-label">
                  <span>支墩数量</span>
                  <span className="param-value">{buttressCount} 个</span>
                </div>
                <div className="param-slider">
                  <input
                    type="range"
                    className="slider-orange"
                    min={3}
                    max={8}
                    step={1}
                    value={buttressCount}
                    onChange={(e) => setButtressCount(parseInt(e.target.value))}
                  />
                  <input
                    type="number"
                    min={3}
                    max={8}
                    step={1}
                    value={buttressCount}
                    onChange={(e) => handleNumberInput(e.target.value, setButtressCount, 3, 8)}
                  />
                </div>
              </div>
            </div>
          )}

          {damType === 'arch' && (
            <div className="param-group">
              <div className="param-group-title">拱坝参数</div>
              <div className="param-item">
                <div className="param-label">
                  <span>曲率系数</span>
                  <span className="param-value">{archRadius}</span>
                </div>
                <div className="param-slider">
                  <input
                    type="range"
                    className="slider-orange"
                    min={20}
                    max={100}
                    step={5}
                    value={archRadius}
                    onChange={(e) => setArchRadius(parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    min={20}
                    max={100}
                    step={5}
                    value={archRadius}
                    onChange={(e) => handleNumberInput(e.target.value, setArchRadius, 20, 100)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="param-group">
            <div className="param-group-title">显示选项</div>
            <div className="param-item">
              <div className="param-label">
                <span>位移放大倍数</span>
                <span className="param-value">{displacementScale}×</span>
              </div>
              <div className="param-slider">
                <input
                  type="range"
                  className="slider-blue"
                  min={100}
                  max={2000}
                  step={100}
                  value={displacementScale}
                  onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  min={100}
                  max={2000}
                  step={100}
                  value={displacementScale}
                  onChange={(e) => handleNumberInput(e.target.value, setDisplacementScale, 100, 2000)}
                />
              </div>
            </div>
          </div>
        </aside>

        <main className="canvas-container">
          <canvas ref={canvasRef} />
          <div className="info-panel">
            <div>应力云图图例</div>
            <div className="stress-legend">
              <span>拉</span>
              <div className="stress-gradient" style={stressGradientStyle}></div>
              <span>压</span>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

export default App
