import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import IngredientAutocomplete from '../components/IngredientAutocomplete';
import NutritionCard from '../components/NutritionCard';
import { calculateTotalNutrition } from '../utils/nutritionCalculator';
import type { Recipe, Ingredient, NutritionDBItem } from '../types';

interface IngredientRow extends Ingredient {
  _key: string;
}

export default function RecipeForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cookTime, setCookTime] = useState<number | ''>('');
  const [servings, setServings] = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { _key: crypto.randomUUID(), name: '', amount: 100 }
  ]);
  const [nutritionDB, setNutritionDB] = useState<NutritionDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadDB = async () => {
      try {
        const res = await fetch('/api/ingredients');
        if (res.ok) setNutritionDB(await res.json());
      } catch (err) {
        console.error('加载食材数据库失败:', err);
      }
    };
    loadDB();
  }, []);

  const loadRecipe = useCallback(async () => {
    if (!id) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      const res = await fetch(`/api/recipes/${id}`, { signal: abortRef.current.signal });
      if (res.ok) {
        const data: Recipe = await res.json();
        setName(data.name);
        setDescription(data.description);
        setCookTime(data.cookTime);
        setServings(data.servings);
        setIngredients(
          data.ingredients.map((ing) => ({ ...ing, _key: crypto.randomUUID() }))
        );
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('加载食谱失败:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecipe();
    return () => abortRef.current?.abort();
  }, [loadRecipe]);

  const previewNutrition = useMemo(() => {
    const validIngredients = ingredients.filter((i) => i.name && i.amount > 0);
    const s = Number(servings) || 1;
    return calculateTotalNutrition(validIngredients, nutritionDB, s);
  }, [ingredients, nutritionDB, servings]);

  const previewServings = useMemo(() => Number(servings) || 1, [servings]);

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { _key: crypto.randomUUID(), name: '', amount: 100 }]);
  };

  const removeIngredient = (key: string) => {
    setIngredients((prev) => prev.filter((i) => i._key !== key));
  };

  const updateIngredient = (key: string, field: 'name' | 'amount', value: string | number) => {
    setIngredients((prev) =>
      prev.map((i) => (i._key === key ? { ...i, [field]: value } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('请输入食谱名称');
      return;
    }
    if (!cookTime || Number(cookTime) <= 0) {
      alert('请输入有效的烹饪时间');
      return;
    }
    if (!servings || Number(servings) <= 0) {
      alert('请输入有效的份数');
      return;
    }
    const validIngs = ingredients.filter((i) => i.name && i.amount > 0);
    if (validIngs.length === 0) {
      alert('请至少添加一种食材');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      cookTime: Number(cookTime),
      servings: Number(servings),
      ingredients: validIngs.map(({ _key, ...rest }) => rest)
    };

    try {
      setSaving(true);
      const url = isEdit ? `/api/recipes/${id}` : '/api/recipes';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved: Recipe = await res.json();
        navigate(`/recipe/${saved.id}`, { replace: true });
      } else {
        const err = await res.json().catch(() => ({ error: '保存失败' }));
        alert(err.error || '保存失败');
      }
    } catch (err) {
      console.error('保存食谱失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="page page-fade-in">
        <div className="loading-state">
          <div className="spinner" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-fade-in">
      <div className="detail-header">
        <Link to="/" className="back-link">← 返回列表</Link>
        <h1 className="section-title-inline">{isEdit ? '编辑食谱' : '创建新食谱'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-grid glass-card">
          <div className="form-column">
            <h2 className="section-title">基本信息</h2>

            <div className="form-group">
              <label className="form-label">食谱名称 *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：番茄炒蛋"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label className="form-label">描述</label>
              <textarea
                className="form-input form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单介绍一下这道菜..."
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">烹饪时间（分钟）*</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max={1440}
                  value={cookTime}
                  onChange={(e) =>
                    setCookTime(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="30"
                />
              </div>

              <div className="form-group">
                <label className="form-label">份数 *</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="50"
                  value={servings}
                  onChange={(e) =>
                    setServings(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="2"
                />
              </div>
            </div>
          </div>

          <div className="form-column">
            <div className="form-column-header">
              <h2 className="section-title">食材列表</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addIngredient}>
                + 添加食材
              </button>
            </div>

            <div className="ingredients-form-wrapper">
              <div className="ingredients-form-header">
                <span className="col-name">食材名称</span>
                <span className="col-amount">数量 (g)</span>
                <span className="col-nutrition">每100g营养预览</span>
                <span className="col-action"></span>
              </div>
              {ingredients.map((ing) => {
                const dbItem = nutritionDB.find((d) => d.name === ing.name);
                return (
                  <div key={ing._key} className="ingredients-form-row">
                    <div className="col-name">
                      <IngredientAutocomplete
                        value={ing.name}
                        onChange={(v) => updateIngredient(ing._key, 'name', v)}
                        placeholder="搜索食材..."
                      />
                    </div>
                    <div className="col-amount">
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={ing.amount}
                        onChange={(e) =>
                          updateIngredient(ing._key, 'amount', Number(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-nutrition">
                      {dbItem ? (
                        <div className="nutrition-preview">
                          <span>{dbItem.calories}千卡</span>
                          <span>P {dbItem.protein}g</span>
                          <span>F {dbItem.fat}g</span>
                          <span>C {dbItem.carbs}g</span>
                        </div>
                      ) : (
                        <span className="nutrition-preview-empty">-</span>
                      )}
                    </div>
                    <div className="col-action">
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon-delete"
                          onClick={() => removeIngredient(ing._key)}
                          title="删除"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {ingredients.some((i) => i.name && i.amount > 0) && (
          <div className="form-preview-section">
            <NutritionCard
              nutrition={previewNutrition}
              servings={previewServings}
              onServingsChange={(v) => setServings(v)}
            />
          </div>
        )}

        <div className="form-actions">
          <Link to="/" className="btn btn-secondary">
            取消
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '保存中...' : isEdit ? '保存修改' : '创建食谱'}
          </button>
        </div>
      </form>
    </div>
  );
}
