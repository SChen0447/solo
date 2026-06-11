import { useMemo, useState, useRef, useEffect } from 'react'
import Scene from './components/Scene'
import Controls from './components/Controls'
import { z } from 'zod'

const paramsSchema = z.object({
  plumeTemp: z.number().min(1000).max(2000),
  subductionAngle: z.number().min(10).max(60),
  subductionSpeed: z.number().min(1).max(5),
})

export interface SimulationParams {
  plumeTemp: number
  subductionAngle: number
  subductionSpeed: number
}

export interface ClickInfo {
  visible: boolean
  x: number
  y: number
  depth: number
  temperature: number
  type: string
}

function App() {
  const [params, setParams] = useState<SimulationParams>({
    plumeTemp: 1500,
    subductionAngle: 30,
    subductionSpeed: 3,
  })

  const [fps, setFps] = useState(60)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const [clickInfo, setClickInfo] = useState<ClickInfo>({
    visible: false,
    x: 0,
    y: 0,
    depth: 0,
    temperature: 0,
    type: '',
  })

  useEffect(() => {
    let animationId: number
    const updateFps = () => {
      frameCount.current++
      const now = performance.now()
      if (now - lastTime.current >= 1000) {
        setFps(frameCount.current)
        frameCount.current = 0
        lastTime.current = now
      }
      animationId = requestAnimationFrame(updateFps)
    }
    animationId = requestAnimationFrame(updateFps)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const waveAnomaly = useMemo(() => {
    const tempFactor = (params.plumeTemp - 1500) / 500
    const speedFactor = (params.subductionSpeed - 3) / 4
    const angleFactor = (params.subductionAngle - 35) / 50
    const anomaly = (tempFactor * 3 + speedFactor * 1.5 + angleFactor * 0.5)
    return Math.max(-5, Math.min(5, anomaly))
  }, [params])

  const handleParamChange = (key: keyof SimulationParams, value: number) => {
    const newParams = { ...params, [key]: value }
    const result = paramsSchema.safeParse(newParams)
    if (result.success) {
      setParams(result.data)
    }
  }

  const handleSceneClick = (info: Omit<ClickInfo, 'visible'>) => {
    setClickInfo({ ...info, visible: true })
    setTimeout(() => {
      setClickInfo(prev => ({ ...prev, visible: false }))
    }, 4000)
  }

  return (
    <div className="app-container">
      <Controls
        params={params}
        onParamChange={handleParamChange}
        waveAnomaly={waveAnomaly}
      />
      <div className="scene-container">
        <Scene
          params={params}
          onClick={handleSceneClick}
        />
        <div className={`fps-counter ${fps < 30 ? 'low' : ''}`}>
          FPS: {fps}
        </div>
        {clickInfo.visible && (
          <div
            className="info-bubble"
            style={{
              left: clickInfo.x + 15,
              top: clickInfo.y - 10,
              opacity: clickInfo.visible ? 1 : 0,
              transform: clickInfo.visible ? 'translateY(0)' : 'translateY(-10px)',
            }}
          >
            <div className="info-bubble-title">{clickInfo.type}</div>
            <div className="info-bubble-row">
              <span className="info-bubble-label">深度:</span>
              <span className="info-bubble-data">{clickInfo.depth.toFixed(0)} km</span>
            </div>
            <div className="info-bubble-row">
              <span className="info-bubble-label">温度:</span>
              <span className="info-bubble-data">{clickInfo.temperature.toFixed(0)} °C</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
