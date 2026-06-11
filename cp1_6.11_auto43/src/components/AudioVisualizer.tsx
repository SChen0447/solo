import React, { useRef, useEffect, useCallback } from 'react'

interface AudioVisualizerProps {
  analyser: AnalyserNode | null
  isActive: boolean
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const peaksRef = useRef<number[]>([])
  const peakTimesRef = useRef<number[]>([])
  const peakHoldDuration = 200

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    const barCount = 32
    const barWidth = width / barCount - 2
    const now = Date.now()

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * bufferLength)
      const value = dataArray[dataIndex]
      const barHeight = (value / 255) * height * 0.9

      if (!peaksRef.current[i] || barHeight > peaksRef.current[i]) {
        peaksRef.current[i] = barHeight
        peakTimesRef.current[i] = now
      } else if (now - peakTimesRef.current[i] > peakHoldDuration) {
        peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 2)
      }

      const x = i * (barWidth + 2)
      const y = height - barHeight

      const gradient = ctx.createLinearGradient(x, height, x, y)
      gradient.addColorStop(0, '#1B5E20')
      gradient.addColorStop(0.5, '#4CAF50')
      gradient.addColorStop(1, '#8BC34A')

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth, barHeight)

      if (peaksRef.current[i] > 0) {
        const peakY = height - peaksRef.current[i]
        ctx.fillStyle = '#CDDC39'
        ctx.fillRect(x, peakY - 2, barWidth, 2)
      }
    }

    animationRef.current = requestAnimationFrame(draw)
  }, [analyser])

  useEffect(() => {
    if (isActive && analyser) {
      peaksRef.current = []
      peakTimesRef.current = []
      draw()
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, analyser, draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  return (
    <div style={{
      width: '100%',
      height: '60px',
      backgroundColor: '#0D1B0D',
      borderRadius: '4px',
      border: '2px solid #1B3A1B',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  )
}

export default AudioVisualizer
