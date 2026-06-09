import { useState, useEffect, useMemo } from 'react';
import type { Recipe, Difficulty } from './types';
import { api } from './api';
import RecipeCard from './components/RecipeCard';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import SearchFilter from './components/SearchFilter';

type TimeFilter = 'all' | '7days' | '30days';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    try {
      const data = await api.getRecipes();
      setRecipes(data);
    } catch (e) {
      console.error('加载配方失败', e);
    }
  }

  const filteredRecipes = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    return recipes.filter((r) => {
      if (debouncedSearch && !r.name.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        return false;
      }
      if (difficultyFilter !== 'all' && r.difficulty !== difficultyFilter) {
        return false;
      }
      if (timeFilter !== 'all') {
        const created = new Date(r.createdAt).getTime();
        if (timeFilter === '7days' && now - created > sevenDays) return false;
        if (timeFilter === '30days' && now - created > thirtyDays) return false;
      }
      return true;
    });
  }, [recipes, debouncedSearch, difficultyFilter, timeFilter]);

  async function handleRecipeCreated() {
    setShowForm(false);
    await loadRecipes();
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
        onRecipeUpdated={() => loadRecipes()}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="title">🧁 我的烘焙日志</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + 新建配方
          </button>
        </div>
        <SearchFilter
          searchText={searchText}
          onSearchChange={setSearchText}
          difficultyFilter={difficultyFilter}
          onDifficultyChange={setDifficultyFilter}
          timeFilter={timeFilter}
          onTimeChange={setTimeFilter}
        />
      </header>

      <main className="main">
        {filteredRecipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍰</div>
            <p>还没有配方，点击"新建配方"开始记录吧！</p>
          </div>
        ) : (
          <div className="recipe-grid">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => setSelectedRecipe(recipe)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <RecipeForm
          onClose={() => setShowForm(false)}
          onSubmit={handleRecipeCreated}
        />
      )}
    </div>
  );
}
