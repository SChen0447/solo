import { useState, useEffect, useCallback, useRef } from 'react'
import type { Recipe, RecipeWithMatch, Note } from './types'
import {
  getRecommendations,
  getRandomRecipe,
  getFavorites,
  addFavorite,
  removeFavorite,
  getNotes,
  addNote,
  updateNote,
  deleteNote
} from './api'

function App() {
  const [currentInput, setCurrentInput] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<RecipeWithMatch[]>([])
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Recipe[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null)
  const [showRandomModal, setShowRandomModal] = useState(false)
  const [notes, setNotes] = useState<Record<string, Note[]>>({})
  const [showNoteEditor, setShowNoteEditor] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteEditorText, setNoteEditorText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      const data = await getFavorites()
      setFavorites(data)
    } catch (err) {
      console.error('加载收藏失败:', err)
    }
  }

  const loadNotes = useCallback(async (recipeId: string) => {
    try {
      const data = await getNotes(recipeId)
      setNotes(prev => ({ ...prev, [recipeId]: data }))
    } catch (err) {
      console.error('加载笔记失败:', err)
    }
  }, [])

  useEffect(() => {
    if (expandedRecipeId && !notes[expandedRecipeId]) {
      loadNotes(expandedRecipeId)
    }
  }, [expandedRecipeId, notes, loadNotes])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      e.preventDefault()
      addIngredient()
    }
  }

  const addIngredient = () => {
    const trimmed = currentInput.trim()
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed])
    }
    setCurrentInput('')
  }

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const handleSearch = async () => {
    if (ingredients.length < 1) {
      setError('请至少输入一种食材')
      return
    }

    setLoading(true)
    setError(null)
    setSearched(true)
    setExpandedRecipeId(null)

    try {
      const data = await getRecommendations(ingredients)
      setRecommendations(data)
    } catch (err) {
      setError('搜索失败，请稍后重试')
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleExpand = (recipeId: string) => {
    setExpandedRecipeId(prev => prev === recipeId ? null : recipeId)
  }

  const handleToggleFavorite = async (recipe: Recipe | RecipeWithMatch) => {
    const isFavorited = favorites.some(f => f.id === recipe.id)

    try {
      let newFavorites: Recipe[]
      if (isFavorited) {
        newFavorites = await removeFavorite(recipe.id)
      } else {
        newFavorites = await addFavorite(recipe.id)
      }
      setFavorites(newFavorites)
    } catch (err) {
      console.error('收藏操作失败:', err)
    }
  }

  const handleRandomRecipe = async () => {
    try {
      const recipe = await getRandomRecipe()
      setRandomRecipe(recipe)
      setShowRandomModal(true)
    } catch (err) {
      setError('获取随机菜谱失败')
    }
  }

  const closeRandomModal = () => {
    setShowRandomModal(false)
    setTimeout(() => setRandomRecipe(null), 300)
  }

  const handleFavoriteClick = (recipe: Recipe) => {
    setSidebarOpen(false)
    setExpandedRecipeId(recipe.id)
    setRecommendations([{ ...recipe, matchCount: 0, matchRatio: 0 }])
    setSearched(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openNoteEditor = (recipeId: string, note?: Note) => {
    setShowNoteEditor(recipeId)
    setEditingNoteId(note?.id || null)
    setNoteEditorText(note?.content || '')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const closeNoteEditor = () => {
    setShowNoteEditor(null)
    setEditingNoteId(null)
    setNoteEditorText('')
  }

  const handleSaveNote = async () => {
    if (!showNoteEditor || !noteEditorText.trim()) return

    try {
      if (editingNoteId) {
        const updated = await updateNote(showNoteEditor, editingNoteId, noteEditorText)
        setNotes(prev => ({
          ...prev,
          [showNoteEditor]: prev[showNoteEditor]?.map(n =>
            n.id === editingNoteId ? updated : n
          )
        }))
      } else {
        const newNote = await addNote(showNoteEditor, noteEditorText)
        setNotes(prev => ({
          ...prev,
          [showNoteEditor]: [newNote, ...(prev[showNoteEditor] || [])]
        }))
      }
      closeNoteEditor()
    } catch (err) {
      console.error('保存笔记失败:', err)
    }
  }

  const handleDeleteNote = async (recipeId: string, noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return

    try {
      await deleteNote(recipeId, noteId)
      setNotes(prev => ({
        ...prev,
        [recipeId]: prev[recipeId]?.filter(n => n.id !== noteId)
      }))
    } catch (err) {
      console.error('删除笔记失败:', err)
    }
  }

  const insertFormat = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = noteEditorText.substring(start, end)

    let prefix = ''
    let suffix = ''
    let newText = ''

    switch (format) {
      case 'bold':
        prefix = '**'
        suffix = '**'
        newText = noteEditorText.substring(0, start) + prefix + (selected || '粗体文字') + suffix + noteEditorText.substring(end)
        break
      case 'italic':
        prefix = '*'
        suffix = '*'
        newText = noteEditorText.substring(0, start) + prefix + (selected || '斜体文字') + suffix + noteEditorText.substring(end)
        break
      case 'ul':
        prefix = '- '
        newText = noteEditorText.substring(0, start) + prefix + (selected || '列表项') + '\n' + noteEditorText.substring(end)
        break
      case 'ol':
        prefix = '1. '
        newText = noteEditorText.substring(0, start) + prefix + (selected || '列表项') + '\n' + noteEditorText.substring(end)
        break
      default:
        return
    }

    setNoteEditorText(newText)

    setTimeout(() => {
      textarea.focus()
      if (selected) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length)
      }
    }, 0)
  }

  const renderNoteContent = (content: string) => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
    let match

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      const text = match[0]
      if (text.startsWith('**')) {
        parts.push(<strong key={match.index}>{text.slice(2, -2)}</strong>)
      } else if (text.startsWith('*')) {
        parts.push(<em key={match.index}>{text.slice(1, -1)}</em>)
      }
      lastIndex = match.index + text.length
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  const getStarRating = (matchCount: number, totalIngredients: number) => {
    const ratio = matchCount / totalIngredients
    if (ratio >= 0.8) return 5
    if (ratio >= 0.6) return 4
    if (ratio >= 0.4) return 3
    if (ratio >= 0.25) return 2
    return 1
  }

  const renderStars = (count: number) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count)
  }

  const isIngredientMatched = (ingredient: string) => {
    const lower = ingredient.toLowerCase()
    return ingredients.some(ing =>
      lower.includes(ing.toLowerCase()) || ing.toLowerCase().includes(lower)
    )
  }

  const renderRecipeDetail = (recipe: Recipe) => (
    <div className="recipe-detail">
      <div className="detail-layout">
        <div className="detail-image-placeholder">{recipe.image}</div>
        <div className="detail-content">
          <h3>所需食材</h3>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing, idx) => (
              <li
                key={idx}
                className={`ingredient-item ${
                  searched && isIngredientMatched(ing) ? 'matched' : ''
                }`}
              >
                {ing}
              </li>
            ))}
          </ul>

          <div className="cook-time">
            <span>⏱️</span>
            <span>预计耗时：{recipe.cookTime} 分钟</span>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '24px' }}>烹饪步骤</h3>
      <ol className="steps-list">
        {recipe.steps.map((step, idx) => (
          <li key={idx} className="step-item">
            <span className="step-text">{step}</span>
          </li>
        ))}
      </ol>

      <div className="action-buttons">
        <button
          className={`action-btn ${favorites.some(f => f.id === recipe.id) ? 'favorited' : 'secondary'}`}
          onClick={() => handleToggleFavorite(recipe)}
        >
          {favorites.some(f => f.id === recipe.id) ? '❤️ 已收藏' : '🤍 收藏菜谱'}
        </button>
        <button
          className="action-btn primary"
          onClick={() => openNoteEditor(recipe.id)}
        >
          📝 添加笔记
        </button>
      </div>

      <div className="notes-section">
        <div className="notes-header">
          <h3>我的笔记 ({notes[recipe.id]?.length || 0})</h3>
          <button
            className="add-note-btn"
            onClick={() => openNoteEditor(recipe.id)}
          >
            + 添加笔记
          </button>
        </div>

        {showNoteEditor === recipe.id && (
          <div className="note-editor">
            <div className="note-toolbar">
              <button
                className="toolbar-btn"
                onClick={() => insertFormat('bold')}
                title="粗体"
              >
                <strong>B</strong>
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormat('italic')}
                title="斜体"
              >
                <em>I</em>
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormat('ul')}
                title="无序列表"
              >
                •
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormat('ol')}
                title="有序列表"
              >
                1.
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className="note-textarea"
              value={noteEditorText}
              onChange={e => setNoteEditorText(e.target.value)}
              placeholder="写下你的烹饪心得..."
            />
            <div className="note-editor-actions">
              <button className="action-btn secondary" onClick={closeNoteEditor}>
                取消
              </button>
              <button
                className="action-btn primary"
                onClick={handleSaveNote}
                disabled={!noteEditorText.trim()}
              >
                {editingNoteId ? '更新' : '保存'}
              </button>
            </div>
          </div>
        )}

        {notes[recipe.id]?.length === 0 && !showNoteEditor && (
          <div className="empty-notes">
            还没有笔记，快来添加第一条吧～
          </div>
        )}

        {notes[recipe.id]?.map(note => (
          <div key={note.id} className="note-item">
            <div className="note-content">{renderNoteContent(note.content)}</div>
            <div className="note-meta">
              <span>{new Date(note.updatedAt).toLocaleString('zh-CN')}</span>
              <div className="note-actions">
                <button
                  className="note-action-btn"
                  onClick={() => openNoteEditor(recipe.id, note)}
                >
                  编辑
                </button>
                <button
                  className="note-action-btn delete"
                  onClick={() => handleDeleteNote(recipe.id, note.id)}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="app-container">
      <button
        className="favorite-toggle"
        onClick={() => setSidebarOpen(true)}
      >
        📚 收藏夹 ({favorites.length})
      </button>

      <header className="header">
        <h1>🍳 智能食谱生成器</h1>
        <p>输入你有的食材，我来推荐美味佳肴</p>
      </header>

      <section className="search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="输入食材名称，按回车添加..."
            value={currentInput}
            onChange={e => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-btn" onClick={handleSearch}>
            搜索
          </button>
          <button className="random-btn" onClick={handleRandomRecipe}>
            🎲 随机
          </button>
        </div>

        {ingredients.length > 0 && (
          <div className="search-tags">
            {ingredients.map((ing, idx) => (
              <span key={idx} className="search-tag">
                {ing}
                <button onClick={() => removeIngredient(idx)}>×</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading">正在为您匹配菜谱...</div>}

      {searched && !loading && recommendations.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🤔</div>
          <div className="empty-state-text">没有找到匹配的菜谱</div>
          <div className="empty-state-hint">
            试试添加更多食材，或者换个食材名称？
          </div>
        </div>
      )}

      {searched && recommendations.length > 0 && (
        <>
          <h2 className="section-title">推荐菜谱</h2>
          <div className="recipe-grid">
            {recommendations.map(recipe => (
              <div
                key={recipe.id}
                className={`recipe-card ${
                  expandedRecipeId === recipe.id ? 'expanded' : ''
                }`}
                onClick={() =>
                  expandedRecipeId !== recipe.id && handleToggleExpand(recipe.id)
                }
              >
                <div className="recipe-card-header">
                  <div className="recipe-icon">{recipe.image}</div>
                  <div className="recipe-card-info">
                    <div className="recipe-card-name">{recipe.name}</div>
                    <div className="recipe-card-category">{recipe.category}</div>
                    <div className="recipe-match-info">
                      {recipe.matchCount > 0 && (
                        <span className="match-count">
                          匹配 {recipe.matchCount} 种食材
                        </span>
                      )}
                      <span className="stars">
                        {renderStars(
                          getStarRating(
                            recipe.matchCount,
                            recipe.ingredients.length
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="recipe-card-meta">
                  <span>🍽️ {recipe.ingredients.length} 种食材</span>
                  <span>⏱️ {recipe.cookTime} 分钟</span>
                </div>

                {expandedRecipeId === recipe.id && (
                  <div onClick={e => e.stopPropagation()}>
                    {renderRecipeDetail(recipe)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div
        className={`overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`favorite-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>📚 我的收藏</h2>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="sidebar-content">
          {favorites.length === 0 ? (
            <div className="empty-favorites">
              <div className="empty-favorites-icon">📖</div>
              <div>还没有收藏的菜谱</div>
            </div>
          ) : (
            favorites.map(recipe => (
              <div key={recipe.id} className="favorite-item">
                <div
                  className="favorite-item-icon"
                  onClick={() => handleFavoriteClick(recipe)}
                >
                  {recipe.image}
                </div>
                <div
                  className="favorite-item-info"
                  onClick={() => handleFavoriteClick(recipe)}
                >
                  <div className="favorite-item-name">{recipe.name}</div>
                  <div className="favorite-item-category">{recipe.category}</div>
                </div>
                <button
                  className="favorite-item-remove"
                  onClick={e => {
                    e.stopPropagation()
                    handleToggleFavorite(recipe)
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div
        className={`modal-overlay ${showRandomModal ? 'visible' : ''}`}
        onClick={closeRandomModal}
      >
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          {randomRecipe && (
            <>
              <div className="modal-header">
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
                    {randomRecipe.image}
                  </div>
                  <div className="modal-title">{randomRecipe.name}</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {randomRecipe.category} · {randomRecipe.cookTime} 分钟
                  </div>
                </div>
                <button className="modal-close" onClick={closeRandomModal}>
                  ×
                </button>
              </div>

              <h3 style={{ marginBottom: '12px', color: 'var(--accent-dark)' }}>
                所需食材
              </h3>
              <ul className="ingredient-list" style={{ marginBottom: '20px' }}>
                {randomRecipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="ingredient-item">
                    {ing}
                  </li>
                ))}
              </ul>

              <h3 style={{ marginBottom: '12px', color: 'var(--accent-dark)' }}>
                烹饪步骤
              </h3>
              <ol className="steps-list">
                {randomRecipe.steps.map((step, idx) => (
                  <li key={idx} className="step-item">
                    <span className="step-text">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="action-buttons">
                <button
                  className={`action-btn ${
                    favorites.some(f => f.id === randomRecipe.id)
                      ? 'favorited'
                      : 'secondary'
                  }`}
                  onClick={() => handleToggleFavorite(randomRecipe)}
                >
                  {favorites.some(f => f.id === randomRecipe.id)
                    ? '❤️ 已收藏'
                    : '🤍 收藏菜谱'}
                </button>
                <button
                  className="action-btn primary"
                  onClick={handleRandomRecipe}
                >
                  🎲 换一个
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
