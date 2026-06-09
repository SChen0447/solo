import { useState } from 'react';
import type { Ingredient, Recipe } from '../types';

interface Props {
  onSubmit: (recipe: Omit<Recipe, 'id' | 'favorite' | 'coverImage'>) => void;
  onCancel: () => void;
}

export default function RecipeForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '' }
  ]);
  const [steps, setSteps] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', amount: '' }]);
  };

  const removeIngredient = (idx: number) => {
    if (ingredients.length > 1) {
      setIngredients((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const updateIngredient = (idx: number, field: 'name' | 'amount', value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = '请输入食谱名称';
    if (!prepTime || Number(prepTime) <= 0) newErrors.prepTime = '请输入有效的准备时长';
    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) newErrors.ingredients = '至少添加一种食材';
    if (!steps.trim()) newErrors.steps = '请输入烹饪步骤';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    onSubmit({
      name: name.trim(),
      prepTime: Number(prepTime),
      difficulty,
      ingredients: validIngredients,
      steps: steps.trim()
    });
  };

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <h2 className="form-title">创建新食谱</h2>

      <div className="form-group">
        <label>食谱名称 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：番茄炒蛋"
          className={errors.name ? 'input-error' : ''}
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>准备时长（分钟）*</label>
          <input
            type="number"
            min="1"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="30"
            className={errors.prepTime ? 'input-error' : ''}
          />
          {errors.prepTime && <span className="error-text">{errors.prepTime}</span>}
        </div>
        <div className="form-group">
          <label>难度等级</label>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={`star-btn ${n <= difficulty ? 'filled' : ''}`}
                onClick={() => setDifficulty(n)}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>食材列表 *</label>
        <div className="ingredients-list">
          {ingredients.map((ing, idx) => (
            <div className="ingredient-row" key={idx}>
              <input
                type="text"
                placeholder="食材名称"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
              />
              <input
                type="text"
                placeholder="用量"
                value={ing.amount}
                onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
              />
              <button
                type="button"
                className="btn-icon ripple"
                onClick={() => removeIngredient(idx)}
                disabled={ingredients.length === 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-sm ripple" onClick={addIngredient}>
          + 添加食材
        </button>
        {errors.ingredients && <span className="error-text">{errors.ingredients}</span>}
      </div>

      <div className="form-group">
        <label>烹饪步骤 *</label>
        <textarea
          rows={6}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="请按步骤描述烹饪过程，支持换行分段..."
          className={errors.steps ? 'input-error' : ''}
        />
        {errors.steps && <span className="error-text">{errors.steps}</span>}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary ripple" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn btn-primary ripple">
          保存食谱
        </button>
      </div>
    </form>
  );
}
