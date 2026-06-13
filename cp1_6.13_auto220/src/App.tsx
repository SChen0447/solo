import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { useStoryStore } from '@/store/storyStore'
import { useAudio } from '@/hooks/useAudio'
import StoryCard from '@/components/StoryCard'

type AppPhase = 'welcome' | 'story' | 'ending'

export default function App() {
  const {
    storyData,
    gameState,
    appPhase,
    loadStory,
    startJourney,
    chooseOption,
    restart,
    getCurrentNode,
  } = useStoryStore()

  const { initAudio, setAtmosphere, setVolume, resumeAudio } = useAudio()
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const nodesRef = useRef<{ x: number; y: number; r: number; glow: number }[]>([])
  const edgesRef = useRef<[number, number][]>([])
  const titleRef = useRef<HTMLDivElement>(null)
  const endingTitleRef = useRef<HTMLDivElement>(null)
  const endingSubRef = useRef<HTMLDivElement>(null)
  const [cardDirection, setCardDirection] = useState('right')
  const [volume, setVolume] = useState(0.3)
  const [showVolume, setShowVolume] = useState(false)
  const phaseRef = useRef<AppPhase>('welcome')
  const particlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; size: number; alpha: number; twinkle: number }[]
  >([])
  const endingTextVisible = useRef(false)

  useEffect(() => {
    loadStory()
  }, [loadStory])

  useEffect(() => {
    phaseRef.current = appPhase
  }, [appPhase])

  useEffect(() => {
    if (appPhase === 'story' && storyData) {
      const currentNode = getCurrentNode()
      if (currentNode) {
        const config = storyData.audioConfigs[currentNode.atmosphere]
        if (config) setAtmosphere(config)
      }
    }
  }, [appPhase, gameState?.currentNodeId, storyData, getCurrentNode, setAtmosphere])

  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      generateMapNodes(canvas.width, canvas.height)
    }

    const generateMapNodes = (w: number, h: number) => {
      const count = 8 + Math.floor(Math.random() * 5)
      const nodes: typeof nodesRef.current = []
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 3 + Math.random() * 5,
          glow: 0.3 + Math.random() * 0.7,
        })
      }
      nodesRef.current = nodes
      const edges: [number, number][] = []
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          if (Math.sqrt(dx * dx + dy * dy) < 300) {
            edges.push([i, j])
          }
        }
      }
      edgesRef.current = edges
    }

    resize()
    window.addEventListener('resize', resize)

    let animId: number
    const draw = () => {
      if (!ctx || !canvas) return
      const w = canvas.width
      const h = canvas.height

      rotationRef.current += 0.01

      ctx.clearRect(0, 0, w, h)

      const gradient = ctx.createLinearGradient(0, 0, 0, h)
      gradient.addColorStop(0, '#0f0c29')
      gradient.addColorStop(1, '#302b63')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      if (phaseRef.current === 'story') {
        ctx.save()
        ctx.translate(w / 2, h / 2)
        ctx.rotate(rotationRef.current)
        ctx.translate(-w / 2, -h / 2)

        const nodes = nodesRef.current
        const edges = edgesRef.current

        edges.forEach(([i, j]) => {
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.strokeStyle = 'rgba(102, 126, 234, 0.15)'
          ctx.lineWidth = 1
          ctx.stroke()
        })

        const time = Date.now() * 0.001
        nodes.forEach((node, idx) => {
          const pulse = 0.5 + 0.5 * Math.sin(time * 2 + idx)
          const glowSize = node.r + 8 * pulse * node.glow

          const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize)
          grd.addColorStop(0, `rgba(102, 126, 234, ${0.6 * node.glow * pulse})`)
          grd.addColorStop(0.5, `rgba(118, 75, 162, ${0.3 * node.glow * pulse})`)
          grd.addColorStop(1, 'rgba(118, 75, 162, 0)')
          ctx.beginPath()
          ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2)
          ctx.fillStyle = grd
          ctx.fill()

          ctx.beginPath()
          ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(184, 184, 255, ${0.4 + 0.4 * pulse})`
          ctx.fill()
        })

        ctx.restore()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  useEffect(() => {
    if (appPhase !== 'ending') return

    const canvas = particleCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: typeof particlesRef.current = []
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1 + Math.random() * 3,
        alpha: Math.random(),
        twinkle: 0.5 + Math.random() * 2,
      })
    }
    particlesRef.current = particles

    let animId: number
    const draw = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const time = Date.now() * 0.001

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * p.twinkle))
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        grd.addColorStop(0, `rgba(252, 202, 70, ${p.alpha * twinkle})`)
        grd.addColorStop(0.5, `rgba(184, 184, 255, ${p.alpha * twinkle * 0.5})`)
        grd.addColorStop(1, 'rgba(184, 184, 255, 0)')

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * twinkle})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()

    if (endingTitleRef.current) {
      gsap.fromTo(
        endingTitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.5, delay: 0.5, ease: 'power2.out' }
      )
    }
    if (endingSubRef.current) {
      gsap.fromTo(
        endingSubRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.5, delay: 1.5 }
      )
    }
    endingTextVisible.current = true

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [appPhase])

  useEffect(() => {
    if (titleRef.current && appPhase === 'welcome') {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }
      )
    }
  }, [appPhase])

  const handleStart = useCallback(() => {
    initAudio()
    resumeAudio()
    startJourney()
  }, [initAudio, resumeAudio, startJourney])

  const handleChoose = useCallback(
    (nextNodeId: string) => {
      const dirs = ['left', 'right', 'top', 'bottom']
      setCardDirection(dirs[Math.floor(Math.random() * dirs.length)])
      chooseOption(nextNodeId)
    },
    [chooseOption]
  )

  const handleRestart = useCallback(() => {
    restart()
  }, [restart])

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value)
      setVolume(v)
      setVolume(v)
    },
    [setVolume]
  )

  const currentNode = getCurrentNode()
  const visitedCount = gameState?.visitedNodes.length || 0
  const totalSteps = storyData
    ? storyData.nodes.filter((n) => !n.isEnding).length + 1
    : 0
  const achievements = gameState?.achievements || []

  return (
    <div className="app-container">
      <canvas ref={bgCanvasRef} className="bg-canvas" />

      {appPhase === 'welcome' && storyData && (
        <div className="welcome-screen">
          <div ref={titleRef} className="welcome-content">
            <h1 className="welcome-title">{storyData.title}</h1>
            <p className="welcome-intro">{storyData.intro}</p>
            <button className="start-btn" onClick={handleStart}>
              <span>开始旅程</span>
            </button>
          </div>
        </div>
      )}

      {appPhase === 'story' && currentNode && (
        <>
          <div className="progress-bar">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`progress-dot ${i < visitedCount ? 'visited' : ''} ${
                  i === visitedCount - 1 ? 'current' : ''
                }`}
              />
            ))}
          </div>

          <StoryCard
            node={currentNode}
            onChoose={handleChoose}
            direction={cardDirection}
          />

          <div
            className="volume-control"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            {showVolume && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            )}
            <button className="volume-icon-btn" onClick={() => setShowVolume(!showVolume)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b8b8ff" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </button>
          </div>
        </>
      )}

      {appPhase === 'ending' && (
        <>
          <canvas ref={particleCanvasRef} className="particle-canvas" />
          <div className="ending-screen">
            <div ref={endingTitleRef} className="ending-content">
              <h2 className="ending-title">{currentNode?.endingTitle || '旅程终结'}</h2>
              <p className="ending-text">{currentNode?.text}</p>

              <div ref={endingSubRef} className="ending-sub">
                <div className="achievements-row">
                  {achievements.map((a, i) => (
                    <div key={i} className="achievement-badge" style={{ backgroundColor: a.color }}>
                      <span className="achievement-letter">{a.name[0]}</span>
                    </div>
                  ))}
                </div>
                <div className="achievement-names">
                  {achievements.map((a, i) => (
                    <span key={i} className="achievement-label">{a.name}</span>
                  ))}
                </div>

                <button className="restart-btn" onClick={handleRestart}>
                  再玩一次
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
