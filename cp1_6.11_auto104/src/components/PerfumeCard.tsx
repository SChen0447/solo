import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PerfumeRecipe, Ingredient } from '../types'
import './PerfumeCard.css'

interface PerfumeCardProps {
  recipe: PerfumeRecipe
  size?: 'full' | 'thumbnail'
  onClick?: () => void
  onLongPress?: () => void
  isDeleting?: boolean
}

const PerfumeCard = ({ recipe, size = 'full', onClick, onLongPress, isDeleting }: PerfumeCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 10

    ctx.clearRect(0, 0, width, height)

    const topNotes = recipe.ingredients.filter(i => i.noteType === 'top')
    const middleNotes = recipe.ingredients.filter(i => i.noteType === 'middle')
    const baseNotes = recipe.ingredients.filter(i => i.noteType === 'base')

    const mixColors = (ingredients: Ingredient[]): string => {
      if (ingredients.length === 0) return 'rgba(200, 200, 200, 0.4)'
      
      let r = 0, g = 0, b = 0
      ingredients.forEach(ing => {
        const color = ing.color
        const hex = color.replace('#', '')
        r += parseInt(hex.substr(0, 2), 16)
        g += parseInt(hex.substr(2, 2), 16)
        b += parseInt(hex.substr(4, 2), 16)
      })
      r = Math.round(r / ingredients.length)
      g = Math.round(g / ingredients.length)
      b = Math.round(b / ingredients.length)
      
      return `rgba(${r}, ${g}, ${b}, 0.4)`
    }

    const drawGlowRing = (radius: number, color: string) => {
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.7,
        centerX, centerY, radius * 1.3
      )
      gradient.addColorStop(0, color)
      gradient.addColorStop(0.5, color.replace('0.4', '0.2'))
      gradient.addColorStop(1, 'transparent')
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    const drawRing = (innerRadius: number, outerRadius: number, color: string) => {
      ctx.beginPath()
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true)
      ctx.fillStyle = color
      ctx.fill()
    }

    const baseColor = mixColors(baseNotes)
    const middleColor = mixColors(middleNotes)
    const topColor = mixColors(topNotes)

    const ring1Outer = maxRadius
    const ring1Inner = maxRadius * 0.72
    const ring2Outer = maxRadius * 0.68
    const ring2Inner = maxRadius * 0.4
    const centerRadius = maxRadius * 0.36

    drawGlowRing(ring1Outer, topColor)
    drawGlowRing(ring2Outer, middleColor)
    drawGlowRing(centerRadius, baseColor)

    drawRing(ring1Inner, ring1Outer, topColor)
    drawRing(ring2Inner, ring2Outer, middleColor)

    const centerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, centerRadius
    )
    const baseColorSolid = baseNotes[0]?.color || '#ce93d8'
    centerGradient.addColorStop(0, baseColorSolid + '80')
    centerGradient.addColorStop(0.7, baseColor)
    centerGradient.addColorStop(1, baseColor.replace('0.4', '0.1'))

    ctx.beginPath()
    ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2)
    ctx.fillStyle = centerGradient
    ctx.fill()
  }, [recipe])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleMouseDown = () => {
    if (onLongPress && size === 'thumbnail') {
      pressTimerRef.current = setTimeout(() => {
        onLongPress()
      }, 600)
    }
  }

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const handleMouseLeave = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  if (size === 'thumbnail') {
    return (
      <motion.div
        className={`perfume-card-thumbnail ${isDeleting ? 'deleting' : ''}`}
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        whileHover={{ y: -3, scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <canvas ref={canvasRef} className="thumbnail-canvas" />
        <div className="thumbnail-name">{recipe.name || '未命名'}</div>
        {isDeleting && <div className="delete-overlay">删除</div>}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="perfume-card-full"
      initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="card-watercolor-bg">
        <div className="water-stain stain-1" />
        <div className="water-stain stain-2" />
        <div className="water-stain stain-3" />
      </div>

      <div className="card-gold-corner corner-tl" />
      <div className="card-gold-corner corner-tr" />
      <div className="card-gold-corner corner-bl" />
      <div className="card-gold-corner corner-br" />

      <div className="card-header">
        <h2 className="perfume-name">{recipe.name || '未命名香水'}</h2>
        <p className="perfume-date">{formatDate(recipe.createdAt)}</p>
      </div>

      <div className="card-aroma">
        <canvas ref={canvasRef} className="aroma-canvas" />
      </div>

      <div className="card-ingredients">
        <div className="ingredient-group">
          <span className="group-label top-label">前调</span>
          <div className="group-items">
            {recipe.ingredients.filter(i => i.noteType === 'top').map(ing => (
              <span key={ing.id} className="ingredient-item">
                {ing.icon} {ing.name}
              </span>
            ))}
          </div>
        </div>
        <div className="ingredient-group">
          <span className="group-label middle-label">中调</span>
          <div className="group-items">
            {recipe.ingredients.filter(i => i.noteType === 'middle').map(ing => (
              <span key={ing.id} className="ingredient-item">
                {ing.icon} {ing.name}
              </span>
            ))}
          </div>
        </div>
        <div className="ingredient-group">
          <span className="group-label base-label">后调</span>
          <div className="group-items">
            {recipe.ingredients.filter(i => i.noteType === 'base').map(ing => (
              <span key={ing.id} className="ingredient-item">
                {ing.icon} {ing.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default PerfumeCard
