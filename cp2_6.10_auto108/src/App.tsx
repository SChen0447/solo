import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Recipe, Ingredient, ShoppingListItem, IngredientCategory } from './types';
import RecipeCard from './RecipeCard';
import ShoppingList from './ShoppingList';

const VEGETABLE_KEYWORDS = ['番茄', '西红柿', '黄瓜', '茄子', '辣椒', '青椒', '白菜', '生菜', '菠菜', '芹菜', '韭菜', '洋葱', '土豆', '马铃薯', '胡萝卜', '萝卜', '南瓜', '冬瓜', '丝瓜', '苦瓜', '玉米', '豆角', '豌豆', '西兰花', '花菜', '蘑菇', '香菇', '金针菇', '木耳', '山药', '藕', '莲藕', '大蒜', '蒜', '姜', '葱', '香菜'];
const MEAT_KEYWORDS = ['猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉', '鹅肉', '鱼', '虾', '蟹', '鸡蛋', '鸭蛋', '里脊', '五花肉', '排骨', '牛排', '鸡腿', '鸡翅', '鸡胸', '培根', '火腿', '香肠', '肉馅', '肉糜'];
const SEASONING_KEYWORDS = ['盐', '糖', '酱油', '醋', '料酒', '生抽', '老抽', '蚝油', '味精', '鸡精', '胡椒粉', '花椒', '八角', '桂皮', '香叶', '孜然', '辣椒面', '豆瓣酱', '甜面酱', '番茄酱', '沙拉酱', '油', '食用油', '橄榄油', '香油', '麻油', '淀粉', '生粉'];
const STAPLE_KEYWORDS = ['米', '大米', '面', '面粉', '面条', '馒头', '面包', '饺子', '包子', '饼', '米饭', '粥', '意面', '意大利面', '粉丝', '粉条', '年糕', '挂面', '方便面'];

function categorizeIngredient(name: string): IngredientCategory {
  if (VEGETABLE_KEYWORDS.some(kw => name.includes(kw))) return 'vegetable';
  if (MEAT_KEYWORDS.some(kw => name.includes(kw))) return 'meat';
  if (SEASONING_KEYWORDS.some(kw => name.includes(kw))) return 'seasoning';
  if (STAPLE_KEYWORDS.some(kw => name.includes(kw))) return 'staple';
  return 'other';
}

const FOOD_EMOJIS = ['🍳', '🥘', '🍜', '🍝', '🍲', '🥗', '🍛', '🍣', '🍱', '🥙', '🌮', '🍔', '🍕', '🥞', '🧁', '🍰', '🍪', '🥐', '🥨', '🥯'];

function getRandomEmoji(): string {
  return FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
}

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIngredients, setFormIngredients] = useState<{ id: string; name: string; amount: string; unit: string }[]>([
    { id: uuidv4(), name: '', amount: '', unit: '克' },
    { id: uuidv4(), name: '', amount: '', unit: '克' },
    { id: uuidv4(), name: '', amount: '', unit: '克' },
  ]);
  const [formError, setFormError] = useState('');

  const totalItems = shoppingList.length;
  const purchasedCount = shoppingList.filter(i => i.purchased).length;

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDesc('');
    setFormIngredients([
      { id: uuidv4(), name: '', amount: '', unit: '克' },
      { id: uuidv4(), name: '', amount: '', unit: '克' },
      { id: uuidv4(), name: '', amount: '', unit: '克' },
    ]);
    setFormError('');
  }, []);

  const handleOpenAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    resetForm();
  }, [resetForm]);

  const addIngredientRow = useCallback(() => {
    setFormIngredients(prev => [...prev, { id: uuidv4(), name: '', amount: '', unit: '克' }]);
  }, []);

  const removeIngredientRow = useCallback((id: string) => {
    setFormIngredients(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  }, []);

  const updateIngredientRow = useCallback((id: string, field: 'name' | 'amount' | 'unit', value: string) => {
    setFormIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }, []);

  const handleSubmitRecipe = useCallback(() => {
    if (!formName.trim()) {
      setFormError('请输入食谱名称');
      return;
    }
    if (formName.trim().length > 30) {
      setFormError('食谱名称不能超过30字');
      return;
    }
    if (formDesc.trim().length > 100) {
      setFormError('简介不能超过100字');
      return;
    }
    const validIngredients = formIngredients.filter(i => i.name.trim() && i.amount.trim());
    if (validIngredients.length < 3) {
      setFormError('至少需要3项有效食材（填写名称和用量）');
      return;
    }

    const ingredients: Ingredient[] = validIngredients.map(i => ({
      id: uuidv4(),
      name: i.name.trim(),
      amount: parseFloat(i.amount) || 0,
      unit: i.unit.trim() || '克',
    }));

    const newRecipe: Recipe = {
      id: uuidv4(),
      name: formName.trim(),
      description: formDesc.trim(),
      ingredients,
      imagePlaceholder: getRandomEmoji(),
    };

    setRecipes(prev => [...prev, newRecipe]);
    setShowAddModal(false);
    resetForm();
  }, [formName, formDesc, formIngredients, resetForm]);

  const handleDeleteRecipe = useCallback((id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  }, []);

  const mergeIngredientsToShoppingList = useCallback((ingredients: Ingredient[]) => {
    setShoppingList(prev => {
      const updated = [...prev];
      ingredients.forEach(ing => {
        const existingIdx = updated.findIndex(
          item => item.name === ing.name && item.unit === ing.unit
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            amount: updated[existingIdx].amount + ing.amount,
          };
        } else {
          updated.push({
            id: uuidv4(),
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            category: categorizeIngredient(ing.name),
            purchased: false,
          });
        }
      });
      return updated;
    });
  }, []);

  const handleQuickAddToShopping = useCallback((recipe: Recipe) => {
    mergeIngredientsToShoppingList(recipe.ingredients);
  }, [mergeIngredientsToShoppingList]);

  const handleGenerateFromDetail = useCallback(() => {
    if (detailRecipe) {
      mergeIngredientsToShoppingList(detailRecipe.ingredients);
      setDetailRecipe(null);
    }
  }, [detailRecipe, mergeIngredientsToShoppingList]);

  const handleTogglePurchased = useCallback((id: string) => {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, purchased: !i.purchased } : i));
  }, []);

  const handleAdjustAmount = useCallback((id: string, delta: number) => {
    setShoppingList(prev => prev.map(i => {
      if (i.id !== id) return i;
      const step = (i.unit === '克' || i.unit === '毫升') ? 50 : 1;
      const newAmount = Math.max(0, i.amount + delta * step);
      return { ...i, amount: newAmount };
    }).filter(i => i.amount > 0));
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleClearPurchased = useCallback(() => {
    setShoppingList(prev => prev.filter(i => !i.purchased));
  }, []);

  const handleResetShoppingList = useCallback(() => {
    setShoppingList([]);
    setShowResetConfirm(false);
  }, []);

  const sortedShoppingList = useMemo(() => {
    const categoryOrder: IngredientCategory[] = ['vegetable', 'meat', 'seasoning', 'staple', 'other'];
    return [...shoppingList].sort((a, b) => {
      const aOrder = categoryOrder.indexOf(a.category);
      const bOrder = categoryOrder.indexOf(b.category);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }, [shoppingList]);

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="header">
          <h1>🍽️ 食谱收藏采购管家</h1>
          <button className="btn-primary" onClick={handleOpenAddModal}>
            + 添加新食谱
          </button>
        </div>

        {recipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <div className="empty-state-text">还没有食谱，点击上方按钮添加你的第一个食谱吧！</div>
          </div>
        ) : (
          <div className="recipe-grid">
            {recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onViewDetail={setDetailRecipe}
                onAddToShopping={handleQuickAddToShopping}
                onDelete={handleDeleteRecipe}
              />
            ))}
          </div>
        )}
      </div>

      <div className="sidebar">
        <ShoppingList
          items={sortedShoppingList}
          totalItems={totalItems}
          purchasedCount={purchasedCount}
          onTogglePurchased={handleTogglePurchased}
          onAdjustAmount={handleAdjustAmount}
          onDeleteItem={handleDeleteItem}
          onClearPurchased={handleClearPurchased}
          onResetList={() => setShowResetConfirm(true)}
        />
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseAddModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">添加新食谱</div>
              <button className="modal-close" onClick={handleCloseAddModal}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">食谱名称 <span style={{color: '#E53935'}}>*</span></label>
              <input
                className="form-input"
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                maxLength={30}
                placeholder="例如：西红柿炒鸡蛋"
              />
              <div className="form-hint">{formName.length}/30</div>
            </div>

            <div className="form-group">
              <label className="form-label">简介</label>
              <textarea
                className="form-textarea"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                maxLength={100}
                placeholder="简单描述一下这道菜..."
              />
              <div className="form-hint">{formDesc.length}/100</div>
            </div>

            <div className="form-group">
              <label className="form-label">食材列表 <span style={{color: '#E53935'}}>*</span>（至少3项）</label>
              {formIngredients.map((ing, idx) => (
                <div className="ingredient-row" key={ing.id}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder={`食材${idx + 1}名称`}
                    value={ing.name}
                    onChange={e => updateIngredientRow(ing.id, 'name', e.target.value)}
                  />
                  <input
                    className="form-input amount-input"
                    type="number"
                    placeholder="用量"
                    min="0"
                    value={ing.amount}
                    onChange={e => updateIngredientRow(ing.id, 'amount', e.target.value)}
                  />
                  <input
                    className="form-input unit-input"
                    type="text"
                    placeholder="单位"
                    value={ing.unit}
                    onChange={e => updateIngredientRow(ing.id, 'unit', e.target.value)}
                  />
                  <button
                    className="btn-remove"
                    onClick={() => removeIngredientRow(ing.id)}
                    disabled={formIngredients.length <= 1}
                    style={{ opacity: formIngredients.length <= 1 ? 0.4 : 1, cursor: formIngredients.length <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="btn-add" onClick={addIngredientRow}>
                + 添加一行食材
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-actions">
              <button className="btn-secondary" onClick={handleCloseAddModal}>取消</button>
              <button className="btn-primary" onClick={handleSubmitRecipe}>保存食谱</button>
            </div>
          </div>
        </div>
      )}

      {detailRecipe && (
        <div className="modal-overlay" onClick={() => setDetailRecipe(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{detailRecipe.name}</div>
              <button className="modal-close" onClick={() => setDetailRecipe(null)}>×</button>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">简介</div>
              <div className="detail-description">
                {detailRecipe.description || '暂无简介'}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">食材清单</div>
              <ul className="detail-ingredients">
                {detailRecipe.ingredients.map(ing => (
                  <li className="detail-ingredient-item" key={ing.id}>
                    <span className="detail-ingredient-name">{ing.name}</span>
                    <span className="detail-ingredient-amount">{ing.amount} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="detail-actions">
              <button className="btn-secondary" onClick={() => setDetailRecipe(null)}>关闭</button>
              <button className="btn-success" onClick={handleGenerateFromDetail}>
                🛒 生成采购清单
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-content confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">确认重置</div>
              <button className="modal-close" onClick={() => setShowResetConfirm(false)}>×</button>
            </div>
            <div className="confirm-message">
              确定要清空整个采购清单吗？<br />此操作不可撤销。
            </div>
            <div className="form-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <button className="btn-secondary" onClick={() => setShowResetConfirm(false)}>取消</button>
              <button className="btn-danger" onClick={handleResetShoppingList}>确认清空</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
