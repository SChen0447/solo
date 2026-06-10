import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import RecipeCard from './components/RecipeCard';
import {
  Recipe,
  Ingredient,
  MealPlanItem,
  MealPlanDay,
  ViewType,
  TabType,
  DIFFICULTY_LABELS,
  MEAL_TYPE_LABELS,
  WEEKDAY_LABELS,
  PRESET_GRADIENTS,
  COMMON_INGREDIENTS,
} from './types';

class RecipeDatabase extends Dexie {
  recipes!: Table<Recipe>;
  ingredients!: Table<Ingredient>;
  mealPlan!: Table<MealPlanDay>;

  constructor() {
    super('recipeWorkshop');
    this.version(1).stores({
      recipes: 'id, name, difficulty, isFavorite, createdAt',
      ingredients: 'id, name',
      mealPlan: 'date',
    });
  }
}

const db = new RecipeDatabase();

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('welcome');
  const [activeTab, setActiveTab] = useState<TabType>('recipes');
  const [viewKey, setViewKey] = useState(0);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [showSidePanel, setShowSidePanel] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(PRESET_GRADIENTS[0]);
  const [formDifficulty, setFormDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [formCookTime, setFormCookTime] = useState(30);
  const [formIngredients, setFormIngredients] = useState<Array<{ id: string; name: string; quantity: string; unit: string; error?: string }>>([]);
  const [formSteps, setFormSteps] = useState<string[]>(['']);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('');
  const [newIngredientUnit, setNewIngredientUnit] = useState('个');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);

  const [recommendations, setRecommendations] = useState<Array<{ recipe: Recipe; matchPercent: number }>>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const [draggingRecipe, setDraggingRecipe] = useState<Recipe | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const [deletingPlannedId, setDeletingPlannedId] = useState<string | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDraggingTimeline = useRef(false);
  const timelineStartX = useRef(0);
  const timelineScrollLeft = useRef(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedRecipes, loadedIngredients, loadedMealPlan] = await Promise.all([
        db.recipes.orderBy('createdAt').reverse().toArray(),
        db.ingredients.toArray(),
        db.mealPlan.toArray(),
      ]);
      setRecipes(loadedRecipes);
      setIngredients(loadedIngredients);
      ensureMealPlanDays(loadedMealPlan);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ensureMealPlanDays = async (existingPlan: MealPlanDay[]) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }

    const planMap = new Map(existingPlan.map((d) => [d.date, d]));
    const fullPlan: MealPlanDay[] = weekDates.map((date) => {
      if (planMap.has(date)) {
        return planMap.get(date)!;
      }
      return { date, items: [] };
    });

    setMealPlan(fullPlan);

    for (const day of fullPlan) {
      if (!planMap.has(day.date)) {
        try {
          await db.mealPlan.put(day);
        } catch (e) {
          // 忽略
        }
      }
    }
  };

  const handleEnterApp = () => {
    setCurrentView('recipes');
    setActiveTab('recipes');
    setViewKey((k) => k + 1);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentView(tab);
    setViewKey((k) => k + 1);
  };

  const openAddRecipePanel = () => {
    setEditingRecipe(null);
    setFormName('');
    setFormColor(PRESET_GRADIENTS[Math.floor(Math.random() * PRESET_GRADIENTS.length)]);
    setFormDifficulty('easy');
    setFormCookTime(30);
    setFormIngredients([{ id: uuidv4(), name: '', quantity: '', unit: '克' }]);
    setFormSteps(['']);
    setFormErrors({});
    setShowSidePanel(true);
  };

  const openEditRecipePanel = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormColor(recipe.thumbnailColor);
    setFormDifficulty(recipe.difficulty);
    setFormCookTime(recipe.cookTime);
    setFormIngredients(
      recipe.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        quantity: String(ing.quantity),
        unit: ing.unit,
      }))
    );
    setFormSteps([...recipe.steps]);
    setFormErrors({});
    setShowSidePanel(true);
  };

  const addIngredientRow = () => {
    setFormIngredients((prev) => [...prev, { id: uuidv4(), name: '', quantity: '', unit: '克' }]);
  };

  const removeIngredientRow = (id: string) => {
    setFormIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const updateIngredientRow = (id: string, field: 'name' | 'quantity' | 'unit', value: string) => {
    setFormIngredients((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: value };
        if (field === 'quantity' && value !== '') {
          const num = parseFloat(value);
          if (isNaN(num) || num <= 0) {
            updated.error = '请输入有效的正数';
          } else {
            updated.error = undefined;
          }
        }
        if (field === 'name' && value !== '') {
          if (value.length < 1) {
            updated.error = '食材名不能为空';
          } else {
            updated.error = undefined;
          }
        }
        return updated;
      })
    );
  };

  const addStepRow = () => {
    setFormSteps((prev) => [...prev, '']);
  };

  const removeStepRow = (index: number) => {
    if (formSteps.length <= 1) return;
    setFormSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStepRow = (index: number, value: string) => {
    setFormSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formSteps.length) return;
    setFormSteps((prev) => {
      const newSteps = [...prev];
      const [removed] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, removed);
      return newSteps;
    });
  };

  const handleStepDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('stepIndex', String(index));
  };

  const handleStepDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStepDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('stepIndex'));
    if (!isNaN(fromIndex)) {
      moveStep(fromIndex, targetIndex);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) {
      errors.name = '请输入菜名';
    }
    const validIngredients = formIngredients.filter((i) => i.name.trim() !== '');
    if (validIngredients.length === 0) {
      errors.ingredients = '请至少添加一种食材';
    }
    for (const ing of formIngredients) {
      if (ing.name.trim() !== '' && (!ing.quantity || parseFloat(ing.quantity) <= 0)) {
        errors.ingredients = '请填写有效的食材数量';
        break;
      }
    }
    const validSteps = formSteps.filter((s) => s.trim() !== '');
    if (validSteps.length === 0) {
      errors.steps = '请至少添加一个步骤';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveRecipe = async () => {
    if (!validateForm()) return;

    const validIngredients: Ingredient[] = formIngredients
      .filter((i) => i.name.trim() !== '' && i.quantity && parseFloat(i.quantity) > 0)
      .map((i) => ({
        id: i.id,
        name: i.name.trim(),
        quantity: parseFloat(i.quantity),
        unit: i.unit || '克',
      }));

    const validSteps = formSteps.filter((s) => s.trim() !== '');

    if (editingRecipe) {
      const updated: Recipe = {
        ...editingRecipe,
        name: formName.trim(),
        thumbnailColor: formColor,
        difficulty: formDifficulty,
        cookTime: formCookTime,
        ingredients: validIngredients,
        steps: validSteps,
      };
      await db.recipes.put(updated);
    } else {
      const newRecipe: Recipe = {
        id: uuidv4(),
        name: formName.trim(),
        thumbnailColor: formColor,
        difficulty: formDifficulty,
        cookTime: formCookTime,
        ingredients: validIngredients,
        steps: validSteps,
        isFavorite: false,
        createdAt: Date.now(),
      };
      await db.recipes.add(newRecipe);
    }

    setShowSidePanel(false);
    loadData();
  };

  const toggleFavorite = async (recipe: Recipe) => {
    const updated = { ...recipe, isFavorite: !recipe.isFavorite };
    await db.recipes.put(updated);
    loadData();
  };

  const deleteRecipe = async (recipe: Recipe) => {
    if (!confirm(`确定要删除菜谱"${recipe.name}"吗？`)) return;
    await db.recipes.delete(recipe.id);
    for (const day of mealPlan) {
      const newItems = day.items.filter((item) => item.recipeId !== recipe.id);
      if (newItems.length !== day.items.length) {
        await db.mealPlan.put({ ...day, items: newItems });
      }
    }
    loadData();
  };

  const openRecipeModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
  };

  const handleAddIngredient = async () => {
    if (!newIngredientName.trim()) return;
    const qty = parseFloat(newIngredientQuantity);
    if (!newIngredientQuantity || isNaN(qty) || qty <= 0) return;

    const existing = ingredients.find((i) => i.name === newIngredientName.trim());
    if (existing) {
      const updated = { ...existing, quantity: existing.quantity + qty };
      await db.ingredients.put(updated);
    } else {
      const newIng: Ingredient = {
        id: uuidv4(),
        name: newIngredientName.trim(),
        quantity: qty,
        unit: newIngredientUnit || '个',
      };
      await db.ingredients.add(newIng);
    }

    setNewIngredientName('');
    setNewIngredientQuantity('');
    setShowAutocomplete(false);
    loadData();
  };

  const handleIngredientNameChange = (value: string) => {
    setNewIngredientName(value);
    if (value.trim()) {
      const suggestions = COMMON_INGREDIENTS.filter(
        (ing) => ing.includes(value.trim()) && ing !== value.trim()
      ).slice(0, 5);
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(suggestions.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const selectAutocomplete = (name: string) => {
    setNewIngredientName(name);
    setShowAutocomplete(false);
  };

  const deleteIngredient = async (ingredient: Ingredient) => {
    await db.ingredients.delete(ingredient.id);
    loadData();
  };

  const calculateMatchPercent = (recipe: Recipe): number => {
    if (recipe.ingredients.length === 0) return 0;
    let matched = 0;
    for (const reqIng of recipe.ingredients) {
      const userIng = ingredients.find((i) => i.name === reqIng.name);
      if (userIng && userIng.quantity >= reqIng.quantity) {
        matched++;
      }
    }
    return Math.round((matched / recipe.ingredients.length) * 100);
  };

  const getRecommendations = () => {
    const results = recipes
      .map((recipe) => ({
        recipe,
        matchPercent: calculateMatchPercent(recipe),
      }))
      .filter((r) => r.matchPercent > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent);
    setRecommendations(results);
    setShowRecommendations(true);
  };

  const addRecipeToMealPlan = async (recipe: Recipe) => {
    const today = mealPlan.find((_, idx) => idx === new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) || mealPlan[0];
    if (!today) return;
    if (today.items.length >= 3) {
      alert('该日期已满，最多只能放3道菜');
      return;
    }
    const newItem: MealPlanItem = {
      id: uuidv4(),
      recipeId: recipe.id,
      recipe,
      mealType: 'lunch',
    };
    const updatedDay = { ...today, items: [...today.items, newItem] };
    await db.mealPlan.put(updatedDay);
    loadData();
  };

  const handleRecipeDragStart = (e: React.DragEvent, recipe: Recipe) => {
    setDraggingRecipe(recipe);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('dragging');
    }
  };

  const handleRecipeDragEnd = (e: React.DragEvent) => {
    setDraggingRecipe(null);
    setDragOverDay(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('dragging');
    }
  };

  const handleDayDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(date);
  };

  const handleDayDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDayDrop = async (e: React.DragEvent, day: MealPlanDay) => {
    e.preventDefault();
    setDragOverDay(null);
    if (!draggingRecipe) return;
    if (day.items.length >= 3) {
      alert('该日期已满，最多只能放3道菜');
      return;
    }
    const newItem: MealPlanItem = {
      id: uuidv4(),
      recipeId: draggingRecipe.id,
      recipe: draggingRecipe,
      mealType: 'lunch',
    };
    const updatedDay = { ...day, items: [...day.items, newItem] };
    await db.mealPlan.put(updatedDay);
    setDraggingRecipe(null);
    loadData();
  };

  const cycleMealType = async (day: MealPlanDay, itemId: string) => {
    const types: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner'];
    const updatedItems = day.items.map((item) => {
      if (item.id !== itemId) return item;
      const currentIdx = types.indexOf(item.mealType);
      const nextIdx = (currentIdx + 1) % types.length;
      return { ...item, mealType: types[nextIdx] };
    });
    await db.mealPlan.put({ ...day, items: updatedItems });
    loadData();
  };

  const handlePlannedItemMouseDown = (itemId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      removePlannedItem(itemId);
    }, 800);
  };

  const handlePlannedItemMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const removePlannedItem = async (itemId: string) => {
    setDeletingPlannedId(itemId);
    setTimeout(async () => {
      for (const day of mealPlan) {
        const filtered = day.items.filter((i) => i.id !== itemId);
        if (filtered.length !== day.items.length) {
          await db.mealPlan.put({ ...day, items: filtered });
          break;
        }
      }
      setDeletingPlannedId(null);
      loadData();
    }, 500);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    isDraggingTimeline.current = true;
    timelineStartX.current = e.pageX - timelineRef.current.offsetLeft;
    timelineScrollLeft.current = timelineRef.current.scrollLeft;
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTimeline.current || !timelineRef.current) return;
    e.preventDefault();
    const x = e.pageX - timelineRef.current.offsetLeft;
    const walk = (x - timelineStartX.current) * 1.5;
    timelineRef.current.scrollLeft = timelineScrollLeft.current - walk;
  };

  const handleTimelineMouseUp = () => {
    isDraggingTimeline.current = false;
  };

  const getFormattedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const guideSteps = [
    {
      icon: '📖',
      title: '管理您的菜谱',
      description: '创建个性化菜谱，记录每一道美食的配方和做法。支持收藏、编辑和删除，轻松管理您的美食库。',
    },
    {
      icon: '🥗',
      title: '食材智能推荐',
      description: '录入您现有的食材，系统会智能匹配可做的菜肴。根据食材完备度排序，再也不用纠结今天吃什么！',
    },
    {
      icon: '📅',
      title: '规划每周菜单',
      description: '拖拽菜谱到日历中，轻松规划一周的早中晚餐。长按可删除，点击切换餐次类型。',
    },
    {
      icon: '✨',
      title: '开始美食之旅',
      description: '所有数据都保存在您的浏览器中，安全又私密。现在就开始创建您的第一道菜谱吧！',
    },
  ];

  const nextGuideStep = () => {
    if (guideStep < guideSteps.length - 1) {
      setGuideStep(guideStep + 1);
    } else {
      setShowGuide(false);
      setGuideStep(0);
    }
  };

  const renderWelcome = () => (
    <div className="welcome-page">
      <div className="welcome-header">
        <div className="welcome-logo">🍳</div>
        <div className="welcome-title">美食工坊</div>
      </div>
      <div className="welcome-content">
        <h1>发现美食的无限可能</h1>
        <p>智能管理您的私人菜谱库，根据现有食材推荐美味佳肴，轻松规划每周饮食计划。让烹饪变得简单而有趣。</p>
        <button className="btn-primary" onClick={handleEnterApp}>
          开始探索 →
        </button>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="recipe-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-thumbnail" />
          <div className="skeleton-body">
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderRecipesView = () => (
    <div key={viewKey} className="view-fade-enter-active">
      {isLoading ? (
        renderSkeleton()
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <div className="empty-state-text">还没有菜谱，点击左上角 + 号创建您的第一道菜谱吧</div>
          <button className="btn-primary" onClick={openAddRecipePanel}>创建菜谱</button>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => openRecipeModal(recipe)}
              onFavorite={() => toggleFavorite(recipe)}
              onEdit={() => openEditRecipePanel(recipe)}
              onDelete={() => deleteRecipe(recipe)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderIngredientsView = () => (
    <div key={viewKey} className="view-fade-enter-active ingredients-view">
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>我的食材库</h2>

      <div className="floating-form">
        <div className="add-ingredient-form">
          <div style={{ position: 'relative', flex: 2 }}>
            <input
              type="text"
              className="form-input"
              placeholder="食材名称（如：鸡蛋）"
              value={newIngredientName}
              onChange={(e) => handleIngredientNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
              onFocus={() => newIngredientName && autocompleteSuggestions.length > 0 && setShowAutocomplete(true)}
            />
            {showAutocomplete && (
              <div className="autocomplete-dropdown">
                {autocompleteSuggestions.map((name) => (
                  <div key={name} className="autocomplete-item" onClick={() => selectAutocomplete(name)}>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            className="form-input"
            placeholder="数量"
            value={newIngredientQuantity}
            onChange={(e) => setNewIngredientQuantity(e.target.value.replace(/[^0-9.]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
            style={{ flex: 1 }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="单位"
            value={newIngredientUnit}
            onChange={(e) => setNewIngredientUnit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
            style={{ width: 80 }}
          />
          <button className="btn-primary" style={{ padding: '0 20px' }} onClick={handleAddIngredient}>
            添加
          </button>
        </div>
      </div>

      {ingredients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🥗</div>
          <div className="empty-state-text">还没有食材，添加一些您现有的食材吧</div>
        </div>
      ) : (
        <div className="ingredients-list">
          {ingredients.map((ing) => (
            <div key={ing.id} className="ingredient-list-item glass">
              <div className="ingredient-info">
                <div className="ingredient-icon">🥬</div>
                <div>
                  <div className="ingredient-detail-name">{ing.name}</div>
                  <div className="ingredient-detail-quantity">{ing.quantity} {ing.unit}</div>
                </div>
              </div>
              <button className="btn-danger" onClick={() => deleteIngredient(ing)}>
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="recommend-section">
        <div className="section-header">
          <h2>智能推荐</h2>
          <button className="btn-primary" onClick={getRecommendations}>
            推荐菜谱
          </button>
        </div>

        {showRecommendations && (
          recommendations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🤔</div>
              <div className="empty-state-text">没有找到匹配的菜谱，试试添加更多食材吧</div>
            </div>
          ) : (
            <div className="waterfall-grid">
              {recommendations.map(({ recipe, matchPercent }) => (
                <div key={recipe.id} className="recommend-card glass" onClick={() => openRecipeModal(recipe)}>
                  <div className="recommend-thumbnail" style={{ background: recipe.thumbnailColor }}>
                    <span className="recommend-match-badge">{matchPercent}% 匹配</span>
                  </div>
                  <div className="recommend-body">
                    <div className="recommend-name">{recipe.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`difficulty-tag difficulty-${recipe.difficulty}`}>
                        {DIFFICULTY_LABELS[recipe.difficulty]}
                      </span>
                      <span className="cook-time" style={{ fontSize: 12 }}>⏳ {recipe.cookTime}分钟</span>
                    </div>
                    <div className="recommend-actions">
                      <button
                        className="btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          addRecipeToMealPlan(recipe);
                        }}
                      >
                        加入计划
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );

  const renderPlannerView = () => (
    <div key={viewKey} className="view-fade-enter-active planner-view">
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>每周计划</h2>

      <div className="planner-content">
        <div className="planner-recipes-sidebar glass">
          <h3>菜谱列表（拖拽添加）</h3>
          <div className="sidebar-recipe-list">
            {recipes.length === 0 ? (
              <div style={{ fontSize: 14, color: 'rgba(224,224,255,0.5)', textAlign: 'center', padding: 24 }}>
                还没有菜谱
              </div>
            ) : (
              recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="sidebar-recipe-item"
                  draggable
                  onDragStart={(e) => handleRecipeDragStart(e, recipe)}
                  onDragEnd={handleRecipeDragEnd}
                >
                  <span
                    className="sidebar-recipe-name"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {recipe.name}
                  </span>
                  <span className={`difficulty-tag difficulty-${recipe.difficulty}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                    {DIFFICULTY_LABELS[recipe.difficulty]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          ref={timelineRef}
          className="planner-timeline-container glass"
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseUp={handleTimelineMouseUp}
          onMouseLeave={handleTimelineMouseUp}
          style={{ cursor: isDraggingTimeline.current ? 'grabbing' : 'grab' }}
        >
          <div className="planner-timeline">
            {mealPlan.map((day, idx) => (
              <div
                key={day.date}
                className={`day-column glass-light ${dragOverDay === day.date ? 'drag-over' : ''} ${day.items.length >= 3 ? 'warning' : ''}`}
                onDragOver={(e) => handleDayDragOver(e, day.date)}
                onDragLeave={handleDayDragLeave}
                onDrop={(e) => handleDayDrop(e, day)}
              >
                <div className="day-header">
                  <div className="day-name">{WEEKDAY_LABELS[idx]}</div>
                  <div className="day-date">{getFormattedDate(day.date)}</div>
                  {day.items.length >= 3 && <div className="day-warning">已满</div>}
                </div>
                <div className="day-content">
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      className={`planned-meal-card ${deletingPlannedId === item.id ? 'deleting' : ''}`}
                      onMouseDown={() => handlePlannedItemMouseDown(item.id)}
                      onMouseUp={handlePlannedItemMouseUp}
                      onMouseLeave={handlePlannedItemMouseUp}
                      onTouchStart={() => handlePlannedItemMouseDown(item.id)}
                      onTouchEnd={handlePlannedItemMouseUp}
                      onClick={() => cycleMealType(day, item.id)}
                      title="点击切换早/中/晚餐，长按删除"
                    >
                      <div className="planned-meal-name" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.recipe.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button className="meal-type-btn">
                          {MEAL_TYPE_LABELS[item.mealType]}
                        </button>
                        <span className={`difficulty-tag difficulty-${item.recipe.difficulty}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                          {DIFFICULTY_LABELS[item.recipe.difficulty]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'welcome':
        return renderWelcome();
      case 'recipes':
        return renderRecipesView();
      case 'ingredients':
        return renderIngredientsView();
      case 'planner':
        return renderPlannerView();
      default:
        return null;
    }
  };

  const difficultyClass = selectedRecipe
    ? {
        easy: 'difficulty-easy',
        medium: 'difficulty-medium',
        hard: 'difficulty-hard',
      }[selectedRecipe.difficulty]
    : '';

  return (
    <div className="app-container">
      {currentView !== 'welcome' && (
        <nav className="top-nav glass">
          <div className="nav-logo">
            <div className="nav-logo-icon">🍳</div>
            <div className="nav-logo-text">美食工坊</div>
          </div>

          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'recipes' ? 'active' : ''}`}
              onClick={() => handleTabChange('recipes')}
            >
              所有菜谱
            </button>
            <button
              className={`nav-tab ${activeTab === 'ingredients' ? 'active' : ''}`}
              onClick={() => handleTabChange('ingredients')}
            >
              食材库
            </button>
            <button
              className={`nav-tab ${activeTab === 'planner' ? 'active' : ''}`}
              onClick={() => handleTabChange('planner')}
            >
              每周计划
            </button>
          </div>

          <div className="nav-actions">
            <button className="add-btn" onClick={openAddRecipePanel} title="添加菜谱">
              +
            </button>
          </div>
        </nav>
      )}

      {currentView === 'welcome' ? (
        renderCurrentView()
      ) : (
        <div className="main-app">
          <div className="view-container">{renderCurrentView()}</div>
        </div>
      )}

      {currentView !== 'welcome' && (
        <button className="help-btn" onClick={() => { setShowGuide(true); setGuideStep(0); }}>
          ?
        </button>
      )}

      {showRecipeModal && selectedRecipe && (
        <div className="modal-overlay" onClick={() => setShowRecipeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                background: selectedRecipe.thumbnailColor,
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 80, opacity: 0.8 }}>
                🍽️
              </span>
            </div>
            <div className="modal-header">
              <h2>{selectedRecipe.name}</h2>
              <button className="modal-close" onClick={() => setShowRecipeModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="recipe-detail-meta">
                <span className={`difficulty-tag ${difficultyClass}`}>
                  难度：{DIFFICULTY_LABELS[selectedRecipe.difficulty]}
                </span>
                <span className="cook-time" style={{ fontSize: 14 }}>
                  ⏳ 烹饪时间：{selectedRecipe.cookTime}分钟
                </span>
              </div>

              <div className="recipe-detail-section">
                <h3>食材清单</h3>
                <ul className="ingredient-list">
                  {selectedRecipe.ingredients.map((ing) => (
                    <li key={ing.id} className="ingredient-item">
                      <span className="ingredient-name">{ing.name}</span>
                      <span className="ingredient-quantity">{ing.quantity} {ing.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="recipe-detail-section">
                <h3>制作步骤</h3>
                <ol className="step-list">
                  {selectedRecipe.steps.map((step, idx) => (
                    <li key={idx} className="step-item">{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSidePanel && (
        <>
          <div className="side-panel-overlay" onClick={() => setShowSidePanel(false)} />
          <div className="side-panel glass" onClick={(e) => e.stopPropagation()}>
            <div className="side-panel-header">
              <h2>{editingRecipe ? '编辑菜谱' : '新建菜谱'}</h2>
              <button className="modal-close" onClick={() => setShowSidePanel(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">菜名</label>
              <input
                type="text"
                className={`form-input ${formErrors.name ? 'error' : ''}`}
                placeholder="请输入菜名"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              {formErrors.name && <div className="form-error">{formErrors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">缩略图颜色</label>
              <div className="color-picker">
                {PRESET_GRADIENTS.map((gradient) => (
                  <div
                    key={gradient}
                    className={`color-option ${formColor === gradient ? 'selected' : ''}`}
                    style={{ background: gradient }}
                    onClick={() => setFormColor(gradient)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">难度</label>
              <select
                className="form-select"
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">烹饪时间：<span style={{ color: '#ff6b35' }}>{formCookTime} 分钟</span></label>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider"
                  min={5}
                  max={180}
                  step={5}
                  value={formCookTime}
                  onChange={(e) => setFormCookTime(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                食材列表
                {formErrors.ingredients && <span style={{ color: '#f87171', fontSize: 12, marginLeft: 8 }}>{formErrors.ingredients}</span>}
              </label>
              {formIngredients.map((ing, idx) => (
                <div key={ing.id} className="ingredient-row">
                  <input
                    type="text"
                    className={`form-input ${ing.error && ing.name ? 'error' : ''}`}
                    placeholder={`食材${idx + 1}`}
                    value={ing.name}
                    onChange={(e) => updateIngredientRow(ing.id, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    className={`form-input ${ing.error ? 'error' : ''}`}
                    placeholder="数量"
                    value={ing.quantity}
                    onChange={(e) => updateIngredientRow(ing.id, 'quantity', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="单位"
                    value={ing.unit}
                    onChange={(e) => updateIngredientRow(ing.id, 'unit', e.target.value)}
                  />
                  <button className="remove-btn" onClick={() => removeIngredientRow(ing.id)}>×</button>
                </div>
              ))}
              <button className="add-small-btn" onClick={addIngredientRow}>+ 添加食材</button>
            </div>

            <div className="form-group">
              <label className="form-label">
                制作步骤（可拖拽排序）
                {formErrors.steps && <span style={{ color: '#f87171', fontSize: 12, marginLeft: 8 }}>{formErrors.steps}</span>}
              </label>
              {formSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="step-row"
                  draggable
                  onDragStart={(e) => handleStepDragStart(e, idx)}
                  onDragOver={handleStepDragOver}
                  onDrop={(e) => handleStepDrop(e, idx)}
                >
                  <div className="drag-handle">⋮⋮</div>
                  <textarea
                    className="form-textarea"
                    placeholder={`步骤 ${idx + 1}`}
                    value={step}
                    onChange={(e) => updateStepRow(idx, e.target.value)}
                  />
                  <button className="remove-btn" onClick={() => removeStepRow(idx)}>×</button>
                </div>
              ))}
              <button className="add-small-btn" onClick={addStepRow}>+ 添加步骤</button>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowSidePanel(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={saveRecipe}>
                {editingRecipe ? '保存修改' : '创建菜谱'}
              </button>
            </div>
          </div>
        </>
      )}

      {showGuide && (
        <div className="guide-overlay">
          <div className="guide-content glass">
            <div className="guide-dots">
              {guideSteps.map((_, i) => (
                <div key={i} className={`guide-dot ${i === guideStep ? 'active' : ''}`} />
              ))}
            </div>
            <div className="guide-step" key={guideStep}>
              <div className="guide-icon">{guideSteps[guideStep].icon}</div>
              <h3 className="guide-title">{guideSteps[guideStep].title}</h3>
              <p className="guide-description">{guideSteps[guideStep].description}</p>
              <div className="guide-actions">
                {guideStep < guideSteps.length - 1 ? (
                  <button className="btn-primary" onClick={nextGuideStep}>
                    下一步
                  </button>
                ) : (
                  <button className="btn-primary" onClick={nextGuideStep}>
                    开始使用
                  </button>
                )}
                {guideStep < guideSteps.length - 1 && (
                  <button className="btn-secondary" onClick={() => { setShowGuide(false); setGuideStep(0); }}>
                    跳过
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
