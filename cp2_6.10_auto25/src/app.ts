import './style.css';
import {
  RecipeManager,
  Recipe,
  RecipeStep,
  Ingredient,
  SearchFilter,
  CuisineType,
  DifficultyLevel,
  IngredientCategory
} from './recipeManager.js';
import {
  MealPlanner,
  MealType,
  MEAL_LABELS,
  getWeekDates,
  getWeekDayLabel,
  ShoppingItem,
  ExtraShoppingItem
} from './mealPlanner.js';

type ViewType = 'home' | 'add-recipe' | 'recipe-detail' | 'meal-plan' | 'shopping-list';

interface AppState {
  currentView: ViewType;
  selectedRecipeId: string | null;
  currentPage: number;
  pageSize: number;
  searchFilter: SearchFilter;
  draggedRecipeId: string | null;
}

const CUISINE_OPTIONS: CuisineType[] = ['中式', '意式', '日式', '韩式', '西式', '其他'];
const CATEGORY_OPTIONS: IngredientCategory[] = ['蔬菜', '肉类', '调味品', '主食', '海鲜', '乳制品', '其他'];
const DIFFICULTY_OPTIONS: DifficultyLevel[] = [1, 2, 3, 4, 5];

const recipeManager = new RecipeManager();
const mealPlanner = new MealPlanner(recipeManager);

const state: AppState = {
  currentView: 'home',
  selectedRecipeId: null,
  currentPage: 1,
  pageSize: 4,
  searchFilter: {},
  draggedRecipeId: null
};

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lazyLoadObserver: IntersectionObserver | null = null;

function app(): void {
  const root = document.getElementById('app');
  if (!root) return;

  initSeedData();
  render();
}

function initSeedData(): void {
  if (recipeManager.getAllRecipes().length > 0) return;

  const sampleRecipes: Omit<Recipe, 'id' | 'createdAt' | 'isFavorite'>[] = [
    {
      name: '番茄意大利面',
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tomato%20spaghetti%20pasta%20on%20plate%20italian%20food%20photography&image_size=square',
      cuisine: '意式',
      difficulty: 2,
      ingredients: [
        { name: '意大利面', amount: '200g', category: '主食' },
        { name: '番茄', amount: '3个', category: '蔬菜' },
        { name: '大蒜', amount: '3瓣', category: '蔬菜' },
        { name: '橄榄油', amount: '2汤匙', category: '调味品' },
        { name: '盐', amount: '适量', category: '调味品' },
        { name: '黑胡椒', amount: '适量', category: '调味品' }
      ],
      steps: [
        { order: 1, description: '锅中加水煮沸，加盐，放入意大利面煮至八分熟。' },
        { order: 2, description: '番茄切丁，大蒜切末备用。' },
        { order: 3, description: '平底锅加橄榄油，爆香蒜末，加入番茄丁翻炒出汁。' },
        { order: 4, description: '加入煮好的意大利面，翻炒均匀，调味出锅。' }
      ]
    },
    {
      name: '日式照烧鸡腿',
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20teriyaki%20chicken%20rice%20bowl%20food%20photography&image_size=square',
      cuisine: '日式',
      difficulty: 3,
      ingredients: [
        { name: '鸡腿', amount: '2只', category: '肉类' },
        { name: '酱油', amount: '3汤匙', category: '调味品' },
        { name: '味醂', amount: '2汤匙', category: '调味品' },
        { name: '料酒', amount: '1汤匙', category: '调味品' },
        { name: '蜂蜜', amount: '1汤匙', category: '调味品' },
        { name: '米饭', amount: '2碗', category: '主食' }
      ],
      steps: [
        { order: 1, description: '鸡腿去骨，用叉子在肉面扎几下便于入味。' },
        { order: 2, description: '调制照烧汁：酱油、味醂、料酒、蜂蜜混合均匀。' },
        { order: 3, description: '平底锅不放油，鸡皮朝下煎至金黄，翻面继续煎。' },
        { order: 4, description: '倒入照烧汁，小火收汁，切片铺在米饭上。' }
      ]
    },
    {
      name: '红烧牛肉',
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20braised%20beef%20stew%20in%20pot%20food%20photography&image_size=square',
      cuisine: '中式',
      difficulty: 4,
      ingredients: [
        { name: '牛腩', amount: '500g', category: '肉类' },
        { name: '大葱', amount: '1根', category: '蔬菜' },
        { name: '姜', amount: '3片', category: '蔬菜' },
        { name: '八角', amount: '2颗', category: '调味品' },
        { name: '生抽', amount: '2汤匙', category: '调味品' },
        { name: '老抽', amount: '1汤匙', category: '调味品' },
        { name: '冰糖', amount: '15g', category: '调味品' }
      ],
      steps: [
        { order: 1, description: '牛腩切块，冷水下锅焯水去血沫，捞出洗净。' },
        { order: 2, description: '锅中放少许油，加冰糖小火炒出糖色。' },
        { order: 3, description: '下牛肉翻炒上色，加葱姜八角爆香。' },
        { order: 4, description: '加生抽、老抽、热水没过牛肉，大火烧开转小火炖1.5小时。' },
        { order: 5, description: '大火收汁至浓稠即可。' }
      ]
    },
    {
      name: '韩式石锅拌饭',
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=korean%20bibimbap%20stone%20bowl%20rice%20with%20vegetables%20egg%20food%20photography&image_size=square',
      cuisine: '韩式',
      difficulty: 3,
      ingredients: [
        { name: '米饭', amount: '2碗', category: '主食' },
        { name: '牛肉末', amount: '100g', category: '肉类' },
        { name: '菠菜', amount: '100g', category: '蔬菜' },
        { name: '胡萝卜', amount: '1根', category: '蔬菜' },
        { name: '豆芽', amount: '100g', category: '蔬菜' },
        { name: '鸡蛋', amount: '2个', category: '其他' },
        { name: '韩式辣酱', amount: '2汤匙', category: '调味品' },
        { name: '香油', amount: '1汤匙', category: '调味品' }
      ],
      steps: [
        { order: 1, description: '菠菜、豆芽分别焯水沥干，胡萝卜切丝炒熟备用。' },
        { order: 2, description: '牛肉末用少许酱油、料酒腌制后炒熟。' },
        { order: 3, description: '石锅刷香油，放入米饭，将蔬菜和牛肉分别摆放在上面。' },
        { order: 4, description: '中间放一个煎蛋，小火加热至锅底米饭形成锅巴。' },
        { order: 5, description: '配韩式辣酱拌匀食用。' }
      ]
    },
    {
      name: '蔬菜沙拉',
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fresh%20vegetable%20salad%20in%20bowl%20healthy%20food%20photography&image_size=square',
      cuisine: '西式',
      difficulty: 1,
      ingredients: [
        { name: '生菜', amount: '1颗', category: '蔬菜' },
        { name: '黄瓜', amount: '1根', category: '蔬菜' },
        { name: '小番茄', amount: '10颗', category: '蔬菜' },
        { name: '紫甘蓝', amount: '3片', category: '蔬菜' },
        { name: '橄榄油', amount: '2汤匙', category: '调味品' },
        { name: '柠檬汁', amount: '1汤匙', category: '调味品' },
        { name: '蜂蜜', amount: '1茶匙', category: '调味品' }
      ],
      steps: [
        { order: 1, description: '所有蔬菜洗净沥干，生菜撕成小片，黄瓜切片，小番茄对半切，紫甘蓝切丝。' },
        { order: 2, description: '橄榄油、柠檬汁、蜂蜜、少许盐混合调成油醋汁。' },
        { order: 3, description: '蔬菜装入大碗，淋上油醋汁拌匀即可。' }
      ]
    },
    {
      name: '清蒸鲈鱼',
      coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20steamed%20sea%20bass%20fish%20with%20ginger%20scallion%20food%20photography&image_size=square',
      cuisine: '中式',
      difficulty: 2,
      ingredients: [
        { name: '鲈鱼', amount: '1条', category: '海鲜' },
        { name: '大葱', amount: '2根', category: '蔬菜' },
        { name: '姜', amount: '1块', category: '蔬菜' },
        { name: '蒸鱼豉油', amount: '3汤匙', category: '调味品' },
        { name: '料酒', amount: '1汤匙', category: '调味品' }
      ],
      steps: [
        { order: 1, description: '鲈鱼处理干净，两面划几刀，抹上料酒腌制10分钟。' },
        { order: 2, description: '盘底铺上姜片和葱段，放上鱼，鱼腹内也塞入葱姜。' },
        { order: 3, description: '水开后上锅蒸8-10分钟，取出倒掉盘中汤汁。' },
        { order: 4, description: '铺上新鲜葱丝姜丝，淋上蒸鱼豉油，浇上热油即可。' }
      ]
    }
  ];

  for (const r of sampleRecipes) {
    recipeManager.addRecipe(r);
  }
}

function render(): void {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = '';
  root.appendChild(renderNavbar());

  const main = document.createElement('main');
  main.className = 'main-content';

  switch (state.currentView) {
    case 'home':
      main.appendChild(renderHomeView());
      break;
    case 'add-recipe':
      main.appendChild(renderAddRecipeView());
      break;
    case 'recipe-detail':
      main.appendChild(renderRecipeDetailView());
      break;
    case 'meal-plan':
      main.appendChild(renderMealPlanView());
      break;
    case 'shopping-list':
      main.appendChild(renderShoppingListView());
      break;
  }

  root.appendChild(main);

  if (state.currentView === 'home') {
    setupLazyLoadObserver();
  }
}

function renderNavbar(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'navbar';

  const brand = document.createElement('div');
  brand.className = 'navbar-brand';
  brand.innerHTML = `<span class="brand-icon">🍳</span><span>美味食谱</span>`;
  brand.addEventListener('click', () => navigateTo('home'));
  nav.appendChild(brand);

  const links = document.createElement('div');
  links.className = 'navbar-links';

  const linksData: { view: ViewType; label: string; icon: string }[] = [
    { view: 'home', label: '食谱库', icon: '📖' },
    { view: 'meal-plan', label: '餐单规划', icon: '📅' },
    { view: 'shopping-list', label: '购物清单', icon: '🛒' }
  ];

  for (const link of linksData) {
    const a = document.createElement('a');
    a.className = 'nav-link' + (state.currentView === link.view ? ' active' : '');
    a.innerHTML = `<span>${link.icon}</span> ${link.label}`;
    a.addEventListener('click', () => navigateTo(link.view));
    links.appendChild(a);
  }

  nav.appendChild(links);

  if (state.currentView === 'home') {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary add-recipe-btn';
    addBtn.innerHTML = '<span>＋</span> 添加食谱';
    addBtn.addEventListener('click', () => navigateTo('add-recipe'));
    nav.appendChild(addBtn);
  }

  return nav;
}

function navigateTo(view: ViewType, recipeId: string | null = null): void {
  state.currentView = view;
  state.selectedRecipeId = recipeId;
  state.currentPage = 1;
  if (lazyLoadObserver) {
    lazyLoadObserver.disconnect();
    lazyLoadObserver = null;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function renderHomeView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'home-view';

  const searchSection = document.createElement('div');
  searchSection.className = 'search-section';

  const searchBox = document.createElement('div');
  searchBox.className = 'search-box';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'search-input';
  searchInput.placeholder = '搜索食谱名称或食材...';
  searchInput.value = state.searchFilter.keyword || '';
  searchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      state.searchFilter.keyword = target.value;
      state.currentPage = 1;
      updateRecipeGrid();
    }, 300);
  });
  searchBox.appendChild(searchInput);

  const filters = document.createElement('div');
  filters.className = 'filters';

  const difficultySelect = document.createElement('select');
  difficultySelect.className = 'filter-select';
  difficultySelect.innerHTML = `<option value="">全部难易度</option>` +
    DIFFICULTY_OPTIONS.map(d => `<option value="${d}" ${state.searchFilter.difficulty === d ? 'selected' : ''}>${'⭐'.repeat(d)} ${d}星</option>`).join('');
  difficultySelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    state.searchFilter.difficulty = val ? (parseInt(val) as DifficultyLevel) : null;
    state.currentPage = 1;
    updateRecipeGrid();
  });

  const cuisineSelect = document.createElement('select');
  cuisineSelect.className = 'filter-select';
  cuisineSelect.innerHTML = `<option value="">全部菜系</option>` +
    CUISINE_OPTIONS.map(c => `<option value="${c}" ${state.searchFilter.cuisine === c ? 'selected' : ''}>${c}</option>`).join('');
  cuisineSelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    state.searchFilter.cuisine = val ? (val as CuisineType) : null;
    state.currentPage = 1;
    updateRecipeGrid();
  });

  filters.appendChild(difficultySelect);
  filters.appendChild(cuisineSelect);

  searchSection.appendChild(searchBox);
  searchSection.appendChild(filters);
  container.appendChild(searchSection);

  const gridWrapper = document.createElement('div');
  gridWrapper.className = 'grid-wrapper';
  const grid = document.createElement('div');
  grid.className = 'recipe-grid';
  grid.id = 'recipe-grid';
  gridWrapper.appendChild(grid);
  container.appendChild(gridWrapper);

  const sentinel = document.createElement('div');
  sentinel.id = 'scroll-sentinel';
  sentinel.className = 'scroll-sentinel';
  container.appendChild(sentinel);

  updateRecipeGrid();

  return container;
}

function updateRecipeGrid(): void {
  const grid = document.getElementById('recipe-grid');
  if (!grid) return;

  if (state.currentPage === 1) {
    grid.innerHTML = '';
  }

  const result = recipeManager.getPaginatedRecipes(state.currentPage, state.pageSize, state.searchFilter);

  if (result.recipes.length === 0 && state.currentPage === 1) {
    grid.innerHTML = '<div class="empty-state"><p>🍽️</p><p>暂无食谱，点击右上角添加您的第一个食谱吧！</p></div>';
    return;
  }

  for (const recipe of result.recipes) {
    grid.appendChild(renderRecipeCard(recipe));
  }

  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel) {
    if (!result.hasMore) {
      sentinel.style.display = 'none';
    } else {
      sentinel.style.display = 'block';
    }
  }
}

function setupLazyLoadObserver(): void {
  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel) return;

  if (lazyLoadObserver) {
    lazyLoadObserver.disconnect();
  }

  lazyLoadObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio > 0) {
        const result = recipeManager.getPaginatedRecipes(state.currentPage, state.pageSize, state.searchFilter);
        if (result.hasMore) {
          state.currentPage++;
          updateRecipeGrid();
        }
      }
    }
  }, { rootMargin: '100px' });

  lazyLoadObserver.observe(sentinel);
}

function renderRecipeCard(recipe: Recipe): HTMLElement {
  const card = document.createElement('div');
  card.className = 'recipe-card fade-in';
  card.draggable = true;

  card.addEventListener('click', () => navigateTo('recipe-detail', recipe.id));

  card.addEventListener('dragstart', (e) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', recipe.id);
      state.draggedRecipeId = recipe.id;
    }
  });

  card.addEventListener('dragend', () => {
    state.draggedRecipeId = null;
  });

  const imgContainer = document.createElement('div');
  imgContainer.className = 'card-image';
  const img = document.createElement('img');
  img.src = recipe.coverImage;
  img.alt = recipe.name;
  img.loading = 'lazy';
  img.onerror = () => {
    img.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#E8DDD0" width="200" height="200"/><text x="100" y="110" font-size="48" text-anchor="middle">🍽️</text></svg>'
    );
  };
  imgContainer.appendChild(img);

  const favBadge = document.createElement('div');
  favBadge.className = 'favorite-badge' + (recipe.isFavorite ? ' active' : '');
  favBadge.innerHTML = recipe.isFavorite ? '❤️' : '🤍';
  favBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    recipeManager.toggleFavorite(recipe.id);
    const updated = recipeManager.getRecipeById(recipe.id);
    if (updated) {
      favBadge.className = 'favorite-badge' + (updated.isFavorite ? ' active' : '');
      favBadge.innerHTML = updated.isFavorite ? '❤️' : '🤍';
    }
  });
  imgContainer.appendChild(favBadge);

  card.appendChild(imgContainer);

  const info = document.createElement('div');
  info.className = 'card-info';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = recipe.name;
  info.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.innerHTML = `
    <span class="cuisine-tag">${recipe.cuisine}</span>
    <span class="difficulty">${'⭐'.repeat(recipe.difficulty)}</span>
  `;
  info.appendChild(meta);

  card.appendChild(info);

  return card;
}

function renderRecipeDetailView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'recipe-detail-view';

  if (!state.selectedRecipeId) {
    container.innerHTML = '<div class="empty-state"><p>未找到食谱</p></div>';
    return container;
  }

  const recipe = recipeManager.getRecipeById(state.selectedRecipeId);
  if (!recipe) {
    container.innerHTML = '<div class="empty-state"><p>食谱不存在或已被删除</p></div>';
    return container;
  }

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-back';
  backBtn.innerHTML = '← 返回食谱库';
  backBtn.addEventListener('click', () => navigateTo('home'));
  container.appendChild(backBtn);

  const header = document.createElement('div');
  header.className = 'detail-header';

  const cover = document.createElement('div');
  cover.className = 'detail-cover';
  const img = document.createElement('img');
  img.src = recipe.coverImage;
  img.alt = recipe.name;
  cover.appendChild(img);
  header.appendChild(cover);

  const info = document.createElement('div');
  info.className = 'detail-info';

  const title = document.createElement('h1');
  title.className = 'detail-title';
  title.textContent = recipe.name;
  info.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'detail-meta';
  meta.innerHTML = `
    <span class="cuisine-tag large">${recipe.cuisine}</span>
    <span class="difficulty large">${'⭐'.repeat(recipe.difficulty)} 难度</span>
    <span class="ingredient-count">🥗 ${recipe.ingredients.length} 种食材</span>
    <span class="step-count">👨‍🍳 ${recipe.steps.length} 个步骤</span>
  `;
  info.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'detail-actions';

  const favBtn = document.createElement('button');
  favBtn.className = 'btn' + (recipe.isFavorite ? ' btn-danger' : ' btn-secondary');
  favBtn.innerHTML = recipe.isFavorite ? '❤️ 取消收藏' : '🤍 收藏';
  favBtn.addEventListener('click', () => {
    recipeManager.toggleFavorite(recipe.id);
    render();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger';
  deleteBtn.innerHTML = '🗑️ 删除食谱';
  deleteBtn.addEventListener('click', () => {
    if (confirm('确定要删除这个食谱吗？')) {
      recipeManager.deleteRecipe(recipe.id);
      navigateTo('home');
    }
  });

  actions.appendChild(favBtn);
  actions.appendChild(deleteBtn);
  info.appendChild(actions);

  header.appendChild(info);
  container.appendChild(header);

  const content = document.createElement('div');
  content.className = 'detail-content';

  const ingredientsSection = document.createElement('section');
  ingredientsSection.className = 'ingredients-section';
  ingredientsSection.innerHTML = '<h2>🥬 食材清单</h2>';

  const ingredientsList = document.createElement('div');
  ingredientsList.className = 'ingredients-grid';
  for (const ing of recipe.ingredients) {
    const item = document.createElement('div');
    item.className = 'ingredient-item';
    item.innerHTML = `
      <span class="ing-category">${ing.category}</span>
      <span class="ing-name">${ing.name}</span>
      <span class="ing-amount">${ing.amount}</span>
    `;
    ingredientsList.appendChild(item);
  }
  ingredientsSection.appendChild(ingredientsList);
  content.appendChild(ingredientsSection);

  const stepsSection = document.createElement('section');
  stepsSection.className = 'steps-section';
  stepsSection.innerHTML = '<h2>👨‍🍳 烹饪步骤</h2>';

  const stepsList = document.createElement('ol');
  stepsList.className = 'steps-list';
  for (const step of recipe.steps) {
    const li = document.createElement('li');
    li.className = 'step-item';
    li.innerHTML = `<span class="step-number">${step.order}</span><p>${step.description}</p>`;
    stepsList.appendChild(li);
  }
  stepsSection.appendChild(stepsList);
  content.appendChild(stepsSection);

  container.appendChild(content);

  return container;
}

function renderAddRecipeView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'add-recipe-view';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-back';
  backBtn.innerHTML = '← 返回食谱库';
  backBtn.addEventListener('click', () => navigateTo('home'));
  container.appendChild(backBtn);

  const formTitle = document.createElement('h1');
  formTitle.className = 'form-title';
  formTitle.textContent = '✨ 添加新食谱';
  container.appendChild(formTitle);

  const form = document.createElement('form');
  form.className = 'recipe-form';
  form.id = 'recipe-form';
  form.noValidate = true;

  const nameGroup = createFormGroup('食谱名称', (wrapper) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'name';
    input.required = true;
    input.placeholder = '例如：番茄炒蛋';
    wrapper.appendChild(input);
  });
  form.appendChild(nameGroup);

  const coverGroup = document.createElement('div');
  coverGroup.className = 'form-group';
  const coverLabel = document.createElement('label');
  coverLabel.textContent = '封面图片';
  coverGroup.appendChild(coverLabel);

  const coverOptions = document.createElement('div');
  coverOptions.className = 'cover-options';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.name = 'coverImage';
  urlInput.placeholder = '输入图片URL，或上传本地图片';
  urlInput.className = 'cover-url-input';
  coverOptions.appendChild(urlInput);

  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.id = 'cover-upload';
  uploadInput.style.display = 'none';
  uploadInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        urlInput.value = ev.target?.result as string || '';
        updatePreview(urlInput.value);
      };
      reader.readAsDataURL(file);
    }
  });
  coverOptions.appendChild(uploadInput);

  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'btn btn-secondary';
  uploadBtn.textContent = '📷 上传图片';
  uploadBtn.addEventListener('click', () => uploadInput.click());
  coverOptions.appendChild(uploadBtn);

  coverGroup.appendChild(coverOptions);

  const preview = document.createElement('div');
  preview.className = 'cover-preview';
  preview.id = 'cover-preview';
  coverGroup.appendChild(preview);

  function updatePreview(url: string): void {
    if (!url) {
      preview.innerHTML = '<span class="preview-placeholder">图片预览</span>';
      return;
    }
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    img.onerror = () => {
      preview.innerHTML = '<span class="preview-placeholder preview-error">图片加载失败</span>';
    };
    preview.appendChild(img);
  }
  updatePreview('');

  urlInput.addEventListener('input', (e) => {
    updatePreview((e.target as HTMLInputElement).value);
  });

  form.appendChild(coverGroup);

  const metaRow = document.createElement('div');
  metaRow.className = 'form-row';

  const cuisineGroup = createFormGroup('菜系', (wrapper) => {
    const select = document.createElement('select');
    select.name = 'cuisine';
    select.required = true;
    for (const c of CUISINE_OPTIONS) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    }
    wrapper.appendChild(select);
  });
  metaRow.appendChild(cuisineGroup);

  const difficultyGroup = createFormGroup('难易度', (wrapper) => {
    const stars = document.createElement('div');
    stars.className = 'star-rating';
    stars.id = 'star-rating';
    let selected = 3;

    function renderStars(): void {
      stars.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star' + (i <= selected ? ' filled' : '');
        star.textContent = '⭐';
        star.dataset.value = String(i);
        star.addEventListener('click', () => {
          selected = i;
          hiddenInput.value = String(i);
          renderStars();
        });
        stars.appendChild(star);
      }
    }
    renderStars();

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'difficulty';
    hiddenInput.value = '3';

    wrapper.appendChild(stars);
    wrapper.appendChild(hiddenInput);
  });
  metaRow.appendChild(difficultyGroup);

  form.appendChild(metaRow);

  const ingredientsGroup = document.createElement('div');
  ingredientsGroup.className = 'form-group';
  const ingredientsLabel = document.createElement('label');
  ingredientsLabel.textContent = '🥬 食材清单';
  ingredientsGroup.appendChild(ingredientsLabel);

  const ingredientsContainer = document.createElement('div');
  ingredientsContainer.className = 'ingredients-dynamic';
  ingredientsContainer.id = 'ingredients-container';
  ingredientsGroup.appendChild(ingredientsContainer);

  function addIngredientRow(name = '', amount = '', category: IngredientCategory = '蔬菜'): void {
    const row = document.createElement('div');
    row.className = 'ingredient-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'ing-name-input';
    nameInput.placeholder = '食材名称';
    nameInput.value = name;
    nameInput.dataset.field = 'name';

    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.className = 'ing-amount-input';
    amountInput.placeholder = '用量';
    amountInput.value = amount;
    amountInput.dataset.field = 'amount';

    const categorySelect = document.createElement('select');
    categorySelect.className = 'ing-category-select';
    categorySelect.dataset.field = 'category';
    for (const c of CATEGORY_OPTIONS) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === category) opt.selected = true;
      categorySelect.appendChild(opt);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-row';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
    });

    row.appendChild(nameInput);
    row.appendChild(amountInput);
    row.appendChild(categorySelect);
    row.appendChild(removeBtn);
    ingredientsContainer.appendChild(row);
  }

  addIngredientRow();
  addIngredientRow();
  addIngredientRow();

  const addIngBtn = document.createElement('button');
  addIngBtn.type = 'button';
  addIngBtn.className = 'btn btn-secondary btn-add-row';
  addIngBtn.innerHTML = '+ 添加食材';
  addIngBtn.addEventListener('click', () => addIngredientRow());
  ingredientsGroup.appendChild(addIngBtn);

  form.appendChild(ingredientsGroup);

  const stepsGroup = document.createElement('div');
  stepsGroup.className = 'form-group';
  const stepsLabel = document.createElement('label');
  stepsLabel.innerHTML = '👨‍🍳 烹饪步骤 <span class="hint">（拖拽排序）</span>';
  stepsGroup.appendChild(stepsLabel);

  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'steps-dynamic';
  stepsContainer.id = 'steps-container';
  stepsGroup.appendChild(stepsContainer);

  let dragSrcEl: HTMLElement | null = null;

  function addStepRow(description = ''): void {
    const row = document.createElement('div');
    row.className = 'step-row';
    row.draggable = true;

    const orderBadge = document.createElement('div');
    orderBadge.className = 'step-order';
    orderBadge.textContent = String(stepsContainer.children.length + 1);
    row.appendChild(orderBadge);

    const textarea = document.createElement('textarea');
    textarea.placeholder = '描述这个步骤...';
    textarea.value = description;
    textarea.rows = 2;
    row.appendChild(textarea);

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '⋮⋮';
    row.appendChild(dragHandle);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-row';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
      updateStepOrder();
    });
    row.appendChild(removeBtn);

    row.addEventListener('dragstart', (e) => {
      dragSrcEl = row;
      row.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'step');
      }
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      dragSrcEl = null;
      updateStepOrder();
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragSrcEl || dragSrcEl === row) return;
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        row.parentNode?.insertBefore(dragSrcEl, row);
      } else {
        row.parentNode?.insertBefore(dragSrcEl, row.nextSibling);
      }
    });

    stepsContainer.appendChild(row);
  }

  function updateStepOrder(): void {
    const rows = stepsContainer.querySelectorAll('.step-row');
    rows.forEach((row, index) => {
      const badge = row.querySelector('.step-order');
      if (badge) badge.textContent = String(index + 1);
    });
  }

  addStepRow();
  addStepRow();
  addStepRow();

  const addStepBtn = document.createElement('button');
  addStepBtn.type = 'button';
  addStepBtn.className = 'btn btn-secondary btn-add-row';
  addStepBtn.innerHTML = '+ 添加步骤';
  addStepBtn.addEventListener('click', () => addStepRow());
  stepsGroup.appendChild(addStepBtn);

  form.appendChild(stepsGroup);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = '取消';
  cancelBtn.addEventListener('click', () => navigateTo('home'));

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = '✓ 保存食谱';

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);
  form.appendChild(actions);

  form.addEventListener('submit', handleAddRecipeSubmit);

  container.appendChild(form);

  return container;
}

function createFormGroup(label: string, renderContent: (wrapper: HTMLDivElement) => void): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  group.appendChild(labelEl);

  const wrapper = document.createElement('div');
  wrapper.className = 'form-input-wrapper';
  renderContent(wrapper);
  group.appendChild(wrapper);

  return group;
}

function handleAddRecipeSubmit(e: SubmitEvent): void {
  e.preventDefault();
  const form = e.target as HTMLFormElement;

  let hasError = false;
  const errors: { input: HTMLElement; message: string }[] = [];

  const formData = new FormData(form);

  const name = (formData.get('name') as string || '').trim();
  if (!name) {
    errors.push({ input: form.elements.namedItem('name') as HTMLElement, message: '请输入食谱名称' });
    hasError = true;
  }

  const coverImage = (formData.get('coverImage') as string || '').trim();
  if (!coverImage) {
    errors.push({ input: form.querySelector('.cover-url-input') as HTMLElement, message: '请提供封面图片' });
    hasError = true;
  }

  const cuisine = formData.get('cuisine') as CuisineType;
  if (!cuisine) {
    hasError = true;
  }

  const difficulty = parseInt(formData.get('difficulty') as string || '3') as DifficultyLevel;

  const ingredientsContainer = document.getElementById('ingredients-container');
  const ingredients: Ingredient[] = [];
  if (ingredientsContainer) {
    const rows = ingredientsContainer.querySelectorAll('.ingredient-row');
    rows.forEach((row) => {
      const nameInput = row.querySelector('[data-field="name"]') as HTMLInputElement;
      const amountInput = row.querySelector('[data-field="amount"]') as HTMLInputElement;
      const categorySelect = row.querySelector('[data-field="category"]') as HTMLSelectElement;

      const ingName = nameInput.value.trim();
      const ingAmount = amountInput.value.trim();
      if (ingName && ingAmount) {
        ingredients.push({
          name: ingName,
          amount: ingAmount,
          category: categorySelect.value as IngredientCategory
        });
      }
    });
  }

  if (ingredients.length === 0) {
    hasError = true;
    errors.push({ input: document.getElementById('ingredients-container') as HTMLElement, message: '请至少添加一种食材' });
  }

  const stepsContainer = document.getElementById('steps-container');
  const steps: RecipeStep[] = [];
  if (stepsContainer) {
    const rows = stepsContainer.querySelectorAll('.step-row');
    rows.forEach((row, index) => {
      const textarea = row.querySelector('textarea') as HTMLTextAreaElement;
      const desc = textarea.value.trim();
      if (desc) {
        steps.push({
          order: index + 1,
          description: desc
        });
      }
    });
  }

  if (steps.length === 0) {
    hasError = true;
    errors.push({ input: document.getElementById('steps-container') as HTMLElement, message: '请至少添加一个步骤' });
  }

  document.querySelectorAll('.shake').forEach(el => el.classList.remove('shake'));
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.error-message').forEach(el => el.remove());

  if (hasError) {
    for (const err of errors) {
      if (err.input) {
        err.input.classList.add('input-error', 'shake');
        const msg = document.createElement('div');
        msg.className = 'error-message';
        msg.textContent = err.message;
        err.input.parentNode?.insertBefore(msg, err.input.nextSibling);
        setTimeout(() => err.input.classList.remove('shake'), 300);
      }
    }
    return;
  }

  try {
    recipeManager.addRecipe({
      name,
      coverImage,
      cuisine,
      difficulty,
      ingredients,
      steps
    });
    navigateTo('home');
  } catch (err) {
    console.error('保存食谱失败:', err);
    alert('保存失败，请重试');
  }
}

function renderMealPlanView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'meal-plan-view';

  const header = document.createElement('div');
  header.className = 'plan-header';

  const title = document.createElement('h1');
  title.innerHTML = '📅 本周餐单规划';
  header.appendChild(title);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-danger';
  clearBtn.innerHTML = '🗑️ 清空整周';
  clearBtn.addEventListener('click', () => {
    if (confirm('确定要清空本周所有餐单吗？')) {
      mealPlanner.clearWeekPlans();
      render();
    }
  });
  header.appendChild(clearBtn);

  container.appendChild(header);

  const tip = document.createElement('div');
  tip.className = 'plan-tip';
  tip.innerHTML = '💡 提示：从左侧食谱库拖拽食谱到右侧对应日期的餐位即可完成规划，同一食谱在同一天不能重复使用。';
  container.appendChild(tip);

  const layout = document.createElement('div');
  layout.className = 'plan-layout';

  const sidebar = document.createElement('aside');
  sidebar.className = 'plan-sidebar';
  sidebar.innerHTML = '<h3>📖 食谱库</h3><p class="sidebar-hint">拖拽食谱到日历</p>';

  const recipeList = document.createElement('div');
  recipeList.className = 'plan-recipe-list';
  const allRecipes = recipeManager.getAllRecipes();
  for (const recipe of allRecipes) {
    const item = document.createElement('div');
    item.className = 'plan-recipe-item';
    item.draggable = true;
    item.innerHTML = `
      <img src="${recipe.coverImage}" alt="${recipe.name}" loading="lazy">
      <span>${recipe.name}</span>
    `;
    item.addEventListener('dragstart', (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', recipe.id);
      }
    });
    recipeList.appendChild(item);
  }
  if (allRecipes.length === 0) {
    recipeList.innerHTML = '<p class="empty-hint">暂无食谱</p>';
  }
  sidebar.appendChild(recipeList);
  layout.appendChild(sidebar);

  const calendar = document.createElement('div');
  calendar.className = 'week-calendar';

  const calendarHeader = document.createElement('div');
  calendarHeader.className = 'calendar-header';
  calendarHeader.innerHTML = '<div class="corner-cell"></div>';
  const weekDates = getWeekDates();
  for (const date of weekDates) {
    const cell = document.createElement('div');
    cell.className = 'day-header';
    const dayLabel = getWeekDayLabel(date);
    const datePart = date.substring(5);
    cell.innerHTML = `<strong>${dayLabel}</strong><span class="date-num">${datePart}</span>`;
    calendarHeader.appendChild(cell);
  }
  calendar.appendChild(calendarHeader);

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
  const weekPlans = mealPlanner.getWeekMealPlans();

  for (const mealType of mealTypes) {
    const row = document.createElement('div');
    row.className = 'calendar-row';

    const mealHeader = document.createElement('div');
    mealHeader.className = `meal-header ${mealType}`;
    mealHeader.innerHTML = `<strong>${MEAL_LABELS[mealType]}</strong>`;
    row.appendChild(mealHeader);

    for (const date of weekDates) {
      const slot = document.createElement('div');
      slot.className = `meal-slot ${mealType}`;
      slot.dataset.date = date;
      slot.dataset.mealType = mealType;

      const recipe = weekPlans[date]?.[mealType];
      if (recipe) {
        const tag = document.createElement('div');
        tag.className = `meal-tag ${mealType} fade-in`;
        tag.innerHTML = `<span>${recipe.name}</span>`;
        tag.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`移除 ${MEAL_LABELS[mealType]} 的 ${recipe.name}？`)) {
            mealPlanner.removeMealPlan(date, mealType);
            render();
          }
        });
        slot.appendChild(tag);
      } else {
        slot.innerHTML = '<span class="slot-placeholder">+ 拖放食谱</span>';
      }

      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });
      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        const recipeId = e.dataTransfer?.getData('text/plain');
        if (recipeId) {
          const success = mealPlanner.addMealPlan(date, mealType, recipeId);
          if (!success) {
            alert('该食谱在今天已有安排，请选择其他食谱！');
          }
          render();
        }
      });

      row.appendChild(slot);
    }

    calendar.appendChild(row);
  }

  layout.appendChild(calendar);
  container.appendChild(layout);

  return container;
}

function renderShoppingListView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'shopping-list-view';

  const title = document.createElement('h1');
  title.innerHTML = '🛒 购物清单';
  container.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'shopping-subtitle';
  subtitle.textContent = '基于本周餐单自动生成，去重后按分类展示';
  container.appendChild(subtitle);

  const startTime = performance.now();
  const autoItems = mealPlanner.generateShoppingList();
  const elapsed = performance.now() - startTime;

  const debugInfo = document.createElement('div');
  debugInfo.className = 'perf-info';
  debugInfo.textContent = `清单生成耗时: ${elapsed.toFixed(1)}ms`;
  container.appendChild(debugInfo);

  const autoSection = document.createElement('section');
  autoSection.className = 'shopping-section';

  if (autoItems.length === 0) {
    autoSection.innerHTML = '<div class="empty-state small"><p>本周暂无餐单，先去规划餐单吧~</p></div>';
  } else {
    const grouped = new Map<string, ShoppingItem[]>();
    for (const item of autoItems) {
      if (!grouped.has(item.category)) {
        grouped.set(item.category, []);
      }
      grouped.get(item.category)!.push(item);
    }

    for (const [category, items] of grouped) {
      const group = document.createElement('div');
      group.className = 'shopping-group';
      group.innerHTML = `<h3>${category} (${items.length})</h3>`;

      const list = document.createElement('ul');
      list.className = 'shopping-items';
      for (const item of items) {
        list.appendChild(renderShoppingItem(item, false));
      }
      group.appendChild(list);
      autoSection.appendChild(group);
    }
  }
  container.appendChild(autoSection);

  const extraSection = document.createElement('section');
  extraSection.className = 'shopping-section';
  extraSection.innerHTML = '<h2>✨ 额外物品</h2>';

  const addForm = document.createElement('form');
  addForm.className = 'add-item-form';
  addForm.innerHTML = `
    <input type="text" name="name" placeholder="物品名称" required>
    <input type="text" name="amount" placeholder="数量/用量">
    <button type="submit" class="btn btn-primary">+ 添加</button>
  `;
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(addForm);
    const name = (formData.get('name') as string).trim();
    const amount = (formData.get('amount') as string).trim() || '适量';
    if (name) {
      mealPlanner.addExtraShoppingItem(name, amount);
      render();
    }
  });
  extraSection.appendChild(addForm);

  const extraItems = mealPlanner.getExtraShoppingItems();
  if (extraItems.length > 0) {
    const list = document.createElement('ul');
    list.className = 'shopping-items';
    for (const item of extraItems) {
      list.appendChild(renderShoppingItem(item, true));
    }
    extraSection.appendChild(list);

    if (extraItems.length > 0) {
      const clearExtraBtn = document.createElement('button');
      clearExtraBtn.className = 'btn btn-secondary btn-sm';
      clearExtraBtn.textContent = '清空额外物品';
      clearExtraBtn.addEventListener('click', () => {
        if (confirm('清空所有额外物品？')) {
          mealPlanner.clearExtraShoppingItems();
          render();
        }
      });
      extraSection.appendChild(clearExtraBtn);
    }
  }
  container.appendChild(extraSection);

  return container;
}

function renderShoppingItem(item: ShoppingItem | ExtraShoppingItem, isExtra: boolean): HTMLElement {
  const li = document.createElement('li');
  li.className = 'shopping-item' + (item.checked ? ' checked' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = item.checked;
  checkbox.addEventListener('change', () => {
    if (isExtra) {
      mealPlanner.toggleExtraShoppingItem(item.id);
    }
    item.checked = checkbox.checked;
    li.classList.toggle('checked', checkbox.checked);
  });

  const label = document.createElement('label');
  label.className = 'item-label';
  label.appendChild(checkbox);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'item-name';
  nameSpan.textContent = item.name;
  label.appendChild(nameSpan);

  const amountSpan = document.createElement('span');
  amountSpan.className = 'item-amount';
  amountSpan.textContent = item.amount;
  label.appendChild(amountSpan);

  li.appendChild(label);

  if (isExtra) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-remove-row';
    deleteBtn.innerHTML = '×';
    deleteBtn.addEventListener('click', () => {
      mealPlanner.removeExtraShoppingItem(item.id);
      render();
    });
    li.appendChild(deleteBtn);
  }

  return li;
}

app();
