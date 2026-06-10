import { useState } from 'react';
import type { Recipe, Difficulty, Ingredient } from '../types';
import { api } from '../api';

interface Props {
  onClose: () => void;
  onSubmit: () => void;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function RecipeForm({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [temperature, setTemperature] = useState(180);
  const [time, setTime] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>('中等');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: genId(), name: '', amount: '', unit: 'g' },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addIngredient() {
    setIngredients([...ingredients, { id: genId(), name: '', amount: '', unit: 'g' }]);
  }

  function removeIngredient(id: string) {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((i) => i.id !== id));
  }

  function updateIngredient(id: string, field: keyof Ingredient, value: string) {
    setIngredients(ingredients.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  function addStep() {
    setSteps([...steps, '']);
  }

  function updateStep(index: number, value: string) {
    setSteps(steps.map((s, i) => (i === index ? value : s)));
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      let coverImage: string | null = null;
      if (coverFile) {
        const uploaded = await api.uploadImage(coverFile);
        coverImage = uploaded.thumbnailUrl;
      }

      await api.createRecipe({
        name: name.trim(),
        temperature,
        time,
        difficulty,
        ingredients: ingredients.filter((i) => i.name.trim()),
        steps: steps.filter((s) => s.trim()),
        coverImage,
      } as Partial<Recipe>);

      onSubmit();
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新建配方</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <form className="form-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>配方名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：香草戚风蛋糕"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>烘焙温度 (°C)</label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="form-group">
              <label>烘焙时间 (分钟)</label>
              <input
                type="number"
                value={time}
                onChange={(e) => setTime(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="form-group">
              <label>难度等级</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="简单">简单</option>
                <option value="中等">中等</option>
                <option value="困难">困难</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>封面图片</label>
            <input type="file" accept="image/*" onChange={handleCoverChange} />
            {coverPreview && <img src={coverPreview} alt="预览" className="cover-preview" />}
          </div>

          <div className="form-group">
            <div className="section-header">
              <label>食材列表</label>
              <button type="button" className="btn btn-small" onClick={addIngredient}>
                + 添加食材
              </button>
            </div>
            {ingredients.map((ing, index) => (
              <div key={ing.id} className="ingredient-row">
                <input
                  type="text"
                  placeholder="食材名称"
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="用量"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                  className="ingredient-amount"
                />
                <input
                  type="text"
                  placeholder="单位"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  className="ingredient-unit"
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => removeIngredient(ing.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-group">
            <div className="section-header">
              <label>制作步骤</label>
              <button type="button" className="btn btn-small" onClick={addStep}>
                + 添加步骤
              </button>
            </div>
            {steps.map((step, index) => (
              <div key={index} className="step-row">
                <span className="step-number">{index + 1}</span>
                <textarea
                  placeholder={`步骤 ${index + 1}`}
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  rows={2}
                />
                <div className="step-actions">
                  {index > 0 && (
                    <button type="button" className="btn-icon" onClick={() => moveStep(index, 'up')}>
                      ↑
                    </button>
                  )}
                  {index < steps.length - 1 && (
                    <button type="button" className="btn-icon" onClick={() => moveStep(index, 'down')}>
                      ↓
                    </button>
                  )}
                  {steps.length > 1 && (
                    <button type="button" className="btn-icon" onClick={() => removeStep(index)}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '保存中...' : '保存配方'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
