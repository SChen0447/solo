import React, { useState, useEffect, useMemo } from 'react'
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { recipes, ingredients } from './data'
import IngredientSelector from './components/IngredientSelector'
import RecipeCard from './components/RecipeCard'
import NutritionPieChart from './components/NutritionPieChart'

const STORAGE_KEY = 'recipe-palette-selected'

function getRandomRecipes(count: number) {
  const shuffled = [...recipes].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

interface MatchedRecipe {
  recipe: typeof recipes[number]
  percent: number
}

function HomePage() {
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds))
  }, [selectedIds])

  const inspirationRecipes = useMemo(() => getRandomRecipes(5), [])

  const matchedRecipes = useMemo<MatchedRecipe[]>(() => {
    if (selectedIds.length === 0) return []
    const result: MatchedRecipe[] = []
    for (const recipe of recipes) {
      const needed = recipe.matchIngredients
      if (needed.length === 0) continue
      const matched = needed.filter(id => selectedIds.includes(id)).length
      const percent = Math.round((matched / needed.length) * 100)
      if (percent >= 60) {
        result.push({ recipe, percent })
      }
    }
    result.sort((a, b) => b.percent - a.percent)
    return result.slice(0, 5)
  }, [selectedIds])

  const handleSelect = (id: string) => {
    setSelectedIds(prev => [...prev, id])
  }

  const handleRemove = (id: string) => {
    setSelectedIds(prev => prev.filter(i => i !== id))
  }

  return (
    <div>
      <header className="app-header">
        <h1>🍳 食谱调色盘</h1>
        <p>让家中的食材，变出美味惊喜</p>
      </header>

      <IngredientSelector
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onRemove={handleRemove}
      />

      {selectedIds.length === 0 ? (
        <>
          <div className="guide-hint">
            选择你的食材，让我来推荐美味菜谱！（提示：试试西红柿、鸡蛋、牛奶……）
            <span className="cursor-blink" />
          </div>
          <section className="recipes-section" style={{ marginTop: '24px' }}>
            <h2>🌟 今日灵感</h2>
            <div className="recipes-grid">
              {inspirationRecipes.map(r => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  isInspiration
                  onClick={() => navigate(`/recipe/${r.id}`)}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="recipes-section">
          <h2>✨ 为你推荐</h2>
          {matchedRecipes.length > 0 ? (
            <div className="recipes-grid">
              {matchedRecipes.map(({ recipe, percent }) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  matchPercent={percent}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="no-match">
              😊 没有找到匹配度60%以上的菜谱，试试添加更多食材吧！
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const recipe = useMemo(() => recipes.find(r => r.id === id), [id])

  if (!recipe) {
    return (
      <div className="recipe-detail" style={{ padding: '48px', textAlign: 'center' }}>
        <h2>菜谱不存在</h2>
        <button className="back-button" onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  const fullIngredientsWithEmoji = recipe.fullIngredients.map(fi => {
    const ing = ingredients.find(i => i.id === fi.ingredientId)
    return { ...fi, name: ing?.name || '', emoji: ing?.iconEmoji || '🍽️' }
  })

  return (
    <div className="recipe-detail">
      <div className="detail-top">
        <div className="detail-info">
          <div className="detail-title">
            <span className="detail-emoji">{recipe.emoji}</span>
            <h2>{recipe.name}</h2>
          </div>
          <div className="detail-meta">
            <span className="detail-meta-item">⏱️ {recipe.time}分钟</span>
            <span className="detail-meta-item">📊 {recipe.difficulty}</span>
          </div>
          <h3 className="section-title" style={{ marginTop: '8px' }}>食材清单</h3>
          <div className="ingredients-list">
            {fullIngredientsWithEmoji.map((fi, i) => (
              <div key={i} className="ingredient-item">
                <span className="ingredient-item-emoji">{fi.emoji}</span>
                <span className="ingredient-item-name">{fi.name}</span>
                <span className="ingredient-item-amount">{fi.amount}</span>
              </div>
            ))}
          </div>
        </div>
        <NutritionPieChart nutrition={recipe.nutrition} />
      </div>

      <div className="detail-content">
        <h3 className="section-title">烹饪步骤</h3>
        <ul className="steps-list">
          {recipe.steps.map((step, i) => (
            <li key={i} className="step-item">
              <span className="step-dot" />
              <span className="step-text">{step}</span>
            </li>
          ))}
        </ul>
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回推荐
        </button>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/recipe/:id" element={<RecipeDetailPage />} />
    </Routes>
  )
}

export default App
