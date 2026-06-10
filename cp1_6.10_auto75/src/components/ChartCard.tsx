import { useEffect, useRef, useState, useCallback } from 'react'
import { ChartConfig, RefreshInterval, COLOR_SCHEMES, CHART_ICONS, getIntervalMs, generateMockData, DataPoint } from '../types'

declare global {
  interface Window {
    Chart: any
  }
}

interface ChartCardProps {
  chart: ChartConfig
  theme: {
    text: string
    textSecondary: string
    chartBorder: string
    modalBg: string
  }
  isDarkTheme: boolean
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onWheel: (e: React.WheelEvent) => void
  onUpdate: (updates: Partial<ChartConfig>) => void
  onDelete: () => void
}

const ChartCard = ({
  chart,
  theme,
  isDarkTheme,
  isDragging,
  onMouseDown,
  onWheel,
  onUpdate,
  onDelete
}: ChartCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [configTitle, setConfigTitle] = useState(chart.title)
  const [configInterval, setConfigInterval] = useState<RefreshInterval>(chart.refreshInterval)
  const [configColorScheme, setConfigColorScheme] = useState(chart.colorSchemeIndex)

  const applyRefreshAnimation = useCallback(() => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }, [])

  const refreshData = useCallback(() => {
    const now = new Date()
    const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    const newValue = Math.floor(Math.random() * 101)
    const newData: DataPoint[] = [...chart.data.slice(1), { label, value: newValue }]
    onUpdate({ data: newData })
    applyRefreshAnimation()
  }, [chart.data, onUpdate, applyRefreshAnimation])

  useEffect(() => {
    if (chart.refreshInterval === 'manual') return
    const intervalMs = getIntervalMs(chart.refreshInterval)
    if (intervalMs <= 0) return
    const timer = setInterval(refreshData, intervalMs)
    return () => clearInterval(timer)
  }, [chart.refreshInterval, refreshData])

  const createGradient = (ctx: CanvasRenderingContext2D, colors: string[], height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, colors[0])
    gradient.addColorStop(1, colors[1])
    return gradient
  }

  const invertColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `#${(255 - r).toString(16).padStart(2, '0')}${(255 - g).toString(16).padStart(2, '0')}${(255 - b).toString(16).padStart(2, '0')}`
  }

  const getEffectiveColors = () => {
    const scheme = COLOR_SCHEMES[chart.colorSchemeIndex] || COLOR_SCHEMES[0]
    if (isDarkTheme) return scheme.colors
    return scheme.colors.map(invertColor)
  }

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const effectiveColors = getEffectiveColors()
    const textColor = isDarkTheme ? '#ffffff' : '#333333'
    const gridColor = isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

    const Chart = window.Chart

    const labels = chart.data.map(d => d.label)
    const values = chart.data.map(d => d.value)

    let config: any = {
      type: 'line',
      data: { labels, datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDarkTheme ? 'rgba(30, 30, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkTheme ? '#4a4a5f' : '#dddddd',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, maxTicksLimit: 6, font: { size: 10 } },
            grid: { color: gridColor }
          },
          y: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { color: gridColor }
          }
        }
      }
    }

    switch (chart.type) {
      case 'line':
        config.type = 'line'
        config.data.datasets = [{
          data: values,
          borderColor: effectiveColors[0],
          backgroundColor: createGradient(ctx, effectiveColors, canvasRef.current.height),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: effectiveColors[1]
        }]
        break

      case 'bar':
        config.type = 'bar'
        config.data.datasets = [{
          data: values,
          backgroundColor: values.map((_, i) => {
            const ratio = i / values.length
            return effectiveColors[0]
          }),
          borderColor: effectiveColors[1],
          borderWidth: 0,
          borderRadius: 4
        }]
        config.options.scales = {
          x: {
            ticks: { color: textColor, maxTicksLimit: 8, font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { color: gridColor }
          }
        }
        break

      case 'pie':
        config.type = 'doughnut'
        const pieData = values.slice(-8)
        const pieColors: string[] = []
        for (let i = 0; i < pieData.length; i++) {
          const ratio = i / pieData.length
          pieColors.push(effectiveColors[i % effectiveColors.length])
        }
        config.data = {
          labels: pieData.map((_, i) => `数据${i + 1}`),
          datasets: [{
            data: pieData,
            backgroundColor: pieColors,
            borderColor: isDarkTheme ? '#252535' : '#ffffff',
            borderWidth: 2
          }]
        }
        config.options = {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor, font: { size: 11 }, padding: 10 }
            },
            tooltip: {
              backgroundColor: isDarkTheme ? 'rgba(30, 30, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              titleColor: textColor,
              bodyColor: textColor
            }
          },
          cutout: '60%'
        }
        break

      case 'heatmap':
        config.type = 'bar'
        const heatmapSize = 10
        const heatmapData: number[][] = []
        for (let i = 0; i < heatmapSize; i++) {
          heatmapData.push(values.slice(i * 10, (i + 1) * 10))
        }
        config.data = {
          labels: Array.from({ length: heatmapSize }, (_, i) => `${i * 10}s`),
          datasets: heatmapData.map((row, i) => ({
            label: `行${i + 1}`,
            data: row,
            backgroundColor: row.map(v => {
              const alpha = v / 100
              return effectiveColors[0] + Math.round(alpha * 255).toString(16).padStart(2, '0')
            }),
            borderColor: effectiveColors[1],
            borderWidth: 1,
            borderRadius: 2
          }))
        }
        config.options = {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDarkTheme ? 'rgba(30, 30, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              titleColor: textColor,
              bodyColor: textColor
            }
          },
          scales: {
            x: {
              stacked: true,
              ticks: { color: textColor, font: { size: 10 } },
              grid: { display: false }
            },
            y: {
              stacked: true,
              ticks: { color: textColor, font: { size: 10 } },
              grid: { display: false }
            }
          }
        }
        break
    }

    chartInstanceRef.current = new Chart(ctx, config)

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [chart.data, chart.type, chart.colorSchemeIndex, isDarkTheme])

  useEffect(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.update()
    }
  }, [chart.data])

  const handleSaveConfig = () => {
    onUpdate({
      title: configTitle,
      refreshInterval: configInterval,
      colorSchemeIndex: configColorScheme
    })
    setShowConfig(false)
  }

  const openConfig = () => {
    setConfigTitle(chart.title)
    setConfigInterval(chart.refreshInterval)
    setConfigColorScheme(chart.colorSchemeIndex)
    setShowConfig(true)
  }

  const info = CHART_ICONS[chart.type]

  const animationScale = isAnimating ? 0.9 : 1.0

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        onMouseEnter={() => setShowDelete(true)}
        onMouseLeave={() => setShowDelete(false)}
        style={{
          position: 'absolute',
          left: chart.x,
          top: chart.y,
          width: chart.width * chart.scale,
          height: chart.height * chart.scale,
          backgroundColor: isDarkTheme ? '#252535' : '#ffffff',
          border: isDragging ? '2px dashed #00bcd4' : `1px solid ${theme.chartBorder}`,
          borderRadius: 8,
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'box-shadow 0.2s ease, border 0.2s ease',
          transform: `scale(${animationScale})`,
          transitionTimingFunction: 'ease-in-out',
          zIndex: isDragging ? 1000 : 1
        }}
      >
        <div style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${theme.chartBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
          flexShrink: 0
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: isDarkTheme ? '#ffffff' : '#333333',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            textAlign: 'center',
            flex: 1
          }}>
            {chart.title}
          </div>
          {showDelete && (
            <button
              className="chart-delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('确定要删除这个图表吗？')) {
                  onDelete()
                }
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: '#e74c3c',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                padding: 0,
                boxShadow: '0 2px 6px rgba(231, 76, 60, 0.4)',
                transition: 'transform 0.15s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              ×
            </button>
          )}
        </div>

        <div style={{
          position: 'relative',
          width: '100%',
          height: `calc(100% - 38px)`
        }}>
          <canvas ref={canvasRef} />
        </div>

        <button
          className="chart-config-btn chart-no-drag"
          onClick={(e) => {
            e.stopPropagation()
            openConfig()
          }}
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 20px',
            backgroundColor: info.color,
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            opacity: 0,
            transition: 'opacity 0.2s ease',
            boxShadow: `0 2px 8px ${info.color}66`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.parentElement!.querySelector('.chart-config-btn')?.setAttribute('style', '')
          }}
        />

        <style>{`
          div:hover > button.chart-config-btn {
            opacity: 0.9 !important;
          }
        `}</style>
      </div>

      {showConfig && (
        <div
          className="chart-no-drag"
          onClick={() => setShowConfig(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#00000099',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 600,
              height: 400,
              backgroundColor: theme.modalBg,
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflow: 'auto'
            }}
          >
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 20,
              color: isDarkTheme ? '#ffffff' : '#333333',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <span style={{ display: 'inline-block', width: 4, height: 20, backgroundColor: info.color, borderRadius: 2 }}></span>
              图表配置 - {info.name}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: theme.textSecondary
                }}>
                  图表标题
                </label>
                <input
                  type="text"
                  value={configTitle}
                  onChange={(e) => setConfigTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: `1px solid ${theme.chartBorder}`,
                    backgroundColor: isDarkTheme ? '#1e1e2e' : '#f5f5f5',
                    color: isDarkTheme ? '#ffffff' : '#333333',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: theme.textSecondary
                }}>
                  数据源
                </label>
                <select
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: `1px solid ${theme.chartBorder}`,
                    backgroundColor: isDarkTheme ? '#1e1e2e' : '#f5f5f5',
                    color: isDarkTheme ? '#ffffff' : '#333333',
                    fontSize: 14,
                    outline: 'none',
                    opacity: 0.7
                  }}
                >
                  <option>模拟数据 (随机100个点, 0-100)</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: theme.textSecondary
                }}>
                  刷新间隔
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['1s', '5s', '10s', 'manual'] as RefreshInterval[]).map(interval => (
                    <button
                      key={interval}
                      onClick={() => setConfigInterval(interval)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: `1px solid ${configInterval === interval ? '#667eea' : theme.chartBorder}`,
                        backgroundColor: configInterval === interval ? '#667eea' : (isDarkTheme ? '#1e1e2e' : '#f5f5f5'),
                        color: configInterval === interval ? '#ffffff' : (isDarkTheme ? '#ffffff' : '#333333'),
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {interval === '1s' ? '1秒' : interval === '5s' ? '5秒' : interval === '10s' ? '10秒' : '手动'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: theme.textSecondary
                }}>
                  配色方案
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {COLOR_SCHEMES.map((scheme, index) => (
                    <button
                      key={scheme.name}
                      onClick={() => setConfigColorScheme(index)}
                      title={scheme.name}
                      style={{
                        padding: 4,
                        borderRadius: 8,
                        border: configColorScheme === index ? '2px solid #667eea' : `1px solid ${theme.chartBorder}`,
                        backgroundColor: isDarkTheme ? '#1e1e2e' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div
                        style={{
                          height: 32,
                          borderRadius: 4,
                          background: `linear-gradient(135deg, ${scheme.colors[0]}, ${scheme.colors[1]})`
                        }}
                      />
                      <div style={{
                        fontSize: 11,
                        marginTop: 4,
                        color: theme.textSecondary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {scheme.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${theme.chartBorder}`
            }}>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: `1px solid ${theme.chartBorder}`,
                  backgroundColor: 'transparent',
                  color: isDarkTheme ? '#ffffff' : '#333333',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveConfig}
                style={{
                  padding: '8px 24px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#667eea',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5a6fd6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#667eea')}
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ChartCard
