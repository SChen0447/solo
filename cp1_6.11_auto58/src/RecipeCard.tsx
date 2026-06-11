import { useState } from 'react'
import type { Recipe } from './types'

interface RecipeCardProps {
  recipe: Recipe
  isFavorite: boolean
  onFavoriteToggle: (recipeId: string) => void
  onClick: (recipe: Recipe) => void
  index?: number
}

const ICON_TYPES = ['noodle', 'salad', 'cake', 'soup', 'steak', 'pasta', 'rice', 'fish', 'bread']

function StarRating({ difficulty }: { difficulty: number }) {
  return (
    <div className="recipe-card-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`star-dot${i <= difficulty ? ' filled' : ''}`}
        />
      ))}
    </div>
  )
}

function HeartIcon({
  isFavorite,
  isAnimating,
  animationType,
}: {
  isFavorite: boolean
  isAnimating: boolean
  animationType: 'heartbeat' | 'unfavoriting' | null
}) {
  let iconClass = 'heart-icon'
  if (isFavorite) iconClass += ' active'
  if (isAnimating && animationType === 'heartbeat') iconClass += ' heartbeat'
  if (isAnimating && animationType === 'unfavoriting') iconClass += ' unfavoriting'

  return <div className={iconClass} />
}

function FoodIcon({ iconType }: { iconType: string }) {
  return (
    <div className={`food-icon ${iconType}`}>
      {iconType === 'noodle' && (
        <>
          <div className="steam" />
          <div className="bowl" />
        </>
      )}
      {iconType === 'salad' && (
        <>
          <div className="bowl" />
          <div className="greens">
            <div className="leaf" />
            <div className="leaf" />
            <div className="leaf" />
          </div>
        </>
      )}
      {iconType === 'cake' && (
        <>
          <div className="plate" />
          <div className="layer1" />
          <div className="layer2" />
          <div className="cherry" />
        </>
      )}
      {iconType === 'soup' && (
        <>
          <div className="bowl" />
          <div className="broth" />
          <div className="herb" />
          <div className="herb" />
          <div className="herb" />
        </>
      )}
      {iconType === 'steak' && (
        <>
          <div className="plate" />
          <div className="meat" />
        </>
      )}
      {iconType === 'pasta' && (
        <>
          <div className="plate" />
          <div className="noodles" />
          <div className="sauce" />
        </>
      )}
      {iconType === 'rice' && (
        <>
          <div className="bowl" />
          <div className="mound" />
        </>
      )}
      {iconType === 'fish' && (
        <>
          <div className="plate" />
          <div className="body" />
          <div className="tail" />
          <div className="eye" />
        </>
      )}
      {iconType === 'bread' && (
        <>
          <div className="basket" />
          <div className="loaf" />
        </>
      )}
    </div>
  )
}

export default function RecipeCard({
  recipe,
  isFavorite,
  onFavoriteToggle,
  onClick,
  index = 0,
}: RecipeCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationType, setAnimationType] = useState<'heartbeat' | 'unfavoriting' | null>(null)
  const iconType = ICON_TYPES[index % ICON_TYPES.length]

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isAnimating) return

    if (isFavorite) {
      setAnimationType('unfavoriting')
      setIsAnimating(true)
      setTimeout(() => {
        onFavoriteToggle(recipe.id)
        setIsAnimating(false)
        setAnimationType(null)
      }, 300)
    } else {
      setAnimationType('heartbeat')
      setIsAnimating(true)
      onFavoriteToggle(recipe.id)
      setTimeout(() => {
        setIsAnimating(false)
        setAnimationType(null)
      }, 300)
    }
  }

  return (
    <div
      className="recipe-card"
      onClick={() => onClick(recipe)}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
    >
      <div className="recipe-card-icon">
        <FoodIcon iconType={iconType} />
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-name">{recipe.name}</h3>
        <div className="recipe-card-meta">
          <div className="recipe-card-duration">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            {recipe.duration} 分钟
          </div>
          <StarRating difficulty={recipe.difficulty} />
        </div>
      </div>
      <div
        className="recipe-card-favorite"
        onClick={handleFavoriteClick}
        role="button"
        aria-label={isFavorite ? '取消收藏' : '收藏菜谱'}
      >
        <HeartIcon
          isFavorite={isFavorite && animationType !== 'unfavoriting'}
          isAnimating={isAnimating}
          animationType={animationType}
        />
      </div>
    </div>
  )
}

export { FoodIcon }
