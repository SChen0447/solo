import { EmotionScore, EMOTION_LABELS } from './types'

export function drawEmotionRadar(
  canvas: HTMLCanvasElement,
  scores: EmotionScore[],
  options: {
    radius?: number
    gridOpacity?: number
    breathePhase?: number
  } = {}
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const radius = options.radius ?? 120
  const gridOpacity = options.gridOpacity ?? 0.3
  const breathePhase = options.breathePhase ?? 0
  const breatheAlpha = 0.8 + 0.2 * (Math.sin(breathePhase) * 0.5 + 0.5)

  const n = EMOTION_LABELS.length
  const cx = canvas.width / 2
  const cy = canvas.height / 2

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.globalAlpha = breatheAlpha

  const levelCount = 4
  for (let lv = 1; lv <= levelCount; lv++) {
    const r = (radius * lv) / levelCount
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = `rgba(148, 163, 184, ${gridOpacity})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = `rgba(148, 163, 184, ${gridOpacity})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const orderedScores = EMOTION_LABELS.map(label => {
    const found = scores.find(s => s.label === label)
    if (found) return found
    const fallback: Record<string, { name: string; emoji: string; color: string }> = {
      happy: { name: '高兴', emoji: '😊', color: '#22c55e' },
      sad: { name: '悲伤', emoji: '😢', color: '#6366f1' },
      angry: { name: '愤怒', emoji: '😡', color: '#ef4444' },
      surprise: { name: '惊讶', emoji: '😲', color: '#f59e0b' },
      fear: { name: '恐惧', emoji: '😨', color: '#a855f7' },
      disgust: { name: '厌恶', emoji: '🤢', color: '#84cc16' }
    }
    return { label, ...fallback[label], confidence: 0 } as EmotionScore
  })

  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = radius * Math.min(1, orderedScores[i]?.confidence ?? 0)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()

  const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius)
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)')
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.15)')
  ctx.fillStyle = gradient
  ctx.globalAlpha = breatheAlpha * 0.4
  ctx.fill()
  ctx.globalAlpha = breatheAlpha

  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = radius * Math.min(1, orderedScores[i]?.confidence ?? 0)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    const color = orderedScores[i]?.color ?? '#38bdf8'

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    if (i < n - 1) {
      const angle2 = (Math.PI * 2 * (i + 1)) / n - Math.PI / 2
      const r2 = radius * Math.min(1, orderedScores[i + 1]?.confidence ?? 0)
      const x2 = cx + Math.cos(angle2) * r2
      const y2 = cy + Math.sin(angle2) * r2
      ctx.lineTo(x2, y2)
    } else {
      ctx.lineTo(cx, cy)
    }
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = radius * Math.min(1, orderedScores[i]?.confidence ?? 0)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2
  ctx.stroke()

  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const x = cx + Math.cos(angle) * (radius + 24)
    const y = cy + Math.sin(angle) * (radius + 24)
    const name = orderedScores[i]?.name ?? ''
    const color = orderedScores[i]?.color ?? '#f8fafc'

    ctx.font = '13px -apple-system, "PingFang SC", sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, x, y)
  }

  ctx.restore()
}
