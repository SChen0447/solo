import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import RecipeForm from './components/RecipeForm';
import RecipeCard from './components/RecipeCard';
import IngredientMatcher from './components/IngredientMatcher';
import StatsPage from './components/StatsPage';
import type { Recipe, MatchResult } from './types';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((data) => setRecipes(data))
      .catch(() => {
        import('./mockData').then((m) => setRecipes(m.defaultRecipes));
      });
  }, []);

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id' | 'favorite' | 'coverImage'>) => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe)
      });
      const newRecipe = await res.json();
      setRecipes((prev) => [newRecipe, ...prev]);
    } catch {
      const newRecipe: Recipe = {
        ...recipe,
        id: Date.now().toString(),
        favorite: false,
        coverImage: ''
      };
      setRecipes((prev) => [newRecipe, ...prev]);
    }
    setShowForm(false);
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
    );
    try {
      const recipe = recipes.find((r) => r.id === id);
      if (recipe) {
        await fetch(`/api/recipes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorite: !recipe.favorite })
        });
      }
    } catch {}
  }, [recipes]);

  const handleDelete = useCallback((id: string) => {
    setConfirmDelete(id);
  }, []);

  const confirmDeleteRecipe = useCallback(async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete);
    const id = confirmDelete;
    setConfirmDelete(null);

    setTimeout(async () => {
      try {
        await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      } catch {}
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      setDeletingId(null);
    }, 400);
  }, [confirmDelete]);

  const cancelDelete = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🍳 智能食谱管理</h1>
        <nav className="app-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            首页
          </Link>
          <Link to="/stats" className={`nav-link ${location.pathname === '/stats' ? 'active' : ''}`}>
            数据统计
          </Link>
        </nav>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <div className="main-content">
              <div className="recipes-section">
                <div className="section-header">
                  <h2>我的食谱</h2>
                  <button
                    className="btn btn-primary ripple"
                    onClick={() => setShowForm(true)}
                  >
                    + 创建食谱
                  </button>
                </div>

                <div className={`recipes-grid ${deletingId ? 'deleting' : ''}`}>
                  {recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className={`recipe-card-wrapper ${
                        deletingId === recipe.id ? 'fade-out' : ''
                      }`}
                    >
                      <RecipeCard
                        recipe={recipe}
                        onToggleFavorite={toggleFavorite}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                </div>

                {recipes.length === 0 && (
                  <div className="empty-state">
                    <p>还没有食谱，点击"创建食谱"开始添加吧！</p>
                  </div>
                )}
              </div>

              <div className="matcher-section">
                <IngredientMatcher recipes={recipes} />
              </div>
            </div>
          }
        />
        <Route path="/stats" element={<StatsPage recipes={recipes} />} />
      </Routes>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-enter" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowForm(false)}>
              ×
            </button>
            <RecipeForm onSubmit={addRecipe} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content confirm-modal modal-enter" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-text">确定删除该食谱吗？</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary ripple" onClick={cancelDelete}>
                取消
              </button>
              <button className="btn btn-danger ripple" onClick={confirmDeleteRecipe}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
