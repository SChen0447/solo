import React from 'react'
import { WeatherType } from './types'

interface WeatherControllerProps {
  currentWeather: WeatherType
  onWeatherChange: (weather: WeatherType) => void
  elementCount: number
  maxElements: number
  onSave: () => void
  onLoad: () => void
}

const WeatherController: React.FC<WeatherControllerProps> = ({
  currentWeather,
  onWeatherChange,
  elementCount,
  maxElements,
  onSave,
  onLoad,
}) => {
  const weathers: { type: WeatherType; name: string; color: string; icon: string }[] = [
    { type: 'sunny', name: '晴天', color: '#f9d71c', icon: '☀️' },
    { type: 'rainy', name: '雨天', color: '#4a90d9', icon: '🌧️' },
    { type: 'snowy', name: '雪天', color: '#f0f4f8', icon: '❄️' },
    { type: 'cloudy', name: '阴天', color: '#6c757d', icon: '☁️' },
  ]

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>天气控制</h3>
      </div>

      <div style={styles.weatherGrid}>
        {weathers.map((w) => (
          <button
            key={w.type}
            onClick={() => onWeatherChange(w.type)}
            style={{
              ...styles.weatherButton,
              backgroundColor: w.color,
              border: currentWeather === w.type ? '3px solid #ffd700' : '3px solid transparent',
              transform: currentWeather === w.type ? 'scale(1.1)' : 'scale(1)',
            }}
            title={w.name}
          >
            <span style={styles.weatherIcon}>{w.icon}</span>
          </button>
        ))}
      </div>

      <div style={styles.weatherLabel}>
        <span style={styles.labelText}>
          当前：{weathers.find((w) => w.type === currentWeather)?.name}
        </span>
      </div>

      <div style={styles.divider} />

      <div style={styles.statsSection}>
        <h4 style={styles.sectionTitle}>场景统计</h4>
        <div style={styles.statBox}>
          <span style={styles.statLabel}>元素数量</span>
          <span style={{
            ...styles.statValue,
            color: elementCount > 100 ? '#ff6b6b' : elementCount > 80 ? '#ffa94d' : '#51cf66',
          }}>
            {elementCount} / {maxElements}
          </span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${(elementCount / maxElements) * 100}%`,
              backgroundColor: elementCount > 100 ? '#ff6b6b' : elementCount > 80 ? '#ffa94d' : '#51cf66',
            }}
          />
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.actionsSection}>
        <h4 style={styles.sectionTitle}>场景操作</h4>
        <button onClick={onSave} style={styles.actionButton}>
          💾 保存场景
        </button>
        <button onClick={onLoad} style={{ ...styles.actionButton, backgroundColor: '#4a5568' }}>
          📂 加载场景
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '160px',
    backgroundColor: '#2d3e4f',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '-2px 0 4px rgba(0,0,0,0.2)',
    overflowY: 'auto',
  },
  header: {
    borderBottom: '1px solid #4a5568',
    paddingBottom: '12px',
  },
  title: {
    color: '#f1f1f1',
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  weatherGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  weatherButton: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  weatherIcon: {
    fontSize: '24px',
  },
  weatherLabel: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#3d4f60',
    borderRadius: '8px',
  },
  labelText: {
    color: '#f1f1f1',
    fontSize: '14px',
    fontWeight: 500,
  },
  divider: {
    height: '1px',
    backgroundColor: '#4a5568',
  },
  statsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    color: '#f1f1f1',
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
  },
  statBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#a0aec0',
    fontSize: '12px',
  },
  statValue: {
    color: '#51cf66',
    fontSize: '14px',
    fontWeight: 600,
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#4a5568',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  actionsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  actionButton: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#2d6a4f',
    color: '#f1f1f1',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background-color 0.2s, transform 0.1s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
}

export default WeatherController
