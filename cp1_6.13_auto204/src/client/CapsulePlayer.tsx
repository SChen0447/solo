import { useEffect, useRef, useState } from 'react'
import { Capsule, COLOR_PALETTES } from './types'

interface CapsulePlayerProps {
  capsule: Capsule
  onClose: () => void
}

function CapsulePlayer({ capsule, onClose }: CapsulePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number>(0)
  const wavesRef = useRef<{ radius: number; opacity: number; speed: number }[]>([])
  const [isPlaying, setIsPlaying] = useState(true)
  const [isReady, setIsReady] = useState(false)

  const palette = COLOR_PALETTES[capsule.color] || COLOR_PALETTES.amber

  useEffect(() => {
    if (!capsule.audioUrl) {
      setIsReady(true)
      startIdleAnimation()
      return
    }

    const audio = new Audio(capsule.audioUrl)
    audio.crossOrigin = 'anonymous'
    audio.loop = true
    audioRef.current = audio

    audio.addEventListener('canplay', () => {
      setIsReady(true)
      initAudioContext()
      audio.play().catch(err => {
        console.log('Autoplay blocked, waiting for user interaction:', err)
        setIsPlaying(false)
      })
    })

    audio.addEventListener('play', () => setIsPlaying(true))
    audio.addEventListener('pause', () => setIsPlaying(false))

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [capsule.audioUrl])

  const initAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioContext = new AudioCtx()
    audioContextRef.current = audioContext

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 128
    analyserRef.current = analyser

    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)
    sourceRef.current = source
  }

  const getAudioLevel = (): number => {
    if (!analyserRef.current) return 0
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const sum = dataArray.reduce((a, b) => a + b, 0)
    return sum / dataArray.length / 255
  }

  const startIdleAnimation = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio
      canvas.height = window.innerHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    let idleTime = 0
    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      idleTime += 0.016

      const baseLevel = (Math.sin(idleTime * 1.5) + 1) / 2 * 0.3 + 0.1
      drawRipples(ctx, w, h, baseLevel, idleTime)
      drawParticles(ctx, w, h, baseLevel, idleTime)

      animationRef.current = requestAnimationFrame(draw)
    }
    draw()
  }

  useEffect(() => {
    if (!isReady || !capsule.audioUrl) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio
      canvas.height = window.innerHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    let time = 0
    let lastSpawn = 0

    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      time += 0.016
      const level = isPlaying ? getAudioLevel() : 0

      if (isPlaying && time - lastSpawn > Math.max(0.15, 0.6 - level * 0.5)) {
        wavesRef.current.push({
          radius: 50 + level * 30,
          opacity: 0.4 + level * 0.4,
          speed: 100 + level * 300
        })
        lastSpawn = time
      }

      drawRipples(ctx, w, h, level, time)
      drawParticles(ctx, w, h, level, time)

      animationRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [isReady, isPlaying, capsule.audioUrl, palette.from, palette.to])

  const drawRipples = (ctx: CanvasRenderingContext2D, w: number, h: number, level: number, time: number) => {
    const cx = w / 2
    const cy = h / 2

    wavesRef.current = wavesRef.current.filter(wave => {
      wave.radius += wave.speed * 0.016
      wave.opacity -= 0.008

      if (wave.opacity <= 0) return false

      const gradient = ctx.createRadialGradient(cx, cy, wave.radius * 0.8, cx, cy, wave.radius)
      gradient.addColorStop(0, `rgba(255,255,255,0)`)
      gradient.addColorStop(0.5, `${hexToRgba(palette.from, wave.opacity * 0.6)}`)
      gradient.addColorStop(1, `${hexToRgba(palette.to, 0)}`)

      ctx.beginPath()
      ctx.arc(cx, cy, wave.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      return true
    })

    const baseRadius = 100 + Math.sin(time * 2) * 10 + level * 80
    const pulseCount = 3
    for (let i = 0; i < pulseCount; i++) {
      const offset = i * 60 + Math.sin(time * 1.5 + i) * 20
      const r = baseRadius + offset
      const alpha = (0.15 + level * 0.2) * (1 - i / pulseCount)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = hexToRgba(palette.from, alpha)
      ctx.lineWidth = 2 + level * 3
      ctx.stroke()
    }
  }

  const drawParticles = (ctx: CanvasRenderingContext2D, w: number, h: number, level: number, time: number) => {
    const cx = w / 2
    const cy = h / 2
    const count = 40 + Math.floor(level * 60)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + time * 0.3
      const radius = 80 + Math.sin(time * 2 + i * 0.5) * 40 + level * 150
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius * 0.6
      const size = 2 + Math.sin(time * 3 + i) * 1.5 + level * 4
      const alpha = 0.3 + Math.sin(time * 2 + i * 0.3) * 0.2 + level * 0.3

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2)
      gradient.addColorStop(0, hexToRgba(i % 2 === 0 ? palette.from : palette.to, alpha))
      gradient.addColorStop(1, hexToRgba(palette.to, 0))

      ctx.beginPath()
      ctx.arc(x, y, size * 2, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200 + level * 100)
    centerGlow.addColorStop(0, hexToRgba(palette.from, 0.3 + level * 0.3))
    centerGlow.addColorStop(0.5, hexToRgba(palette.to, 0.1))
    centerGlow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = centerGlow
    ctx.fillRect(0, 0, w, h)
  }

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  const togglePlay = async () => {
    if (!capsule.audioUrl) return
    if (!audioRef.current) return

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    if (audioRef.current.paused) {
      await audioRef.current.play()
    } else {
      audioRef.current.pause()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.code === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, capsule.audioUrl])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      wavesRef.current = []
    }
  }, [])

  return (
    <div
      onClick={togglePlay}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        background: `radial-gradient(circle at center, ${hexToRgba(palette.from, 0.5)} 0%, #0a0e17 80%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: 'pointer',
        animation: 'playerFadeIn 0.8s ease-out'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          animation: 'titleFadeIn 0.8s ease-out'
        }}
      >
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 200,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '8px',
            textShadow: `0 0 80px ${palette.from}, 0 0 120px ${palette.to}`
          }}
        >
          {capsule.title}
        </h1>
        {capsule.audioUrl && (
          <p style={{
            marginTop: '32px',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '2px'
          }}>
            {isPlaying ? '按空格键或点击暂停' : '按空格键或点击播放'} · ESC退出
          </p>
        )}
        {!capsule.audioUrl && (
          <p style={{
            marginTop: '32px',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '2px'
          }}>
            纯光影记忆 · ESC退出
          </p>
        )}
      </div>

      {!isReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '16px'
        }}>
          加载中...
        </div>
      )}

      <button
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          position: 'absolute',
          top: '32px',
          right: '32px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: 200,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={e => (e.currentTarget.style.transform = '')}
      >
        ×
      </button>
    </div>
  )
}

const playerStyleInjected = (() => {
  const existing = document.getElementById('capsule-player-styles')
  if (existing) return true
  const style = document.createElement('style')
  style.id = 'capsule-player-styles'
  style.textContent = `
    @keyframes playerFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes titleFadeIn {
      from { opacity: 0; transform: translateY(20px); letter-spacing: 20px; }
      to { opacity: 1; transform: translateY(0); letter-spacing: 8px; }
    }
  `
  document.head.appendChild(style)
  return true
})()
void playerStyleInjected

export default CapsulePlayer
