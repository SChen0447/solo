import { motion } from 'framer-motion'
import { Ingredient, NoteType } from '../types'
import { getIngredientsByNote } from '../data/ingredients'
import './IngredientShelf.css'

interface IngredientShelfProps {
  onDragStart: (ingredient: Ingredient) => void
  onDragEnd: () => void
}

const noteLabels: Record<NoteType, string> = {
  top: '前调',
  middle: '中调',
  base: '后调',
}

const IngredientShelf = ({ onDragStart, onDragEnd }: IngredientShelfProps) => {
  const noteTypes: NoteType[] = ['top', 'middle', 'base']

  const handleDragStart = (e: React.DragEvent, ingredient: Ingredient) => {
    e.dataTransfer.setData('ingredient', JSON.stringify(ingredient))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(ingredient)
  }

  const handleDragEnd = () => {
    onDragEnd()
  }

  return (
    <div className="shelf-container">
      {noteTypes.map((noteType) => {
        const ingredients = getIngredientsByNote(noteType)
        return (
          <motion.div
            key={noteType}
            className={`shelf-row shelf-${noteType}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: noteType === 'top' ? 0 : noteType === 'middle' ? 0.1 : 0.2 }}
          >
            <div className="shelf-label">
              <span className="shelf-label-text">{noteLabels[noteType]}</span>
              <span className="shelf-label-en">
                {noteType === 'top' ? 'Top Notes' : noteType === 'middle' ? 'Heart Notes' : 'Base Notes'}
              </span>
            </div>
            <div className="shelf-cards">
              {ingredients.map((ingredient, index) => (
                <motion.div
                  key={ingredient.id}
                  className="ingredient-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, ingredient)}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    '--ingredient-color': ingredient.color,
                  } as React.CSSProperties}
                >
                  <div className="ingredient-icon">{ingredient.icon}</div>
                  <div className="ingredient-name">{ingredient.name}</div>
                  <div className="ingredient-color-bar" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default IngredientShelf
