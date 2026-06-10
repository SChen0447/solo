import { useEffect, useRef, useState, useCallback } from 'react'
import { EmotionResult, EMOTION_LABELS } from './types'
import { drawEmotionRadar } from './emotionChart'

type HistoryItem = {
  id: number
  timestamp: number
  name: string
  emoji: string
  confidence: number
  color: string
}

type WorkerState = 'idle' | 'initializing' | 'ready' | 'error'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const DEFAULT_SCORES = EMOTION_LABELS.map(label => {
  const map: Record<string, { name: string; emoji: string; color: string }> = {
    happy: { name: '高兴', emoji: '😊', color: '#22c55e' },
    sad: { name: '悲伤', emoji: '😢', color: '#6366f1' },
    angry: { name: '愤怒', emoji: '😡', color: '#ef4444' },
    surprise: { name: '惊讶', emoji: '😲', color: '#f59e0b' },
    fear: { name: '恐惧', emoji: '😨', color: '#a855f7' },
    disgust: { name: '厌恶', emoji: '🤢', color: '#84cc16' }
  }
  return {
    label,
    ...map[label],
    confidence: 0.05
  }
})

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const radarRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const historyIdRef = useRef(0)
  const historyRef = useRef<HTMLUListElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sharedCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [cameraAvailable, setCameraAvailable] = useState(true)
  const [workerState, setWorkerState] = useState<WorkerState>('idle')
  const [workerError, setWorkerError] = useState<string>('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [result, setResult] = useState<EmotionResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    const worker = new Worker(new URL('./emotion.worker.ts', import.meta.url), {
      type: 'module'
    })
    workerRef.current = worker

    worker.onmessage = (e) => {
      const { id, type, result: res, error } = e.data
      if (type === 'init-complete') {
        setWorkerState('ready')
      } else if (type === 'error') {
        setWorkerState('error')
        setWorkerError(error || 'Worker error')
        setIsCapturing(false)
      } else if (type === 'result') {
        setIsCapturing(false)
        if (res) {
          setResult(res as EmotionResult)
          const dom = (res as EmotionResult).dominant
          historyIdRef.current += 1
          setHistory(prev => [
            ...prev,
            {
              id: historyIdRef.current,
              timestamp: dom ? Date.now() : Date.now(),
              name: dom?.name || '未知',
              emoji: dom?.emoji || '❓',
              confidence: dom?.confidence || 0,
              color: dom?.color || '#64748b'
            }
          ])
        }
      }
    }

    setWorkerState('initializing')
    worker.postMessage({ id: 0, type: 'init' })

    return () => {
      worker.terminate()
      workerRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCameraAvailable(true)
      } catch (err) {
        console.warn('Camera unavailable:', err)
        setCameraAvailable(false)
      }
    }
    initCamera()
  }, [])

  const drawRadar = useCallback((scores: any[] = DEFAULT_SCORES) => {
    const canvas = radarRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const size = 340
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = size + 'px'
      canvas.style.height = size + 'px'
    }
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const proxyCanvas: HTMLCanvasElement = new Proxy(canvas, {
        get(target, prop) {
          if (prop === 'width') return size
          if (prop === 'height') return size
          const v = (target as any)[prop]
          return typeof v === 'function' ? v.bind(target) : v
        }
      })
      drawEmotionRadar(proxyCanvas, scores)
    }
  }, [])

  useEffect(() => {
    let animId: number
    let startTime = performance.now()
    const render = () => {
      drawRadar(result?.scores)
      startTime = performance.now()
      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [result, drawRadar])

  useEffect(() => {
    if (history.length > 0 && historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [history])

  const captureFromVideo = async () => {
    if (!videoRef.current || isCapturing || workerState !== 'ready') return
    setIsCapturing(true)
    try {
      const video = videoRef.current
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      if (!sharedCanvasRef.current) sharedCanvasRef.current = document.createElement('canvas')
      const canvas = sharedCanvasRef.current
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.save()
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, w, h)
      ctx.restore()
      const imageBitmap = await createImageBitmap(canvas)
      workerRef.current?.postMessage(
        { id: Date.now(), type: 'detect', imageBitmap, width: w, height: h },
        [imageBitmap]
      )
    } catch (err: any) {
      setIsCapturing(false)
      console.error('Capture failed:', err)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || isCapturing || workerState !== 'ready') return
    if (!/image\/(jpeg|png)/i.test(file.type)) {
      alert('仅支持 JPG 或 PNG 格式')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }
    setIsCapturing(true)
    try {
      const img = await createImageBitmap(file)
      const w = img.width
      const h = img.height
      if (!sharedCanvasRef.current) sharedCanvasRef.current = document.createElement('canvas')
      const canvas = sharedCanvasRef.current
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)
      const imageBitmap = await createImageBitmap(canvas)
      workerRef.current?.postMessage(
        { id: Date.now(), type: 'detect', imageBitmap, width: w, height: h },
        [imageBitmap]
      )
    } catch (err: any) {
      setIsCapturing(false)
      console.error('Upload failed:', err)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearHistory = () => setHistory([])

  const scores = result?.scores || DEFAULT_SCORES
  const orderedScores = EMOTION_LABELS.map(label => scores.find(s => s.label === label) || DEFAULT_SCORES.find(s => s.label === label)!)

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">实时人脸表情识别</h1>
        <p className="app-subtitle">基于摄像头的情绪分析 · TensorFlow.js</p>
      </header>

      <div className="main-content">
        <section className="camera-section">
          <div className="video-container">
            {cameraAvailable ? (
              <video ref={videoRef} className="video-element" playsInline muted />
            ) : (
              <div className="video-placeholder">
                <div style={{ fontSize: 42 }}>📷</div>
                <div>摄像头不可用，请上传图片进行识别</div>
                <label className="upload-label">
                  <span>选择图片</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="upload-input"
                    onChange={handleFileUpload}
                    disabled={isCapturing || workerState !== 'ready'}
                  />
                </label>
                <div style={{ fontSize: 12 }}>支持 JPG/PNG · 最大 5MB</div>
              </div>
            )}
          </div>

          {cameraAvailable && (
            <button
              className="capture-btn"
              onClick={captureFromVideo}
              disabled={isCapturing || workerState !== 'ready'}
            >
              {workerState === 'initializing' ? '模型加载中…' : isCapturing ? '识别中…' : '📸 拍照识别'}
            </button>
          )}

          {workerState === 'error' && (
            <div className="loading-text" style={{ color: '#ef4444' }}>
              模型加载失败：{workerError}
            </div>
          )}
          {workerState === 'initializing' && cameraAvailable && (
            <div className="loading-text">正在加载人脸识别模型…</div>
          )}
        </section>

        <section className="result-section">
          <div className="result-card">
            <h2 className="result-title">🧠 情绪分析结果</h2>

            {result && result.dominant ? (
              <div className="dominant-emotion">
                <span className="dominant-emoji">{result.dominant.emoji}</span>
                <div className="dominant-info">
                  <div className="dominant-name" style={{ color: result.dominant.color }}>
                    主要情绪：{result.dominant.name}
                  </div>
                  <div className="dominant-percent">
                    置信度 {(result.dominant.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">暂无结果，请先拍照或上传图片</div>
            )}

            <div className="emotion-list">
              {orderedScores.map(s => (
                <div key={s.label} className="emotion-item">
                  <span className="emotion-dot" style={{ backgroundColor: s.color }} />
                  <span className="emotion-label">
                    {s.emoji} {s.name}
                  </span>
                  <div className="emotion-bar-wrap">
                    <div
                      className="emotion-bar"
                      style={{
                        width: `${(s.confidence * 100).toFixed(1)}%`,
                        backgroundColor: s.color
                      }}
                    />
                  </div>
                  <span className="emotion-percent">
                    {(s.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-section">
            <h2 className="result-title" style={{ marginBottom: 0, alignSelf: 'flex-start' }}>
              📊 情绪雷达图
            </h2>
            <canvas ref={radarRef} className="radar-canvas" />
          </div>

          <div className="history-section">
            <div className="history-header">
              <h2 className="history-title">🕒 识别历史</h2>
              <button
                className="clear-btn"
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                清空历史
              </button>
            </div>
            <ul ref={historyRef} className="history-list">
              {history.length === 0 ? (
                <li className="empty-state">暂无历史记录</li>
              ) : (
                history.map(item => (
                  <li key={item.id} className="history-item">
                    <span className="history-time">{formatTime(item.timestamp)}</span>
                    <span className="history-emoji">{item.emoji}</span>
                    <span className="history-name" style={{ color: item.color }}>
                      {item.name}
                    </span>
                    <span className="history-percent">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
