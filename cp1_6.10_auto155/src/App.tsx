import { useState, useEffect, useMemo, useCallback } from 'react';
import { Ingredient, Recipe, RecipeIngredient, NoteType } from './types';
import { INGREDIENTS, NOTE_TYPE_LABELS } from './data/ingredients';
import {
  loadRecipes,
  saveRecipes,
  generateRecipeName,
  generateId,
  formatDate,
} from './utils/storage';
import CanvasBoard from './components/CanvasBoard';
import ChartPanel from './components/ChartPanel';

const MIN_WEIGHT = 5;
const MAX_WEIGHT = 50;
const WEIGHT_STEP = 5;

export default function App() {
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeName, setRecipeName] = useState<string>(generateRecipeName());
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setSavedRecipes(loadRecipes());
  }, []);

  const selectedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ri of recipeIngredients) {
      map[ri.ingredient.id] = ri.selectedCount;
    }
    return map;
  }, [recipeIngredients]);

  const ingredientsByType = useMemo(() => {
    const grouped: Record<NoteType, Ingredient[]> = {
      top: [],
      middle: [],
      base: [],
    };
    for (const ing of INGREDIENTS) {
      grouped[ing.type].push(ing);
    }
    return grouped;
  }, []);

  const addIngredient = useCallback((ingredient: Ingredient) => {
    setRecipeIngredients((prev) => {
      const existing = prev.find((ri) => ri.ingredient.id === ingredient.id);
      if (existing) {
        return prev.map((ri) =>
          ri.ingredient.id === ingredient.id
            ? { ...ri, selectedCount: ri.selectedCount + 1 }
            : ri
        );
      }
      return [
        ...prev,
        {
          ingredient,
          weight: 20,
          selectedCount: 1,
        },
      ];
    });
  }, []);

  const removeIngredient = useCallback((ingredientId: string) => {
    setRecipeIngredients((prev) =>
      prev.filter((ri) => ri.ingredient.id !== ingredientId)
    );
  }, []);

  const adjustWeight = useCallback(
    (ingredientId: string, delta: number) => {
      setRecipeIngredients((prev) =>
        prev.map((ri) => {
          if (ri.ingredient.id !== ingredientId) return ri;
          const newWeight = Math.min(
            MAX_WEIGHT,
            Math.max(MIN_WEIGHT, ri.weight + delta)
          );
          return { ...ri, weight: newWeight };
        })
      );
    },
    []
  );

  const handleSave = useCallback(() => {
    if (recipeIngredients.length === 0) {
      return;
    }
    const newRecipe: Recipe = {
      id: generateId(),
      name: recipeName.trim() || generateRecipeName(),
      createdAt: Date.now(),
      ingredients: recipeIngredients,
    };
    const updated = [newRecipe, ...savedRecipes];
    setSavedRecipes(updated);
    saveRecipes(updated);
    setRecipeName(generateRecipeName());
  }, [recipeName, recipeIngredients, savedRecipes]);

  const handleLoadRecipe = useCallback((recipe: Recipe) => {
    setRecipeIngredients(recipe.ingredients);
    setRecipeName(recipe.name);
  }, []);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTargetId) return;
    const updated = savedRecipes.filter((r) => r.id !== deleteTargetId);
    setSavedRecipes(updated);
    saveRecipes(updated);
    setDeleteTargetId(null);
  }, [deleteTargetId, savedRecipes]);

  const cancelDelete = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  const showWarning = recipeIngredients.length > 10;

  return (
    <div className="app-container">
      <aside className="sidebar">
        {(Object.keys(ingredientsByType) as NoteType[]).map((type) => (
          <div key={type} className="note-group">
            <div className="note-group-title">{NOTE_TYPE_LABELS[type]}</div>
            <div className="ingredient-list">
              {ingredientsByType[type].map((ing) => (
                <button
                  key={ing.id}
                  className="ingredient-btn"
                  onClick={() => addIngredient(ing)}
                  title={`${ing.name} - ${NOTE_TYPE_LABELS[ing.type]}`}
                >
                  <span className="dot" style={{ background: ing.color }} />
                  <span>{ing.name}</span>
                  {selectedCounts[ing.id] ? (
                    <span className="count-badge">{selectedCounts[ing.id]}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <main className="main-area">
        <section className="top-section">
          <div className="canvas-wrapper">
            <CanvasBoard ingredients={recipeIngredients} />
            {showWarning && (
              <div className="warning-text">
                成分过多，建议精简至10个以内以达到最佳香气平衡
              </div>
            )}
          </div>

          <div className="selected-panel">
            <h3>当前配方 ({recipeIngredients.length})</h3>
            {recipeIngredients.length === 0 ? (
              <div className="empty-hint">点击左侧成分按钮添加</div>
            ) : (
              recipeIngredients.map((ri) => (
                <div key={ri.ingredient.id} className="selected-item">
                  <div className="selected-item-info">
                    <span
                      className="dot"
                      style={{ background: ri.ingredient.color }}
                    />
                    <div>
                      <div className="selected-item-name">
                        {ri.ingredient.name}
                      </div>
                      <div className="selected-item-type">
                        {NOTE_TYPE_LABELS[ri.ingredient.type]} · 选择
                        {ri.selectedCount}次
                      </div>
                    </div>
                  </div>
                  <div className="weight-controls">
                    <button
                      className="weight-btn"
                      onClick={() =>
                        adjustWeight(ri.ingredient.id, -WEIGHT_STEP)
                      }
                      title="减少权重"
                    >
                      −
                    </button>
                    <span className="weight-value">{ri.weight}%</span>
                    <button
                      className="weight-btn"
                      onClick={() =>
                        adjustWeight(ri.ingredient.id, WEIGHT_STEP)
                      }
                      title="增加权重"
                    >
                      +
                    </button>
                    <button
                      className="remove-btn"
                      onClick={() => removeIngredient(ri.ingredient.id)}
                      title="移除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={{ flex: 1, minHeight: 0 }}>
          <ChartPanel ingredients={recipeIngredients} />
        </section>

        <section className="bottom-section">
          <input
            type="text"
            className="name-input"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="输入配方名称"
          />
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={recipeIngredients.length === 0}
          >
            保存配方
          </button>
          <div className="saved-recipes">
            {savedRecipes.length === 0 ? (
              <div className="empty-hint" style={{ padding: '8px 0' }}>
                暂无保存的配方
              </div>
            ) : (
              savedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="recipe-card"
                  onClick={() => handleLoadRecipe(recipe)}
                >
                  <div className="recipe-card-name">{recipe.name}</div>
                  <div className="recipe-card-date">
                    {formatDate(recipe.createdAt)} · {recipe.ingredients.length}种
                  </div>
                  <button
                    className="recipe-card-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(recipe.id);
                    }}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {deleteTargetId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定要删除此配方吗？此操作无法撤销。</p>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={cancelDelete}
              >
                取消
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={confirmDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
