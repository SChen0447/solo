import { useState, useEffect, useRef, useMemo } from 'react'
import type { SignItem, DrawRecord } from '../types'

interface LuckyDrawProps {
  signs: SignItem[]
  onClose: () => void
  onComplete: (record: DrawRecord) => void
}

interface Particle {
  id: number
  x: number
  y: number
  tx: number
  ty: number
  delay: number
}

const LuckyDraw = ({ signs, onClose, onComplete }: LuckyDrawProps) => {
  const [phase, setPhase] = useState<'rolling' | 'result'>('rolling')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [winner, setWinner] = useState<SignItem | null>(null)
  const [showParticles, setShowParticles] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const timeoutRef2 = useRef<number | null>(null)

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = []
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.5
      const dist = 150 + Math.random() * 200
      arr.push({
        id: i,
        x: 0,
        y: 0,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        delay: Math.random() * 0.5
      })
    }
    return arr
  }, [])

  useEffect(() => {
    if (phase !== 'rolling') return
    let tick = 0
    const duration = 5000
    const startTime = Date.now()
    const roll = () => {
      const elapsed = Date.now() - startTime
      if (elapsed >= duration) {
        const finalIdx = Math.floor(Math.random() * signs.length)
        setCurrentIdx(finalIdx)
        setWinner(signs[finalIdx])
        setPhase('result')
        setShowParticles(true)
        const record: DrawRecord = {
          id: Date.now().toString(),
          winnerNickname: signs[finalIdx].nickname,
          winnerImage: signs[finalIdx].image,
          participantCount: signs.length,
          timestamp: Date.now()
        }
        onComplete(record)
        timeoutRef2.current = window.setTimeout(() => {
          setShowParticles(false)
        }, 3000)
        return
      }
      const progress = elapsed / duration
      const speed = 50 + progress * 200
      tick++
      setCurrentIdx(Math.floor(Math.random() * signs.length))
      intervalRef.current = window.setTimeout(roll, speed)
    }
    roll()
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (timeoutRef2.current) clearTimeout(timeoutRef2.current)
    }
  }, [phase, signs, onComplete])

  const handleClose = () => {
    if (intervalRef.current) clearTimeout(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (timeoutRef2.current) clearTimeout(timeoutRef2.current)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleClose}
    >
      <div style={{ position: 'absolute', top: 24, color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
        🎉 幸运抽奖 🎉
      </div>

      {phase === 'rolling' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: 220,
            height: 220,
            border: '4px solid #ffd700',
            borderRadius: 16,
            boxShadow: '0 0 40px rgba(255, 215, 0, 0.5)',
            background: '#1c1c2e',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {signs.length > 0 && signs[currentIdx] && (
              <img
                src={signs[currentIdx].image}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                draggable={false}
              />
            )}
          </div>
          <div style={{ color: '#ffd700', fontSize: 24, fontWeight: 600 }}>
            {signs[currentIdx]?.nickname || '...'}
          </div>
          <div style={{ color: '#aaa', fontSize: 14 }}>
            参与人数: {signs.length}
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {showParticles && (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 0,
              height: 0,
              pointerEvents: 'none',
              zIndex: 10
            }}>
              {particles.map(p => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ffd700',
                    boxShadow: '0 0 6px #ffd700',
                    left: 0,
                    top: 0,
                    animation: `particle 1.5s ease-out ${p.delay}s forwards`,
                    ['--tx' as any]: `${p.tx}px`,
                    ['--ty' as any]: `${p.ty}px`
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          <div style={{
            width: 300,
            height: 300,
            border: '4px solid #ffd700',
            borderRadius: 16,
            boxShadow: '0 0 60px rgba(255, 215, 0, 0.8), inset 0 0 30px rgba(255, 215, 0, 0.2)',
            background: '#1c1c2e',
            overflow: 'hidden',
            animation: 'pulse 1.5s ease-in-out infinite',
            zIndex: 5
          }}>
            {winner && (
              <img
                src={winner.image}
                alt={winner.nickname}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                draggable={false}
              />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 5 }}>
            <div style={{ color: '#ffd700', fontSize: 36, fontWeight: 700, letterSpacing: 4 }}>
              🏆 恭喜中奖 🏆
            </div>
            <div style={{ color: '#fff', fontSize: 28, fontWeight: 600 }}>
              {winner?.nickname}
            </div>
            <div style={{ color: '#aaa', fontSize: 14 }}>
              序号 #{signs.findIndex(s => s.id === winner?.id) + 1} · 参与人数 {signs.length}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          bottom: 40,
          padding: '12px 36px',
          borderRadius: 24,
          border: 'none',
          background: '#4ecdc4',
          color: '#1c1c2e',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 600,
          transition: 'all 0.2s',
          display: phase === 'result' ? 'block' : 'none'
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.filter = 'brightness(1.1)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.filter = 'brightness(1)'
        }}
      >
        关闭
      </button>
    </div>
  )
}

export default LuckyDraw
