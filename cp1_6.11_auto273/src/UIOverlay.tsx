import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Crater } from './CraterRenderer'

interface UIOverlayProps {
  score: number
  impactCount: number
  angle: number
  power: number
  splashCoeff: number
  craters: Crater[]
  canvasWidth: number
  canvasHeight: number
  onAngleChange: (value: number) => void
  onPowerChange: (value: number) => void
  onSplashCoeffChange: (value: number) => void
  onLaunch: () => void
  isLaunched: boolean
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  score,
  impactCount,
  angle,
  power,
  splashCoeff,
  craters,
  canvasWidth,
  canvasHeight,
  onAngleChange,
  onPowerChange,
  onSplashCoeffChange,
  onLaunch,
  isLaunched,
}) => {
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const canvas = minimapRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#424242'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1)

    const scaleX = canvas.width / canvasWidth
    const scaleY = canvas.height / canvasHeight

    for (const crater of craters) {
      const x = crater.x * scaleX
      const y = crater.y * scaleY
      const r = crater.radius * Math.min(scaleX, scaleY)

      ctx.fillStyle = 'rgba(189, 189, 189, 0.5)'
      ctx.beginPath()
      ctx.arc(x, y, Math.max(r, 2), 0, Math.PI * 2)
      ctx.fill()
    }
  }, [craters, canvasWidth, canvasHeight])

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        pointerEvents: 'auto',
      }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: 24,
            fontFamily: '"Courier New", monospace',
            color: '#e0e0e0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            fontWeight: 'bold',
            letterSpacing: 2,
          }}
        >
          得分: {score.toString().padStart(6, '0')}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: 16,
            color: '#9e9e9e',
            marginTop: 8,
            fontFamily: '"Courier New", monospace',
          }}
        >
          撞击次数: {impactCount}
        </motion.div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid #757575',
          borderRadius: 8,
          padding: 6,
        }}>
          <div style={{
            fontSize: 11,
            color: '#9e9e9e',
            textAlign: 'center',
            marginBottom: 4,
            fontFamily: '"Courier New", monospace',
          }}>
            迷你地图
          </div>
          <canvas
            ref={minimapRef}
            width={100}
            height={100}
            style={{
              display: 'block',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      <div style={{
        position: 'absolute',
        right: 24,
        bottom: 24,
        pointerEvents: 'auto',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(224, 224, 224, 0.2)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid #bdbdbd',
            borderRadius: 16,
            padding: 20,
            width: 280,
          }}
        >
          <div style={{
            fontSize: 18,
            color: '#e0e0e0',
            fontWeight: 'bold',
            marginBottom: 16,
            textAlign: 'center',
            fontFamily: '"Courier New", monospace',
          }}>
            撞击参数
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 14,
              color: '#e0e0e0',
              fontFamily: '"Courier New", monospace',
            }}>
              <span>撞击角度</span>
              <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>{angle.toFixed(0)}°</span>
            </div>
            <div style={{
              position: 'relative',
              height: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 3,
              marginBottom: 8,
            }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${(angle / 90) * 100}%`,
                  background: '#ffcc80',
                  borderRadius: 3,
                }}
              />
              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={angle}
                onChange={(e) => onAngleChange(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  top: -4,
                  left: 0,
                  width: '100%',
                  height: 14,
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${(angle / 90) * 100}% - 7px)`,
                  top: -4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid #ffcc80',
                  boxShadow: '0 0 6px rgba(255,204,128,0.6)',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <svg width={40} height={40} viewBox="0 0 40 40">
                <line x1={5} y1={35} x2={35} y2={35} stroke="#757575" strokeWidth={1} />
                <line
                  x1={5}
                  y1={35}
                  x2={5 + 30 * Math.cos((angle * Math.PI) / 180)}
                  y2={35 - 30 * Math.sin((angle * Math.PI) / 180)}
                  stroke="#ffcc80"
                  strokeWidth={2}
                />
                <circle cx={5} cy={35} r={3} fill="#ffcc80" />
              </svg>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 14,
              color: '#e0e0e0',
              fontFamily: '"Courier New", monospace',
            }}>
              <span>动能</span>
              <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>{power.toFixed(1)} GJ</span>
            </div>
            <div style={{
              position: 'relative',
              height: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 3,
              marginBottom: 8,
            }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${((power - 1) / 9) * 100}%`,
                  background: `linear-gradient(to right, #00e676, #ffc107, #ff1744)`,
                  borderRadius: 3,
                }}
              />
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={power}
                onChange={(e) => onPowerChange(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  top: -4,
                  left: 0,
                  width: '100%',
                  height: 14,
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${((power - 1) / 9) * 100}% - 7px)`,
                  top: -4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid #ffc107',
                  boxShadow: '0 0 6px rgba(255,193,7,0.6)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 14,
              color: '#e0e0e0',
              fontFamily: '"Courier New", monospace',
            }}>
              <span>溅射系数</span>
              <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>{splashCoeff.toFixed(1)}</span>
            </div>
            <div style={{
              position: 'relative',
              height: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 3,
            }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${((splashCoeff - 0.1) / 0.9) * 100}%`,
                  background: '#81d4fa',
                  borderRadius: 3,
                }}
              />
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={splashCoeff}
                onChange={(e) => onSplashCoeffChange(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  top: -4,
                  left: 0,
                  width: '100%',
                  height: 14,
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${((splashCoeff - 0.1) / 0.9) * 100}% - 7px)`,
                  top: -4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid #81d4fa',
                  boxShadow: '0 0 6px rgba(129,212,250,0.6)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <motion.button
            onClick={onLaunch}
            disabled={isLaunched}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 'bold',
              color: isLaunched ? '#9e9e9e' : '#fff',
              background: isLaunched
                ? 'rgba(255,255,255,0.05)'
                : isHovering
                ? 'rgba(255,111,0,0.9)'
                : 'rgba(255,111,0,0.7)',
              border: `2px solid ${isHovering && !isLaunched ? '#ffab00' : '#e65100'}`,
              borderRadius: 8,
              cursor: isLaunched ? 'not-allowed' : 'pointer',
              fontFamily: '"Courier New", monospace',
              textTransform: 'uppercase',
              letterSpacing: 2,
              boxShadow: isHovering && !isLaunched
                ? '0 0 20px rgba(255,171,0,0.4)'
                : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isLaunched ? '飞行中...' : '发射碎片'}
          </motion.button>
        </motion.div>
      </div>

      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        pointerEvents: 'auto',
      }}>
        <div style={{
          fontSize: 12,
          color: '#757575',
          fontFamily: '"Courier New", monospace',
          textAlign: 'right',
          lineHeight: 1.6,
        }}>
          <div>拖拽瞄准 · 点击发射</div>
          <div>排列环形山链解锁符文</div>
        </div>
      </div>
    </div>
  )
}

export default UIOverlay
