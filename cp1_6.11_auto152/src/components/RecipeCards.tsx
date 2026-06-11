import { useCallback } from 'react'
import { useWorkshopStore } from '../store'
import { v4 as uuidv4 } from 'uuid'
import type { SaveData } from '../types'

export default function RecipeCards() {
  const { savedRecipes, candles, saveRecipe, deleteRecipe, restoreFromRecipe, selectCandle } = useWorkshopStore()

  const handleSave = useCallback(() => {
    for (const c of candles) {
      const data: SaveData = {
        id: c.id,
        name: c.name,
        waxColor: c.waxColor,
        scents: c.scents,
        burnDuration: c.burnTime,
        currentColor: c.currentColor,
      }
      saveRecipe(data)
    }
  }, [candles, saveRecipe])

  const handleRestore = useCallback(
    (recipe: SaveData) => {
      restoreFromRecipe(recipe)
      selectCandle(recipe.id)
    },
    [restoreFromRecipe, selectCandle]
  )

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      deleteRecipe(id)
    },
    [deleteRecipe]
  )

  return (
    <div className="recipe-section">
      <div className="recipe-header">
        <span className="recipe-title">已保存配方</span>
        <button className="save-btn" onClick={handleSave}>
          保存当前配方
        </button>
      </div>
      <div className="recipe-grid">
        {savedRecipes.map((recipe) => {
          const progress = Math.min(recipe.burnDuration / 240000, 1)
          return (
            <div
              key={recipe.id}
              className="recipe-card"
              style={{ backgroundColor: recipe.currentColor }}
              onClick={() => handleRestore(recipe)}
            >
              <span className="recipe-card-name">{recipe.name}</span>
              <div className="recipe-progress-track">
                <div
                  className="recipe-progress-fill"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <button
                className="recipe-delete-btn"
                onClick={(e) => handleDelete(recipe.id, e)}
              >
                ×
              </button>
            </div>
          )
        })}
        {savedRecipes.length === 0 && (
          <div className="recipe-empty">尚无保存的配方</div>
        )}
      </div>
    </div>
  )
}
