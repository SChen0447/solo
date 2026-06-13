import React, { useState } from 'react';
import axios from 'axios';
import UploadCard from '../components/UploadCard';
import MenuCard from '../components/MenuCard';
import { Ingredient, Cuisine, Dish, Season, UploadResponse, MenuResponse } from '../types';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../context/AuthContext';
import './HomePage.scss';

const seasonOptions: { value: Season; label: string; icon: string }[] = [
  { value: 'spring', label: '春季', icon: '🌸' },
  { value: 'summer', label: '夏季', icon: '☀️' },
  { value: 'autumn', label: '秋季', icon: '🍂' },
  { value: 'winter', label: '冬季', icon: '❄️' },
];

function HomePage() {
  const [season, setSeason] = useState<Season>('spring');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [cuisine, setCuisine] = useState<Cuisine | null>(null);
  const [menu, setMenu] = useState<Dish[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [showIngredients, setShowIngredients] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { saveMenu } = useMenu();
  const { isLoggedIn } = useAuth();

  const handleUploadSuccess = (response: UploadResponse) => {
    setIngredients(response.ingredients);
    setCuisine(response.cuisine);
    setUploadedImage(response.imageUrl);
    setShowIngredients(true);
    generateMenu(response.ingredients, response.cuisine);
  };

  const generateMenu = async (ings: Ingredient[], cui: Cuisine) => {
    setIsGenerating(true);
    setShowMenu(false);
    
    try {
      const response = await axios.post<MenuResponse>('/api/menu', {
        season,
        ingredients: ings,
        cuisine: cui.name
      });
      
      if (response.data.success) {
        setMenu(response.data.menu);
        setShowMenu(true);
        
        if (isLoggedIn) {
          saveMenu(
            response.data.menu,
            season,
            response.data.cuisine,
            uploadedImage,
            ings
          );
        }
      }
    } catch (error) {
      console.error('生成菜单失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSeasonChange = (newSeason: Season) => {
    setSeason(newSeason);
    if (ingredients.length > 0 && cuisine) {
      generateMenu(ingredients, cuisine);
    }
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <h1 className="hero-title">探索时令美食</h1>
        <p className="hero-subtitle">上传一张食物照片，AI为您生成专属时令菜单</p>
      </section>

      <section className="upload-section">
        <UploadCard 
          onUploadStart={() => setIsUploading(true)}
          onUploadSuccess={handleUploadSuccess}
          onUploadEnd={() => setIsUploading(false)}
        />
      </section>

      {showIngredients && ingredients.length > 0 && (
        <section className="ingredients-section" style={{ animationDelay: '0.1s' }}>
          <div className="section-header">
            <h2>识别结果</h2>
            {cuisine && (
              <span className="cuisine-tag">
                {cuisine.icon} {cuisine.name} · {cuisine.description}
              </span>
            )}
          </div>
          <div className="ingredient-tags">
            {ingredients.map((ing, index) => (
              <span 
                key={ing.name} 
                className="ingredient-tag"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="tag-icon">{ing.icon}</span>
                <span className="tag-name">{ing.name}</span>
                <span className="tag-category">{ing.category}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {(showIngredients || isGenerating || showMenu) && (
        <section className="season-section">
          <div className="season-selector">
            <span className="season-label">选择季节：</span>
            <div className="season-buttons">
              {seasonOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`season-btn ${season === opt.value ? 'active' : ''}`}
                  onClick={() => handleSeasonChange(opt.value)}
                  disabled={isGenerating}
                >
                  <span className="season-icon">{opt.icon}</span>
                  <span className="season-name">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {isGenerating && (
        <section className="loading-section">
          <div className="loading-content">
            <div className="loading-icons">
              <span className="loading-icon" style={{ animationDelay: '0s' }}>🥕</span>
              <span className="loading-icon" style={{ animationDelay: '0.2s' }}>🍅</span>
              <span className="loading-icon" style={{ animationDelay: '0.4s' }}>🥬</span>
              <span className="loading-icon" style={{ animationDelay: '0.6s' }}>🌽</span>
              <span className="loading-icon" style={{ animationDelay: '0.8s' }}>🍆</span>
            </div>
            <p className="loading-text">正在为您精心搭配时令菜单...</p>
          </div>
        </section>
      )}

      {showMenu && menu.length > 0 && (
        <section className="menu-section">
          <div className="section-header">
            <h2>为您推荐的时令菜单</h2>
            <span className="menu-count">共 {menu.length} 道菜</span>
          </div>
          <div className="menu-grid">
            {menu.map((dish, index) => (
              <div 
                key={dish.id} 
                className="menu-item-wrapper"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <MenuCard dish={dish} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;
