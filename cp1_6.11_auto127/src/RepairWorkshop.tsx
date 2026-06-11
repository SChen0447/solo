import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Book, ToolType, DamagePoint, RepairLog } from './types';

interface RepairWorkshopProps {
  book: Book | null;
  onBack: () => void;
}

type ToolsUsed = {
  stainRemover: number;
  wormholeFiller: number;
  creaseIron: number;
  inkRestorer: number;
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function generateDamages(book: Book): DamagePoint[] {
  const damages: DamagePoint[] = [];
  const pages: ('left' | 'right')[] = ['left', 'right'];
  const damageCount = Math.floor(book.damageLevel * 0.3) + 8;

  for (let i = 0; i < damageCount; i++) {
    const page = pages[Math.floor(Math.random() * 2)];
    const types: Array<'stain' | 'wormhole' | 'crease' | 'faded'> = ['stain', 'wormhole', 'crease', 'faded'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const baseDamage: DamagePoint = {
      id: generateId(),
      type,
      page,
      x: 5 + Math.random() * 85,
      y: 10 + Math.random() * 75,
      width: type === 'crease' ? 15 + Math.random() * 25 : 3 + Math.random() * 12,
      height: type === 'crease' ? 0.5 : type === 'wormhole' ? 3 + Math.random() * 8 : 3 + Math.random() * 12,
      repaired: false,
      opacity: 0.4 + Math.random() * 0.5
    };

    if (type === 'crease') {
      baseDamage.width = 20 + Math.random() * 30;
      baseDamage.height = 1;
    }

    damages.push(baseDamage);
  }

  return damages;
}

const PAPER_TEXTURE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)" opacity="0.5"/>
</svg>
`;

export default function RepairWorkshop({ book: propBook, onBack }: RepairWorkshopProps) {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const [book, setBook] = useState<Book | null>(propBook);
  const [damages, setDamages] = useState<DamagePoint[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>(null);
  const [toolsUsed, setToolsUsed] = useState<ToolsUsed>({
    stainRemover: 0,
    wormholeFiller: 0,
    creaseIron: 0,
    inkRestorer: 0
  });
  const [isOpening, setIsOpening] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [repairLog, setRepairLog] = useState<RepairLog | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; color: string }>>([]);
  const [coverRefreshed, setCoverRefreshed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!propBook) {
      const stored = sessionStorage.getItem('selectedBook');
      if (stored) {
        try {
          setBook(JSON.parse(stored));
        } catch {}
      }
    }
  }, [propBook]);

  useEffect(() => {
    if (book) {
      sessionStorage.setItem('selectedBook', JSON.stringify(book));
      setDamages(generateDamages(book));
      setTimeout(() => setIsOpening(false), 800);
    }
  }, [book]);

  const totalDamages = damages.length;
  const repairedCount = damages.filter(d => d.repaired).length;
  const repairProgress = totalDamages > 0 ? Math.round((repairedCount / totalDamages) * 100) : 0;

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
    const newParticles = Array.from({ length: count }, () => ({
      id: generateId(),
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      color
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
    
    if (isDragging && currentTool === 'crease') {
      handleCreaseDrag(e);
    }
  }, [isDragging, currentTool]);

  const handleCreaseDrag = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const damageEl = target.closest('.damage-item') as HTMLElement;
    
    if (damageEl && damageEl.dataset.type === 'crease' && !damageEl.classList.contains('repaired')) {
      const damageId = damageEl.dataset.id;
      if (damageId) {
        repairDamage(damageId, e.clientX, e.clientY);
      }
    }
  }, []);

  const repairDamage = useCallback((damageId: string, clientX: number, clientY: number) => {
    setDamages(prev => {
      const damage = prev.find(d => d.id === damageId);
      if (!damage || damage.repaired) return prev;

      const canRepair = 
        (currentTool === 'stain' && damage.type === 'stain') ||
        (currentTool === 'wormhole' && damage.type === 'wormhole') ||
        (currentTool === 'crease' && damage.type === 'crease') ||
        (currentTool === 'ink' && damage.type === 'faded');

      if (!canRepair) return prev;

      setToolsUsed(tu => {
        const newTools = { ...tu };
        if (currentTool === 'stain') newTools.stainRemover++;
        if (currentTool === 'wormhole') newTools.wormholeFiller++;
        if (currentTool === 'crease') newTools.creaseIron++;
        if (currentTool === 'ink') newTools.inkRestorer++;
        return newTools;
      });

      const particleColors: Record<string, string> = {
        stain: '#d4a574',
        wormhole: '#f0d6a8',
        crease: '#ffffff',
        ink: '#3a2a1a'
      };
      createParticles(clientX, clientY, particleColors[currentTool!] || '#d4a574');

      return prev.map(d => 
        d.id === damageId ? { ...d, repaired: true } : d
      );
    });
  }, [currentTool, createParticles]);

  const handleDamageClick = useCallback((e: React.MouseEvent, damage: DamagePoint) => {
    e.stopPropagation();
    if (!currentTool || damage.repaired) return;
    repairDamage(damage.id, e.clientX, e.clientY);
  }, [currentTool, repairDamage]);

  const handleMouseDown = useCallback(() => {
    if (currentTool === 'crease') {
      setIsDragging(true);
    }
  }, [currentTool]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const selectTool = useCallback((tool: ToolType) => {
    setCurrentTool(prev => prev === tool ? null : tool);
  }, []);

  const handleRebind = useCallback(async () => {
    if (repairProgress < 30) {
      alert('请先完成至少30%的修复工作再装订');
      return;
    }

    setIsClosing(true);
    
    setTimeout(() => {
      setCoverRefreshed(true);
      
      const log: RepairLog = {
        timestamp: new Date().toISOString(),
        toolsUsed: { ...toolsUsed },
        repairedAreaPercent: repairProgress
      };
      setRepairLog(log);
      
      setTimeout(() => {
        setIsClosing(false);
        setShowLog(true);
      }, 800);
    }, 800);
  }, [repairProgress, toolsUsed]);

  const saveToCollection = useCallback(async () => {
    if (!book || !repairLog) return;
    
    setIsSaving(true);
    try {
      const savedBook: Book = {
        ...book,
        coverColor: coverRefreshed ? book.coverColor : book.coverColor,
        repairProgress,
        repairLog,
        repairedAt: new Date().toISOString(),
        isPublic: true,
        repairedBy: '古籍修复师'
      };

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedBook)
      });

      if (response.ok) {
        alert('修复完成！古籍已收入私人藏书阁');
        setTimeout(() => {
          onBack();
          navigate('/collection');
        }, 500);
      } else {
        alert('保存失败，请稍后重试');
      }
    } catch (e) {
      alert('网络错误，保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [book, repairLog, repairProgress, coverRefreshed, navigate, onBack]);

  const handleBackToShop = useCallback(() => {
    onBack();
    navigate('/');
  }, [navigate, onBack]);

  const getCursorStyle = () => {
    if (!currentTool) return 'default';
    const cursors: Record<string, string> = {
      stain: 'crosshair',
      wormhole: 'cell',
      crease: 'col-resize',
      ink: 'text'
    };
    return cursors[currentTool] || 'crosshair';
  };

  const getGlowColor = () => {
    const colors: Record<string, string> = {
      stain: 'rgba(212, 165, 116, 0.6)',
      wormhole: 'rgba(240, 214, 168, 0.6)',
      crease: 'rgba(255, 255, 255, 0.6)',
      ink: 'rgba(58, 42, 26, 0.6)'
    };
    return currentTool ? colors[currentTool] || 'transparent' : 'transparent';
  };

  if (!book) {
    return (
      <div className="repair-workshop">
        <div className="loading">正在加载古籍...</div>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="action-btn secondary" onClick={handleBackToShop}>
            返回书坊
          </button>
        </div>
      </div>
    );
  }

  const renderPage = (page: 'left' | 'right') => {
    const pageDamages = damages.filter(d => d.page === page);
    const contentKey = page;
    const pageText = book.content[contentKey];
    const pageTitle = page === 'left' ? '卷一' : '卷二';

    return (
      <div 
        ref={page === 'left' ? leftPageRef : rightPageRef}
        className={`single-page ${page}-page`}
        style={{ cursor: getCursorStyle() }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="page-texture"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(PAPER_TEXTURE_SVG)}")`,
            backgroundRepeat: 'repeat'
          }}
        />
        
        <div className="page-content">
          <div className="page-title">{pageTitle} · {book.title}</div>
          <div className="page-text">
            {pageText.map((text, idx) => (
              <p key={idx}>{text}</p>
            ))}
          </div>
        </div>

        <div className={`damage-layer ${currentTool ? 'interactive' : ''}`}>
          {pageDamages.map(damage => (
            <div
              key={damage.id}
              data-id={damage.id}
              data-type={damage.type}
              className={`damage-item damage-${damage.type} ${damage.repaired ? 'repaired' : ''}`}
              style={{
                left: `${damage.x}%`,
                top: `${damage.y}%`,
                width: `${damage.width}%`,
                height: damage.type === 'crease' ? `${damage.height}px` : `${damage.height}%`,
                opacity: damage.opacity,
                transform: damage.type === 'crease' 
                  ? `rotate(${(Math.random() - 0.5) * 30}deg)` 
                  : undefined,
                cursor: currentTool && !damage.repaired ? 'pointer' : 'default'
              }}
              onClick={(e) => handleDamageClick(e, damage)}
            />
          ))}
          
          {pageDamages.filter(d => d.type === 'faded' && !d.repaired).map(damage => (
            <div
              key={`faded-text-${damage.id}`}
              data-id={damage.id}
              data-type="faded"
              className={`damage-faded-text ${damage.repaired ? 'restored' : ''}`}
              style={{
                left: `${damage.x}%`,
                top: `${damage.y}%`,
                opacity: damage.repaired ? 1 : damage.opacity! * 0.4
              }}
              onClick={(e) => handleDamageClick(e, damage)}
            >
              {damage.repaired ? '' : '墨迹'}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tools: Array<{ type: ToolType; name: string; icon: string; color: string }> = [
    { type: 'stain', name: '去渍刷', icon: '🧹', color: '#d4a574' },
    { type: 'wormhole', name: '补虫蛀笔', icon: '🖋️', color: '#f0d6a8' },
    { type: 'crease', name: '去折痕熨斗', icon: '🔥', color: '#ffffff' },
    { type: 'ink', name: '墨字补全笔', icon: '🖌️', color: '#3a2a1a' }
  ];

  return (
    <div className="repair-workshop">
      <div className="workshop-header">
        <div className="book-info">
          <h2 style={{ color: coverRefreshed ? book.coverColor : undefined }}>
            {coverRefreshed ? '✨ ' : ''}{book.title}
          </h2>
          <p>【{book.dynasty}】{book.author} 撰</p>
          <p>破损程度：{'★'.repeat(Math.ceil(book.damageLevel / 20))}
            {'☆'.repeat(5 - Math.ceil(book.damageLevel / 20))}
          </p>
        </div>
        <div className="progress-container">
          <div className="progress-label">
            <span>修复进度</span>
            <span>{repairProgress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${repairProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="workshop-main">
        <div className="toolbar">
          {tools.map(tool => (
            <button
              key={tool.type}
              className={`tool-button ${currentTool === tool.type ? 'active' : ''}`}
              onClick={() => selectTool(tool.type)}
              title={`选择${tool.name}工具`}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-name">{tool.name}</span>
            </button>
          ))}
        </div>

        <div className="pages-container">
          <div className={`book-pages ${isOpening ? 'opening' : ''} ${isClosing ? 'closing' : ''}`}>
            {renderPage('left')}
            {renderPage('right')}
          </div>
        </div>
      </div>

      <div className="actions-bar">
        <button 
          className="action-btn secondary"
          onClick={handleBackToShop}
        >
          ← 返回书坊
        </button>
        <button 
          className="action-btn primary"
          onClick={handleRebind}
          disabled={isClosing || showLog}
        >
          📜 重新装订
        </button>
        {showLog && (
          <button 
            className="action-btn primary"
            onClick={saveToCollection}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '🏛️ 收入藏书阁'}
          </button>
        )}
      </div>

      {currentTool && (
        <div 
          className="cursor-glow"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: 60,
            height: 60,
            backgroundColor: getGlowColor()
          }}
        />
      )}

      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            width: 10,
            height: 10,
            backgroundColor: p.color
          }}
        />
      ))}

      {showLog && repairLog && (
        <>
          <div className="overlay" onClick={() => setShowLog(false)} />
          <div className={`repair-log-scroll ${showLog ? 'show' : ''}`}>
            <div className="scroll-header">
              <h3>修复登记簿</h3>
            </div>
            <div className="scroll-content">
              <div className="log-section">
                <div className="log-section-title">基本信息</div>
                <div className="log-item">
                  <span className="log-label">古籍名称</span>
                  <span className="log-value">{book.title}</span>
                </div>
                <div className="log-item">
                  <span className="log-label">修复时间</span>
                  <span className="log-value">
                    {new Date(repairLog.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="log-item">
                  <span className="log-label">朝代作者</span>
                  <span className="log-value">{book.dynasty} · {book.author}</span>
                </div>
              </div>

              <div className="log-section">
                <div className="log-section-title">工具使用记录</div>
                <div className="log-item">
                  <span className="log-label">🧹 去渍刷</span>
                  <span className="log-value">{repairLog.toolsUsed.stainRemover} 次</span>
                </div>
                <div className="log-item">
                  <span className="log-label">🖋️ 补虫蛀笔</span>
                  <span className="log-value">{repairLog.toolsUsed.wormholeFiller} 次</span>
                </div>
                <div className="log-item">
                  <span className="log-label">🔥 去折痕熨斗</span>
                  <span className="log-value">{repairLog.toolsUsed.creaseIron} 次</span>
                </div>
                <div className="log-item">
                  <span className="log-label">🖌️ 墨字补全笔</span>
                  <span className="log-value">{repairLog.toolsUsed.inkRestorer} 次</span>
                </div>
              </div>

              <div className="log-section">
                <div className="log-section-title">修复统计</div>
                <div className="log-item">
                  <span className="log-label">修复总面积</span>
                  <span className="log-value">{repairLog.repairedAreaPercent}%</span>
                </div>
                <div className="log-item">
                  <span className="log-label">破损处理数</span>
                  <span className="log-value">{repairedCount} / {totalDamages}</span>
                </div>
                <div className="log-item">
                  <span className="log-label">封面焕新</span>
                  <span className="log-value" style={{ color: book.coverColor }}>● 已完成</span>
                </div>
              </div>
            </div>
            <div className="scroll-footer">
              <button 
                className="action-btn secondary"
                onClick={() => setShowLog(false)}
              >
                合上卷轴
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
