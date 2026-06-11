import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Chawan, { ChawanRef, Bubble } from './components/Chawan';
import ControlPanel, { TeaRecipe } from './components/ControlPanel';
import PinJianTable from './components/品鉴Table';

interface TeaRecord {
  id: string;
  date: string;
  textureParams: any;
  score: number;
  inscription: string;
  thumbnail?: string;
  scores: {
    density: number;
    uniformity: number;
    complexity: number;
    swipeRatio: number;
    total: number;
  };
}

const computeFourierComplexity = (bubbles: Bubble[]): number => {
  if (bubbles.length < 10) return 15;
  const n = Math.min(bubbles.length, 128);
  const xs = bubbles.slice(0, n).map(b => b.x - 200);
  const ys = bubbles.slice(0, n).map(b => b.y - 180);

  let re = 0, im = 0;
  for (let k = 1; k <= 8; k++) {
    let sumRe = 0, sumIm = 0;
    for (let t = 0; t < n; t++) {
      const angle = -2 * Math.PI * k * t / n;
      sumRe += xs[t] * Math.cos(angle) - ys[t] * Math.sin(angle);
      sumIm += xs[t] * Math.sin(angle) + ys[t] * Math.cos(angle);
    }
    re += Math.abs(sumRe) / (n * k);
    im += Math.abs(sumIm) / (n * k);
  }
  const mag = Math.sqrt(re * re + im * im);
  return Math.min(100, Math.max(10, mag * 40 + 20));
};

const generateInscription = (totalScore: number, recipeId: string): string => {
  const stems = ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬'];
  const month = new Date().getMonth();
  const season = stems[month] || '仲夏';

  const prefixes = ['微露', '轻烟', '薄雾', '流霞', '素月', '清风', '晴雪', '浮云'];
  const suffixes = ['泛华', '凝香', '饮翠', '栖云', '漱玉', '烹雪', '浮岚', '澄碧'];
  const grades = totalScore >= 85 ? '上品' : totalScore >= 70 ? '妙品' : totalScore >= 55 ? '逸品' : '佳品';

  const recipeFlavor: Record<string, string> = {
    thin: '·雪韵',
    thick: '·峦峰',
    dou: '·斗胜'
  };

  return `${season}${recipeFlavor[recipeId] || ''}·${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}·${grades}`;
};

const App: React.FC = () => {
  const [teaRecipes, setTeaRecipes] = useState<TeaRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState('thin');
  const [temperature, setTemperature] = useState(80);
  const [waterAmount, setWaterAmount] = useState(70);
  const [whiskSpeed, setWhiskSpeed] = useState(90);
  const [whiskAngle, setWhiskAngle] = useState(0);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [swipeRatio, setSwipeRatio] = useState(0);

  const [scores, setScores] = useState({
    density: 0, uniformity: 0, complexity: 0, swipeRatio: 0, total: 0
  });
  const [inscription, setInscription] = useState('');
  const [showPinJian, setShowPinJian] = useState(false);

  const [records, setRecords] = useState<TeaRecord[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const chawanRef = useRef<ChawanRef>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const defaultRecipes: TeaRecipe[] = [
      {
        id: 'thin', name: '薄茶',
        description: '低浓度，汤花稀疏但细腻，纹理如雪地',
        params: { bubbleCount: 60, minSize: 3, maxSize: 6, aggregation: 0.2, pattern: 'random', concentration: 'low' }
      },
      {
        id: 'thick', name: '浓茶',
        description: '高浓度，汤花厚密如奶油，纹理如山峦',
        params: { bubbleCount: 140, minSize: 5, maxSize: 10, aggregation: 0.55, pattern: 'concentric', concentration: 'high' }
      },
      {
        id: 'dou', name: '斗茶',
        description: '高浓度且快速击拂，汤花表面形成复杂花鸟图纹',
        params: { bubbleCount: 200, minSize: 4, maxSize: 12, aggregation: 0.8, pattern: 'spiral', concentration: 'extreme' }
      }
    ];
    setTeaRecipes(defaultRecipes);

    fetch('/api/records').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setRecords(d);
    }).catch(() => {});
  }, []);

  const handleBubbleUpdate = useCallback((b: Bubble[]) => setBubbles(b), []);
  const handleSwipeUpdate = useCallback((r: number) => setSwipeRatio(r), []);

  const handlePinJian = () => {
    const permBubbles = bubbles.filter(b => b.type === 'permanent');
    const tempBoost = Math.min(1.15, 0.85 + whiskSpeed / 600);

    const recipeParams: Record<string, number> = { thin: 80, thick: 120, dou: 160 };
    const target = recipeParams[selectedRecipe] || 100;
    const density = Math.min(100, (permBubbles.length / target) * 90 * tempBoost + 5);

    let uniformity = 30;
    if (permBubbles.length >= 5) {
      const gridCount = 9;
      const cellCounts = Array(gridCount).fill(0);
      permBubbles.forEach(b => {
        const gx = Math.min(2, Math.floor((b.x - 110) / 60));
        const gy = Math.min(2, Math.floor((b.y - 130) / 30));
        const idx = Math.max(0, Math.min(8, gy * 3 + gx));
        cellCounts[idx]++;
      });
      const avg = permBubbles.length / gridCount;
      const variance = cellCounts.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / gridCount;
      const cv = Math.sqrt(variance) / (avg || 1);
      uniformity = Math.min(100, Math.max(10, 95 - cv * 22));
    }

    const complexity = computeFourierComplexity(permBubbles);
    const swipe = Math.min(100, swipeRatio * 180);
    const total = density * 0.28 + uniformity * 0.22 + complexity * 0.22 + swipe * 0.28;

    const newScores = {
      density: Math.round(density),
      uniformity: Math.round(uniformity),
      complexity: Math.round(complexity),
      swipeRatio: Math.round(swipe),
      total: Math.round(Math.min(100, Math.max(0, total)))
    };
    setScores(newScores);
    setInscription(generateInscription(newScores.total, selectedRecipe));
    setShowPinJian(true);
  };

  const generateThumbnail = (): string => {
    const recipeColors: Record<string, string> = {
      thin: '#e8ebe4',
      thick: '#d4d8c8',
      dou: '#c8ccb8'
    };
    const color = recipeColors[selectedRecipe] || '#e8ebe4';
    let svgParts: string[] = [];
    svgParts.push("<svg xmlns='http://www.w3.org/2000/svg' width='100' height='80'>");
    svgParts.push("<defs><radialGradient id='g' cx='50%25' cy='40%25'>");
    svgParts.push("<stop offset='0%25' stop-color='" + color + "'/>");
    svgParts.push("<stop offset='100%25' stop-color='#6b5e46'/></radialGradient></defs>");
    svgParts.push("<rect width='100' height='80' fill='#2b4d3e' opacity='0.15'/>");
    svgParts.push("<ellipse cx='50' cy='45' rx='38' ry='22' fill='url(%23g)' stroke='#d4a017' stroke-width='1'/>");
    bubbles.filter(b => b.type === 'permanent').slice(0, 25).forEach(b => {
      const cx = (b.x / 400 * 100).toFixed(1);
      const cy = (b.y / 420 * 80).toFixed(1);
      const r = (b.size / 2).toFixed(1);
      svgParts.push("<circle cx='" + cx + "' cy='" + cy + "' r='" + r + "' fill='%23fff' opacity='0.7'/>");
    });
    svgParts.push("</svg>");
    const svgStr = svgParts.join('');
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const handleSave = async () => {
    if (scores.total === 0) return;
    const record: Partial<TeaRecord> = {
      textureParams: { recipe: selectedRecipe, temperature, waterAmount, whiskSpeed, whiskAngle },
      score: scores.total,
      inscription,
      scores,
      thumbnail: generateThumbnail()
    };
    try {
      const resp = await fetch('/api/saveRecord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      const data = await resp.json();
      if (data.success) {
        setRecords(prev => [data.record, ...prev].slice(0, 5));
      }
    } catch {
      const localRecord: TeaRecord = {
        id: 'local-' + Date.now(),
        date: new Date().toISOString(),
        ...record
      } as TeaRecord;
      setRecords(prev => [localRecord, ...prev].slice(0, 5));
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setDeletingId(id);
    setTimeout(async () => {
      try {
        await fetch("/api/records/" + id, { method: 'DELETE' });
      } catch {}
      setRecords(prev => prev.filter(r => r.id !== id));
      setDeletingId(null);
    }, 300);
  };

  const handleLoadRecord = (r: TeaRecord) => {
    const p = r.textureParams || {};
    setSelectedRecipe(p.recipe || 'thin');
    setTemperature(p.temperature || 80);
    setWaterAmount(p.waterAmount || 70);
    setWhiskSpeed(p.whiskSpeed || 90);
    setWhiskAngle(p.whiskAngle || 0);
    setScores(r.scores);
    setInscription(r.inscription);
    setSwipeRatio((r.scores?.swipeRatio || 0) / 100);
    setShowPinJian(true);
  };

  const handleExportPNG = () => {
    const W = 500, H = 700;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#2b4d3e');
    bgGrad.addColorStop(1, '#f5f0e0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.strokeStyle = 'rgba(212, 160, 23, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    ctx.fillStyle = '#3d2817';
    ctx.font = "bold 32px 'Ma Shan Zheng', 'Noto Serif SC', serif";
    ctx.textAlign = 'center';
    ctx.fillText('汤花品鉴卡', W / 2, 80);

    ctx.font = "14px 'Noto Serif SC', serif";
    ctx.fillStyle = '#6b4423';
    ctx.fillText(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), W / 2, 108);

    const bowlGrad = ctx.createRadialGradient(W / 2, 250, 20, W / 2, 250, 130);
    bowlGrad.addColorStop(0, '#d4d98b');
    bowlGrad.addColorStop(1, '#5d6b3c');
    ctx.fillStyle = bowlGrad;
    ctx.beginPath();
    ctx.ellipse(W / 2, 250, 130, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#6b5e46';
    ctx.lineWidth = 8;
    ctx.stroke();

    bubbles.filter(b => b.type === 'permanent').slice(0, 200).forEach(b => {
      const sx = (b.x / 400) * 260 + (W / 2 - 130);
      const sy = (b.y / 420) * 150 + 175;
      ctx.fillStyle = "rgba(255,255,255," + (b.opacity * 0.8).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(sx, sy, b.size * 0.9, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(245, 240, 224, 0.95)';
    ctx.fillRect(60, 360, W - 120, 280);
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 360, W - 120, 280);

    const items = [
      { label: '汤花密度', val: scores.density, color: '#3d6b54' },
      { label: '均匀程度', val: scores.uniformity, color: '#8a8a4a' },
      { label: '纹理复杂', val: scores.complexity, color: '#8a5a3a' },
      { label: '涂抹显露', val: Math.round(scores.swipeRatio), color: '#a8783a' },
    ];

    ctx.font = "bold 16px 'Noto Serif SC', serif";
    ctx.textAlign = 'left';
    items.forEach((it, i) => {
      const y = 400 + i * 40;
      ctx.fillStyle = '#3d2817';
      ctx.fillText(it.label, 85, y);
      ctx.fillStyle = it.color;
      ctx.fillRect(190, y - 12, 180, 10);
      ctx.fillStyle = 'rgba(43,77,62,0.15)';
      ctx.fillRect(190 + (it.val / 100) * 180, y - 12, 180 - (it.val / 100) * 180, 10);
      ctx.fillStyle = '#2b4d3e';
      ctx.font = "bold 18px 'Noto Serif SC', serif";
      ctx.textAlign = 'right';
      ctx.fillText(it.val + ' 分', W - 85, y);
      ctx.textAlign = 'left';
      ctx.font = "bold 16px 'Noto Serif SC', serif";
    });

    ctx.beginPath();
    ctx.moveTo(85, 565);
    ctx.lineTo(W - 85, 565);
    ctx.strokeStyle = 'rgba(212,160,23,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#2b4d3e';
    ctx.font = "bold 26px 'Ma Shan Zheng', cursive";
    ctx.textAlign = 'left';
    ctx.fillText('综合评分', 85, 600);

    ctx.textAlign = 'right';
    ctx.font = "bold 52px 'Ma Shan Zheng', cursive";
    ctx.fillStyle = '#6b3a3a';
    ctx.fillText(scores.total.toString(), W - 170, 602);
    ctx.font = "bold 18px 'Noto Serif SC', serif";
    ctx.fillStyle = '#3d2817';
    ctx.fillText('分', W - 90, 602);

    ctx.fillStyle = '#6b4423';
    ctx.font = "italic 18px 'Ma Shan Zheng', cursive";
    ctx.textAlign = 'center';
    ctx.fillText("「 " + inscription + " 」", W / 2, 645);

    ctx.font = "11px 'Noto Serif SC', serif";
    ctx.fillStyle = 'rgba(61,40,23,0.5)';
    ctx.fillText('—— 虚拟茶道师品鉴实验室 ——', W / 2, 680);

    const link = document.createElement('a');
    link.download = "汤花品鉴_" + scores.total + "分_" + Date.now() + ".png";
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const formatDate = (d: string) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '16px', maxWidth: '1440px', margin: '0 auto' }}>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: '20px', padding: '20px' }}
      >
        <h1 className="ink-title" style={{ fontSize: '42px', marginBottom: '6px' }}>
          虛擬茶道師
        </h1>
        <p style={{ fontSize: '15px', color: '#6b4423', opacity: 0.75, letterSpacing: '4px' }}>
          — 汤花纹理品鉴实验室 —
        </p>
      </motion.header>

      <div className="main-layout" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="chawan-panel"
          style={{ flex: '0 0 40%', maxWidth: '520px' }}
        >
          <div className="tea-card" style={{ padding: '14px' }}>
            <Chawan
              ref={chawanRef}
              whiskFrequency={whiskSpeed}
              whiskAngle={whiskAngle}
              teaRecipeId={selectedRecipe}
              temperature={temperature}
              waterAmount={waterAmount}
              onBubbleUpdate={handleBubbleUpdate}
              onSwipeUpdate={handleSwipeUpdate}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="tea-btn" onClick={handlePinJian} style={{ fontWeight: 700 }}>
                🔍 品鉴汤花
              </button>
              <button className="tea-btn" onClick={handleSave} disabled={scores.total === 0} style={{ opacity: scores.total === 0 ? 0.5 : 1 }}>
                💾 保存记录
              </button>
            </div>
          </div>

          <div className="tea-card" style={{ marginTop: '20px' }}>
            <h3 className="ink-title" style={{ fontSize: '20px', marginBottom: '14px', textAlign: 'center' }}>
              · 品鉴典藏 ·
            </h3>
            {records.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '13px', opacity: 0.55, padding: '24px 8px' }}>
                暂无保存的品鉴记录<br />完成品鉴后点击"保存记录"即可
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence>
                  {records.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: deletingId === r.id ? 0 : 1,
                        scale: deletingId === r.id ? 0.1 : 1,
                        originX: 0,
                        originY: 0,
                        x: deletingId === r.id ? -50 : 0,
                        y: deletingId === r.id ? -50 : 0
                      }}
                      exit={{ opacity: 0, scale: 0.1, originX: 0, originY: 0 }}
                      transition={{ duration: 0.4, ease: 'easeIn' }}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '10px',
                        background: 'rgba(245,240,224,0.7)',
                        borderRadius: '12px',
                        border: '1.5px solid rgba(212,160,23,0.4)',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onClick={() => handleLoadRecord(r)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#eebb44';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,160,23,0.4)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      }}
                    >
                      {r.thumbnail && (
                        <img
                          src={r.thumbnail}
                          alt="缩略图"
                          style={{ width: '64px', height: '52px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(212,160,23,0.3)', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '11px',
                            color: '#6b4423',
                            opacity: 0.75
                          }}>{formatDate(r.date)}</span>
                          <span style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#2b4d3e',
                            fontFamily: "'Ma Shan Zheng', cursive"
                          }}>
                            {r.score}分
                          </span>
                        </div>
                        <p style={{
                          fontSize: '13px',
                          color: '#3d2817',
                          marginTop: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 600
                        }}>
                          {r.inscription}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecord(r.id);
                        }}
                        style={{
                          alignSelf: 'flex-start',
                          background: 'rgba(107,58,58,0.1)',
                          border: '1px solid rgba(107,58,58,0.3)',
                          borderRadius: '6px',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          color: '#6b3a3a',
                          fontSize: '12px',
                          fontWeight: 700,
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="control-panel"
          style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <ControlPanel
            teaRecipes={teaRecipes}
            selectedRecipe={selectedRecipe}
            onSelectRecipe={setSelectedRecipe}
            temperature={temperature}
            onTemperatureChange={setTemperature}
            waterAmount={waterAmount}
            onWaterAmountChange={setWaterAmount}
            whiskSpeed={whiskSpeed}
            onWhiskSpeedChange={setWhiskSpeed}
            whiskAngle={whiskAngle}
            onWhiskAngleChange={setWhiskAngle}
          />

          <AnimatePresence>
            {showPinJian && (
              <motion.div
                ref={exportCardRef}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 24 }}
                className="tea-card"
              >
                <div style={{ display: 'flex', gap: '28px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 280px', minWidth: '280px' }}>
                    <PinJianTable scores={scores} />
                  </div>
                  <div style={{
                    flex: '1 1 240px',
                    minWidth: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '20px'
                  }}>
                    <div>
                      <h3 className="ink-title" style={{ fontSize: '22px', marginBottom: '14px', textAlign: 'center' }}>
                        · 茶道铭文 ·
                      </h3>
                      <motion.div
                        initial={{ opacity: 0, rotateX: -30 }}
                        animate={{ opacity: 1, rotateX: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        style={{
                          padding: '20px 16px',
                          background: 'linear-gradient(135deg, rgba(245,240,224,0.9), rgba(232,220,192,0.9))',
                          border: '2px solid rgba(212,160,23,0.5)',
                          borderRadius: '12px',
                          textAlign: 'center',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          left: '8px',
                          width: '20px',
                          height: '20px',
                          borderTop: '2px solid #d4a017',
                          borderLeft: '2px solid #d4a017',
                          opacity: 0.6
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          right: '8px',
                          width: '20px',
                          height: '20px',
                          borderTop: '2px solid #d4a017',
                          borderRight: '2px solid #d4a017',
                          opacity: 0.6
                        }} />
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '8px',
                          width: '20px',
                          height: '20px',
                          borderBottom: '2px solid #d4a017',
                          borderLeft: '2px solid #d4a017',
                          opacity: 0.6
                        }} />
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '8px',
                          width: '20px',
                          height: '20px',
                          borderBottom: '2px solid #d4a017',
                          borderRight: '2px solid #d4a017',
                          opacity: 0.6
                        }} />
                        <p style={{
                          fontSize: '24px',
                          fontFamily: "'Ma Shan Zheng', cursive",
                          color: '#2b4d3e',
                          lineHeight: 1.6,
                          letterSpacing: '2px',
                          fontWeight: 600
                        }}>
                          {inscription.split('·').map((s, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && <span style={{ color: '#d4a017', margin: '0 4px' }}>·</span>}
                              {s}
                            </React.Fragment>
                          ))}
                        </p>
                      </motion.div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button
                        className="tea-btn"
                        onClick={handleExportPNG}
                        style={{
                          padding: '14px 20px',
                          fontSize: '16px',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #d4a017, #b8860b)',
                          color: '#fff8e0',
                          borderColor: '#eebb44',
                          letterSpacing: '2px'
                        }}
                      >
                        🖼️ 导出品鉴卡 PNG
                      </button>
                      <button
                        className="tea-btn"
                        onClick={() => setShowPinJian(false)}
                        style={{ fontSize: '13px', opacity: 0.8 }}
                      >
                        关闭品鉴结果
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <footer style={{
        textAlign: 'center',
        marginTop: '32px',
        padding: '20px',
        fontSize: '12px',
        color: '#3d2817',
        opacity: 0.55
      }}>
        <p>🍵 茶者，南方之嘉木也 · 一盏清茗，半日闲情</p>
      </footer>
    </div>
  );
};

export default App;
