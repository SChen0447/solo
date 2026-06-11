import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ingredient, Ripple } from '../types'
import { v4 as uuidv4 } from 'uuid'
import './MixingBowl.css'

interface MixingBowlProps {
  ingredients: Ingredient[]
  onRemoveIngredient: (id: string) => void
  onDrop: (ingredient: Ingredient) => void
  isBlending: boolean
  onBlend: () => void
  perfumeName: string
  onNameChange: (name: string) => void
  canBlend: boolean
}

const MixingBowl = ({
  ingredients,
  onRemoveIngredient,
  onDrop,
  isBlending,
  onBlend,
  perfumeName,
  onNameChange,
  canBlend,
}: MixingBowlProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [flashes, setFlashes] = useState<string[]>([])
  const bowlRef = useRef<HTMLDivElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const ingredientData = e.dataTransfer.getData('ingredient')
    if (ingredientData) {
      const ingredient: Ingredient = JSON.parse(ingredientData)
      onDrop(ingredient)
      
      const flashId = uuidv4()
      setFlashes(prev => [...prev, flashId])
      setTimeout(() => {
        setFlashes(prev => prev.filter(id => id !== flashId))
      }, 300)
    }
  }

  const handleRemove = (ingredient: Ingredient) => {
    const rippleId = uuidv4()
    const bowlRect = bowlRef.current?.getBoundingClientRect()
    const x = bowlRect ? bowlRect.width / 2 : 150
    const y = bowlRect ? bowlRect.height / 2 : 150
    
    setRipples(prev => [...prev, { id: rippleId, color: ingredient.color, x, y }])
    onRemoveIngredient(ingredient.id)
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId))
    }, 500)
  }

  const hasTopNote = ingredients.some(i => i.noteType === 'top')
  const hasMiddleNote = ingredients.some(i => i.noteType === 'middle')
  const hasBaseNote = ingredients.some(i => i.noteType === 'base')

  return (
    <div className="mixing-bowl-container">
      <div className="selected-ingredients-list">
        <AnimatePresence>
          {ingredients.map((ingredient) => (
            <motion.div
              key={ingredient.id}
              className="selected-ingredient-tag"
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              transition={{ duration: 0.2 }}
              style={{ '--tag-color': ingredient.color } as React.CSSProperties}
            >
              <span className="tag-icon">{ingredient.icon}</span>
              <span className="tag-name">{ingredient.name}</span>
              <button
                className="tag-remove"
                onClick={() => handleRemove(ingredient)}
                aria-label={`删除${ingredient.name}`}
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div
        ref={bowlRef}
        className={`mixing-bowl ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="bowl-inner">
          {ingredients.length === 0 && !isBlending && (
            <div className="bowl-placeholder">
              <span className="placeholder-icon">🧪</span>
              <span className="placeholder-text">将香原料拖入碗中</span>
            </div>
          )}
          
          <AnimatePresence>
            {flashes.map((id) => (
              <motion.div
                key={id}
                className="flash-effect"
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>

          {ripples.map((ripple) => (
            <div
              key={ripple.id}
              className="ripple-effect animate-ripple"
              style={{
                left: ripple.x,
                top: ripple.y,
                borderColor: ripple.color,
              }}
            />
          ))}

          {isBlending && (
            <motion.div
              className="bottle-animation"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 360 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            >
              <span className="bottle-emoji">🧴</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="blend-controls">
        <div className="name-input-wrapper">
          <input
            type="text"
            className="perfume-name-input"
            placeholder="为你的香水命名..."
            value={perfumeName}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={20}
          />
        </div>
        
        <motion.button
          className={`blend-button ${canBlend ? 'active' : 'disabled'}`}
          onClick={onBlend}
          disabled={!canBlend || isBlending}
          whileHover={canBlend ? { scale: 1.05 } : {}}
          whileTap={canBlend ? { scale: 0.95 } : {}}
        >
          {isBlending ? '调和中...' : '调和'}
        </motion.button>
        
        {!canBlend && ingredients.length > 0 && (
          <div className="blend-hint">
            {!hasTopNote && <span className="hint-item">需要前调</span>}
            {!hasMiddleNote && <span className="hint-item">需要中调</span>}
            {!hasBaseNote && <span className="hint-item">需要后调</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default MixingBowl
