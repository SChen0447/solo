import { useState, useRef, useEffect } from 'react'
import { CITY_LIST, getCityColor } from '../data/temperatureData'
import { ChartType } from '../main'

interface ControlPanelProps {
  selectedCities: string[]
  monthRange: [number, number]
  chartType: ChartType
  onCitiesChange: (cities: string[]) => void
  onMonthRangeChange: (range: [number, number]) => void
  onChartTypeChange: (type: ChartType) => void
}

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

export default function ControlPanel({
  selectedCities,
  monthRange,
  chartType,
  onCitiesChange,
  onMonthRangeChange,
  onChartTypeChange,
}: ControlPanelProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      onCitiesChange(selectedCities.filter((c) => c !== city))
    } else if (selectedCities.length < 10) {
      onCitiesChange([...selectedCities, city])
    }
  }

  const handleStartMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    const end = Math.max(val, monthRange[1])
    onMonthRangeChange([val, end])
  }

  const handleEndMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    const start = Math.min(val, monthRange[0])
    onMonthRangeChange([start, val])
  }

  return (
    <div className="controls-container">
      <h2 className="panel-title">控制面板</h2>

      <div className="control-section">
        <label className="control-label">
          选择城市（最多10个，已选 {selectedCities.length}）
        </label>
        <div className="city-dropdown" ref={dropdownRef}>
          <div
            className="dropdown-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="selected-cities-display">
              {selectedCities.length === 0 ? (
                <span className="placeholder-text">请选择城市...</span>
              ) : (
                selectedCities.map((city) => (
                  <span
                    key={city}
                    className="city-tag"
                    style={{ backgroundColor: getCityColor(city) + '33', color: getCityColor(city) }}
                  >
                    {city}
                  </span>
                ))
              )}
            </div>
            <span className="dropdown-arrow">{dropdownOpen ? '▲' : '▼'}</span>
          </div>
          {dropdownOpen && (
            <div className="dropdown-menu">
              {CITY_LIST.map((city) => {
                const isSelected = selectedCities.includes(city)
                const disabled = !isSelected && selectedCities.length >= 10
                return (
                  <div
                    key={city}
                    className={`dropdown-item ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && toggleCity(city)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      disabled={disabled}
                    />
                    <span
                      className="city-color-dot"
                      style={{ backgroundColor: getCityColor(city) }}
                    />
                    <span>{city}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="control-section">
        <label className="control-label">
          月份范围：{MONTH_NAMES[monthRange[0] - 1]} - {MONTH_NAMES[monthRange[1] - 1]}
        </label>
        <div className="month-sliders">
          <div className="slider-row">
            <span className="slider-label">起始</span>
            <input
              type="range"
              min="1"
              max="12"
              value={monthRange[0]}
              onChange={handleStartMonthChange}
              className="md-slider"
            />
            <span className="slider-value">{monthRange[0]}月</span>
          </div>
          <div className="slider-row">
            <span className="slider-label">结束</span>
            <input
              type="range"
              min="1"
              max="12"
              value={monthRange[1]}
              onChange={handleEndMonthChange}
              className="md-slider"
            />
            <span className="slider-value">{monthRange[1]}月</span>
          </div>
        </div>
      </div>

      <div className="control-section">
        <label className="control-label">图表类型</label>
        <div className="chart-type-toggle">
          <button
            className={`toggle-btn ${chartType === 'box' ? 'active' : ''}`}
            onClick={() => onChartTypeChange('box')}
          >
            箱线图
          </button>
          <button
            className={`toggle-btn ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => onChartTypeChange('line')}
          >
            折线图
          </button>
          <button
            className={`toggle-btn ${chartType === 'heatmap' ? 'active' : ''}`}
            onClick={() => onChartTypeChange('heatmap')}
          >
            热力图
          </button>
        </div>
      </div>
    </div>
  )
}
