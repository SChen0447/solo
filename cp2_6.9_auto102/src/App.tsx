import { useState, useEffect, useCallback } from 'react'
import GradientCanvas from './components/GradientCanvas'
import Controls from './components/Controls'
import { ColorStop, GradientScheme, generateGradientCSS, hslToHex, hexToHsl } from './types'

const defaultColorStops: ColorStop[] = [
  { color: '#667eea', position: 0 },
  { color: '#764ba2', position: 100 },
]

const App = () => {
  const [angle, setAngle] = useState(0)
  const [colorStops, setColorStops] = useState<ColorStop[]>(defaultColorStops)
  const [blurRadius, setBlurRadius] = useState(0)
  const [schemeName, setSchemeName] = useState('')
  const [savedSchemes, setSavedSchemes] = useState<GradientScheme[]>([])
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hue1, setHue1] = useState(hexToHsl(defaultColorStops[0].color).h)
  const [hue2, setHue2] = useState(hexToHsl(defaultColorStops[1].color).h)

  const fetchSchemes = useCallback(async () => {
    try {
      const res = await fetch('/api/schemes')
      const data = await res.json()
      setSavedSchemes(data)
    } catch (err) {
      console.error('Failed to fetch schemes:', err)
    }
  }, [])

  useEffect(() => {
    fetchSchemes()
  }, [fetchSchemes])

  const handleHue1Change = (hue: number) => {
    setHue1(hue)
    const hsl = hexToHsl(colorStops[0].color)
    const newColor = hslToHex(hue, hsl.s, hsl.l)
    setColorStops(prev => {
      const updated = [...prev]
      updated[0] = { ...updated[0], color: newColor }
      return updated
    })
  }

  const handleHue2Change = (hue: number) => {
    setHue2(hue)
    const hsl = hexToHsl(colorStops[1].color)
    const newColor = hslToHex(hue, hsl.s, hsl.l)
    setColorStops(prev => {
      const updated = [...prev]
      updated[1] = { ...updated[1], color: newColor }
      return updated
    })
  }

  const handleAddColorStop = () => {
    if (colorStops.length >= 5) return
    const newStop: ColorStop = {
      color: '#ffffff',
      position: 50,
    }
    setColorStops(prev => {
      const updated = [...prev]
      updated.splice(updated.length - 1, 0, newStop)
      return updated
    })
  }

  const handleColorStopMove = (index: number, position: number) => {
    setColorStops(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], position }
      return updated
    })
  }

  const handleSave = async () => {
    if (!schemeName.trim()) return
    try {
      await fetch('/api/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schemeName,
          angle,
          colorStops,
          blurRadius,
        }),
      })
      setSchemeName('')
      fetchSchemes()
    } catch (err) {
      console.error('Failed to save scheme:', err)
    }
  }

  const handleLoadScheme = (scheme: GradientScheme) => {
    setAngle(scheme.angle)
    setColorStops(scheme.colorStops)
    setBlurRadius(scheme.blurRadius)
    if (scheme.colorStops[0]) {
      setHue1(hexToHsl(scheme.colorStops[0].color).h)
    }
    if (scheme.colorStops[1]) {
      setHue2(hexToHsl(scheme.colorStops[1].color).h)
    }
  }

  const cssCode = `background: ${generateGradientCSS(angle, colorStops)};${
    blurRadius > 0 ? `\nfilter: blur(${blurRadius}px);` : ''
  }`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const codeLines = cssCode.split('\n')

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>CSS 渐变色生成器</h1>
      <p style={styles.subtitle}>在线生成和预览精美的 CSS 渐变背景</p>

      <div style={styles.mainLayout}>
        <div style={styles.leftColumn}>
          <GradientCanvas
            angle={angle}
            colorStops={colorStops}
            blurRadius={blurRadius}
            onColorStopMove={handleColorStopMove}
          />
          <Controls
            angle={angle}
            hue1={hue1}
            hue2={hue2}
            blurRadius={blurRadius}
            schemeName={schemeName}
            onAngleChange={setAngle}
            onHue1Change={handleHue1Change}
            onHue2Change={handleHue2Change}
            onBlurRadiusChange={setBlurRadius}
            onAddColorStop={handleAddColorStop}
            onSchemeNameChange={setSchemeName}
            onSave={handleSave}
          />
        </div>

        <div style={styles.rightColumn}>
          <h2 style={styles.sectionTitle}>已保存方案</h2>
          <div style={styles.cardGrid}>
            {savedSchemes.map((scheme) => (
              <div
                key={scheme.id}
                onClick={() => handleLoadScheme(scheme)}
                style={{
                  ...styles.card,
                  background: generateGradientCSS(scheme.angle, scheme.colorStops),
                }}
              >
                <span style={styles.cardLabel}>
                  {scheme.colorStops[0].color} → {scheme.colorStops[scheme.colorStops.length - 1].color}, {scheme.angle}°
                </span>
                <span style={styles.cardName}>{scheme.name}</span>
              </div>
            ))}
          </div>

          <div style={styles.exportSection}>
            <button onClick={() => setShowModal(true)} style={styles.exportButton}>
              导出 CSS 代码
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>CSS 代码</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeButton}>
                ×
              </button>
            </div>
            <div style={styles.codeBlock}>
              <div style={styles.lineNumbers}>
                {codeLines.map((_, i) => (
                  <div key={i} style={styles.lineNumber}>{i + 1}</div>
                ))}
              </div>
              <pre style={styles.codeContent}>
                <code>{cssCode}</code>
              </pre>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={handleCopy} style={styles.copyButton}>
                {copied ? '已复制 ✓' : '复制代码'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: none;
          transition: all 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        }
        input[type="text"]:focus {
          border-color: #667eea !important;
          outline: 2px solid #667eea;
          outline-offset: 2px;
        }
        button:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
        button:active {
          transform: translateY(0);
          filter: brightness(0.95);
        }
        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column !important;
          }
          .left-column, .right-column {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: '40px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8b8ba7',
    marginBottom: 40,
    textAlign: 'center',
  },
  mainLayout: {
    display: 'flex',
    gap: 24,
    width: '100%',
    maxWidth: 1200,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
  },
  rightColumn: {
    width: '35%',
    minWidth: 280,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: 16,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  card: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    cursor: 'pointer',
    position: 'relative',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    background: '#1a1a2e',
  },
  cardLabel: {
    fontSize: 10,
    color: '#ffffff',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    fontFamily: "'Fira Code', monospace",
    fontWeight: 500,
  },
  cardName: {
    fontSize: 12,
    color: '#ffffff',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    fontWeight: 600,
  },
  exportSection: {
    marginTop: 24,
  },
  exportButton: {
    width: '100%',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: 500,
    maxWidth: '90%',
    height: 240,
    background: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#ffffff',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#8b8ba7',
    fontSize: 24,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  codeBlock: {
    flex: 1,
    background: '#1e1e2e',
    borderRadius: 8,
    display: 'flex',
    overflow: 'auto',
  },
  lineNumbers: {
    padding: '12px 8px',
    borderRight: '1px solid #2a2a4a',
    userSelect: 'none',
  },
  lineNumber: {
    fontSize: 13,
    color: '#555577',
    fontFamily: "'Fira Code', monospace",
    lineHeight: 1.6,
    textAlign: 'right',
    minWidth: 24,
  },
  codeContent: {
    padding: 12,
    flex: 1,
    margin: 0,
    overflowX: 'auto',
  },
  modalFooter: {
    marginTop: 16,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  copyButton: {
    padding: '8px 20px',
    background: '#667eea',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
}

export default App
