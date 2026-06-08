import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import BlastFurnace from './BlastFurnace'
import ControlPanel from './ControlPanel'
import OperationLog from './OperationLog'

export interface LogEntry {
  id: number
  time: string
  message: string
}

export interface ChargeItem {
  type: 'ore' | 'coke' | 'limestone'
  count: number
}

function App() {
  const [temperature, setTemperature] = useState(25)
  const [isBlasting, setIsBlasting] = useState(false)
  const [chargeLevel, setChargeLevel] = useState(0)
  const [ironLevel, setIronLevel] = useState(0)
  const [isTapping, setIsTapping] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logCollapsed, setLogCollapsed] = useState(false)
  const [chargeLayers, setChargeLayers] = useState<Array<{ type: string; height: number }>>([])
  const [isWarning, setIsWarning] = useState(false)
  
  const startTimeRef = useRef<number>(Date.now())
  const logIdRef = useRef(0)
  const blastIntervalRef = useRef<number | null>(null)
  const ironIntervalRef = useRef<number | null>(null)
  const tapAnimationRef = useRef<number | null>(null)

  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const addLog = useCallback((message: string) => {
    const elapsed = Date.now() - startTimeRef.current
    const time = formatTime(elapsed)
    logIdRef.current += 1
    setLogs(prev => {
      const newLogs = [...prev, { id: logIdRef.current, time, message }]
      if (newLogs.length > 100) {
        return newLogs.slice(-100)
      }
      return newLogs
    })
  }, [formatTime])

  useEffect(() => {
    addLog('系统启动，高炉就绪')
  }, [addLog])

  useEffect(() => {
    if (chargeLevel >= 80) {
      setIsWarning(true)
    } else {
      setIsWarning(false)
    }
  }, [chargeLevel])

  useEffect(() => {
    if (isBlasting) {
      blastIntervalRef.current = window.setInterval(() => {
        setTemperature(prev => {
          const newTemp = Math.min(prev + 50, 1200)
          return newTemp
        })
      }, 2000)
    } else {
      if (blastIntervalRef.current) {
        clearInterval(blastIntervalRef.current)
        blastIntervalRef.current = null
      }
    }
    return () => {
      if (blastIntervalRef.current) {
        clearInterval(blastIntervalRef.current)
      }
    }
  }, [isBlasting])

  useEffect(() => {
    if (isBlasting && temperature >= 1000 && !isTapping) {
      ironIntervalRef.current = window.setInterval(() => {
        setIronLevel(prev => Math.min(prev + 2, 100))
      }, 1000)
    } else {
      if (ironIntervalRef.current) {
        clearInterval(ironIntervalRef.current)
        ironIntervalRef.current = null
      }
    }
    return () => {
      if (ironIntervalRef.current) {
        clearInterval(ironIntervalRef.current)
      }
    }
  }, [isBlasting, temperature, isTapping])

  const handleCharge = useCallback((items: ChargeItem[]) => {
    let oreCount = 0, cokeCount = 0, limestoneCount = 0
    
    items.forEach(item => {
      if (item.type === 'ore') oreCount += item.count
      if (item.type === 'coke') cokeCount += item.count
      if (item.type === 'limestone') limestoneCount += item.count
    })

    const totalHeight = (oreCount + cokeCount + limestoneCount) * 3
    
    setChargeLayers(prev => {
      const newLayers = [...prev]
      if (oreCount > 0) newLayers.push({ type: 'ore', height: oreCount * 3 })
      if (cokeCount > 0) newLayers.push({ type: 'coke', height: cokeCount * 3 })
      if (limestoneCount > 0) newLayers.push({ type: 'limestone', height: limestoneCount * 3 })
      return newLayers.slice(-50)
    })

    setChargeLevel(prev => {
      const newLevel = Math.min(prev + totalHeight, 100)
      return newLevel
    })

    addLog(`布料-矿石*${oreCount}，焦炭*${cokeCount}，石灰石*${limestoneCount}，当前料面高度${Math.min(chargeLevel + totalHeight, 100).toFixed(0)}%`)
  }, [addLog, chargeLevel])

  const handleBlast = useCallback(() => {
    if (!isBlasting) {
      setIsBlasting(true)
      addLog(`送风启动，当前温度${temperature}°C`)
    } else {
      setIsBlasting(false)
      addLog(`送风停止，当前温度${temperature}°C`)
    }
  }, [isBlasting, temperature, addLog])

  const handleTap = useCallback(() => {
    if (ironLevel < 70 || isTapping) return
    
    setIsTapping(true)
    addLog(`出铁开始，铁水产出量${ironLevel.toFixed(0)}%`)
    
    const startLevel = ironLevel
    const targetLevel = 10
    const duration = 3000
    const startTime = Date.now()
    
    const animateTap = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const currentLevel = startLevel - (startLevel - targetLevel) * progress
      
      setIronLevel(currentLevel)
      
      if (progress < 1) {
        tapAnimationRef.current = requestAnimationFrame(animateTap)
      } else {
        setIsTapping(false)
        addLog(`出铁完成，剩余铁水${targetLevel}%`)
      }
    }
    
    tapAnimationRef.current = requestAnimationFrame(animateTap)
  }, [ironLevel, isTapping, addLog])

  useEffect(() => {
    return () => {
      if (tapAnimationRef.current) {
        cancelAnimationFrame(tapAnimationRef.current)
      }
      if (blastIntervalRef.current) {
        clearInterval(blastIntervalRef.current)
      }
      if (ironIntervalRef.current) {
        clearInterval(ironIntervalRef.current)
      }
    }
  }, [])

  const canTap = ironLevel >= 70 && !isTapping

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="scene-container">
          <div className="scene-header">
            <h1 className="title">高炉炼铁模拟器</h1>
            <div className="status-bar">
              <span className={`status-item ${isWarning ? 'warning' : ''}`}>
                料面: {chargeLevel.toFixed(0)}%
              </span>
              <span className="status-item">
                铁水: {ironLevel.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="canvas-wrapper">
            <Canvas
              camera={{ position: [8, 6, 10], fov: 50 }}
              gl={{ antialias: true }}
            >
              <color attach="background" args={['#0f0f1e']} />
              <ambientLight intensity={0.4} />
              <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
              <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ff6600" />
              
              <BlastFurnace
                chargeLevel={chargeLevel}
                chargeLayers={chargeLayers}
                temperature={temperature}
                ironLevel={ironLevel}
                isBlasting={isBlasting}
                isTapping={isTapping}
                isWarning={isWarning}
              />
              
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={5}
                maxDistance={30}
                target={[0, 3, 0]}
              />
            </Canvas>
            
            {isWarning && (
              <div className="warning-overlay">
                <div className="warning-text">⚠ 料面过高，请暂停布料</div>
              </div>
            )}
          </div>
        </div>
        
        <ControlPanel
          onCharge={handleCharge}
          onBlast={handleBlast}
          onTap={handleTap}
          isBlasting={isBlasting}
          canTap={canTap}
          temperature={temperature}
          isTapping={isTapping}
        />
      </div>
      
      <OperationLog
        logs={logs}
        collapsed={logCollapsed}
        onToggle={() => setLogCollapsed(!logCollapsed)}
      />
    </div>
  )
}

export default App
