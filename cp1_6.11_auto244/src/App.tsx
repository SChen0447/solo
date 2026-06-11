import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OceanCanvas, type OceanParams, type OceanSnapshot } from './OceanCanvas'
import ControlPanel from './ControlPanel'
import TimeLine from './TimeLine'

const DEFAULT_PARAMS: OceanParams = {
  tideStrength: 50,
  waterTemperature: 18,
  nutrientConcentration: 50,
}

const RECORD_INTERVAL = 15000
const MAX_SNAPSHOTS = 50

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const oceanRef = useRef<OceanCanvas | null>(null)

  const [params, setParams] = useState<OceanParams>(DEFAULT_PARAMS)
  const [snapshots, setSnapshots] = useState<OceanSnapshot[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null)
  const [isPlayingSnapshot, setIsPlayingSnapshot] = useState(false)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'info' } | null>(null)

  const latestBrightnessRef = useRef({ brightness: 0.5, color: 'rgb(0,180,200)' })

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'info') => {
    const id = Date.now()
    setToast({ id, message, type })
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t))
    }, 2500)
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return

    const ocean = new OceanCanvas(canvasRef.current)
    oceanRef.current = ocean

    ocean.setOnBrightnessSample((brightness, color) => {
      latestBrightnessRef.current = { brightness, color }
    })

    ocean.start()

    return () => {
      ocean.destroy()
      oceanRef.current = null
    }
  }, [])

  useEffect(() => {
    if (oceanRef.current && !isPlayingSnapshot) {
      oceanRef.current.setParams(params)
    }
  }, [params, isPlayingSnapshot])

  const recordSnapshot = useCallback(() => {
    if (!oceanRef.current) return

    const snap = oceanRef.current.takeSnapshot()
    setSnapshots((prev) => {
      const next = [...prev, snap]
      if (next.length > MAX_SNAPSHOTS) {
        return next.slice(-MAX_SNAPSHOTS)
      }
      return next
    })
    showToast('📸 已记录新的光谱节点', 'info')
  }, [showToast])

  useEffect(() => {
    const timer = setInterval(recordSnapshot, RECORD_INTERVAL)
    const firstTimer = setTimeout(recordSnapshot, 2000)

    return () => {
      clearInterval(timer)
      clearTimeout(firstTimer)
    }
  }, [recordSnapshot])

  const handlePlayback = useCallback((snapshot: OceanSnapshot) => {
    if (!oceanRef.current) return
    oceanRef.current.loadSnapshot(snapshot)
    setIsPlayingSnapshot(true)
    setParams(snapshot.params)
    showToast('⏪ 已回放该时刻海面快照', 'info')
  }, [showToast])

  const handleSelectSnapshot = useCallback((index: number | null) => {
    setSelectedSnapshot(index)
    if (index === null && isPlayingSnapshot) {
      setIsPlayingSnapshot(false)
      showToast('▶️ 恢复实时海面', 'success')
    }
  }, [isPlayingSnapshot, showToast])

  const handleParamsChange = useCallback((newParams: OceanParams) => {
    setParams(newParams)
    if (isPlayingSnapshot) {
      setIsPlayingSnapshot(false)
      setSelectedSnapshot(null)
    }
  }, [isPlayingSnapshot])

  const captureScreenshot = useCallback(() => {
    if (!oceanRef.current || !canvasRef.current) return

    try {
      const dataUrl = oceanRef.current.getCanvasDataURL()
      const now = new Date()
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

      const metaText = [
        `荧光海潮汐可视化 - 截图`,
        `时间: ${now.toLocaleString('zh-CN')}`,
        `潮汐力度: ${Math.round(params.tideStrength)}`,
        `水温: ${params.waterTemperature.toFixed(1)}°C`,
        `营养盐浓度: ${Math.round(params.nutrientConcentration)}`,
        `海藻亮度: ${Math.round(latestBrightnessRef.current.brightness * 100)}%`,
      ].join('\n')

      const img = new Image()
      img.onload = () => {
        const metaCanvas = document.createElement('canvas')
        metaCanvas.width = img.width
        metaCanvas.height = img.height + 120
        const mctx = metaCanvas.getContext('2d')!
        mctx.fillStyle = '#0a1128'
        mctx.fillRect(0, 0, metaCanvas.width, metaCanvas.height)
        mctx.drawImage(img, 0, 0)

        const grad = mctx.createLinearGradient(0, img.height, 0, metaCanvas.height)
        grad.addColorStop(0, 'rgba(10,17,40,0.0)')
        grad.addColorStop(0.2, 'rgba(10,17,40,0.95)')
        grad.addColorStop(1, 'rgba(10,17,40,1)')
        mctx.fillStyle = grad
        mctx.fillRect(0, img.height - 60, metaCanvas.width, 180)

        mctx.font = 'bold 22px -apple-system, "Microsoft YaHei", sans-serif'
        mctx.fillStyle = '#00ffaa'
        mctx.shadowColor = '#00ffaa'
        mctx.shadowBlur = 15
        mctx.fillText('🌊 荧光海潮汐可视化', 30, img.height + 40)
        mctx.shadowBlur = 0

        mctx.font = '14px -apple-system, "Microsoft YaHei", sans-serif'
        mctx.fillStyle = '#b4e6ec'
        const lines = metaText.split('\n').slice(1)
        lines.forEach((line, i) => {
          mctx.fillText(line, 30, img.height + 68 + i * 22)
        })

        const link = document.createElement('a')
        link.download = `fluorescent_ocean_${timestamp}.png`
        link.href = metaCanvas.toDataURL('image/png')
        link.click()

        showToast('💾 截图已保存到本地', 'success')
      }
      img.src = dataUrl
    } catch (err) {
      console.error('截图失败:', err)
      showToast('❌ 截图保存失败', 'success')
    }
  }, [params, showToast])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        captureScreenshot()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [captureScreenshot])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: 'grab' }}
      />

      <motion.div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div
          className="px-6 py-2.5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(0,188,212,0.15), rgba(0,255,170,0.1))',
            border: '1px solid rgba(0,255,170,0.2)',
            boxShadow: '0 4px 24px rgba(0,255,170,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-pulse">✨</span>
            <div>
              <div
                className="text-base font-bold tracking-wide"
                style={{
                  color: '#00ffaa',
                  textShadow: '0 0 20px rgba(0,255,170,0.6)',
                }}
              >
                荧光海潮汐可视化
              </div>
              <div className="text-[10px] opacity-70 tracking-wider" style={{ color: '#8fd4dc' }}>
                FLUORESCENT OCEAN TIDE SIMULATOR
              </div>
            </div>
            <span className="text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>🌊</span>
          </div>
        </div>
      </motion.div>

      <motion.button
        className="fixed top-4 right-4 z-40 px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer border-0"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={captureScreenshot}
        style={{
          background: 'linear-gradient(135deg, rgba(0,188,212,0.25), rgba(0,255,170,0.15))',
          border: '1px solid rgba(0,255,170,0.25)',
          color: '#00ffaa',
          fontSize: '12px',
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,255,170,0.15)',
          textShadow: '0 0 10px rgba(0,255,170,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span>📷</span>
        <span>保存截图 (S)</span>
      </motion.button>

      <ControlPanel params={params} onChange={handleParamsChange} />

      <TimeLine
        snapshots={snapshots}
        onPlayback={handlePlayback}
        selectedIndex={selectedSnapshot}
        onSelect={handleSelectSnapshot}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium"
              style={{
                background: toast.type === 'success'
                  ? 'linear-gradient(135deg, rgba(0,255,170,0.2), rgba(0,255,170,0.08))'
                  : 'linear-gradient(135deg, rgba(0,188,212,0.2), rgba(0,188,212,0.08))',
                border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,170,0.35)' : 'rgba(0,188,212,0.35)'}`,
                color: toast.type === 'success' ? '#80ffd4' : '#b4e6ec',
                boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 20px ${toast.type === 'success' ? 'rgba(0,255,170,0.15)' : 'rgba(0,188,212,0.15)'}`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                textShadow: '0 0 10px currentColor',
              }}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isPlayingSnapshot && (
        <motion.div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(0,188,212,0.15)',
            border: '1px solid rgba(0,188,212,0.3)',
            color: '#00bcd4',
            fontSize: '11px',
            fontWeight: 500,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            textShadow: '0 0 8px rgba(0,188,212,0.5)',
          }}
        >
          🎞️ 快照回放中 · 修改参数或点击节点外区域恢复实时
        </motion.div>
      )}
    </div>
  )
}
