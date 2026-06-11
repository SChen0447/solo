import React, { useState, useCallback, useEffect } from 'react'
import ElementsPanel from './ElementsPanel'
import Sandbox from './Sandbox'
import WeatherController from './WeatherController'
import { SceneElement, WeatherType, MAX_ELEMENTS, WARNING_THRESHOLD, ElementType } from './types'

const STORAGE_KEY = 'miniature_sandbox_config'

const App: React.FC = () => {
  const [elements, setElements] = useState<SceneElement[]>([])
  const [weather, setWeather] = useState<WeatherType>('sunny')
  const [showWarning, setShowWarning] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showLoadConfirm, setShowLoadConfirm] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleDragStart = useCallback((_type: ElementType) => {
    // 可以在这里添加拖拽开始的视觉反馈
  }, [])

  const handleWeatherChange = useCallback((newWeather: WeatherType) => {
    setWeather(newWeather)
  }, [])

  const handleExceedLimit = useCallback((): boolean => {
    setShowWarning(true)
    return window.confirm(`当前元素数量已超过${WARNING_THRESHOLD}个，是否继续添加？（最多${MAX_ELEMENTS}个）`)
  }, [])

  const handleSave = useCallback(() => {
    try {
      const data = JSON.stringify(elements)
      localStorage.setItem(STORAGE_KEY, data)
      setShowSaveConfirm(true)
      setTimeout(() => setShowSaveConfirm(false), 3000)
    } catch (e) {
      alert('保存失败：' + (e as Error).message)
    }
  }, [elements])

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      alert('没有找到保存的场景配置')
      return
    }
    setShowLoadConfirm(true)
  }, [])

  const confirmLoad = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved) as SceneElement[]
        setElements(data)
      }
    } catch (e) {
      alert('加载失败：' + (e as Error).message)
    }
    setShowLoadConfirm(false)
  }, [])

  const cancelLoad = useCallback(() => {
    setShowLoadConfirm(false)
  }, [])

  const layoutStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }
    : {
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }

  return (
    <div style={layoutStyle}>
      <ElementsPanel onDragStart={handleDragStart} />

      <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        <Sandbox
          elements={elements}
          setElements={setElements}
          weather={weather}
          showWarning={showWarning}
          setShowWarning={setShowWarning}
          onExceedLimit={handleExceedLimit}
        />

        {showSaveConfirm && (
          <div
            className="save-confirm"
            style={{
              position: 'absolute',
              top: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#2d6a4f',
              color: '#fff',
              padding: '12px 32px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontSize: '14px',
              fontWeight: 600,
              zIndex: 1000,
            }}
          >
            ✓ 场景保存成功
          </div>
        )}

        {showLoadConfirm && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: '#2d3e4f',
                borderRadius: '12px',
                padding: '24px',
                minWidth: '320px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 style={{ color: '#f1f1f1', margin: '0 0 16px 0', fontSize: '18px' }}>
                确认加载场景
              </h3>
              <p style={{ color: '#a0aec0', margin: '0 0 24px 0', fontSize: '14px' }}>
                加载将覆盖当前沙盘中的所有元素，是否继续？
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelLoad}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4a5568',
                    color: '#f1f1f1',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={confirmLoad}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2d6a4f',
                    color: '#f1f1f1',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  确认加载
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <WeatherController
        currentWeather={weather}
        onWeatherChange={handleWeatherChange}
        elementCount={elements.length}
        maxElements={MAX_ELEMENTS}
        onSave={handleSave}
        onLoad={handleLoad}
      />
    </div>
  )
}

export default App
