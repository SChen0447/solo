import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import NutritionCard from '../components/NutritionCard';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Recipe, NutritionDBItem } from '../types';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [nutritionDB, setNutritionDB] = useState<NutritionDBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [showDelete, setShowDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      const [recipeRes, dbRes] = await Promise.all([
        fetch(`/api/recipes/${id}`, { signal: abortRef.current.signal }),
        fetch('/api/ingredients', { signal: abortRef.current.signal })
      ]);

      if (recipeRes.ok) {
        const data: Recipe = await recipeRes.json();
        setRecipe(data);
        setServings(data.servings);
      }
      if (dbRes.ok) {
        setNutritionDB(await dbRes.json());
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('加载食谱详情失败:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = async () => {
    if (!recipe) return;
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('删除食谱失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="page page-fade-in">
        <div className="loading-state">
          <div className="spinner" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="page page-fade-in">
        <div className="empty-state">
          <div className="empty-illustration">❓</div>
          <h3>食谱未找到</h3>
          <p>该食谱可能已被删除或链接无效</p>
          <Link to="/" className="btn btn-primary">
            返回食谱列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-fade-in">
      <div className="detail-header">
        <Link to="/" className="back-link">← 返回列表</Link>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={handleShare}>
            {copied ? '✓ 已复制链接' : '🔗 分享'}
          </button>
          <Link to={`/edit/${recipe.id}`} className="btn btn-secondary">
            ✎ 编辑
          </Link>
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
            🗑 删除
          </button>
        </div>
      </div>

      <div className="detail-hero glass-card">
        <h1 className="detail-title">{recipe.name}</h1>
        <p className="detail-description">{recipe.description || '暂无描述'}</p>
        <div className="detail-meta">
          <span className="meta-chip">⏱ {recipe.cookTime} 分钟</span>
          <span className="meta-chip">🍽 {recipe.servings} 份</span>
          <span className="meta-chip">
            🔥 {Math.round(recipe.nutritionPerServing.calories * recipe.servings)} 千卡总热量
          </span>
        </div>
      </div>

      <div className="detail-section">
        <NutritionCard
          nutrition={recipe.nutritionPerServing}
          servings={servings}
          onServingsChange={setServings}
        />
      </div>

      <div className="detail-section glass-card">
        <h2 className="section-title">食材清单</h2>
        <div className="ingredients-table-wrapper">
          <table className="ingredients-table">
            <thead>
              <tr>
                <th>食材</th>
                <th>数量</th>
                <th>热量</th>
                <th>蛋白质</th>
                <th>脂肪</th>
                <th>碳水</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ing, idx) => {
                const db = nutritionDB.find((d) => d.name === ing.name);
                const factor = ing.amount / 100;
                return (
                  <tr key={idx}>
                    <td className="ing-name">{ing.name}</td>
                    <td>{ing.amount}g</td>
                    <td>{db ? Math.round(db.calories * factor) : '-'} 千卡</td>
                    <td>{db ? (db.protein * factor).toFixed(1) : '-'}g</td>
                    <td>{db ? (db.fat * factor).toFixed(1) : '-'}g</td>
                    <td>{db ? (db.carbs * factor).toFixed(1) : '-'}g</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="删除食谱"
        message={`确定要删除「${recipe.name}」吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
