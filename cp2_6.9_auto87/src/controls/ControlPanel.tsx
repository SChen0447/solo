import React from 'react'
import { GlassParams } from '../types'
import { exportCSS } from '../utils/exportCSS'

interface ControlPanelProps {
  params: GlassParams
  onChange: (params: GlassParams) => void
  onExport: () => void
}

interface SliderConfig {
  key: keyof Omit<GlassParams, 'borderColor'>
  label: string
  min: number
  max: number
  step: number
  suffix?: string
  formatValue?: (v: number) => string
}

const sliderConfigs: SliderConfig[] = [
  { key: 'blurRadius', label: '模糊半径', min: 0, max: 30, step: 1, suffix: 'px' },
  { key: 'opacity', label: '透明度', min: 0.1, max: 0.9, step: 0.1, formatValue: (v) => v.toFixed(1) },
  { key: 'highlightPosition', label: '光泽位置', min: 0, max: 100, step: 5, suffix: '%' },
  { key: 'highlightIntensity', label: '光泽强度', min: 0, max: 1, step: 0.1, formatValue: (v) => v.toFixed(1) },
  { key: 'gradientHue', label: '渐变色相', min: 0, max: 360, step: 1, suffix: '°' },
  { key: 'gradientSaturation', label: '渐变饱和度', min: 0, max: 100, step: 1, suffix: '%' },
]

const ControlPanel: React.FC<ControlPanelProps> = React.memo(({ params, onChange, onExport }) => {
  const handleSliderChange = (key: SliderConfig['key'], value: number) => {
    onChange({ ...params, [key]: value })
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...params, borderColor: e.target.value })
  }

  const handleExport = async () => {
    await exportCSS(params)
    onExport()
  }

  const handleHexToRgba = (hex: string): string => {
    const cleanHex = hex.replace('#', '')
    if (cleanHex.length === 8) {
      const r = parseInt(cleanHex.slice(0, 2), 16)
      const g = parseInt(cleanHex.slice(2, 4), 16)
      const b = parseInt(cleanHex.slice(4, 6), 16)
      const a = parseInt(cleanHex.slice(6, 8), 16) / 255
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
    }
    return hex
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: '#1E1E2E',
        borderTop: '1px solid #FFFFFF08',
        borderBottom: '1px solid #FFFFFF10',
      }}
    >
      <div className="flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-semibold text-white mb-6">参数控制面板</h2>

        <div className="space-y-5">
          {sliderConfigs.map((config) => {
            const value = params[config.key] as number
            const displayValue = config.formatValue
              ? config.formatValue(value)
              : `${value}${config.suffix || ''}`

            const percentage = ((value - config.min) / (config.max - config.min)) * 100

            return (
              <div key={config.key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    className="text-sm"
                    style={{ color: '#A0A0B0', fontSize: '14px' }}
                  >
                    {config.label}
                  </label>
                  <span
                    className="text-sm font-mono"
                    style={{ color: '#A78BFA', fontSize: '14px' }}
                  >
                    {displayValue}
                  </span>
                </div>
                <div className="relative w-full" style={{ height: '24px' }}>
                  <div
                    className="absolute top-1/2 left-0 h-1 w-full rounded"
                    style={{ background: '#2D2D3F', transform: 'translateY(-50%)' }}
                  />
                  <div
                    className="absolute top-1/2 left-0 h-1 rounded"
                    style={{
                      background: 'linear-gradient(to right, #7C3AED, #A78BFA)',
                      width: `${percentage}%`,
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={value}
                    onChange={(e) => handleSliderChange(config.key, parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{
                      WebkitAppearance: 'slider-vertical',
                      zIndex: 10,
                    }}
                  />
                  <div
                    className="absolute top-1/2 rounded-full pointer-events-none"
                    style={{
                      width: '16px',
                      height: '16px',
                      background: '#7C3AED',
                      border: '2px solid #A78BFA',
                      transform: `translate(calc(${percentage}% - 8px), -50%)`,
                      left: 0,
                      zIndex: 5,
                    }}
                  />
                </div>
              </div>
            )
          })}

          <div className="flex items-center justify-between">
            <label className="text-sm" style={{ color: '#A0A0B0', fontSize: '14px' }}>
              边框颜色
            </label>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-mono"
                style={{ color: '#A78BFA', fontSize: '12px' }}
              >
                {handleHexToRgba(params.borderColor)}
              </span>
              <input
                type="color"
                value={params.borderColor.length === 9 ? params.borderColor.slice(0, 7) : params.borderColor}
                onChange={handleColorChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-5" style={{ borderTop: '1px solid #FFFFFF10' }}>
        <button
          onClick={handleExport}
          className="w-full py-3 rounded-lg font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
          }}
        >
          导出 CSS
        </button>
      </div>
    </div>
  )
})

ControlPanel.displayName = 'ControlPanel'

export default ControlPanel
