import { z } from 'zod'
import type { SimulationParams } from '../App'

const tempSchema = z.number().min(1000).max(2000)
const angleSchema = z.number().min(10).max(60)
const speedSchema = z.number().min(1).max(5)

interface ControlsProps {
  params: SimulationParams
  onParamChange: (key: keyof SimulationParams, value: number) => void
  waveAnomaly: number
}

function Controls({ params, onParamChange, waveAnomaly }: ControlsProps) {
  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    const validated = tempSchema.safeParse(value)
    if (validated.success) {
      onParamChange('plumeTemp', value)
    }
  }

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    const validated = angleSchema.safeParse(value)
    if (validated.success) {
      onParamChange('subductionAngle', value)
    }
  }

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    const validated = speedSchema.safeParse(value)
    if (validated.success) {
      onParamChange('subductionSpeed', value)
    }
  }

  const anomalyPosition = ((waveAnomaly + 5) / 10) * 100
  const anomalyColor = waveAnomaly >= 0
    ? `rgb(${255}, ${Math.max(0, 140 - Math.abs(waveAnomaly) * 28)}, ${0})`
    : `rgb(${0}, ${Math.max(0, 120 - Math.abs(waveAnomaly) * 24)}, ${255})`

  return (
    <div className="controls-panel">
      <div className="panel-title">地幔动力学参数</div>

      <div className="control-group">
        <div className="control-label">
          <span className="control-label-text">热柱温度</span>
          <span className="control-value">{params.plumeTemp} °C</span>
        </div>
        <div className="slider-wrapper">
          <input
            type="range"
            min="1000"
            max="2000"
            step="50"
            value={params.plumeTemp}
            onChange={handleTempChange}
            className="temp-slider"
          />
        </div>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span className="control-label-text">俯冲角度</span>
          <span className="control-value">{params.subductionAngle}°</span>
        </div>
        <div className="slider-wrapper">
          <input
            type="range"
            min="10"
            max="60"
            step="1"
            value={params.subductionAngle}
            onChange={handleAngleChange}
            className="angle-slider"
          />
        </div>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span className="control-label-text">俯冲速度</span>
          <span className="control-value">{params.subductionSpeed.toFixed(1)} cm/yr</span>
        </div>
        <div className="slider-wrapper">
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={params.subductionSpeed}
            onChange={handleSpeedChange}
            className="speed-slider"
          />
        </div>
      </div>

      <div className="wave-anomaly-container">
        <div className="wave-anomaly-title">地震波速异常</div>
        <div className="wave-anomaly-bar">
          <div
            className="wave-anomaly-indicator"
            style={{ left: `${anomalyPosition}%` }}
          />
        </div>
        <div
          className="wave-anomaly-value"
          style={{ color: anomalyColor }}
        >
          {waveAnomaly >= 0 ? '+' : ''}{waveAnomaly.toFixed(2)}%
        </div>
      </div>
    </div>
  )
}

export default Controls
