import { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react'
import AsciiRenderer from './AsciiRenderer'
import {
  loadImageToImageData,
  convertImageToAscii,
  DEFAULT_CHARSET,
  MINIMAL_CHARSET,
  GRAPHICAL_CHARSET,
  DEFAULT_WIDTH,
  type AsciiMatrix,
} from './ImageProcessor'
import { exportAsText, exportAsSvg } from './ExportManager'

interface AppContextType {
  imageData: ImageData | null
  charset: string
  charWidth: number
  colored: boolean
  setColored: (colored: boolean) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

type CharsetPreset = 'classic' | 'minimal' | 'graphical' | 'custom'

const CHARSETS: Record<CharsetPreset, string> = {
  classic: DEFAULT_CHARSET,
  minimal: MINIMAL_CHARSET,
  graphical: GRAPHICAL_CHARSET,
  custom: '',
}

export default function App() {
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const [charWidth, setCharWidth] = useState(DEFAULT_WIDTH)
  const [charsetPreset, setCharsetPreset] = useState<CharsetPreset>('classic')
  const [customCharset, setCustomCharset] = useState('')
  const [colored, setColored] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [asciiMatrix, setAsciiMatrix] = useState<AsciiMatrix | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  const currentCharset = charsetPreset === 'custom' ? customCharset : CHARSETS[charsetPreset]

  useEffect(() => {
    const savedPreset = localStorage.getItem('ascii-charset-preset') as CharsetPreset
    const savedCustom = localStorage.getItem('ascii-custom-charset')
    if (savedPreset && CHARSETS.hasOwnProperty(savedPreset)) {
      setCharsetPreset(savedPreset)
    }
    if (savedCustom) {
      setCustomCharset(savedCustom)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('ascii-charset-preset', charsetPreset)
  }, [charsetPreset])

  useEffect(() => {
    localStorage.setItem('ascii-custom-charset', customCharset)
  }, [customCharset])

  const generateAscii = useCallback(() => {
    if (!imageData || !currentCharset) {
      setAsciiMatrix(null)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      const start = performance.now()
      const matrix = convertImageToAscii(imageData, charWidth, currentCharset, colored)
      const elapsed = performance.now() - start
      console.log(`ASCII生成耗时: ${elapsed.toFixed(2)}ms`)
      setAsciiMatrix(matrix)
    }, 16)
  }, [imageData, charWidth, currentCharset, colored])

  useEffect(() => {
    generateAscii()
  }, [generateAscii])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('请上传PNG或JPG格式的图片')
      return
    }
    try {
      const data = await loadImageToImageData(file)
      setImageData(data)
    } catch (e) {
      console.error('图片加载失败', e)
      alert('图片加载失败，请重试')
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCharWidth(parseInt(e.target.value, 10))
  }

  const handlePresetChange = (preset: CharsetPreset) => {
    setCharsetPreset(preset)
  }

  const handleCustomCharsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 20)
    setCustomCharset(value)
    if (charsetPreset === 'custom' && value) {
    }
  }

  const handleExportText = () => {
    if (!asciiMatrix) return
    setIsExporting(true)
    setExportProgress(50)
    setTimeout(() => {
      exportAsText(asciiMatrix)
      setExportProgress(100)
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
        setShowExportMenu(false)
      }, 500)
    }, 100)
  }

  const handleExportSvg = () => {
    if (!asciiMatrix) return
    setIsExporting(true)
    setExportProgress(0)

    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      if (progress >= 90) {
        clearInterval(interval)
      }
      setExportProgress(Math.min(progress, 90))
    }, 30)

    setTimeout(() => {
      exportAsSvg(asciiMatrix, colored, 'ascii-art.svg', (p) => {
        setExportProgress(p)
      })
      clearInterval(interval)
      setExportProgress(100)
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
        setShowExportMenu(false)
      }, 500)
    }, 50)
  }

  const contextValue: AppContextType = {
    imageData,
    charset: currentCharset,
    charWidth,
    colored,
    setColored,
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div style={styles.app}>
        <header style={styles.header}>
          <h1 style={styles.title}>ASCII Art Studio</h1>
          <p style={styles.subtitle}>将图片快速转换为ASCII艺术风格</p>
        </header>

        <div style={styles.mainContainer}>
          <aside style={styles.leftPanel}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>上传图片</h3>
              <div
                style={{
                  ...styles.uploadArea,
                  ...(isDragging ? styles.uploadAreaDragging : {}),
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={styles.uploadIcon}>📁</div>
                <p style={styles.uploadText}>
                  拖拽图片到此处，或点击上传
                </p>
                <p style={styles.uploadHint}>支持 PNG、JPG、JPEG</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>参数控制</h3>

              <div style={styles.controlGroup}>
                <div style={styles.controlLabel}>
                  <span>字符宽度</span>
                  <span style={styles.controlValue}>{charWidth}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={charWidth}
                  onChange={handleWidthChange}
                  style={styles.slider}
                />
                <div style={styles.sliderLabels}>
                  <span>10</span>
                  <span>200</span>
                </div>
              </div>

              <div style={styles.controlGroup}>
                <div style={styles.controlLabel}>
                  <span>字符集</span>
                </div>
                <div style={styles.charsetButtons}>
                  <button
                    style={{
                      ...styles.charsetBtn,
                      ...(charsetPreset === 'classic' ? styles.charsetBtnActive : {}),
                    }}
                    onClick={() => handlePresetChange('classic')}
                  >
                    经典
                  </button>
                  <button
                    style={{
                      ...styles.charsetBtn,
                      ...(charsetPreset === 'minimal' ? styles.charsetBtnActive : {}),
                    }}
                    onClick={() => handlePresetChange('minimal')}
                  >
                    极简
                  </button>
                  <button
                    style={{
                      ...styles.charsetBtn,
                      ...(charsetPreset === 'graphical' ? styles.charsetBtnActive : {}),
                    }}
                    onClick={() => handlePresetChange('graphical')}
                  >
                    图形化
                  </button>
                  <button
                    style={{
                      ...styles.charsetBtn,
                      ...(charsetPreset === 'custom' ? styles.charsetBtnActive : {}),
                    }}
                    onClick={() => handlePresetChange('custom')}
                  >
                    自定义
                  </button>
                </div>

                <div style={styles.charsetPreview}>
                  <span style={styles.charsetPreviewLabel}>预览: </span>
                  <code style={styles.charsetPreviewText}>
                    {currentCharset || '请输入字符'}
                  </code>
                </div>

                {charsetPreset === 'custom' && (
                  <input
                    type="text"
                    value={customCharset}
                    onChange={handleCustomCharsetChange}
                    placeholder="输入自定义字符（最多20个）"
                    maxLength={20}
                    style={styles.customCharsetInput}
                  />
                )}
              </div>

              <div style={styles.controlGroup}>
                <label style={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={colored}
                    onChange={(e) => setColored(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>彩色ASCII</span>
                </label>
              </div>
            </div>
          </aside>

          <main style={styles.centerPanel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>实时预览</h3>
              {asciiMatrix && (
                <span style={styles.matrixInfo}>
                  {asciiMatrix.width} × {asciiMatrix.height} 字符
                </span>
              )}
            </div>
            <AsciiRenderer
              matrix={asciiMatrix}
              colored={colored}
              showGrid={true}
              fontSize={14}
            />
          </main>

          <aside style={styles.rightPanel}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>对比模式</h3>
              <button
                style={{
                  ...styles.primaryBtn,
                  ...(compareMode ? styles.primaryBtnActive : {}),
                }}
                onClick={() => setCompareMode(!compareMode)}
              >
                {compareMode ? '关闭对比' : '开启对比'}
              </button>

              {compareMode && imageData && asciiMatrix && (
                <div style={styles.compareContainer}>
                  <div style={styles.compareItem}>
                    <p style={styles.compareLabel}>原图</p>
                    <div style={styles.compareImageWrapper}>
                      <OriginalImagePreview imageData={imageData} asciiMatrix={asciiMatrix} />
                    </div>
                  </div>
                  <div style={styles.compareDivider} />
                  <div style={styles.compareItem}>
                    <p style={styles.compareLabel}>ASCII效果</p>
                    <div style={styles.compareImageWrapper}>
                      <AsciiRenderer
                        matrix={asciiMatrix}
                        colored={colored}
                        showGrid={false}
                        fontSize={10}
                      />
                    </div>
                  </div>
                </div>
              )}

              {compareMode && !imageData && (
                <p style={styles.hintText}>请先上传图片以使用对比模式</p>
              )}
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>导出</h3>

              {!showExportMenu ? (
                <button
                  style={{ ...styles.primaryBtn, width: '100%' }}
                  onClick={() => setShowExportMenu(true)}
                  disabled={!asciiMatrix}
                >
                  导出文件
                </button>
              ) : (
                <div style={styles.exportMenu}>
                  <button
                    style={styles.exportOption}
                    onClick={handleExportText}
                    disabled={isExporting || !asciiMatrix}
                  >
                    <span style={styles.exportIcon}>📄</span>
                    <div style={styles.exportInfo}>
                      <span style={styles.exportTitle}>导出为纯文本</span>
                      <span style={styles.exportDesc}>.txt 文件，等宽对齐</span>
                    </div>
                  </button>

                  <button
                    style={styles.exportOption}
                    onClick={handleExportSvg}
                    disabled={isExporting || !asciiMatrix}
                  >
                    <span style={styles.exportIcon}>🎨</span>
                    <div style={styles.exportInfo}>
                      <span style={styles.exportTitle}>导出为SVG图片</span>
                      <span style={styles.exportDesc}>.svg 文件，可编辑矢量图</span>
                    </div>
                  </button>

                  {isExporting && (
                    <div style={styles.progressContainer}>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${exportProgress}%`,
                          }}
                        />
                      </div>
                      <span style={styles.progressText}>{exportProgress}%</span>
                    </div>
                  )}

                  <button
                    style={styles.cancelBtn}
                    onClick={() => setShowExportMenu(false)}
                    disabled={isExporting}
                  >
                    取消
                  </button>
                </div>
              )}

              {!asciiMatrix && (
                <p style={styles.hintText}>请先上传图片以启用导出</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppContext.Provider>
  )
}

function OriginalImagePreview({
  imageData,
  asciiMatrix,
}: {
  imageData: ImageData
  asciiMatrix: AsciiMatrix
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const targetWidth = asciiMatrix.width
    const targetHeight = asciiMatrix.height
    const scale = 6

    canvas.width = targetWidth * scale
    canvas.height = targetHeight * scale

    const offscreen = new OffscreenCanvas(imageData.width, imageData.height)
    const offCtx = offscreen.getContext('2d')!
    offCtx.putImageData(imageData, 0, 0)

    ctx.imageSmoothingEnabled = true
    ctx.drawImage(offscreen, 0, 0, targetWidth * scale, targetHeight * scale)
  }, [imageData, asciiMatrix])

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        borderRadius: '4px',
      }}
    />
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    fontFamily: '"Source Code Pro", monospace',
    padding: '20px',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    color: '#e94560',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0 0 0',
  },
  mainContainer: {
    display: 'flex',
    gap: '16px',
    maxWidth: '1400px',
    margin: '0 auto',
    height: 'calc(100vh - 120px)',
    minHeight: '600px',
  },
  leftPanel: {
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flexShrink: 0,
  },
  centerPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  rightPanel: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flexShrink: 0,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 16px 0',
    color: '#ffffff',
  },
  uploadArea: {
    border: '2px dashed #374151',
    borderRadius: '8px',
    padding: '30px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(55, 65, 81, 0.2)',
  },
  uploadAreaDragging: {
    borderColor: '#e94560',
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
  },
  uploadIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  uploadText: {
    fontSize: '14px',
    margin: '0 0 8px 0',
    color: '#d1d5db',
  },
  uploadHint: {
    fontSize: '12px',
    margin: 0,
    color: '#6b7280',
  },
  controlGroup: {
    marginBottom: '20px',
  },
  controlLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#d1d5db',
    marginBottom: '8px',
  },
  controlValue: {
    color: '#e94560',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: '6px',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: '#374151',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '4px',
  },
  charsetButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  charsetBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    fontFamily: 'inherit',
    backgroundColor: '#374151',
    color: '#d1d5db',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  charsetBtnActive: {
    backgroundColor: '#e94560',
    color: '#ffffff',
  },
  charsetPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  charsetPreviewLabel: {
    fontSize: '12px',
    color: '#6b7280',
    flexShrink: 0,
  },
  charsetPreviewText: {
    fontSize: '14px',
    color: '#e94560',
    wordBreak: 'break-all',
  },
  customCharsetInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: 'inherit',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    border: '1px solid #374151',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#d1d5db',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#e94560',
    cursor: 'pointer',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    color: '#ffffff',
  },
  matrixInfo: {
    fontSize: '12px',
    color: '#6b7280',
  },
  primaryBtn: {
    width: '100%',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryBtnActive: {
    backgroundColor: '#c73e54',
  },
  compareContainer: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  compareItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  compareLabel: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
    textAlign: 'center',
  },
  compareImageWrapper: {
    backgroundColor: '#1a1a2e',
    borderRadius: '6px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '120px',
    overflow: 'hidden',
  },
  compareDivider: {
    width: '1px',
    backgroundColor: '#374151',
  },
  hintText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '12px',
    marginBottom: 0,
  },
  exportMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  exportOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #374151',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    fontFamily: 'inherit',
    color: '#ffffff',
  },
  exportIcon: {
    fontSize: '24px',
  },
  exportInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  exportTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
  },
  exportDesc: {
    fontSize: '11px',
    color: '#6b7280',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#374151',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: '3px',
    transition: 'width 0.1s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#e94560',
    minWidth: '40px',
    textAlign: 'right',
  },
  cancelBtn: {
    padding: '10px',
    fontSize: '13px',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #374151',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

export {}
