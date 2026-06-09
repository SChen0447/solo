import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import ShoppingList from './components/ShoppingList';
import type { Recipe, SearchFilters } from './types';
import { TAGS } from './types';

type ViewMode = 'list' | 'detail' | 'form' | 'shopping';

function HomePage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({ query: '', tags: [] });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query);
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      const res = await fetch(`/api/recipes?${params.toString()}`);
      const data = await res.json();
      setRecipes(data);
    } catch (error) {
      console.error('获取食谱列表失败', error);
    }
  }, [filters]);

  const fetchRecommendations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (recentTags.length > 0) params.append('tags', recentTags.join(','));
      const res = await fetch(`/api/recommendations?${params.toString()}`);
      const data = await res.json();
      setRecommendations(data);
    } catch (error) {
      console.error('获取推荐失败', error);
    }
  }, [recentTags]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/recipes/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setSelectedRecipe(data);
          const newTags = [...new Set([...recentTags, ...data.tags])].slice(-6);
          setRecentTags(newTags);
          setViewMode('detail');
        })
        .catch(console.error);
    } else {
      setSelectedRecipe(null);
    }
  }, [params.id]);

  const handleSelectRecipe = (recipe: Recipe) => {
    navigate(`/recipe/${recipe.id}`);
    setSelectedRecipe(recipe);
    const newTags = [...new Set([...recentTags, ...recipe.tags])].slice(-6);
    setRecentTags(newTags);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个食谱吗？')) return;
    try {
      await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
        navigate('/');
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error('删除失败', error);
    }
  };

  const handleCreate = () => {
    setEditingRecipe(null);
    setViewMode('form');
    navigate('/new');
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setViewMode('form');
    navigate(`/edit/${recipe.id}`);
  };

  const handleSave = () => {
    setEditingRecipe(null);
    setViewMode('list');
    navigate('/');
    fetchRecipes();
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingRecipe(null);
    setSelectedRecipe(null);
    navigate('/');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1 className="app-title" onClick={handleBack}>
            🍳 美食食谱
          </h1>
          <nav className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <button className="nav-btn" onClick={() => { handleBack(); setMobileMenuOpen(false); }}>
              食谱列表
            </button>
            <button className="nav-btn" onClick={() => { setViewMode('shopping'); navigate('/shopping'); setMobileMenuOpen(false); }}>
              购物清单 ({selectedIds.size})
            </button>
            <button className="nav-btn primary" onClick={() => { handleCreate(); setMobileMenuOpen(false); }}>
              + 新增食谱
            </button>
          </nav>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
        )}
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <div className="main-layout">
              <div className="list-panel">
                <RecipeList
                  recipes={recipes}
                  recommendations={recommendations}
                  filters={filters}
                  setFilters={setFilters}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelect={handleSelectRecipe}
                  selectedRecipe={selectedRecipe}
                />
              </div>
              <div className="detail-panel">
                {selectedRecipe ? (
                  <RecipeDetail
                    recipe={selectedRecipe}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ) : (
                  <div className="empty-detail">
                    <div className="empty-icon">📖</div>
                    <p>选择一个食谱查看详情</p>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <Route
          path="/recipe/:id"
          element={
            <div className="main-layout">
              <div className="list-panel">
                <RecipeList
                  recipes={recipes}
                  recommendations={recommendations}
                  filters={filters}
                  setFilters={setFilters}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelect={handleSelectRecipe}
                  selectedRecipe={selectedRecipe}
                />
              </div>
              <div className="detail-panel">
                {selectedRecipe && (
                  <RecipeDetail
                    recipe={selectedRecipe}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            </div>
          }
        />
        <Route
          path="/new"
          element={<RecipeForm onSave={handleSave} onCancel={handleBack} />}
        />
        <Route
          path="/edit/:id"
          element={<RecipeForm recipe={editingRecipe} onSave={handleSave} onCancel={handleBack} />}
        />
        <Route
          path="/shopping"
          element={
            <ShoppingList
              selectedIds={selectedIds}
              recipes={recipes}
              onBack={handleBack}
              onClear={() => setSelectedIds(new Set())}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return <HomePage />;
}
