import { useEffect, useState, useRef } from 'react'
import type { VoteOption } from '../voteStore'

interface Particle {
  id: number
  x: number
  y: number
  tx: number
  ty: number
  color: string
  size: number
}

interface ResultChartProps {
  options: VoteOption[]
  triggerParticleKey?: number
}

const COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#F97316',
]

export default function ResultChart({ options, triggerParticleKey }: ResultChartProps) {
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0)
  const [particles, setParticles] = useState<Particle[]>([])
  const [prevVotes, setPrevVotes] = useState<Record<string, number>>({})
  const particleIdRef = useRef(0)
  const barRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const changed: string[] = []
    options.forEach(opt => {
      if (prevVotes[opt.id] !== undefined && prevVotes[opt.id] < opt.votes) {
        changed.push(opt.id)
      }
    })

    if (changed.length > 0 || triggerParticleKey !== undefined) {
      const targetIds = changed.length > 0 ? changed : options.filter(o => o.votes > 0).map(o => o.id)
      const newParticles: Particle[] = []

      targetIds.forEach(optId => {
        const barEl = barRefs.current[optId]
        if (barEl) {
          const rect = barEl.getBoundingClientRect()
          const containerRect = barEl.closest('.chart-container')?.getBoundingClientRect()
          if (containerRect) {
            const originX = rect.right - containerRect.left
            const originY = rect.top + rect.height / 2 - containerRect.top

            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3
              const distance = 40 + Math.random() * 50
              newParticles.push({
                id: particleIdRef.current++,
                x: originX,
                y: originY,
                tx: Math.cos(angle) * distance,
                ty: Math.sin(angle) * distance,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                size: 4 + Math.random() * 6,
              })
            }
          }
        }
      })

      if (newParticles.length > 0) {
        setParticles(prev => [...prev, ...newParticles])
        setTimeout(() => {
          setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)))
        }, 800)
      }
    }

    const newVotes: Record<string, number> = {}
    options.forEach(o => (newVotes[o.id] = o.votes))
    setPrevVotes(newVotes)
  }, [options, triggerParticleKey])

  return (
    <div className="chart-container relative w-full">
      <div className="space-y-4">
        {options.map((option, idx) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0
          const color = COLORS[idx % COLORS.length]

          return (
            <div key={option.id} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-32 sm:w-40 flex-shrink-0">
                <span className="text-2xl">{option.emoji}</span>
                <span className="text-sm font-medium text-gray-700 truncate">{option.text}</span>
              </div>

              <div className="flex-1 relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div
                  ref={el => (barRefs.current[option.id] = el)}
                  className="h-full rounded-full relative"
                  style={{
                    width: `${Math.max(percentage, option.votes > 0 ? 2 : 0)}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    animation: 'barGrow 0.3s ease-out',
                    transition: 'width 0.3s ease-out',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full opacity-0"
                    style={{
                      background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                      animation: 'barGrow 0.3s ease-out',
                    }}
                  />
                </div>
              </div>

              <div className="w-20 text-right flex-shrink-0">
                <span className="text-sm font-bold" style={{ color }}>
                  {percentage.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-1">({option.votes}票)</span>
              </div>
            </div>
          )
        })}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {particles.map(p => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.size}
            fill={p.color}
            style={{
              animation: 'particle 0.8s ease-out forwards',
              ['--tx' as any]: `${p.tx}px`,
              ['--ty' as any]: `${p.ty}px`,
              transformOrigin: `${p.x}px ${p.y}px`,
            }}
          />
        ))}
      </svg>
    </div>
  )
}
