import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { useDebounce } from '../hooks/useDebounce';
import type { Recipe } from '../types';

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchRecipes = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      const res = await fetch('/api/recipes', { signal: abortRef.current.signal });
      if (res.ok) {
        const data: Recipe[] = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('获取食谱列表失败:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
    return () => abortRef.current?.abort();
  }, [fetchRecipes]);

  const filteredRecipes = useMemo(() => {
    if (!debouncedSearch.trim()) return recipes;
    const query = debouncedSearch.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
    );
  }, [recipes, debouncedSearch]);

  const handleDelete = useCallback(async (recipe: Recipe) => {
    setDeletingIds((prev) => new Set(prev).add(recipe.id));

    setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
        if (res.ok) {
          setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
        }
      } catch (err) {
        console.error('删除食谱失败:', err);
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(recipe.id);
          return next;
        });
      }
    }, 400);
  }, []);

  return (
    <div className="page page-fade-in">
      <header className="list-header">
        <div className="header-row">
          <div>
            <h1 className="app-title">食谱管理与营养分析</h1>
            <p className="app-subtitle">创建食谱，自动计算营养成分</p>
          </div>
          <Link to="/create" className="btn btn-primary btn-create">
            + 新建食谱
          </Link>
        </div>
        <div className="search-wrapper">
          <input
            type="text"
            className="form-input search-input"
            placeholder="搜索食谱名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="list-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>加载中...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-illustration">🍳</div>
            <h3>没有找到食谱</h3>
            <p>
              {debouncedSearch ? '试试其他关键词' : '点击"新建食谱"创建您的第一个食谱吧'}
            </p>
            {!debouncedSearch && (
              <Link to="/create" className="btn btn-primary">
                + 新建食谱
              </Link>
            )}
          </div>
        ) : (
          <div className="recipe-grid">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                onDelete={() => setDeleteTarget(recipe)}
                isDeleting={deletingIds.has(recipe.id)}
              />
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除食谱"
        message={`确定要删除「${deleteTarget?.name}」吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
