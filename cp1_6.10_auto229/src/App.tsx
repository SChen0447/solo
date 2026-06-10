import React, { useState, useEffect, useRef, useCallback } from 'react'
import InputPanel from './components/InputPanel'
import Visualizer, { VisualConfig } from './components/Visualizer'
import PlaybackBar from './components/PlaybackBar'
import { analyzeEmotion } from './data/emotionAnalyzer'

export interface ExportData {
  text: string
  emotionValues: number[]
  timestamps: number[]
  visualConfig: VisualConfig
}

const TOTAL_DURATION = 10000
const SAMPLE_INTERVAL = 200

const App: React.FC = () => {
  const [text, setText] = useState<string>('')
  const [emotionValue, setEmotionValue] = useState<number>(0.5)
  const [emotionKeywords, setEmotionKeywords] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [rhythmSignal, setRhythmSignal] = useState<number>(0)
  const [visualConfig, setVisualConfig] = useState<VisualConfig>({
    lineCount: 30,
    rhythmPeriod: 400,
    baseEmotion: 0.5,
    colors: { start: '#7effb3', end: '#a78bfa' }
  })
  const [emotionValuesRecord, setEmotionValuesRecord] = useState<number[]>([])
  const [timestampsRecord, setTimestampsRecord] = useState<number[]>([])

  const progressRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const pauseOffsetRef = useRef<number>(0)
  const rhythmTimerRef = useRef<number | null>(null)
  const sampleTimerRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const generateVisualConfig = useCallback((emotion: number): VisualConfig => {
    const lineCount = Math.floor(20 + Math.random() * 21)
    const rhythmPeriod = Math.floor(200 + Math.random() * 401)
    const startColor = emotion >= 0.5 ? '#7effb3' : '#a78bfa'
    const endColor = emotion >= 0.5 ? '#facc15' : '#ef4444'

    return {
      lineCount,
      rhythmPeriod,
      baseEmotion: emotion,
      colors: { start: startColor, end: endColor }
    }
  }, [])

  const handleAnalyze = useCallback(() => {
    const result = analyzeEmotion(text)
    setEmotionValue(result.value)
    setEmotionKeywords(result.keywords)
  }, [text])

  const clearAllTimers = useCallback(() => {
    if (rhythmTimerRef.current !== null) {
      clearInterval(rhythmTimerRef.current)
      rhythmTimerRef.current = null
    }
    if (sampleTimerRef.current !== null) {
      clearInterval(sampleTimerRef.current)
      sampleTimerRef.current = null
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const startRhythmSimulation = useCallback((period: number) => {
    if (rhythmTimerRef.current !== null) {
      clearInterval(rhythmTimerRef.current)
    }
    rhythmTimerRef.current = window.setInterval(() => {
      setRhythmSignal(1)
      setTimeout(() => setRhythmSignal(0), 100)
    }, period)
  }, [])

  const startSampling = useCallback(() => {
    if (sampleTimerRef.current !== null) {
      clearInterval(sampleTimerRef.current)
    }
    setEmotionValuesRecord([emotionValue])
    setTimestampsRecord([0])

    let elapsed = SAMPLE_INTERVAL
    sampleTimerRef.current = window.setInterval(() => {
      setEmotionValuesRecord(prev => [...prev, emotionValue])
      setTimestampsRecord(prev => [...prev, elapsed])
      elapsed += SAMPLE_INTERVAL
    }, SAMPLE_INTERVAL)
  }, [emotionValue])

  const handleGenerate = useCallback(() => {
    clearAllTimers()

    if (emotionKeywords.length === 0) {
      handleAnalyze()
    }

    const config = generateVisualConfig(emotionValue)
    setVisualConfig(config)
    setProgress(0)
    progressRef.current = 0
    pauseOffsetRef.current = 0
    setIsPlaying(true)
    startTimeRef.current = performance.now()

    startRhythmSimulation(config.rhythmPeriod)
    startSampling()

    const animate = () => {
      const now = performance.now()
      const elapsed = now - startTimeRef.current + pauseOffsetRef.current
      const newProgress = Math.min(elapsed / TOTAL_DURATION, 1)
      progressRef.current = newProgress
      setProgress(newProgress)

      if (newProgress >= 1) {
        setIsPlaying(false)
        clearAllTimers()
        return
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [emotionValue, emotionKeywords.length, handleAnalyze, generateVisualConfig, startRhythmSimulation, startSampling, clearAllTimers])

  const handleTogglePlay = useCallback(() => {
    if (progress >= 1 || progress <= 0) {
      handleGenerate()
      return
    }

    if (isPlaying) {
      setIsPlaying(false)
      pauseOffsetRef.current = progressRef.current * TOTAL_DURATION
      clearAllTimers()
    } else {
      setIsPlaying(true)
      startTimeRef.current = performance.now()
      startRhythmSimulation(visualConfig.rhythmPeriod)

      const animate = () => {
        const now = performance.now()
        const elapsed = now - startTimeRef.current + pauseOffsetRef.current
        const newProgress = Math.min(elapsed / TOTAL_DURATION, 1)
        progressRef.current = newProgress
        setProgress(newProgress)

        if (newProgress >= 1) {
          setIsPlaying(false)
          clearAllTimers()
          return
        }
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [isPlaying, progress, visualConfig.rhythmPeriod, handleGenerate, startRhythmSimulation, clearAllTimers])

  const handleExport = useCallback(() => {
    if (emotionValuesRecord.length === 0) return

    const exportData: ExportData = {
      text,
      emotionValues: emotionValuesRecord,
      timestamps: timestampsRecord,
      visualConfig
    }

    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echo-weave-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [text, emotionValuesRecord, timestampsRecord, visualConfig])

  const handleImport = useCallback((data: ExportData) => {
    clearAllTimers()
    setText(data.text || '')
    setEmotionValue(data.visualConfig?.baseEmotion ?? 0.5)
    setEmotionKeywords([])
    setVisualConfig(data.visualConfig || generateVisualConfig(0.5))
    setEmotionValuesRecord(data.emotionValues || [])
    setTimestampsRecord(data.timestamps || [])
    setProgress(0)
    progressRef.current = 0
    pauseOffsetRef.current = 0

    setIsPlaying(true)
    startTimeRef.current = performance.now()
    const config = data.visualConfig || generateVisualConfig(0.5)
    startRhythmSimulation(config.rhythmPeriod)

    const animate = () => {
      const now = performance.now()
      const elapsed = now - startTimeRef.current
      const newProgress = Math.min(elapsed / TOTAL_DURATION, 1)
      progressRef.current = newProgress
      setProgress(newProgress)

      if (newProgress >= 1) {
        setIsPlaying(false)
        clearAllTimers()
        return
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [generateVisualConfig, startRhythmSimulation, clearAllTimers])

  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  const canExport = emotionValuesRecord.length > 0

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const layoutStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#111827',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }
    : {
        display: 'flex',
        flexDirection: 'row',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#111827',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }

  const canvasContainerStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    paddingBottom: '60px',
    boxSizing: 'border-box',
    minHeight: 0
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#111827',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={layoutStyle}>
        <InputPanel
          text={text}
          onTextChange={setText}
          emotionValue={emotionValue}
          emotionKeywords={emotionKeywords}
          onAnalyze={handleAnalyze}
          onGenerate={handleGenerate}
          onImport={handleImport}
        />
        <div style={canvasContainerStyle}>
          <Visualizer
            isPlaying={isPlaying}
            emotionValue={emotionValue}
            visualConfig={visualConfig}
            rhythmSignal={rhythmSignal}
          />
        </div>
      </div>
      <PlaybackBar
        isPlaying={isPlaying}
        progress={progress}
        onTogglePlay={handleTogglePlay}
        onExport={handleExport}
        canExport={canExport}
      />
    </div>
  )
}

export default App
