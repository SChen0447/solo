import { useState, useEffect, useCallback } from 'react';
import type { Spice, Recipe, FlavorValues } from './types';
import SpiceSelector from './components/SpiceSelector';
import Grinder from './components/Grinder';
import FlavorChart from './components/FlavorChart';
import RecipeList from './components/RecipeList';

function App() {
  const [spices, setSpices] = useState<Spice[]>([]);
  const [selectedSpice, setSelectedSpice] = useState<Spice | null>(null);
  const [grindDuration, setGrindDuration] = useState(30);
  const [grindSpeed, setGrindSpeed] = useState(300);
  const [isGrinding, setIsGrinding] = useState(false);
  const [grindTime, setGrindTime] = useState(0);
  const [flavorValues, setFlavorValues] = useState<FlavorValues | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/spices')
      .then(res => res.json())
      .then(data => {
        setSpices(data);
        if (data.length > 0) {
          setSelectedSpice(data[0]);
        }
      })
      .catch(err => console.error('加载香料数据失败:', err));
  }, []);

  useEffect(() => {
    fetch('http://localhost:3001/api/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data))
      .catch(err => console.error('加载配方列表失败:', err));
  }, []);

  useEffect(() => {
    if (!isGrinding || !selectedSpice) return;

    const interval = setInterval(() => {
      setGrindTime(prev => {
        const newTime = prev + 0.1;
        if (newTime >= grindDuration) {
          setIsGrinding(false);
          return grindDuration;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isGrinding, grindDuration, selectedSpice]);

  const calculateFlavors = useCallback(() => {
    if (!selectedSpice) return null;
    
    const durationFactor = grindTime / 120;
    const speedFactor = (grindSpeed - 100) / 900;
    
    const base = selectedSpice.baseFlavors;
    return {
      spicy: Math.min(100, Math.round(base.spicy * (1 + durationFactor * 0.4))),
      sweet: Math.min(100, Math.round(base.sweet * (1 + durationFactor * 0.2))),
      warm: Math.min(100, Math.round(base.warm * (1 + speedFactor * 0.5))),
      woody: Math.min(100, Math.round(base.woody * (1 + durationFactor * 0.15))),
      floral: Math.min(100, Math.round(base.floral * (1 - speedFactor * 0.1))),
      herbaceous: Math.min(100, Math.round(base.herbaceous * (1 - durationFactor * 0.2)))
    };
  }, [selectedSpice, grindTime, grindSpeed]);

  useEffect(() => {
    if (grindTime > 0 || flavorValues) {
      setFlavorValues(calculateFlavors());
    }
  }, [grindTime, grindSpeed, selectedSpice, calculateFlavors, flavorValues]);

  const handleSpiceSelect = (spice: Spice) => {
    setSelectedSpice(spice);
    setGrindTime(0);
    setFlavorValues(null);
    setIsGrinding(false);
  };

  const handleStartGrind = () => {
    if (grindDuration <= 0) return;
    setGrindTime(0);
    setIsGrinding(true);
  };

  const handleStopGrind = () => {
    setIsGrinding(false);
    setFlavorValues(calculateFlavors());
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim() || !selectedSpice || !flavorValues) return;

    try {
      const response = await fetch('http://localhost:3001/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: recipeName.trim(),
          spiceId: selectedSpice.id,
          grindDuration,
          grindSpeed,
          flavorValues,
        }),
      });

      if (response.ok) {
        const newRecipe = await response.json();
        setRecipes(prev => [newRecipe, ...prev].slice(0, 10));
        setRecipeName('');
      }
    } catch (err) {
      console.error('保存配方失败:', err);
    }
  };

  const handleLoadRecipe = (recipe: Recipe) => {
    const spice = spices.find(s => s.id === recipe.spiceId);
    if (spice) {
      setSelectedSpice(spice);
      setGrindDuration(recipe.grindDuration);
      setGrindSpeed(recipe.grindSpeed);
      setGrindTime(recipe.grindDuration);
      setFlavorValues(recipe.flavorValues);
      setIsGrinding(false);
    }
  };

  const handleFlavorAdjust = (flavor: keyof FlavorValues, value: number) => {
    if (!flavorValues) return;
    setFlavorValues(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [flavor]: Math.max(0, Math.min(100, value))
      };
    });
  };

  const aromaIntensity = Math.round(
    (grindTime / 120) * 50 + 
    ((grindSpeed - 100) / 900) * 50
  );

  return (
    <div className="app-container">
      <div className="left-panel">
        <h2 className="panel-title">香料选择</h2>
        <SpiceSelector
          spices={spices}
          selectedSpice={selectedSpice}
          onSelect={handleSpiceSelect}
        />
      </div>

      <div className="center-panel">
        <h2 className="panel-title">香料研磨台</h2>
        
        {selectedSpice && (
          <>
            <Grinder
              spice={selectedSpice}
              grindDuration={grindDuration}
              grindSpeed={grindSpeed}
              isGrinding={isGrinding}
              grindTime={grindTime}
              aromaIntensity={aromaIntensity}
            />

            <div className="controls-section">
              <div className="control-group">
                <div className="control-label">
                  <span>研磨时长</span>
                  <span className="control-value">{grindDuration} 秒</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={grindDuration}
                  onChange={(e) => setGrindDuration(Number(e.target.value))}
                  className="slider"
                  disabled={isGrinding}
                />
              </div>

              <div className="control-group">
                <div className="control-label">
                  <span>转速</span>
                  <span className="control-value">{grindSpeed} 转/分</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="10"
                  value={grindSpeed}
                  onChange={(e) => setGrindSpeed(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="button-group">
                {!isGrinding ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleStartGrind}
                    disabled={grindDuration <= 0}
                  >
                    开始研磨
                  </button>
                ) : (
                  <button className="btn" onClick={handleStopGrind}>
                    停止研磨
                  </button>
                )}
              </div>

              <div className="aroma-label">
                香味强度
                <div className="aroma-intensity">{aromaIntensity}</div>
              </div>
            </div>

            {flavorValues && (
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <h3 className="panel-title">风味雷达图</h3>
                <FlavorChart
                  values={flavorValues}
                  spiceColor={selectedSpice.color}
                  onAdjust={handleFlavorAdjust}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="right-panel">
        <h2 className="panel-title">配方收藏</h2>
        
        <div className="recipe-input-section">
          <input
            type="text"
            placeholder="输入配方名称..."
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value.slice(0, 20))}
            className="recipe-input"
            maxLength={20}
          />
          <button 
            className="btn btn-primary" 
            onClick={handleSaveRecipe}
            disabled={!recipeName.trim() || !flavorValues}
            style={{ flex: 'none', padding: '10px 15px' }}
          >
            保存
          </button>
        </div>

        <RecipeList
          recipes={recipes}
          spices={spices}
          onLoad={handleLoadRecipe}
        />
      </div>
    </div>
  );
}

export default App;
