import { useState, useRef, useCallback } from 'react'
import InkCanvas, { InkCanvasHandle } from './InkCanvas'

interface HistoryItem {
  id: number
  dataUrl: string
  timestamp: Date
}

export default function App() {
  const [inkLevel, setInkLevel] = useState(100)
  const [nibSize, setNibSize] = useState(3)
  const [isAged, setIsAged] = useState(false)
  const [isDried, setIsDried] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const canvasRef = useRef<InkCanvasHandle>(null)
  const historyIdRef = useRef(0)

  const handleInkConsume = useCallback((amount: number) => {
    setInkLevel(prev => Math.max(0, prev - amount))
  }, [])

  const handleRefillInk = useCallback(() => {
    setInkLevel(100)
  }, [])

  const handleDry = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.startDryingAnimation()
      setIsDried(true)
    }
  }, [])

  const handleAge = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.applyAgingEffect()
      setIsAged(true)
    }
  }, [])

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return

    const blob = await canvasRef.current.exportScroll()
    if (blob) {
      const url = URL.createObjectURL(blob)
      const historyItem: HistoryItem = {
        id: historyIdRef.current++,
        dataUrl: url,
        timestamp: new Date(),
      }
      setHistory(prev => [historyItem, ...prev].slice(0, 10))

      const a = document.createElement('a')
      a.href = url
      a.download = 'parchment_scroll.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }, [])

  const inkLow = inkLevel < 20
  const inkPercent = Math.round(inkLevel)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(135deg, #2c2c2c 0%, #4a3b2a 100%)',
        padding: '20px',
        gap: '20px',
      }}
    >
      <div
        style={{
          width: '240px',
          background: 'rgba(26, 26, 26, 0.85)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          border: '1px solid #5a4a3a',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div>
          <h2
            style={{
              color: '#d4c4a8',
              fontSize: '18px',
              margin: '0 0 12px 0',
              fontWeight: 'normal',
              letterSpacing: '1px',
              borderBottom: '1px solid #5a4a3a',
              paddingBottom: '8px',
            }}
          >
            抄写室工具
          </h2>
        </div>

        <div>
          <label
            style={{
              color: '#c4b498',
              fontSize: '13px',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            墨水余量
          </label>
          <div
            onClick={handleRefillInk}
            style={{
              position: 'relative',
              width: '100%',
              height: '120px',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
              borderRadius: '0 0 40px 40px',
              border: '2px solid #6b5a4a',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: 'inset 0 5px 15px rgba(0,0,0,0.5)',
            }}
            title="点击重新蘸墨"
          >
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${inkLevel}%`,
                background: inkLow
                  ? 'linear-gradient(180deg, #3a3a5a 0%, #1a1a3a 100%)'
                  : 'linear-gradient(180deg, #1a1a4a 0%, #0a0a2a 100%)',
                transition: 'height 0.3s ease',
                boxShadow: 'inset 0 2px 5px rgba(100,100,200,0.2)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: inkLow ? '#ff6b6b' : '#a494c8',
                fontSize: '24px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {inkPercent}%
            </div>
            {inkLow && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#ff6b6b',
                  fontSize: '11px',
                  animation: 'pulse 1s infinite',
                }}
              >
                墨水不足！
              </div>
            )}
          </div>
          <div
            style={{
              color: '#8a7a68',
              fontSize: '11px',
              marginTop: '6px',
              textAlign: 'center',
            }}
          >
            点击墨水瓶重新蘸墨
          </div>
        </div>

        <div>
          <label
            style={{
              color: '#c4b498',
              fontSize: '13px',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            笔尖粗细: {nibSize}px
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={nibSize}
            onChange={(e) => setNibSize(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#8b6b4a',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleDry}
            disabled={isDried}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: isDried ? '#4a3a2a' : '#6b4a3a',
              color: '#e8d8b8',
              border: '1px solid #8b6b4a',
              cursor: isDried ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              transition: 'background 0.2s ease',
              opacity: isDried ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isDried) e.currentTarget.style.background = '#8b6b4a'
            }}
            onMouseLeave={(e) => {
              if (!isDried) e.currentTarget.style.background = '#6b4a3a'
            }}
          >
            🌬️ 风干
          </button>

          <button
            onClick={handleAge}
            disabled={isAged}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: isAged ? '#4a3a2a' : '#6b4a3a',
              color: '#e8d8b8',
              border: '1px solid #8b6b4a',
              cursor: isAged ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              transition: 'background 0.2s ease',
              opacity: isAged ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isAged) e.currentTarget.style.background = '#8b6b4a'
            }}
            onMouseLeave={(e) => {
              if (!isAged) e.currentTarget.style.background = '#6b4a3a'
            }}
          >
            ⏳ 老化
          </button>

          <button
            onClick={handleExport}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#6b4a3a',
              color: '#e8d8b8',
              border: '1px solid #8b6b4a',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#8b6b4a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#6b4a3a'
            }}
          >
            📜 卷轴
          </button>
        </div>

        <div style={{ marginTop: 'auto', color: '#6a5a48', fontSize: '11px', textAlign: 'center' }}>
          Scriptorium v1.0
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <InkCanvas
          ref={canvasRef}
          inkLevel={inkLevel}
          nibSize={nibSize}
          onInkConsume={handleInkConsume}
        />
      </div>

      <div
        style={{
          width: '220px',
          background: 'rgba(26, 26, 26, 0.85)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          border: '1px solid #5a4a3a',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}
      >
        <h2
          style={{
            color: '#d4c4a8',
            fontSize: '18px',
            margin: 0,
            fontWeight: 'normal',
            letterSpacing: '1px',
            borderBottom: '1px solid #5a4a3a',
            paddingBottom: '8px',
          }}
        >
          历史卷轴
        </h2>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '4px',
          }}
        >
          {history.length === 0 ? (
            <div
              style={{
                color: '#6a5a48',
                fontSize: '13px',
                textAlign: 'center',
                padding: '40px 0',
                fontStyle: 'italic',
              }}
            >
              暂无卷轴
              <br />
              <span style={{ fontSize: '11px' }}>点击"卷轴"按钮保存</span>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#1a1a1a',
                  borderRadius: '8px',
                  padding: '8px',
                  border: '1px solid #4a3a2a',
                }}
              >
                <img
                  src={item.dataUrl}
                  alt="scroll"
                  style={{
                    width: '100%',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    color: '#8a7a68',
                    fontSize: '11px',
                    marginTop: '6px',
                    textAlign: 'center',
                  }}
                >
                  {item.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
