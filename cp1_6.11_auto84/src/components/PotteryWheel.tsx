import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  createInitialShape,
  applyDeformation,
  lerp,
  renderPottery,
  renderPotteryWheel,
  ANIMATION_DURATION
} from '../utils/shapeGeometry'

interface PotteryWheelProps {
  onComplete: (shape: number[]) => void
  onBack?: () => void
  initialShape?: number[]
}

const CANVAS_W = 480
const CANVAS_H = 560
const CENTER_X = CANVAS_W / 2
const CENTER_Y = CANVAS_H / 2 - 20
const WHEEL_R = 170

export const PotteryWheel: React.FC<PotteryWheelProps> = ({ onComplete, onBack, initialShape }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [shape, setShape] = useState<number[]>(() => initialShape || createInitialShape())
  const [isDragging, setIsDragging] = useState(false)
  const [hint, setHint] = useState('将鼠标移到陶坯上，按住拖拽开始拉坯')
  const rotationRef = useRef(0)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const dragVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const shapeRef = useRef(shape)
  const targetShapeRef = useRef<number[]>(shape)
  const animStartTimeRef = useRef<number | null>(null)
  const animStartShapeRef = useRef<number[]>(shape)

  useEffect(() => { shapeRef.current = shape }, [shape])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    const bg = ctx.createRadialGradient(CENTER_X, CENTER_Y + 80, 0, CENTER_X, CENTER_Y + 80, 400)
    bg.addColorStop(0, 'rgba(50,40,35,0.6)')
    bg.addColorStop(1, 'rgba(10,8,15,0)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    rotationRef.current += 0.04
    renderPotteryWheel(ctx, CENTER_X, CENTER_Y, WHEEL_R, rotationRef.current)
    renderPottery({
      ctx,
      shape: shapeRef.current,
      centerX: CENTER_X,
      centerY: CENTER_Y,
      rotation: rotationRef.current,
      withTexture: true
    })

    if (isDragging && lastPosRef.current) {
      ctx.beginPath()
      ctx.arc(lastPosRef.current.x, lastPosRef.current.y, 20, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,200,150,0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [isDragging])

  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (animStartTimeRef.current !== null) {
        const elapsed = performance.now() - animStartTimeRef.current
        const t = Math.min(1, elapsed / ANIMATION_DURATION)
        const eased = 1 - Math.pow(1 - t, 3)
        const newShape = animStartShapeRef.current.map((v, i) =>
          lerp(v, targetShapeRef.current[i], eased)
        )
        shapeRef.current = newShape
        if (t >= 1) animStartTimeRef.current = null
      }
      render()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [render])

  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e)
    const avgR = shapeRef.current.reduce((a, b) => a + b, 0) / shapeRef.current.length
    const potteryTop = CENTER_Y + 160 - 320
    const potteryBottom = CENTER_Y + 160
    const withinPottery =
      pos.y >= potteryTop - 30 && pos.y <= potteryBottom + 20 &&
      Math.abs(pos.x - CENTER_X) <= avgR + 40

    if (withinPottery) {
      setIsDragging(true)
      lastPosRef.current = pos
      dragVelocityRef.current = { x: 0, y: 0 }
      setHint('继续拖拽调整形状...')
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !lastPosRef.current) return
    const pos = getCanvasPos(e)
    const dx = pos.x - lastPosRef.current.x
    const dy = pos.y - lastPosRef.current.y
    dragVelocityRef.current = { x: dx, y: dy }

    animStartShapeRef.current = [...shapeRef.current]
    targetShapeRef.current = applyDeformation(
      shapeRef.current,
      pos.x,
      pos.y - (CENTER_Y + 160 - 320),
      dy,
      dx,
      CENTER_X,
      320
    )
    animStartTimeRef.current = performance.now()

    lastPosRef.current = pos
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      lastPosRef.current = null
      setShape([...shapeRef.current])
      setHint('继续调整或点击"完成拉坯"进入上釉环节')
    }
  }

  const handleReset = () => {
    const s = createInitialShape()
    setShape(s)
    shapeRef.current = s
    targetShapeRef.current = s
    animStartShapeRef.current = s
    animStartTimeRef.current = null
    setHint('已重置，重新开始拉坯')
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 p-6">
      <div className="lg:w-[70%] flex flex-col items-center justify-center rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair max-w-full"
          style={{ maxHeight: '70vh' }}
        />
        <div className="mt-4 text-center text-sm px-6 py-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-amber-300">💡 </span>
          <span className="text-gray-300">{hint}</span>
        </div>
      </div>

      <div className="lg:w-[30%] flex flex-col gap-5 p-6 rounded-2xl bg-black/30 border border-white/10">
        <h3 className="text-2xl font-bold text-amber-100 mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          🏺 陶轮控制
        </h3>

        <div className="space-y-3 text-sm text-gray-300 p-4 rounded-xl bg-white/5">
          <p className="font-semibold text-amber-200 mb-2">操作说明：</p>
          <p>⬆️ <span className="text-amber-300">从上往下拉</span> → 收口收腰</p>
          <p>⬇️ <span className="text-amber-300">从下往上推</span> → 扩口鼓腹</p>
          <p>↔️ <span className="text-amber-300">左右拖动</span> → 调整高度</p>
          <p>⭕ 响应半径 20 像素</p>
          <p>⏱️ 黏土流动动画 0.3 秒</p>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <button
            onClick={handleReset}
            className="w-full py-3 px-5 rounded-xl font-semibold transition-all duration-200 active:scale-95
                       text-gray-300 bg-white/10 hover:bg-white/20 border border-white/10"
          >
            🔄 重置形状
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full py-3 px-5 rounded-xl font-semibold transition-all duration-200 active:scale-95
                         text-gray-300 bg-white/5 hover:bg-white/15 border border-white/10"
            >
              ← 返回画廊
            </button>
          )}
          <button
            onClick={() => onComplete([...shapeRef.current])}
            className="w-full py-3.5 px-5 rounded-xl font-bold transition-all duration-200 active:scale-95
                       text-white shadow-lg hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #d4a574 0%, #b8860b 100%)',
              boxShadow: '0 4px 20px rgba(184,134,11,0.4)'
            }}
          >
            ✅ 完成拉坯
          </button>
        </div>
      </div>
    </div>
  )
}

export default PotteryWheel
