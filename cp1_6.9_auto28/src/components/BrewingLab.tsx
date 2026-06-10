import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import type { Material, Recipe } from '../shared/types';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
}

interface Smoke {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
}

export default function BrewingLab() {
  const { state, dispatch, userId, showToast } = useApp();
  const [cauldronMaterials, setCauldronMaterials] = useState<Material[]>([]);
  const [matchedRecipe, setMatchedRecipe] = useState<Recipe | null>(null);
  const [isBrewing, setIsBrewing] = useState(false);
  const [brewProgress, setBrewProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const [liquidColor, setLiquidColor] = useState('#2a1a3a');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const smokesRef = useRef<Smoke[]>([]);
  const bubbleIdRef = useRef(0);
  const smokeIdRef = useRef(0);
  const animationRef = useRef<number>();
  const stirringRef = useRef(false);
  const stirAngleRef = useRef(0);
  const brewStartTimeRef = useRef(0);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 42, g: 26, b: 58 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return (
      '#' +
      [r, g, b]
        .map((x) => Math.min(255, Math.max(0, Math.round(x))).toString(16).padStart(2, '0'))
        .join('')
    );
  };

  const mixColors = useCallback((materials: Material[]) => {
    if (materials.length === 0) return '#2a1a3a';
    const colors = materials.map((m) => hexToRgb(m.color));
    const avg = colors.reduce(
      (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
      { r: 0, g: 0, b: 0 }
    );
    return rgbToHex(avg.r / colors.length, avg.g / colors.length, avg.b / colors.length);
  }, []);

  useEffect(() => {
    const mixed = mixColors(cauldronMaterials);
    setLiquidColor(mixed);
  }, [cauldronMaterials, mixColors]);

  useEffect(() => {
    if (cauldronMaterials.length === 0 || state.recipes.length === 0) {
      setMatchedRecipe(null);
      setIsGlowing(false);
      return;
    }
    const sortedInput = [...cauldronMaterials.map((m) => m.id)].sort();
    const found = state.recipes.find((r) => {
      const sortedRecipe = [...r.materials].sort();
      if (sortedInput.length !== sortedRecipe.length) return false;
      return sortedInput.every((m, i) => m === sortedRecipe[i]);
    });
    setMatchedRecipe(found || null);
    setIsGlowing(!!found);
  }, [cauldronMaterials, state.recipes]);

  const spawnBubble = useCallback((color: string) => {
    const bubble: Bubble = {
      id: bubbleIdRef.current++,
      x: 60 + Math.random() * 80,
      y: 160 + Math.random() * 20,
      size: 3 + Math.random() * 8,
      color,
      opacity: 0.8,
      vy: -0.8 - Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.5,
      life: 0,
      maxLife: 120,
    };
    bubblesRef.current.push(bubble);
  }, []);

  const spawnSmoke = useCallback(() => {
    const smoke: Smoke = {
      id: smokeIdRef.current++,
      x: 80 + Math.random() * 40,
      y: 40 + Math.random() * 20,
      size: 15 + Math.random() * 25,
      opacity: 0.6,
      vy: -0.3 - Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 180,
    };
    smokesRef.current.push(smoke);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bubblesRef.current = bubblesRef.current.filter((b) => {
        b.life++;
        b.x += b.vx;
        b.y += b.vy;
        b.size += 0.05;
        b.opacity = 0.8 * (1 - b.life / b.maxLife);
        if (b.life >= b.maxLife) return false;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = b.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      smokesRef.current = smokesRef.current.filter((s) => {
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.size += 0.2;
        const progress = s.life / s.maxLife;
        s.opacity = 0.6 * (1 - progress);
        if (s.life >= s.maxLife) return false;
        const r = Math.round(74 - progress * 74);
        const g = Math.round(0 + progress * 26);
        const b = Math.round(96 - progress * 38);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${s.opacity})`;
        ctx.fill();
        return true;
      });

      if (stirringRef.current || isBrewing) {
        stirAngleRef.current += isBrewing ? 0.15 : 0.08;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isBrewing]);

  let bubbleInterval: ReturnType<typeof setInterval> | null = null;
  useEffect(() => {
    if (cauldronMaterials.length > 0 || isBrewing) {
      bubbleInterval = setInterval(() => {
        if (cauldronMaterials.length > 0) {
          const mat = cauldronMaterials[Math.floor(Math.random() * cauldronMaterials.length)];
          spawnBubble(mat.color);
        }
        if (isBrewing && Math.random() > 0.4) {
          spawnSmoke();
        }
      }, 150);
    }
    return () => {
      if (bubbleInterval) clearInterval(bubbleInterval);
    };
  }, [cauldronMaterials, isBrewing, spawnBubble, spawnSmoke]);

  const handleDragStart = (e: React.DragEvent, material: Material) => {
    e.dataTransfer.setData('material-id', material.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const matId = e.dataTransfer.getData('material-id');
    const material = state.materials.find((m) => m.id === matId);
    if (material && !isBrewing) {
      setCauldronMaterials((prev) => [...prev, material]);
      stirringRef.current = true;
      setTimeout(() => {
        stirringRef.current = false;
      }, 2000);
    }
  };

  const handleBrew = async () => {
    if (!matchedRecipe || isBrewing || cauldronMaterials.length === 0) {
      if (!matchedRecipe) showToast('材料组合不匹配任何配方！', 'error');
      return;
    }
    setIsBrewing(true);
    setBrewProgress(0);
    brewStartTimeRef.current = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - brewStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 5000) * 100);
      setBrewProgress(progress);
      if (progress >= 100) clearInterval(progressInterval);
    }, 50);

    setTimeout(async () => {
      clearInterval(progressInterval);
      try {
        const res = await fetch('/api/brew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materials: cauldronMaterials.map((m) => m.id),
            userId,
          }),
        });
        const data = await res.json();
        if (data.success && data.potion) {
          dispatch({ type: 'ADD_POTION', payload: data.potion });
          showToast(`成功酿造 ${data.potion.name}！`, 'success');
          setCauldronMaterials([]);
          setBrewProgress(0);
        } else {
          showToast(data.message || '酿造失败', 'error');
        }
      } catch (e) {
        showToast('酿造请求失败', 'error');
      } finally {
        setIsBrewing(false);
      }
    }, 5000);
  };

  const handleClearCauldron = () => {
    if (!isBrewing) {
      setCauldronMaterials([]);
    }
  };

  const rarityLabels: Record<string, string> = {
    common: '普通',
    uncommon: '优秀',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
  };

  return (
    <div className="main-container">
      <div className="content-area">
        <h1 style={{ textAlign: 'center', marginBottom: 16 }}>⚗️ 炼金酿造工坊</h1>

        <div style={{ display: 'flex', gap: 200, alignItems: 'flex-start', justifyContent: 'center' }}>
          <div
            style={{
              width: 220,
              background: 'rgba(42, 26, 58, 0.6)',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,134,11,0.3)',
            }}
          >
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>📦 魔法材料</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}
            >
              {state.materials.map((mat) => (
                <div
                  key={mat.id}
                  draggable={!isBrewing}
                  onDragStart={(e) => handleDragStart(e, mat)}
                  style={{
                    background: 'rgba(26, 10, 42, 0.8)',
                    borderRadius: 8,
                    padding: 10,
                    textAlign: 'center',
                    cursor: isBrewing ? 'not-allowed' : 'grab',
                    border: `2px solid ${mat.rarityColor}`,
                    transition: 'all 0.3s ease',
                    userSelect: 'none',
                    opacity: isBrewing ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isBrewing) {
                      (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  }}
                >
                  <div style={{ fontSize: 28 }}>{mat.icon}</div>
                  <div style={{ fontSize: 14, marginTop: 4, color: '#eaddc0' }}>{mat.name}</div>
                  <div style={{ fontSize: 11, color: mat.rarityColor, marginTop: 2 }}>
                    {rarityLabels[mat.rarity]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              position: 'relative',
            }}
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                width: 200,
                height: 240,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 200,
                  height: 240,
                  background: `linear-gradient(145deg, #3a3a3a 0%, #5a4a3a 50%, #3a3a3a 100%)`,
                  borderRadius: '50% 50% 45% 45% / 40% 40% 60% 60%',
                  border: dragOver ? '3px solid #ffd700' : '3px solid #2a2a2a',
                  boxShadow: isGlowing
                    ? '0 0 20px #ffd700, 0 0 40px rgba(255,215,0,0.5), inset 0 -10px 30px rgba(0,0,0,0.5)'
                    : '0 8px 20px rgba(0,0,0,0.6), inset 0 -10px 30px rgba(0,0,0,0.5)',
                  animation: isGlowing ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '15%',
                    left: '10%',
                    width: '80%',
                    height: '70%',
                    background: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 16px)`,
                    pointerEvents: 'none',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    bottom: '8%',
                    left: '10%',
                    width: '80%',
                    height: cauldronMaterials.length > 0 ? `${30 + cauldronMaterials.length * 8}%` : '10%',
                    background: `radial-gradient(ellipse at center, ${liquidColor} 0%, ${liquidColor}aa 70%, transparent 100%)`,
                    borderRadius: '50%',
                    transform: isBrewing || stirringRef.current
                      ? `translateY(${Math.sin(stirAngleRef.current) * 3}px) rotate(${stirAngleRef.current}rad)`
                      : 'none',
                    transition: 'height 0.5s ease, background 0.8s ease',
                    boxShadow: `inset 0 0 30px rgba(0,0,0,0.4)`,
                  }}
                />

                <canvas
                  ref={canvasRef}
                  width={200}
                  height={240}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            {cauldronMaterials.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280 }}>
                {cauldronMaterials.map((mat, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 20,
                      padding: '4px 8px',
                      background: 'rgba(42,26,58,0.8)',
                      borderRadius: 6,
                      border: `1px solid ${mat.color}`,
                    }}
                    title={mat.name}
                  >
                    {mat.icon}
                  </span>
                ))}
              </div>
            )}

            {isBrewing && (
              <div style={{ width: 200 }}>
                <div
                  style={{
                    width: '100%',
                    height: 12,
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid rgba(184,134,11,0.5)',
                  }}
                >
                  <div
                    style={{
                      width: `${brewProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ff7700 0%, #ffaa00 100%)',
                      transition: 'width 0.1s linear',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'center', marginTop: 6, fontSize: 14, color: '#ffaa00' }}>
                  酿造中... {Math.round(brewProgress)}%
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleBrew}
                disabled={!matchedRecipe || isBrewing || cauldronMaterials.length === 0}
                style={{
                  padding: '14px 32px',
                  fontSize: 18,
                  background: matchedRecipe
                    ? 'linear-gradient(135deg, #ff7700 0%, #b8860b 100%)'
                    : undefined,
                }}
              >
                {isBrewing ? '🔥 酿造中...' : '🔥 开始酿造'}
              </button>
              <button onClick={handleClearCauldron} disabled={isBrewing} style={{ background: 'linear-gradient(135deg, #8b0000 0%, #5a0000 100%)' }}>
                🗑️ 清空
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="side-panel">
        <div
          style={{
            background: '#eaddc0',
            borderRadius: 8,
            padding: 20,
            color: '#3a2a1a',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            position: 'relative',
            minHeight: 'calc(100vh - 180px)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 20,
              background: 'linear-gradient(180deg, #d4c4a0 0%, #eaddc0 100%)',
              borderRadius: '8px 8px 0 0',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 20,
              background: 'linear-gradient(0deg, #d4c4a0 0%, #eaddc0 100%)',
              borderRadius: '0 0 8px 8px',
            }}
          />
          <h2 style={{ color: '#5a3a1a', textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
            📜 炼金古卷
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {state.recipes.map((recipe) => {
              const neededMats = recipe.materials.map(
                (id) => state.materials.find((m) => m.id === id)
              );
              const hasAll = cauldronMaterials.length === recipe.materials.length &&
                recipe.materials.every((id) =>
                  cauldronMaterials.some((cm) => cm.id === id)
                );
              return (
                <div
                  key={recipe.id}
                  style={{
                    background: hasAll ? 'rgba(184,134,11,0.25)' : 'rgba(90,58,26,0.08)',
                    padding: 12,
                    borderRadius: 6,
                    border: hasAll ? '2px solid #b8860b' : '1px solid rgba(90,58,26,0.3)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <h3 style={{ margin: '0 0 6px 0', color: hasAll ? '#8b6508' : '#5a3a1a' }}>
                    {recipe.name}
                    {hasAll && <span style={{ marginLeft: 8, color: '#2d6a2d' }}>✓</span>}
                  </h3>
                  <p style={{ fontSize: 13, margin: '0 0 8px 0', color: '#5a4a3a' }}>
                    {recipe.description}
                  </p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>材料:</span>
                    {neededMats.map((mat, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 18,
                          opacity: mat && cauldronMaterials.some((cm) => cm.id === mat.id) ? 1 : 0.4,
                        }}
                        title={mat?.name}
                      >
                        {mat?.icon}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6, color: '#8b6508' }}>
                    效果: {recipe.resultPotion.effect} · 稀有度: {rarityLabels[recipe.resultPotion.rarity]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
