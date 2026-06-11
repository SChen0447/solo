import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import { Ingredient, PerfumeRecipe } from './types'
import IngredientShelf from './components/IngredientShelf'
import MixingBowl from './components/MixingBowl'
import PerfumeCard from './components/PerfumeCard'
import './App.css'

const MAX_RECIPES = 12

function App() {
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([])
  const [perfumeName, setPerfumeName] = useState('')
  const [savedRecipes, setSavedRecipes] = useState<PerfumeRecipe[]>([])
  const [isBlending, setIsBlending] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [currentRecipe, setCurrentRecipe] = useState<PerfumeRecipe | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const hasTopNote = selectedIngredients.some(i => i.noteType === 'top')
  const hasMiddleNote = selectedIngredients.some(i => i.noteType === 'middle')
  const hasBaseNote = selectedIngredients.some(i => i.noteType === 'base')
  const canBlend = selectedIngredients.length >= 3 && hasTopNote && hasMiddleNote && hasBaseNote

  const handleDropIngredient = useCallback((ingredient: Ingredient) => {
    setSelectedIngredients(prev => {
      if (prev.find(i => i.id === ingredient.id)) {
        return prev
      }
      return [...prev, ingredient]
    })
  }, [])

  const handleRemoveIngredient = useCallback((id: string) => {
    setSelectedIngredients(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleDragStart = useCallback((_ingredient: Ingredient) => {
  }, [])

  const handleDragEnd = useCallback(() => {
  }, [])

  const handleBlend = useCallback(() => {
    if (!canBlend || isBlending) return

    setIsBlending(true)

    setTimeout(() => {
      const newRecipe: PerfumeRecipe = {
        id: uuidv4(),
        name: perfumeName || '未命名香水',
        createdAt: new Date().toISOString(),
        ingredients: [...selectedIngredients],
      }

      setCurrentRecipe(newRecipe)
      setIsBlending(false)
      setShowCardModal(true)
    }, 1500)
  }, [canBlend, isBlending, perfumeName, selectedIngredients])

  const handleSaveRecipe = useCallback(() => {
    if (!currentRecipe) return

    setSavedRecipes(prev => {
      if (prev.length >= MAX_RECIPES) {
        return [...prev.slice(1), currentRecipe]
      }
      return [...prev, currentRecipe]
    })

    setShowCardModal(false)
    setSelectedIngredients([])
    setPerfumeName('')
    setCurrentRecipe(null)
  }, [currentRecipe])

  const handleViewRecipe = useCallback((recipe: PerfumeRecipe) => {
    setCurrentRecipe(recipe)
    setShowCardModal(true)
  }, [])

  const handleLongPress = useCallback((id: string) => {
    if (deletingId === id) {
      setSavedRecipes(prev => prev.filter(r => r.id !== id))
      setDeletingId(null)
    } else {
      setDeletingId(id)
      setTimeout(() => {
        setDeletingId(null)
      }, 2000)
    }
  }, [deletingId])

  const handleCloseModal = useCallback(() => {
    setShowCardModal(false)
    setCurrentRecipe(null)
  }, [])

  return (
    <div className="app-container">
      <motion.header 
        className="app-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>虚拟调香师实验室</h1>
        <p>Virtual Perfumer Lab · 调配属于你的独一无二</p>
      </motion.header>

      <main className="main-content">
        <section className="shelf-section">
          <IngredientShelf
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </section>

        <section className="mixing-section">
          <MixingBowl
            ingredients={selectedIngredients}
            onRemoveIngredient={handleRemoveIngredient}
            onDrop={handleDropIngredient}
            isBlending={isBlending}
            onBlend={handleBlend}
            perfumeName={perfumeName}
            onNameChange={setPerfumeName}
            canBlend={canBlend}
          />
        </section>

        <section className="gallery-section">
          <div className="gallery-header">
            <h3 className="gallery-title">我的配方</h3>
            <span className="gallery-count">{savedRecipes.length}/{MAX_RECIPES}</span>
          </div>
          
          <div className="gallery-container">
            {savedRecipes.length === 0 ? (
              <div className="gallery-empty">
                <span className="empty-icon">📜</span>
                <span className="empty-text">还没有保存的配方，调和你的第一瓶香水吧</span>
              </div>
            ) : (
              <div className="gallery-scroll">
                {savedRecipes.map((recipe) => (
                  <PerfumeCard
                    key={recipe.id}
                    recipe={recipe}
                    size="thumbnail"
                    onClick={() => handleViewRecipe(recipe)}
                    onLongPress={() => handleLongPress(recipe.id)}
                    isDeleting={deletingId === recipe.id}
                  />
                ))}
              </div>
            )}
          </div>
          
          {savedRecipes.length > 0 && (
            <p className="gallery-hint">长按卡片可删除配方</p>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showCardModal && currentRecipe && (
          <motion.div
            className="card-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <PerfumeCard recipe={currentRecipe} size="full" />
              
              <div className="modal-actions">
                <motion.button
                  className="action-button save-button"
                  onClick={handleSaveRecipe}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  保存配方
                </motion.button>
                <motion.button
                  className="action-button close-button"
                  onClick={handleCloseModal}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  关闭
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
