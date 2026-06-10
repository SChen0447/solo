import React, { useState, useEffect, useCallback } from 'react';
import PaletteCanvas from './PaletteCanvas';
import RecipeCard from './RecipeCard';

export interface Ingredient {
  name: string;
  color: string;
  ratio: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  moodTag: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface ScentCluster {
  name: string;
  color: string;
  ingredients: { name: string; color: string }[];
}

export const SCENT_CLUSTERS: ScentCluster[] = [
  {
    name: '花香',
    color: '#ff88aa',
    ingredients: [
      { name: '玫瑰', color: '#ff6699' },
      { name: '茉莉', color: '#ffbbdd' },
      { name: '薰衣草', color: '#aa88dd' },
      { name: '桂花', color: '#ffcc88' },
    ],
  },
  {
    name: '木质',
    color: '#88aa55',
    ingredients: [
      { name: '雪松', color: '#88aa55' },
      { name: '檀香', color: '#aa8844' },
      { name: '橡木', color: '#886644' },
      { name: '沉香', color: '#665544' },
    ],
  },
  {
    name: '辛香',
    color: '#ff6644',
    ingredients: [
      { name: '肉桂', color: '#cc5533' },
      { name: '胡椒', color: '#ff4422' },
      { name: '丁香', color: '#dd6644' },
      { name: '豆蔻', color: '#ff8844' },
    ],
  },
  {
    name: '清新',
    color: '#4488ff',
    ingredients: [
      { name: '薄荷', color: '#88ddcc' },
      { name: '柠檬', color: '#ffdd44' },
      { name: '海风', color: '#66bbff' },
      { name: '竹子', color: '#88ccaa' },
    ],
  },
  {
    name: '甜味',
    color: '#ffcc44',
    ingredients: [
      { name: '蜂蜜', color: '#ffcc44' },
      { name: '香草', color: '#eeddaa' },
      { name: '焦糖', color: '#cc8844' },
      { name: '巧克力', color: '#885533' },
    ],
  },
];

export const MOOD_TAGS: { label: string; value: string; color: string }[] = [
  { label: '宁静', value: 'calm', color: '#66bbaa' },
  { label: '梦幻', value: 'dreamy', color: '#8855aa' },
  { label: '欢乐', value: 'joyful', color: '#ffdd44' },
  { label: '神秘', value: 'mysterious', color: '#aa55cc' },
];

type Page = 'create' | 'list' | 'detail';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('list');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('calm');
  const [activeCluster, setActiveCluster] = useState<number | null>(null);
  const [filterMood, setFilterMood] = useState<string>('');
  const [toast, setToast] = useState<string>('');
  const [detailId, setDetailId] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const fetchRecipes = useCallback(async (mood?: string) => {
    try {
      const url = mood ? `/api/recipes?mood=${mood}` : '/api/recipes';
      const res = await fetch(url);
      const data = await res.json();
      setRecipes(data);
    } catch (e) {
      console.error('获取配方失败', e);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('/recipe/')) {
      const id = hash.split('/recipe/')[1];
      setDetailId(id);
      fetchRecipeById(id);
    }
    fetchRecipes();

    const handleHashChange = () => {
      const h = window.location.hash.replace('#', '');
      if (h.startsWith('/recipe/')) {
        const id = h.split('/recipe/')[1];
        setDetailId(id);
        fetchRecipeById(id);
      } else if (h === '' || h === '/') {
        setPage('list');
        setSelectedRecipe(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [fetchRecipes]);

  const fetchRecipeById = async (id: string) => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRecipe(data);
        setPage('detail');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecipes(filterMood || undefined);
  }, [filterMood, fetchRecipes]);

  const addIngredient = (ing: { name: string; color: string }) => {
    if (ingredients.length >= 8) {
      showToast('最多添加8种香料！');
      return;
    }
    if (ingredients.find((i) => i.name === ing.name)) {
      showToast('该香料已添加！');
      return;
    }
    const newRatio = ingredients.length > 0 ? Math.floor(100 / (ingredients.length + 1)) : 100;
    setIngredients((prev) => {
      const adjusted = prev.map((i) => ({ ...i, ratio: newRatio }));
      const total = adjusted.reduce((s, i) => s + i.ratio, 0);
      return [...adjusted, { ...ing, ratio: Math.max(1, 100 - total) }];
    });
    setActiveCluster(null);
  };

  const removeIngredient = (name: string) => {
    setIngredients((prev) => {
      const remaining = prev.filter((i) => i.name !== name);
      if (remaining.length > 0) {
        const avg = Math.floor(100 / remaining.length);
        const total = avg * (remaining.length - 1);
        return remaining.map((i, idx) => ({
          ...i,
          ratio: idx === remaining.length - 1 ? Math.max(1, 100 - total) : avg,
        }));
      }
      return remaining;
    });
  };

  const updateRatio = (name: string, ratio: number) => {
    setIngredients((prev) => prev.map((i) => (i.name === name ? { ...i, ratio } : i)));
  };

  const saveRecipe = async () => {
    if (ingredients.length === 0) {
      showToast('请至少添加一种香料！');
      return;
    }
    if (!recipeName.trim()) {
      showToast('请输入配方名称！');
      return;
    }
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipeName,
          ingredients,
          moodTag: selectedMood,
        }),
      });
      if (res.ok) {
        showToast('配方保存成功！');
        setRecipeName('');
        setIngredients([]);
        setSelectedMood('calm');
        fetchRecipes();
        setPage('list');
      }
    } catch (e) {
      showToast('保存失败，请重试');
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      await fetch(`/api/recipes/${id}/favorite`, { method: 'PATCH' });
      fetchRecipes(filterMood || undefined);
    } catch (e) {
      showToast('操作失败');
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      showToast('配方已删除');
      fetchRecipes(filterMood || undefined);
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
        setPage('list');
        window.location.hash = '';
      }
    } catch (e) {
      showToast('删除失败');
    }
  };

  const shareRecipe = (id: string) => {
    const url = `${window.location.origin}/#/recipe/${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => showToast('配方链接已复制！'))
      .catch(() => showToast('复制失败'));
  };

  const totalStrength = ingredients.reduce((s, i) => s + i.ratio, 0);
  const strengthColor = (t: number) => {
    const p = Math.min(1, Math.max(0, t / 100));
    const r = Math.round(136 + (255 - 136) * p);
    const g = Math.round(255 + (136 - 255) * p);
    const b = Math.round(136 + (136 - 136) * p);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const renderCreatePage = () => (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '8px', color: '#ff88aa' }}>🌙 梦境调香师</h1>
      <p style={{ textAlign: 'center', marginBottom: '30px', color: '#a0a0cc' }}>
        创造属于你的独特气味配方
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', position: 'relative' }}>
        <PaletteCanvas
          clusters={SCENT_CLUSTERS}
          ingredients={ingredients}
          activeCluster={activeCluster}
          onClusterClick={(idx) => setActiveCluster(activeCluster === idx ? null : idx)}
          strength={totalStrength}
          strengthColor={strengthColor(totalStrength)}
        />
        {activeCluster !== null && (
          <div
            className="glass"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
              padding: '16px',
              borderRadius: '12px',
              minWidth: '180px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontWeight: 600, color: SCENT_CLUSTERS[activeCluster].color }}>
                {SCENT_CLUSTERS[activeCluster].name}
              </span>
              <button
                onClick={() => setActiveCluster(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a0a0cc',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SCENT_CLUSTERS[activeCluster].ingredients.map((ing) => (
                <button
                  key={ing.name}
                  onClick={() => addIngredient(ing)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: '#e0e0ff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: ing.color,
                      boxShadow: `0 0 8px ${ing.color}`,
                    }}
                  />
                  <span>{ing.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#88aaff' }}>香料成分 ({ingredients.length}/8)</h3>
          <span style={{ color: strengthColor(totalStrength), fontWeight: 600 }}>
            强度: {totalStrength}%
          </span>
        </div>
        {ingredients.length === 0 ? (
          <p style={{ color: '#a0a0cc', textAlign: 'center', padding: '20px' }}>
            点击调色盘上的扇形区域添加香料
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ingredients.map((ing) => (
              <div
                key={ing.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: ing.color,
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${ing.color}`,
                  }}
                />
                <span style={{ width: '80px', flexShrink: 0 }}>{ing.name}</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={ing.ratio}
                  onChange={(e) => updateRatio(ing.name, parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: ing.color,
                    cursor: 'pointer',
                  }}
                />
                <span style={{ width: '45px', textAlign: 'right', color: ing.color }}>{ing.ratio}%</span>
                <button
                  onClick={() => removeIngredient(ing.name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff6677',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0 6px',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
        <h3 style={{ color: '#88aaff', marginBottom: '16px' }}>配方信息</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#a0a0cc' }}>
              配方名称
            </label>
            <input
              type="text"
              maxLength={20}
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="给你的配方起个名字..."
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e0e0ff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s ease-out',
              }}
              onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = '#ff88aa')}
              onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{recipeName.length}/20</div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#a0a0cc' }}>
              情绪标签
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {MOOD_TAGS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setSelectedMood(m.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `2px solid ${selectedMood === m.value ? m.color : 'rgba(255,255,255,0.15)'}`,
                    background: selectedMood === m.value ? `${m.color}33` : 'transparent',
                    color: selectedMood === m.value ? m.color : '#a0a0cc',
                    cursor: 'pointer',
                    fontWeight: selectedMood === m.value ? 600 : 400,
                    transition: 'all 0.2s ease-out',
                    fontSize: '13px',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => {
            setIngredients([]);
            setRecipeName('');
            setSelectedMood('calm');
          }}
          style={{
            padding: '12px 32px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: '#a0a0cc',
            cursor: 'pointer',
            fontSize: '15px',
            transition: 'all 0.2s ease-out',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#ff88aa')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)')}
        >
          重置
        </button>
        <button
          onClick={saveRecipe}
          style={{
            padding: '12px 40px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #ff88aa, #88aaff)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 600,
            transition: 'transform 0.2s ease-out',
            boxShadow: '0 4px 15px rgba(255,136,170,0.3)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
        >
          保存配方
        </button>
      </div>
    </div>
  );

  const renderListPage = () => (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: '#ff88aa', marginBottom: '4px' }}>🌙 梦境调香师</h1>
          <p style={{ color: '#a0a0cc' }}>探索他人创造的奇妙气味</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterMood('')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `2px solid ${filterMood === '' ? '#ff88aa' : 'rgba(255,255,255,0.15)'}`,
                background: filterMood === '' ? 'rgba(255,136,170,0.15)' : 'transparent',
                color: filterMood === '' ? '#ff88aa' : '#a0a0cc',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s ease-out',
              }}
            >
              全部
            </button>
            {MOOD_TAGS.map((m) => (
              <button
                key={m.value}
                onClick={() => setFilterMood(m.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: `2px solid ${filterMood === m.value ? m.color : 'rgba(255,255,255,0.15)'}`,
                  background: filterMood === m.value ? `${m.color}33` : 'transparent',
                  color: filterMood === m.value ? m.color : '#a0a0cc',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s ease-out',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage('create')}
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ff88aa, #88aaff)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'transform 0.2s ease-out',
              boxShadow: '0 4px 15px rgba(255,136,170,0.3)',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
          >
            + 调新配方
          </button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div
          className="glass"
          style={{
            padding: '60px 20px',
            borderRadius: '16px',
            textAlign: 'center',
            color: '#a0a0cc',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌸</div>
          <p>还没有配方，点击"调新配方"创造第一个吧！</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '20px',
          }}
        >
          {recipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onToggleFavorite={toggleFavorite}
              onShare={shareRecipe}
              onDelete={deleteRecipe}
              onClick={() => {
                setSelectedRecipe(r);
                setPage('detail');
                window.location.hash = `/recipe/${r.id}`;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderDetailPage = () => {
    if (!selectedRecipe) return null;
    const moodInfo = MOOD_TAGS.find((m) => m.value === selectedRecipe.moodTag);
    return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={() => {
              setSelectedRecipe(null);
              setPage('list');
              window.location.hash = '';
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: '#a0a0cc',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease-out',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#ff88aa')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)')}
          >
            ← 返回
          </button>
          <h1 style={{ color: '#ff88aa' }}>{selectedRecipe.name}</h1>
          {moodInfo && (
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                background: `${moodInfo.color}33`,
                color: moodInfo.color,
                fontSize: '13px',
                border: `1px solid ${moodInfo.color}44`,
              }}
            >
              {moodInfo.label}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => toggleFavorite(selectedRecipe.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '24px',
                padding: '4px 8px',
              }}
            >
              {selectedRecipe.isFavorite ? '❤️' : '🤍'}
            </button>
            <button
              onClick={() => shareRecipe(selectedRecipe.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '22px',
                padding: '4px 8px',
              }}
            >
              🔗
            </button>
            <button
              onClick={() => {
                if (confirm('确定删除这个配方吗？')) deleteRecipe(selectedRecipe.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '22px',
                padding: '4px 8px',
              }}
            >
              🗑️
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <PaletteCanvas
            clusters={SCENT_CLUSTERS}
            ingredients={selectedRecipe.ingredients}
            activeCluster={null}
            onClusterClick={() => {}}
            strength={selectedRecipe.ingredients.reduce((s, i) => s + i.ratio, 0)}
            strengthColor="rgb(200,200,255)"
            readOnly
          />
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
          <h3 style={{ color: '#88aaff', marginBottom: '16px' }}>香料成分</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedRecipe.ingredients.map((ing) => (
              <div
                key={ing.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: ing.color,
                    boxShadow: `0 0 10px ${ing.color}`,
                  }}
                />
                <span style={{ fontWeight: 500, flex: 1 }}>{ing.name}</span>
                <div style={{ width: '200px', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${ing.ratio}%`,
                      height: '100%',
                      background: ing.color,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease-out',
                    }}
                  />
                </div>
                <span style={{ width: '50px', textAlign: 'right', color: ing.color, fontWeight: 600 }}>
                  {ing.ratio}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {toast && <div className="toast">{toast}</div>}
      {page === 'create' && renderCreatePage()}
      {page === 'list' && renderListPage()}
      {page === 'detail' && renderDetailPage()}
    </div>
  );
};

export default App;
