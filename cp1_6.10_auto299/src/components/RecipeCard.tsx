import React from 'react'
import { Recipe } from '../data'

interface Props {
  recipe: Recipe
  matchPercent?: number
  isInspiration?: boolean
  onClick: () => void
}

const difficultyClass: Record<string, string> = {
  '简单': 'difficulty-easy',
  '中等': 'difficulty-medium',
  '困难': 'difficulty-hard'
}

const RecipeCard: React.FC<Props> = ({ recipe, matchPercent, isInspiration, onClick }) => {
  if (isInspiration) {
    return (
      <div className="recipe-card inspiration-card" onClick={onClick}>
        <div className="recipe-emoji">{recipe.emoji}</div>
        <div className="recipe-card-name">{recipe.name}</div>
      </div>
    )
  }

  return (
    <div className="recipe-card" onClick={onClick}>
      <div className="recipe-card-header">
        <span className="recipe-emoji">{recipe.emoji}</span>
        <div className="recipe-card-name">{recipe.name}</div>
      </div>
      <div className="recipe-card-meta">
        <span>⏱️ {recipe.time}分钟</span>
        <span className={`difficulty-badge ${difficultyClass[recipe.difficulty]}`}>{recipe.difficulty}</span>
      </div>
      {matchPercent !== undefined && (
        <div className="match-bar-container">
          <div className="match-bar-label">
            <span>食材匹配度</span>
            <span className="match-percent">{matchPercent}%</span>
          </div>
          <div className="match-bar">
            <div className="match-bar-fill" style={{ width: `${matchPercent}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default RecipeCard
