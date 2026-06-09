import React, { useState, useMemo, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import {
  CITY_LIST,
  getFilteredData,
  TemperatureRecord,
  getCityColor,
} from './data/temperatureData'
import ControlPanel from './components/ControlPanel'
import ChartPanel from './components/ChartPanel'
import './styles.css'

export type ChartType = 'box' | 'line' | 'heatmap'

interface StatsSummary {
  maxAvg: { city: string; value: number }
  minAvg: { city: string; value: number }
  mostExtreme: { city: string; diff: number }
  mostStable: { city: string; diff: number }
  mostVolatile: { city: string; diff: number }
}

function computeStats(
  data: TemperatureRecord[],
  selectedCities: string[]
): StatsSummary | null {
  if (data.length === 0 || selectedCities.length === 0) return null

  const cityStats: Record<
    string,
    { avgTemps: number[]; monthlyRange: number[] }
  > = {}

  for (const city of selectedCities) {
    cityStats[city] = { avgTemps: [], monthlyRange: [] }
  }

  for (const record of data) {
    if (!selectedCities.includes(record.city)) continue
    cityStats[record.city].avgTemps.push(record.avgTemp)
    cityStats[record.city].monthlyRange.push(record.highTemp - record.lowTemp)
  }

  let maxAvgCity = ''
  let maxAvgValue = -Infinity
  let minAvgCity = ''
  let minAvgValue = Infinity
  let mostExtremeCity = ''
  let mostExtremeDiff = -Infinity
  let mostStableCity = ''
  let mostStableDiff = Infinity
  let mostVolatileCity = ''
  let mostVolatileDiff = -Infinity

  for (const city of selectedCities) {
    const stats = cityStats[city]
    if (stats.avgTemps.length === 0) continue

    const avgOfAvgs =
      stats.avgTemps.reduce((a, b) => a + b, 0) / stats.avgTemps.length
    const maxForCity = Math.max(...stats.avgTemps)
    const minForCity = Math.min(...stats.avgTemps)
    const extremeDiff = maxForCity - minForCity
    const avgMonthlyRange =
      stats.monthlyRange.reduce((a, b) => a + b, 0) / stats.monthlyRange.length

    if (avgOfAvgs > maxAvgValue) {
      maxAvgValue = avgOfAvgs
      maxAvgCity = city
    }
    if (avgOfAvgs < minAvgValue) {
      minAvgValue = avgOfAvgs
      minAvgCity = city
    }
    if (extremeDiff > mostExtremeDiff) {
      mostExtremeDiff = extremeDiff
      mostExtremeCity = city
    }
    if (avgMonthlyRange < mostStableDiff) {
      mostStableDiff = avgMonthlyRange
      mostStableCity = city
    }
    if (avgMonthlyRange > mostVolatileDiff) {
      mostVolatileDiff = avgMonthlyRange
      mostVolatileCity = city
    }
  }

  return {
    maxAvg: { city: maxAvgCity, value: +maxAvgValue.toFixed(1) },
    minAvg: { city: minAvgCity, value: +minAvgValue.toFixed(1) },
    mostExtreme: { city: mostExtremeCity, diff: +mostExtremeDiff.toFixed(1) },
    mostStable: { city: mostStableCity, diff: +mostStableDiff.toFixed(1) },
    mostVolatile: { city: mostVolatileCity, diff: +mostVolatileDiff.toFixed(1) },
  }
}

function App() {
  const [selectedCities, setSelectedCities] = useState<string[]>([...CITY_LIST])
  const [monthRange, setMonthRange] = useState<[number, number]>([1, 12])
  const [chartType, setChartType] = useState<ChartType>('box')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [displayYear] = useState(2020)

  const filteredData = useMemo(() => {
    return getFilteredData(
      selectedCities.length > 0 ? selectedCities : CITY_LIST,
      displayYear,
      displayYear,
      monthRange[0],
      monthRange[1]
    )
  }, [selectedCities, monthRange, displayYear])

  const stats = useMemo(() => {
    return computeStats(filteredData, selectedCities)
  }, [filteredData, selectedCities])

  const handleCitiesChange = (cities: string[]) => {
    if (cities.length <= 10) {
      setSelectedCities(cities)
    }
  }

  const handleMonthRangeChange = (range: [number, number]) => {
    setMonthRange(range)
  }

  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type)
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const [, setForceUpdate] = useState(0)

  useEffect(() => {
    const handleResize = () => setForceUpdate((n) => n + 1)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="app-container">
      {isMobile && (
        <button
          className="mobile-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '收起面板' : '展开面板'}
        </button>
      )}
      <div
        className={`control-panel ${sidebarOpen ? 'open' : 'closed'}`}
        style={{ width: isMobile ? '100%' : 280 }}
      >
        <ControlPanel
          selectedCities={selectedCities}
          monthRange={monthRange}
          chartType={chartType}
          onCitiesChange={handleCitiesChange}
          onMonthRangeChange={handleMonthRangeChange}
          onChartTypeChange={handleChartTypeChange}
        />
      </div>
      <div className="main-content">
        <div className="chart-wrapper">
          <ChartPanel
            cities={selectedCities}
            data={filteredData}
            chartType={chartType}
            monthRange={monthRange}
          />
        </div>
        {stats && (
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-icon">🌡️</span>
              <span className="stat-label">最高平均气温:</span>
              <span
                className="stat-value"
                style={{ color: getCityColor(stats.maxAvg.city) }}
              >
                {stats.maxAvg.city} {stats.maxAvg.value}°C
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">❄️</span>
              <span className="stat-label">最低平均气温:</span>
              <span
                className="stat-value"
                style={{ color: getCityColor(stats.minAvg.city) }}
              >
                {stats.minAvg.city} {stats.minAvg.value}°C
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <span className="stat-label">温差最极端:</span>
              <span
                className="stat-value"
                style={{ color: getCityColor(stats.mostExtreme.city) }}
              >
                {stats.mostExtreme.city} {stats.mostExtreme.diff}°C
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🌤️</span>
              <span className="stat-label">最稳定:</span>
              <span
                className="stat-value"
                style={{ color: getCityColor(stats.mostStable.city) }}
              >
                {stats.mostStable.city} {stats.mostStable.diff}°C
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🌪️</span>
              <span className="stat-label">最波动:</span>
              <span
                className="stat-value"
                style={{ color: getCityColor(stats.mostVolatile.city) }}
              >
                {stats.mostVolatile.city} {stats.mostVolatile.diff}°C
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
