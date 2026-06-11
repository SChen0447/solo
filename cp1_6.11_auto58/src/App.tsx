import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom'
import type { Recipe, RecipeList, FavoriteList } from './types'
import RecipeCard from './RecipeCard'
import TimerPanel from './TimerPanel'
import RecipeForm from './RecipeForm'
import { FoodIcon } from './RecipeCard'

const ICON_TYPES = ['noodle', 'salad', 'cake', 'soup', 'steak', 'pasta', 'rice', 'fish', 'bread']

const SAMPLE_RECIPES: RecipeList = [
  {
    id: 'sample-1',
    name: '番茄意面',
    duration: 25,
    difficulty: 2,
    icon: 'pasta',
    createdAt: Date.now() - 100000,
    steps: [
      {
        id: 's1-1',
        description: '烧开一大锅水，加盐后放入意面，按照包装说明煮至八分熟（约比包装时间少1-2分钟），捞出沥干备用，保留一杯煮面水。',
        ingredients: '意大利面 200g、盐 1小勺、清水 适量',
      },
      {
        id: 's1-2',
        description: '番茄顶部划十字，用开水烫30秒后去皮，切成小丁；大蒜切末，洋葱切细丁备用。',
        ingredients: '成熟番茄 3个、大蒜 3瓣、黄洋葱 1/4个',
      },
      {
        id: 's1-3',
        description: '平底锅加橄榄油，小火炒香蒜末和洋葱丁至透明，加入番茄丁翻炒出沙，加少许糖平衡酸度。',
        ingredients: '橄榄油 2大勺、白糖 1/2小勺',
      },
      {
        id: 's1-4',
        description: '倒入少量煮面水，小火慢炖5分钟至酱汁浓稠，放入煮好的意面翻拌均匀，撒上黑胡椒和帕玛森芝士即可装盘。',
        ingredients: '黑胡椒碎 适量、帕玛森芝士粉 适量、新鲜罗勒叶 几片（装饰）',
      },
    ],
  },
  {
    id: 'sample-2',
    name: '日式味噌汤',
    duration: 15,
    difficulty: 1,
    icon: 'soup',
    createdAt: Date.now() - 90000,
    steps: [
      {
        id: 's2-1',
        description: '将海带放入冷水中浸泡30分钟，开火加热至即将沸腾前取出海带（避免汤变粘稠）。',
        ingredients: '干海带（昆布） 10g、清水 800ml',
      },
      {
        id: 's2-2',
        description: '在海带水中加入木鱼花，小火煮2分钟后关火，静置5分钟让鲜味释放，用细滤网滤去木鱼花，即成日式高汤（出汁）。',
        ingredients: '木鱼花 15g',
      },
      {
        id: 's2-3',
        description: '将高汤再次加热，放入切块的嫩豆腐和切薄片的大葱，小火煮2分钟至豆腐温热。',
        ingredients: '嫩豆腐 150g、大葱 1根',
      },
      {
        id: 's2-4',
        description: '关火！将味噌放入小碗中，加入一勺热汤调开后倒回锅中拌匀（味噌不可久煮以免杀死有益菌），撒上葱花即可享用。',
        ingredients: '白味噌 2大勺',
      },
    ],
  },
  {
    id: 'sample-3',
    name: '香煎西冷牛排',
    duration: 30,
    difficulty: 4,
    icon: 'steak',
    createdAt: Date.now() - 80000,
    steps: [
      {
        id: 's3-1',
        description: '牛排提前30分钟从冰箱取出回温，用厨房纸彻底吸干表面水分，两面撒上粗盐和现磨黑胡椒腌制。',
        ingredients: '西冷牛排 250g（约2.5cm厚）、粗盐 1小勺、黑胡椒碎 1/2小勺',
      },
      {
        id: 's3-2',
        description: '铸铁锅大火烧至冒烟，加入少许高烟点油（如牛油果油），放入牛排，每面煎2-3分钟至表面焦化形成美拉德反应层。',
        ingredients: '牛油果油 1大勺',
      },
      {
        id: 's3-3',
        description: '转中小火，加入黄油、整粒大蒜、迷迭香和百里香，倾斜锅子用勺不断将融化的黄油淋在牛排上，约2分钟。',
        ingredients: '无盐黄油 2大勺、大蒜 3瓣（拍扁）、迷迭香 2枝、百里香 3枝',
      },
      {
        id: 's3-4',
        description: '牛排出锅放在温热的盘子上，淋上锅中的黄油香草汁，静置醒肉5分钟（关键步骤！让肉汁重新分布），切片装盘。',
        ingredients: '海盐片 少许装饰',
      },
    ],
  },
  {
    id: 'sample-4',
    name: '经典提拉米苏',
    duration: 45,
    difficulty: 4,
    icon: 'cake',
    createdAt: Date.now() - 70000,
    steps: [
      {
        id: 's4-1',
        description: '蛋黄加细砂糖隔水加热打发至颜色变浅、体积膨胀，离火后继续打至温度下降、质地浓稠顺滑。',
        ingredients: '蛋黄 4个、细砂糖 80g',
      },
      {
        id: 's4-2',
        description: '马斯卡彭奶酪室温软化，用刮刀搅拌至顺滑无颗粒，分三次加入蛋黄糊，每次拌匀后再加。',
        ingredients: '马斯卡彭奶酪 500g',
      },
      {
        id: 's4-3',
        description: '淡奶油加少许糖粉打发至6分发（提起有弯钩），与奶酪糊翻拌均匀成奶酪奶油糊。',
        ingredients: '淡奶油 250ml、糖粉 20g',
      },
      {
        id: 's4-4',
        description: '浓缩咖啡冲好放凉，加入朗姆酒；手指饼干快速蘸取咖啡液（不可久泡），一层饼干一层奶酪糊交替铺入容器，冷藏4小时以上，食用前筛可可粉。',
        ingredients: '浓缩咖啡 200ml、朗姆酒 2大勺（可选）、手指饼干 200g、无糖可可粉 适量',
      },
    ],
  },
  {
    id: 'sample-5',
    name: '凯撒沙拉',
    duration: 10,
    difficulty: 1,
    icon: 'salad',
    createdAt: Date.now() - 60000,
    steps: [
      {
        id: 's5-1',
        description: '生菜叶用手撕成适口大小，用冰水泡5分钟使其爽脆，捞出沥干水分（必须干透否则酱汁挂不住）。',
        ingredients: '罗马生菜 1颗、冰水 适量',
      },
      {
        id: 's5-2',
        description: '面包切丁，平底锅加少许黄油和蒜末小火煎至金黄酥脆，取出放凉备用。',
        ingredients: '法棍面包 1/4根、黄油 15g、大蒜 1瓣（切末）',
      },
      {
        id: 's5-3',
        description: '调凯撒酱汁：蛋黄酱加鳀鱼泥（或盐代替）、柠檬汁、蒜末、第戎芥末、帕玛森芝士粉、黑胡椒，搅拌均匀。',
        ingredients: '蛋黄酱 3大勺、柠檬汁 1大勺、蒜末 1小勺、第戎芥末 1小勺、帕玛森芝士粉 2大勺、黑胡椒 适量、鳀鱼罐头 1条（可选）',
      },
      {
        id: 's5-4',
        description: '将生菜放入大碗，倒入大部分酱汁轻轻翻拌均匀，撒上面包丁和帕玛森芝士片，淋上剩余酱汁即可。',
        ingredients: '帕玛森芝士片 适量装饰',
      },
    ],
  },
  {
    id: 'sample-6',
    name: '扬州炒饭',
    duration: 20,
    difficulty: 2,
    icon: 'rice',
    createdAt: Date.now() - 50000,
    steps: [
      {
        id: 's6-1',
        description: '隔夜米饭提前从冰箱取出，用手或勺子轻轻拨散，每颗米粒尽量分开（关键：米饭要干、要散）。',
        ingredients: '隔夜米饭 2大碗（约300g）',
      },
      {
        id: 's6-2',
        description: '鸡蛋打散加少许盐和料酒，火腿切丁，虾仁去虾线用料酒和盐腌制5分钟，胡萝卜、青豆、玉米粒焯水沥干。',
        ingredients: '鸡蛋 2个、火腿 50g、虾仁 50g、胡萝卜丁 30g、青豆 30g、玉米粒 30g、盐 少许、料酒 1小勺',
      },
      {
        id: 's6-3',
        description: '热锅冷油，倒入蛋液快速划散成蛋花盛出；锅中再加少许油，先炒虾仁和火腿丁出香，加入蔬菜丁翻炒均匀。',
        ingredients: '食用油 3大勺',
      },
      {
        id: 's6-4',
        description: '倒入米饭大火快速翻炒（颠锅！），让每颗米都裹上油香，加入蛋花和葱花，加盐和一点点生抽调味，翻炒均匀出锅。',
        ingredients: '葱花 适量、盐 适量、生抽 1小勺',
      },
    ],
  },
  {
    id: 'sample-7',
    name: '红烧牛肉面',
    duration: 90,
    difficulty: 3,
    icon: 'noodle',
    createdAt: Date.now() - 40000,
    steps: [
      {
        id: 's7-1',
        description: '牛腩切成3cm见方的块，冷水下锅加料酒和姜片焯水5分钟，撇去浮沫后捞出用温水冲洗干净沥干。',
        ingredients: '牛腩 600g、料酒 2大勺、姜片 5片',
      },
      {
        id: 's7-2',
        description: '锅中加少许油，放入冰糖小火炒糖色至枣红色，立即倒入牛腩翻炒均匀上色，加入葱段、姜片、八角、桂皮、香叶、干辣椒炒香。',
        ingredients: '冰糖 30g、葱段 适量、八角 2颗、桂皮 1小段、香叶 3片、干辣椒 3个',
      },
      {
        id: 's7-3',
        description: '沿锅边淋入料酒、生抽、老抽翻炒均匀，加入足量开水没过牛肉，放入番茄块和黄豆酱，大火烧开后转小火炖60-90分钟。',
        ingredients: '料酒 2大勺、生抽 3大勺、老抽 1大勺、番茄 1个、黄豆酱 1大勺',
      },
      {
        id: 's7-4',
        description: '另起锅煮面条和青菜，将煮好的面捞入碗中，淋上炖好的红烧牛肉和汤汁，撒上香菜和葱花即可。',
        ingredients: '面条 2人份、小青菜 适量、香菜 适量、葱花 适量',
      },
    ],
  },
  {
    id: 'sample-8',
    name: '清蒸鲈鱼',
    duration: 20,
    difficulty: 2,
    icon: 'fish',
    createdAt: Date.now() - 30000,
    steps: [
      {
        id: 's8-1',
        description: '鲈鱼处理干净，鱼身两面划3刀，用厨房纸吸干水分，内外抹少许盐和料酒腌制10分钟，鱼肚内塞入葱段和姜片。',
        ingredients: '新鲜鲈鱼 1条（约500g）、盐 1小勺、料酒 1大勺、葱段 适量、姜片 适量',
      },
      {
        id: 's8-2',
        description: '盘子上放两根筷子架起鱼（让蒸汽循环），水烧开后将鱼放入蒸锅，大火蒸8-10分钟（根据鱼的大小调整）。',
        ingredients: '清水 适量',
      },
      {
        id: 's8-3',
        description: '蒸好后倒掉盘中多余的腥水，去掉筷子，鱼身上铺上切好的葱姜丝和红椒丝（配色）。',
        ingredients: '大葱丝 适量、姜丝 适量、红椒丝 少许',
      },
      {
        id: 's8-4',
        description: '淋上蒸鱼豉油，烧一勺热油（冒烟），趁热浇在葱姜丝上激发出香味，撒上葱花点缀即可上桌。',
        ingredients: '蒸鱼豉油 2大勺、食用油 2大勺',
      },
    ],
  },
]

function StarRatingSmall({ difficulty }: { difficulty: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: i <= difficulty ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : '#E0D5C7',
            boxShadow: i <= difficulty ? '0 0 4px rgba(255, 215, 0, 0.4)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

interface RecipeDetailProps {
  recipe: Recipe
  onClose: () => void
}

function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const iconType = ICON_TYPES.findIndex((_, i) => i === SAMPLE_RECIPES.findIndex(r => r.id === recipe.id)) >= 0
    ? ICON_TYPES[SAMPLE_RECIPES.findIndex(r => r.id === recipe.id) % ICON_TYPES.length]
    : 'noodle'

  const actualIconType = recipe.icon && ICON_TYPES.includes(recipe.icon) ? recipe.icon : iconType

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  return (
    <div className="recipe-detail-overlay" onClick={onClose}>
      <div className="recipe-detail-panel" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="recipe-detail-close" onClick={onClose} aria-label="关闭详情">
          ✕
        </button>

        <div className="recipe-detail-left">
          <div className="recipe-detail-header">
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '16px 6px 16px 6px',
                  background: 'linear-gradient(135deg, #FDF4E8 0%, #FFF8F0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid #E8D9C7',
                }}
              >
                <div style={{ transform: 'scale(0.9)' }}>
                  <FoodIcon iconType={actualIconType} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h2 className="recipe-detail-title">{recipe.name}</h2>
              </div>
            </div>
            <div className="recipe-detail-info">
              <div className="recipe-detail-info-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                <span className="recipe-detail-info-label">烹饪时长：</span>
                {recipe.duration} 分钟
              </div>
              <div className="recipe-detail-info-item">
                <span className="recipe-detail-info-label">难度：</span>
                <StarRatingSmall difficulty={recipe.difficulty} />
              </div>
              <div className="recipe-detail-info-item">
                <span className="recipe-detail-info-label">步骤数：</span>
                {recipe.steps.length} 步
              </div>
              <div className="recipe-detail-info-item">
                <span className="recipe-detail-info-label">进度：</span>
                {completedSteps.size}/{recipe.steps.length}
              </div>
            </div>
          </div>

          <div className="recipe-detail-steps">
            <h3 className="recipe-detail-steps-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1" fill="currentColor" />
                <circle cx="4" cy="12" r="1" fill="currentColor" />
                <circle cx="4" cy="18" r="1" fill="currentColor" />
              </svg>
              烹饪步骤
              <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                点击圆形编号标记完成 ✓
              </span>
            </h3>

            {recipe.steps.map((step, idx) => {
              const isCompleted = completedSteps.has(step.id)
              return (
                <div
                  key={step.id}
                  className={`recipe-step${isCompleted ? ' completed' : ''}`}
                >
                  <div
                    className="recipe-step-number"
                    onClick={() => toggleStep(step.id)}
                    title={isCompleted ? '取消标记完成' : '标记为已完成'}
                  >
                    {isCompleted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="recipe-step-content">
                    <div className="recipe-step-description">{step.description}</div>
                    {step.ingredients && (
                      <div className="recipe-step-ingredients">
                        <div className="recipe-step-ingredients-label">📋 本步材料</div>
                        <div className="recipe-step-ingredients-text">{step.ingredients}</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="recipe-detail-right">
          <TimerPanel initialDuration={recipe.duration * 60} />
        </div>
      </div>
    </div>
  )
}

interface HomePageProps {
  recipes: RecipeList
  favorites: FavoriteList
  onToggleFavorite: (id: string) => void
  onOpenRecipe: (recipe: Recipe) => void
}

function HomePage({ recipes, favorites, onToggleFavorite, onOpenRecipe }: HomePageProps) {
  const sortedRecipes = [...recipes].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="main-container">
      <div className="page-header">
        <h1 className="page-title">今日吃什么？</h1>
        <p className="page-subtitle">精选 {recipes.length} 道家常菜谱，开启你的厨房之旅</p>
      </div>

      {sortedRecipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍳</div>
          <h3 className="empty-state-title">还没有菜谱</h3>
          <p className="empty-state-text">
            点击右上角"添加菜谱"按钮，记录你的第一道拿手好菜吧！
          </p>
        </div>
      ) : (
        <div className="recipe-grid">
          {sortedRecipes.map((recipe, idx) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={favorites.includes(recipe.id)}
              onFavoriteToggle={onToggleFavorite}
              onClick={onOpenRecipe}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FavoritesPageProps {
  recipes: RecipeList
  favorites: FavoriteList
  onToggleFavorite: (id: string) => void
  onOpenRecipe: (recipe: Recipe) => void
}

function FavoritesPage({ recipes, favorites, onToggleFavorite, onOpenRecipe }: FavoritesPageProps) {
  const favoriteRecipes = recipes
    .filter((r) => favorites.includes(r.id))
    .sort((a, b) => {
      const aIdx = favorites.indexOf(a.id)
      const bIdx = favorites.indexOf(b.id)
      return aIdx - bIdx
    })

  const originalIndex = (recipeId: string) => recipes.findIndex((r) => r.id === recipeId)

  return (
    <div className="main-container">
      <div className="page-header">
        <h1 className="page-title">我的收藏 ♥</h1>
        <p className="page-subtitle">
          {favoriteRecipes.length > 0
            ? `已收藏 ${favoriteRecipes.length} 道心头好，随时可以开做`
            : '收藏你喜欢的菜谱，下次烹饪不用再找啦'}
        </p>
      </div>

      {favoriteRecipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ background: 'rgba(230, 57, 70, 0.08)' }}>
            ♡
          </div>
          <h3 className="empty-state-title">收藏夹空空如也</h3>
          <p className="empty-state-text">
            在首页每张菜谱卡片的右下角有个小爱心，点击它就可以收藏你喜欢的菜谱了。
          </p>
        </div>
      ) : (
        <div className="favorites-masonry">
          {favoriteRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={true}
              onFavoriteToggle={onToggleFavorite}
              onClick={onOpenRecipe}
              index={originalIndex(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<RecipeList>(SAMPLE_RECIPES)
  const [favorites, setFavorites] = useState<FavoriteList>(['sample-3', 'sample-4', 'sample-7'])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null)
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionState, setTransitionState] = useState<'entering' | 'idle'>('idle')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionState('entering')
      const timer = setTimeout(() => {
        setDisplayLocation(location)
        setTransitionState('idle')
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [location, displayLocation])

  const handleToggleFavorite = (recipeId: string) => {
    setFavorites((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    )
  }

  const handleOpenRecipe = (recipe: Recipe) => {
    setDetailRecipe(recipe)
  }

  const handleCloseRecipe = () => {
    setDetailRecipe(null)
  }

  const handleAddRecipe = (newRecipe: Recipe) => {
    setRecipes((prev) => [newRecipe, ...prev])
    setTimeout(() => {
      navigate('/')
    }, 100)
  }

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          <div className="navbar-brand-icon">🍴</div>
          厨房食谱
        </NavLink>

        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
            全部菜谱
          </NavLink>
          <NavLink
            to="/favorites"
            className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            我的收藏
            {favorites.length > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  padding: '1px 7px',
                  borderRadius: 10,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: location.pathname === '/favorites' ? 'rgba(255,255,255,0.25)' : '#C0582E',
                  color: location.pathname === '/favorites' ? 'white' : 'white',
                }}
              >
                {favorites.length}
              </span>
            )}
          </NavLink>
          <button
            className="navbar-add-btn"
            onClick={() => setIsFormOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            添加菜谱
          </button>
        </div>
      </nav>

      <main
        style={{
          opacity: transitionState === 'entering' ? 0 : 1,
          transform: transitionState === 'entering'
            ? (location.pathname === '/' ? 'translateX(-30px)' : 'translateX(30px)')
            : 'translateX(0)',
          transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
        }}
      >
        <Routes location={displayLocation}>
          <Route
            path="/"
            element={
              <HomePage
                recipes={recipes}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onOpenRecipe={handleOpenRecipe}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <FavoritesPage
                recipes={recipes}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onOpenRecipe={handleOpenRecipe}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <RecipeForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddRecipe}
      />

      {detailRecipe && (
        <RecipeDetail recipe={detailRecipe} onClose={handleCloseRecipe} />
      )}
    </>
  )
}
