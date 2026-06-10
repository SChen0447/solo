import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import RecipeCard from './components/RecipeCard.jsx';
import OrderForm from './components/OrderForm.jsx';
import { Croissant } from 'lucide-react';

const App = () => {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('./api/bakeryApi.js').then(({ getRecipes }) => {
      getRecipes().then(({ data }) => {
        setRecipes(data);
        if (data.length > 0) {
          setSelectedRecipe(data[0]);
        }
        setLoading(false);
      });
    });
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <Croissant size={48} className="loading-icon" />
        <p>正在加载面包坊...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <Croissant size={32} className="header-icon" />
          <h1>面包坊工坊</h1>
        </div>
        <p className="header-subtitle">每日生产计划 · 库存管理 · 客户预订</p>
      </header>

      <main className="main-layout">
        <section className="left-panel">
          <Dashboard
            recipes={recipes}
            onSelectRecipe={setSelectedRecipe}
            selectedRecipeId={selectedRecipe?.id}
          />
        </section>

        <section className="right-panel">
          <RecipeCard recipe={selectedRecipe} />
          <OrderForm
            recipes={recipes}
            onOrderCreated={() => {
              import('./api/bakeryApi.js').then(({ getRecipes }) => {
                getRecipes().then(({ data }) => {
                  setRecipes(data);
                });
              });
            }}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
