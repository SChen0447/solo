import { useState } from 'react'
import type { FilterConfig } from '../types'
import { NEON_COLORS } from '../types'

interface ToolbarProps {
  isMobile: boolean
  currentColor: string
  brushWidth: number
  filters: FilterConfig
  isRecording: boolean
  recordingTime: number
  isPlaying: boolean
  isPaused: boolean
  playbackSpeed: number
  playbackProgress: number
  onSetColor: (color: string) => void
  onSetWidth: (width: number) => void
  onToggleFilter: (filter: keyof FilterConfig) => void
  onUpdateFilter: (filter: keyof FilterConfig, key: string, value: number) => void
  onClear: () => void
  onSave: () => void
  onToggleRecording: () => void
  onStartPlayback: (speed: number) => void
  onTogglePause: () => void
  onStopPlayback: () => void
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  color: '#fff',
  backgroundColor: 'rgba(255,255,255,0.1)',
  transition: 'transform 0.2s ease, background-color 0.2s ease',
  outline: 'none'
}

const getButtonHoverStyle = (active?: boolean): React.CSSProperties => ({
  ...buttonStyle,
  backgroundColor: active ? 'rgba(0,255,255,0.3)' : 'rgba(255,255,255,0.15)'
})

export default function Toolbar(props: ToolbarProps) {
  const {
    isMobile,
    currentColor,
    brushWidth,
    filters,
    isRecording,
    recordingTime,
    isPlaying,
    isPaused,
    playbackProgress,
    onSetColor,
    onSetWidth,
    onToggleFilter,
    onUpdateFilter,
    onClear,
    onSave,
    onToggleRecording,
    onStartPlayback,
    onTogglePause,
    onStopPlayback
  } = props

  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [expandedFilter, setExpandedFilter] = useState<keyof FilterConfig | null>(null)

  const filterLabels: Record<keyof FilterConfig, string> = {
    blur: '模糊',
    glow: '发光',
    mosaic: '马赛克',
    pixelate: '像素化',
    neonEdge: '霓虹边缘'
  }

  const toolbarContainerStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxHeight: '100%',
        overflowY: 'auto',
        padding: '12px',
        backgroundColor: 'rgba(13, 17, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 100,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px'
      }
    : {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '240px',
        height: '100%',
        padding: '16px',
        backgroundColor: 'rgba(13, 17, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        zIndex: 100,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }

  const renderSection = (title: string, children: React.ReactNode) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </div>
      {children}
    </div>
  )

  const renderColorPicker = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px'
    }}>
      {NEON_COLORS.map((color) => {
        const isSelected = color === currentColor
        return (
          <button
            key={color}
            onClick={() => onSetColor(color)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: isSelected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
              backgroundColor: color,
              cursor: 'pointer',
              padding: 0,
              boxShadow: isSelected ? `0 0 15px ${color}` : 'none',
              animation: isSelected ? 'pulse 1.5s ease-in-out infinite' : 'none',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          />
        )
      })}
    </div>
  )

  const renderBrushWidth = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.7)'
        }}>画笔粗细</span>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: currentColor
        }}>{brushWidth}px</span>
      </div>
      <input
        type="range"
        min={3}
        max={12}
        value={brushWidth}
        onChange={(e) => onSetWidth(Number(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          borderRadius: '2px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
  )

  const renderFilterItem = (filterKey: keyof FilterConfig) => {
    const filter = filters[filterKey]
    const isExpanded = expandedFilter === filterKey
    const hasParams = filterKey !== 'neonEdge'

    return (
      <div key={filterKey} style={{
        border: `1px solid ${filter.enabled ? 'rgba(0,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease'
      }}>
        <div
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: filter.enabled ? 'rgba(0,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'background-color 0.2s ease'
          }}
        >
          <button
            onClick={() => {
              if (hasParams) {
                setExpandedFilter(isExpanded ? null : filterKey)
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              color: filter.enabled ? '#00ffff' : 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: hasParams ? 'pointer' : 'default',
              textAlign: 'left',
              padding: 0,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {hasParams && (
              <span style={{
                fontSize: '10px',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                display: 'inline-block'
              }}>▶</span>
            )}
            {filterLabels[filterKey]}
          </button>
          <button
            onClick={() => onToggleFilter(filterKey)}
            style={{
              width: '36px',
              height: '18px',
              borderRadius: '9px',
              backgroundColor: filter.enabled ? '#00ffff' : 'rgba(255,255,255,0.2)',
              position: 'relative',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              transition: 'background-color 0.2s ease'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '2px',
              left: filter.enabled ? '20px' : '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              transition: 'left 0.2s ease'
            }} />
          </button>
        </div>

        {isExpanded && filter.enabled && hasParams && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.05)'
          }}>
            {filterKey === 'blur' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>半径</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00ffff' }}>
                    {filters.blur.radius}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={filters.blur.radius}
                  onChange={(e) => onUpdateFilter('blur', 'radius', Number(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            )}

            {filterKey === 'glow' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>强度</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00ffff' }}>
                    {filters.glow.intensity.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={filters.glow.intensity * 10}
                  onChange={(e) => onUpdateFilter('glow', 'intensity', Number(e.target.value) / 10)}
                  style={sliderStyle}
                />
              </div>
            )}

            {filterKey === 'mosaic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>块大小</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00ffff' }}>
                    {filters.mosaic.blockSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={16}
                  value={filters.mosaic.blockSize}
                  onChange={(e) => onUpdateFilter('mosaic', 'blockSize', Number(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            )}

            {filterKey === 'pixelate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>色阶</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00ffff' }}>
                    {filters.pixelate.levels}
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={64}
                  value={filters.pixelate.levels}
                  onChange={(e) => onUpdateFilter('pixelate', 'levels', Number(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer'
  }

  const renderFilters = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      {(Object.keys(filters) as (keyof FilterConfig)[]).map(renderFilterItem)}
    </div>
  )

  const renderActionButtons = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px'
    }}>
      <button
        onClick={onClear}
        style={hoveredButton === 'clear' ? getButtonHoverStyle() : buttonStyle}
        onMouseEnter={() => setHoveredButton('clear')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        清除画布
      </button>
      <button
        onClick={onSave}
        style={hoveredButton === 'save' ? getButtonHoverStyle() : buttonStyle}
        onMouseEnter={() => setHoveredButton('save')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        保存PNG
      </button>
    </div>
  )

  const renderRecording = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <button
        onClick={onToggleRecording}
        style={{
          ...(hoveredButton === 'record' ? getButtonHoverStyle(isRecording) : buttonStyle),
          backgroundColor: isRecording ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.1)',
          color: isRecording ? '#ff6b6b' : '#fff'
        }}
        onMouseEnter={() => setHoveredButton('record')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        {isRecording ? `● 录制中 ${recordingTime.toFixed(1)}s` : '● 开始录制'}
      </button>

      {isRecording && (
        <div style={{
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${(recordingTime / 30) * 100}%`,
            backgroundColor: '#ff6b6b',
            transition: 'width 0.1s linear'
          }} />
        </div>
      )}
    </div>
  )

  const renderPlayback = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {!isPlaying ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px'
        }}>
          {[1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => onStartPlayback(speed)}
              style={hoveredButton === `play-${speed}` ? getButtonHoverStyle() : buttonStyle}
              onMouseEnter={() => setHoveredButton(`play-${speed}`)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              ▶ {speed}x
            </button>
          ))}
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px'
          }}>
            <button
              onClick={onTogglePause}
              style={hoveredButton === 'pause' ? getButtonHoverStyle() : buttonStyle}
              onMouseEnter={() => setHoveredButton('pause')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              {isPaused ? '▶ 继续' : '❚❚ 暂停'}
            </button>
            <button
              onClick={onStopPlayback}
              style={{
                ...(hoveredButton === 'stop' ? getButtonHoverStyle() : buttonStyle),
                backgroundColor: 'rgba(255,107,107,0.2)'
              }}
              onMouseEnter={() => setHoveredButton('stop')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              ■ 停止
            </button>
          </div>
          <div style={{
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${playbackProgress * 100}%`,
              backgroundColor: '#00ffff',
              transition: 'width 0.1s linear'
            }} />
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #00ffff;
            cursor: pointer;
            box-shadow: 0 0 8px rgba(0,255,255,0.5);
          }
          input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #00ffff;
            cursor: pointer;
            border: none;
            box-shadow: 0 0 8px rgba(0,255,255,0.5);
          }
          ::-webkit-scrollbar {
            width: 4px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.2);
          }
        `}
      </style>

      <div style={toolbarContainerStyle}>
        {renderSection('画笔颜色', renderColorPicker())}
        {renderSection('画笔设置', renderBrushWidth())}
        {renderSection('滤镜效果', renderFilters())}
        {renderSection('操作', renderActionButtons())}
        {renderSection('录制', renderRecording())}
        {renderSection('回放', renderPlayback())}

        <div style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          textAlign: 'center'
        }}>
          Light Paint Studio v1.0
        </div>
      </div>
    </>
  )
}
