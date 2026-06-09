import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PRESET_FRAGRANCES, type FragranceBase, type FormulaNode, type Formula, type FormulaListItem } from './types';

const styles: { readonly [key: string]: React.CSSProperties } = {
  app: {
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 24px',
    backgroundColor: '#2d2d44',
    borderBottom: '1px solid #3d3d5c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#ffb74d',
    letterSpacing: '1px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#8888aa',
  },
  mainGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1fr',
    minWidth: '1200px',
    minHeight: '0',
  },
  panel: {
    backgroundColor: '#2d2d44',
    margin: '16px',
    borderRadius: '12px',
    padding: '16px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffb74d',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #3d3d5c',
  },
  fragranceItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
    gap: '12px',
    position: 'relative',
  },
  fragranceCircle: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  fragranceInfo: {
    flex: 1,
    minWidth: 0,
  },
  fragranceName: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  fragranceType: {
    fontSize: '11px',
    color: '#8888aa',
    marginBottom: '6px',
  },
  slider: {
    width: '100%',
    accentColor: '#ffb74d',
  },
  tooltip: {
    position: 'absolute',
    left: '50%',
    top: '-8px',
    transform: 'translateX(-50%) translateY(-100%)',
    backgroundColor: 'rgba(26,26,46,0.95)',
    color: '#e0e0e0',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    zIndex: 100,
    border: '1px solid #3d3d5c',
  },
  workspaceContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  workspaceHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  formulaNameInput: {
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #3d3d5c',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    outline: 'none',
    width: '200px',
  },
  button: {
    padding: '8px 18px',
    backgroundColor: '#ffb74d',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  hexGrid: {
    flex: 1,
    position: 'relative',
    background: 'linear-gradient(135deg, #f5f0e1 0%, #e8dcc8 100%)',
    borderRadius: '12px',
    minHeight: '400px',
    overflow: 'hidden',
  },
  node: {
    position: 'absolute',
    width: '25px',
    height: '25px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  nodeInfo: {
    position: 'absolute',
    right: '16px',
    top: '16px',
    backgroundColor: 'rgba(26,26,46,0.95)',
    padding: '16px',
    borderRadius: '8px',
    width: '220px',
    border: '1px solid #3d3d5c',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  scentCard: {
    width: '400px',
    height: '300px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #5a5a5a',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  scentCanvas: {
    flex: 1,
    position: 'relative',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
    minHeight: '150px',
  },
  starRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
  },
  star: {
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  commentInput: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #5a5a5a',
    backgroundColor: '#1a1a1a',
    color: '#e0e0e0',
    outline: 'none',
    fontSize: '13px',
    resize: 'none',
    marginBottom: '10px',
    fontFamily: 'inherit',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  th: {
    padding: '8px 6px',
    textAlign: 'left',
    borderBottom: '1px solid #3d3d5c',
    color: '#ffb74d',
    fontWeight: 'bold',
    position: 'sticky',
    top: 0,
    backgroundColor: '#2d2d44',
  },
  td: {
    padding: '8px 6px',
    borderBottom: '1px solid #3d3d5c',
    animation: 'fadeIn 0.3s ease',
  },
  heartIcon: {
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  mobileNav: {
    display: 'none',
    padding: '8px 16px',
    backgroundColor: '#2d2d44',
    gap: '8px',
    overflowX: 'auto',
  },
  mobileNavBtn: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #3d3d5c',
    color: '#e0e0e0',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};

const FragranceInventory: React.FC<{
  fragrances: FragranceBase[];
  concentrations: Record<string, number>;
  onConcentrationChange: (id: string, value: number) => void;
  onDragStart: (e: React.DragEvent, fragrance: FragranceBase) => void;
}> = ({ fragrances, concentrations, onConcentrationChange, onDragStart }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const typeLabels: Record<string, string> = {
    floral: '花香',
    woody: '木质',
    fruity: '果香',
    spicy: '辛香',
  };

  return (
    <div>
      <div style={styles.panelTitle}>香基库存</div>
      {fragrances.map((f) => (
        <div
          key={f.id}
          draggable
          onDragStart={(e) => onDragStart(e, f)}
          onMouseEnter={() => setHoveredId(f.id)}
          onMouseLeave={() => setHoveredId(null)}
          style={{
            ...styles.fragranceItem,
            backgroundColor: hoveredId === f.id ? 'rgba(255,183,77,0.1)' : 'transparent',
          }}
        >
          {hoveredId === f.id && (
            <div style={{ ...styles.tooltip, opacity: 1 }}>{f.description}</div>
          )}
          <div
            style={{
              ...styles.fragranceCircle,
              backgroundColor: f.color,
              transform: hoveredId === f.id ? 'scale(1.2)' : 'scale(1)',
            }}
          />
          <div style={styles.fragranceInfo}>
            <div style={styles.fragranceName}>{f.name}</div>
            <div style={styles.fragranceType}>{typeLabels[f.type]}</div>
            <input
              type="range"
              min="0"
              max="100"
              value={concentrations[f.id] || 50}
              onChange={(e) => onConcentrationChange(f.id, Number(e.target.value))}
              style={styles.slider}
            />
            <div style={{ fontSize: '10px', color: '#8888aa', marginTop: '2px' }}>
              浓度: {concentrations[f.id] || 50}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface Molecule {
  x: number;
  y: number;
  size: number;
  color: string;
  phase: number;
  period: number;
  amplitude: number;
  baseY: number;
}

const ScentCard: React.FC<{
  formulaName: string;
  nodes: FormulaNode[];
  fragrances: FragranceBase[];
  onClose: () => void;
  onSubmit: (score: number, comment: string) => void;
}> = ({ formulaName, nodes, fragrances, onClose, onSubmit }) => {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const moleculesRef = useRef<Molecule[]>([]);
  const animationRef = useRef<number>(0);

  const mixedColors = useMemo(() => {
    if (nodes.length === 0) return ['#ffb74d'];
    return nodes.map((n) => {
      const f = fragrances.find((fr) => fr.id === n.fragranceId);
      return f?.color || '#ffb74d';
    });
  }, [nodes, fragrances]);

  useEffect(() => {
    const molecules: Molecule[] = [];
    for (let i = 0; i < 50; i++) {
      molecules.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        baseY: Math.random() * 100,
        size: 4 + Math.random() * 4,
        color: mixedColors[i % mixedColors.length],
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random() * 2,
        amplitude: 3,
      });
    }
    moleculesRef.current = molecules;

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dots = canvas.querySelectorAll('.scent-dot') as NodeListOf<HTMLDivElement>;
      const t = performance.now() / 1000;
      dots.forEach((dot, i) => {
        const m = molecules[i];
        if (m) {
          const offset = Math.cos(t * (2 * Math.PI / m.period) + m.phase * m.amplitude;
          dot.style.transform = `translateY(${offset}px)`;
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [mixedColors]);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.scentCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: '#ffb74d', fontWeight: 'bold', fontSize: '16px' }}>
            试香卡 - {formulaName}
          </div>
          <div style={{ cursor: 'pointer', color: '#888', fontSize: '18px' }} onClick={onClose}>✕</div>
        </div>
        <div ref={canvasRef} style={styles.scentCanvas}>
          {moleculesRef.current.map((m, i) => (
            <div
            key={i}
            className="scent-dot"
            style={{
              position: 'absolute',
              width: `${m.size}px`,
              height: `${m.size}px`,
              borderRadius: '50%',
              backgroundColor: m.color,
              left: `${m.x}%`,
              top: `${m.y}%`,
              opacity: 0.8,
              willChange: 'transform',
            }}
          />
          ))}
        </div>
        <div style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              style={{
                ...styles.star,
                color: n <= score ? '#ffd700' : '#555',
              }}
              onClick={() => setScore(n)}
            >
              ★
            </span>
          ))}
          <span style={{ marginLeft: '8px', color: '#888', fontSize: '12px', alignSelf: 'center' }}>
            {score > 0 ? `${score} 星` : '请评分'}
          </span>
        </div>
        <textarea
          placeholder="写下你的评价（最多50字）"
          maxLength={50}
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={styles.commentInput}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            style={{ ...styles.button, backgroundColor: '#3d3d5c', color: '#e0e0e0' }} onClick={onClose}>
            取消
          </button>
          <button
            style={styles.button}
            onClick={() => {
              if (score === 0) { alert('请先评分'); return; }
              onSubmit(score, comment);
            }}
          >
            提交评价
          </button>
        </div>
      </div>
    </div>
  );
};

const Leaderboard: React.FC<{
  formulas: FormulaListItem[];
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}> = ({ formulas, favorites, onToggleFavorite }) => {
  return (
    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
      <div style={styles.panelTitle}>社区排行榜</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>配方</th>
            <th style={styles.th}>作者</th>
            <th style={styles.th}>评分</th>
            <th style={styles.th}>收藏</th>
          </tr>
        </thead>
        <tbody>
          {formulas.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '20px' }}>
                暂无配方，快来创建第一个吧！
              </td>
            </tr>
          ) : (
            formulas.map((f) => (
              <tr key={f.id}>
                <td style={styles.td}>{f.name}</td>
                <td style={styles.td}>{f.author}</td>
                <td style={{ ...styles.td, color: '#ffd700' }}>★ {f.averageRating.toFixed(1)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.heartIcon,
                      color: favorites.has(f.id) ? '#ff4080' : '#888',
                    }}
                    onClick={() => onToggleFavorite(f.id)}
                  >
                    {favorites.has(f.id) ? '♥' : '♡'} {f.favoriteCount}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const App: React.FC = () => {
  const [fragrances] = useState<FragranceBase[]>(PRESET_FRAGRANCES);
  const [concentrations, setConcentrations] = useState<Record<string, number>>({});
  const [nodes, setNodes] = useState<FormulaNode[]>([]);
  const [formulaName, setFormulaName] = useState('我的香水');
  const [authorName, setAuthorName] = useState('匿名调香师');
  const [showScentCard, setShowScentCard] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [formulas, setFormulas] = useState<FormulaListItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mobileView, setMobileView] = useState<'inventory' | 'workspace' | 'leaderboard'>('workspace');
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const lastRefreshRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const checkScreen = () => setIsSmallScreen(window.innerWidth < 1200);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const fetchFormulas = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1000) return;
    lastRefreshRef.current = now;
    fetch('/api/formulas')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setFormulas(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchFormulas();
    const interval = setInterval(fetchFormulas, 5000);
    return () => clearInterval(interval);
  }, [fetchFormulas]);

  const handleConcentrationChange = (id: string, value: number) => {
    setConcentrations((prev) => ({ ...prev, [id]: value }));
  };

  const handleDragStart = (e: React.DragEvent, fragrance: FragranceBase) => {
    e.dataTransfer.setData('fragranceId', fragrance.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fragranceId = e.dataTransfer.getData('fragranceId');
    if (!fragranceId || !workspaceRef.current) return;

    const rect = workspaceRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width;
    const y = ((e.clientY - rect.top) / rect.height;

    const gridX = Math.round(x * 5);
    const gridY = Math.round(y * 5);

    const occupied = nodes.find((n) => n.gridX === gridX && n.gridY === gridY);
    if (occupied) return;

    const newNode: FormulaNode = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      fragranceId,
      concentration: concentrations[fragranceId] || 50,
      gridX,
      gridY,
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleNodeConcentrationChange = (nodeId: string, value: number) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, concentration: value } : n));
  };

  const getFragranceColor = (fragranceId: string): string => {
    return fragrances.find((f) => f.id === fragranceId)?.color || '#888';
  };

  const mixColors = (c1: string, c2: string): string => {
    const hex = (c: string) => [
      parseInt(c.slice(1, 3), 16),
      parseInt(c.slice(3, 5), 16),
      parseInt(c.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = hex(c1);
    const [r2, g2, b2] = hex(c2);
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const handleSubmitRating = async (score: number, comment: string) => {
    if (nodes.length === 0) {
      alert('请先添加香基');
      return;
    }

    try {
      const formulaRes = await fetch('/api/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formulaName,
          author: authorName,
          nodes,
          isPublic: true,
        }),
      });
      const formulaData = await formulaRes.json();
      if (!formulaData.success) {
        alert(formulaData.error || '创建配方失败');
        return;
      }
      const formulaId = formulaData.data.id;

      await fetch(`/api/formulas/${formulaId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment }),
      });

      setShowScentCard(false);
      setNodes([]);
      setFormulaName('我的香水');
      fetchFormulas();
      setTimeout(fetchFormulas, 500);
    } catch (err) {
      alert('提交失败，请重试');
    }
  };

  const handleToggleFavorite = async (formulaId: string) => {
    const isFav = favorites.has(formulaId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(formulaId);
      else next.add(formulaId);
      return next;
    });

    setFormulas((prev) =>
      prev.map((f) =>
        f.id === formulaId
          ? { ...f, favoriteCount: f.favoriteCount + (isFav ? -1 : 1) }
          : f
      )
    );

    fetch(`/api/formulas/${formulaId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'default' }),
    }).catch(() => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(formulaId);
        else next.delete(formulaId);
        return next;
      });
    });
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const lines = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; color: string; width: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dist = Math.sqrt((n1.gridX - n2.gridX) ** 2 + (n1.gridY - n2.gridY) ** 2;
        if (dist <= 2) {
          result.push({
            x1: (n1.gridX + 0.5) / 6 * 100,
            y1: (n1.gridY + 0.5) / 6 * 100,
            x2: (n2.gridX + 0.5) / 6 * 100,
            y2: (n2.gridY + 0.5) / 6 * 100,
            color: mixColors(getFragranceColor(n1.fragranceId), getFragranceColor(n2.fragranceId)),
            width: Math.max(1, (n1.concentration + n2.concentration) / 50),
          });
        }
      }
    }
    return result;
  }, [nodes, fragrances]);

  const renderContent = () => {
    if (isSmallScreen) {
      return (
        <div style={{ ...styles.panel, margin: '0', borderRadius: 0 }}>
          {mobileView === 'inventory' && (
            <FragranceInventory
              fragrances={fragrances}
              concentrations={concentrations}
              onConcentrationChange={handleConcentrationChange}
              onDragStart={handleDragStart}
            />
          )}
          {mobileView === 'workspace' && (
            <WorkspaceContent />
          )}
          {mobileView === 'leaderboard' && (
            <Leaderboard formulas={formulas} favorites={favorites} onToggleFavorite={handleToggleFavorite} />
          )}
        </div>
      );
    }
    return (
      <div style={styles.mainGrid}>
        <div style={styles.panel}>
          <FragranceInventory
            fragrances={fragrances}
            concentrations={concentrations}
            onConcentrationChange={handleConcentrationChange}
            onDragStart={handleDragStart}
          />
        </div>
        <div style={{ ...styles.panel, minWidth: 0 }}>
          <WorkspaceContent />
        </div>
        <div style={styles.panel}>
          <Leaderboard formulas={formulas} favorites={favorites} onToggleFavorite={handleToggleFavorite} />
        </div>
      </div>
    );
  };

  const WorkspaceContent = () => (
    <div style={styles.workspaceContainer}>
      <div style={styles.workspaceHeader}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="配方名称"
            value={formulaName}
            onChange={(e) => setFormulaName(e.target.value)}
            style={styles.formulaNameInput}
          />
          <input
            type="text"
            placeholder="作者"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            style={{ ...styles.formulaNameInput, width: '140px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{ ...styles.button, backgroundColor: '#3d3d5c', color: '#e0e0e0' }}
            onClick={() => setNodes([])}
          >
            清空
          </button>
          <button
            style={styles.button}
            onClick={() => {
              if (nodes.length === 0) { alert('请先添加香基'); return; }
              setShowScentCard(true);
            }}
          >
            试香
          </button>
        </div>
      </div>
      <div
        ref={workspaceRef}
        style={styles.hexGrid}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => setSelectedNodeId(null)}
      >
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {lines.map((line, i) => (
            <line
              key={i}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke={line.color}
              strokeWidth={line.width}
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}
        </svg>
        {Array.from({ length: 36 }).map((_, i) => {
          const gx = i % 6;
          const gy = Math.floor(i / 6);
          return (
            <div
              key={`hex-${i}
              style={{
                position: 'absolute',
                left: `${((gx + 0.5) / 6 * 100}%`,
                top: `${((gy + 0.5) / 6 * 100}%`,
                width: '18px',
                height: '18px',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: '1px dashed rgba(0,0,0,0.2)',
              }}
            />
          );
        })}
        {nodes.map((node) => (
          <div
            key={node.id}
            style={{
              ...styles.node,
              backgroundColor: getFragranceColor(node.fragranceId),
              left: `${((node.gridX + 0.5) / 6 * 100}%`,
              top: `${((node.gridY + 0.5) / 6 * 100}%`,
              boxShadow:
                selectedNodeId === node.id
                  ? '0 0 0 3px #ffb74d, 0 4px 8px rgba(0,0,0,0.4)'
                  : '0 2px 6px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(node.id);
            }}
          />
        ))}
        {selectedNode && (
          <div style={styles.nodeInfo}>
            <div style={{ color: '#ffb74d', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
              {fragrances.find((f) => f.id === selectedNode.fragranceId)?.name}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                浓度: {selectedNode.concentration}%
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedNode.concentration}
                onChange={(e) => handleNodeConcentrationChange(selectedNode.id, Number(e.target.value))}
                style={styles.slider}
              />
            </div>
            <button
              style={{
                ...styles.button,
                backgroundColor: '#ff4080',
                color: '#fff',
                width: '100%',
                padding: '6px',
                fontSize: '12px',
              }}
              onClick={() => handleDeleteNode(selectedNode.id)}
            >
              删除节点
            </button>
          </div>
        )}
      </div>
      <div style={{ marginTop: '10px', color: '#8888aa', fontSize: '12px', textAlign: 'center' }}>
        从左侧面板拖拽香基到调香台放置节点 · 点击节点可调整浓度或删除
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 1199px) {
          .mobile-nav { display: flex !important; }
        }
      `}</style>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>✦ 虚拟调香师实验室</div>
          <div style={styles.subtitle}>调配属于你的专属香气</div>
        </div>
        <div style={{ color: '#8888aa', fontSize: '12px' }}>
          {formulas.length} 个公开配方
        </div>
      </div>
      {isSmallScreen && (
        <div className="mobile-nav" style={{ ...styles.mobileNav, display: 'flex' }}>
          <button
            style={{
              ...styles.mobileNavBtn,
              backgroundColor: mobileView === 'inventory' ? '#ffb74d' : 'transparent',
              color: mobileView === 'inventory' ? '#1a1a2e' : '#e0e0e0',
            }}
            onClick={() => setMobileView('inventory')}
          >
            香基库存
          </button>
          <button
            style={{
              ...styles.mobileNavBtn,
              backgroundColor: mobileView === 'workspace' ? '#ffb74d' : 'transparent',
              color: mobileView === 'workspace' ? '#1a1a2e' : '#e0e0e0',
            }}
            onClick={() => setMobileView('workspace')}
          >
            调香台
          </button>
          <button
            style={{
              ...styles.mobileNavBtn,
              backgroundColor: mobileView === 'leaderboard' ? '#ffb74d' : 'transparent',
              color: mobileView === 'leaderboard' ? '#1a1a2e' : '#e0e0e0',
            }}
            onClick={() => setMobileView('leaderboard')}
          >
            排行榜
          </button>
        </div>
      )}
      {renderContent()}
      {showScentCard && (
        <ScentCard
          formulaName={formulaName}
          nodes={nodes}
          fragrances={fragrances}
          onClose={() => setShowScentCard(false)}
          onSubmit={handleSubmitRating}
        />
      )}
    </div>
  );
};

export default App;
