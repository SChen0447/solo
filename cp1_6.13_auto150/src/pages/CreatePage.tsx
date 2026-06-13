import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { textToParticles, CharParticleGroup } from '../utils/textToParticles';
import { THEMES } from '../utils/themeColors';
import {
  CharGroup,
  createCharGroups,
  updateParticlePositions,
  updateColorTransitions,
  explodeGroup,
  applyExplodeDirections,
  startReturnAnimation,
  changeTheme,
  renderCanvas,
  exportToPNG,
  findGroupAtPosition,
} from '../utils/particleEngine';

interface HistoryEntry {
  groups: CharParticleGroup[];
  groupPositions: { x: number; y: number }[];
}

function CreatePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupsRef = useRef<CharGroup[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const isMouseOnCanvasRef = useRef(false);
  const dragGroupRef = useRef<number>(-1);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragGroupStartXRef = useRef(0);
  const dragGroupStartYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const colorTransitionStartRef = useRef(0);

  const [inputText, setInputText] = useState('');
  const [currentTheme, setCurrentTheme] = useState('neon');
  const [charCount, setCharCount] = useState(0);
  const [particleCount, setParticleCount] = useState(0);
  const [workName, setWorkName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const updateCounts = useCallback(() => {
    const g = groupsRef.current;
    setCharCount(g.length);
    setParticleCount(g.reduce((sum, gr) => sum + gr.particles.length, 0));
  }, []);

  const saveHistory = useCallback(() => {
    const g = groupsRef.current;
    const entry: HistoryEntry = {
      groups: g.map((gr) => ({
        char: gr.char,
        x: gr.x,
        y: gr.y,
        particles: gr.particles.map((p) => ({ x: p.offsetX, y: p.offsetY })),
      })),
      groupPositions: g.map((gr) => ({ x: gr.x, y: gr.y })),
    };
    setHistory((prev) => {
      const next = [...prev, entry];
      return next.slice(-3);
    });
  }, []);

  const handleAddText = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    if (text.length > 50) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const existingCount = groupsRef.current.length;
    const startX = 60 + existingCount * 40;
    const startY = canvas.height / 2;

    const charData = textToParticles(text, canvas.width, canvas.height, startX, startY);
    const newGroups = createCharGroups(charData, currentTheme, false);

    saveHistory();
    groupsRef.current = [...groupsRef.current, ...newGroups];
    updateCounts();
    setInputText('');
  }, [inputText, currentTheme, saveHistory, updateCounts]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    const restoredGroups = createCharGroups(
      lastEntry.groups,
      currentTheme,
      false
    );

    for (let i = 0; i < restoredGroups.length; i++) {
      restoredGroups[i].x = lastEntry.groupPositions[i].x;
      restoredGroups[i].y = lastEntry.groupPositions[i].y;
      for (const p of restoredGroups[i].particles) {
        p.currentX = restoredGroups[i].x + p.offsetX;
        p.currentY = restoredGroups[i].y + p.offsetY;
      }
    }

    groupsRef.current = restoredGroups;
    updateCounts();
  }, [history, currentTheme, updateCounts]);

  const handleReset = useCallback(() => {
    groupsRef.current = [];
    updateCounts();
    setHistory([]);
    setShowResetConfirm(false);
  }, [updateCounts]);

  const handleExport = useCallback(() => {
    const dataUrl = exportToPNG(groupsRef.current, currentTheme);
    const link = document.createElement('a');
    link.download = 'particle-graffiti.png';
    link.href = dataUrl;
    link.click();
  }, [currentTheme]);

  const handleThemeChange = useCallback((themeName: string) => {
    setCurrentTheme(themeName);
    const now = performance.now();
    colorTransitionStartRef.current = now;
    changeTheme(groupsRef.current, themeName, now);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!workName.trim() || !authorName.trim()) return;

    setIsPublishing(true);
    try {
      const chars: CharParticleGroup[] = groupsRef.current.map((g) => ({
        char: g.char,
        x: g.x,
        y: g.y,
        particles: g.particles.map((p) => ({ x: p.offsetX, y: p.offsetY })),
      }));

      const res = await axios.post('/api/artwork', {
        name: workName.trim(),
        author: authorName.trim(),
        chars,
        theme: currentTheme,
      });

      navigate(`/artwork/${res.data.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  }, [workName, authorName, currentTheme, navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = performance.now();

      applyExplodeDirections(groupsRef.current, now);

      updateParticlePositions(
        groupsRef.current,
        now,
        mouseXRef.current,
        mouseYRef.current,
        isMouseOnCanvasRef.current
      );

      if (colorTransitionStartRef.current > 0) {
        updateColorTransitions(
          groupsRef.current,
          now,
          colorTransitionStartRef.current
        );
      }

      const scaleFactor = isMobile ? 0.7 : 1;
      renderCanvas(
        ctx,
        groupsRef.current,
        now,
        mouseXRef.current,
        mouseYRef.current,
        isMouseOnCanvasRef.current,
        scaleFactor
      );

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isMobile]);

  const getCanvasPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const touch = e.touches[0] || (e as any).changedTouches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getCanvasPos(e);
      const gi = findGroupAtPosition(groupsRef.current, pos.x, pos.y);

      if (gi >= 0) {
        dragGroupRef.current = gi;
        dragStartXRef.current = pos.x;
        dragStartYRef.current = pos.y;
        dragGroupStartXRef.current = groupsRef.current[gi].x;
        dragGroupStartYRef.current = groupsRef.current[gi].y;
        isDraggingRef.current = true;
        hasMovedRef.current = false;

        const group = groupsRef.current[gi];
        for (const p of group.particles) {
          p.animState = 'dragging';
        }
      }
    },
    [getCanvasPos]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getCanvasPos(e);
      mouseXRef.current = pos.x;
      mouseYRef.current = pos.y;
      isMouseOnCanvasRef.current = true;

      if (isDraggingRef.current && dragGroupRef.current >= 0) {
        const dx = pos.x - dragStartXRef.current;
        const dy = pos.y - dragStartYRef.current;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMovedRef.current = true;
        }

        const gi = dragGroupRef.current;
        const group = groupsRef.current[gi];
        group.x = dragGroupStartXRef.current + dx;
        group.y = dragGroupStartYRef.current + dy;

        for (const p of group.particles) {
          p.currentX = group.x + p.offsetX;
          p.currentY = group.y + p.offsetY;
        }
      }
    },
    [getCanvasPos]
  );

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current && dragGroupRef.current >= 0) {
      const gi = dragGroupRef.current;
      const group = groupsRef.current[gi];
      const now = performance.now();

      if (!hasMovedRef.current) {
        saveHistory();
        explodeGroup(group, now);
      } else {
        saveHistory();
        startReturnAnimation(group, now);
      }
    }

    isDraggingRef.current = false;
    dragGroupRef.current = -1;
  }, [saveHistory]);

  const handlePointerLeave = useCallback(() => {
    isMouseOnCanvasRef.current = false;
  }, []);

  const canvasWidth = isMobile ? '100%' : '90%';
  const canvasHeight = isMobile ? '50vh' : '70vh';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '20px',
          background: 'linear-gradient(90deg, #00ffff, #ff00ff, #ffff00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '4px',
        }}
      >
        粒子涂鸦墙
      </h1>

      <div
        style={{
          position: 'relative',
          width: canvasWidth,
          height: canvasHeight,
          border: '1px solid #1a3a5a',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={(e) => {
            handlePointerUp();
            handlePointerLeave();
          }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        <div
          style={{
            position: 'absolute',
            left: '10px',
            bottom: '10px',
            background: '#00000080',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#fff',
            pointerEvents: 'none',
          }}
        >
          字符: {charCount} | 粒子: {particleCount}
        </div>

        {!isMobile && (
          <div
            style={{
              position: 'absolute',
              right: '10px',
              top: '10px',
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: history.length > 0 ? '#2a2a5acc' : '#1a1a3a',
                color: history.length > 0 ? '#fff' : '#666',
                fontSize: '14px',
                cursor: history.length > 0 ? 'pointer' : 'default',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (history.length > 0) e.currentTarget.style.background = '#4a4a7a';
              }}
              onMouseLeave={(e) => {
                if (history.length > 0) e.currentTarget.style.background = '#2a2a5acc';
              }}
            >
              撤销
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#2a2a5acc',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a7a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#2a2a5acc')}
            >
              重置
            </button>
            <button
              onClick={handleExport}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#2a2a5acc',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a7a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#2a2a5acc')}
            >
              导出PNG
            </button>
          </div>
        )}
      </div>

      {isMobile && (
        <div
          style={{
            width: '100%',
            height: '200px',
            background: '#0a0a2eee',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleUndo} disabled={history.length === 0} style={mobileBtnStyle(history.length === 0)}>
              撤销
            </button>
            <button onClick={() => setShowResetConfirm(true)} style={mobileBtnStyle()}>
              重置
            </button>
            <button onClick={handleExport} style={mobileBtnStyle()}>
              导出
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {THEMES.map((t) => (
              <button
                key={t.name}
                onClick={() => handleThemeChange(t.name)}
                style={{
                  ...mobileBtnStyle(),
                  background: currentTheme === t.name ? '#4a4a7a' : '#2a2a5acc',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, 50))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              placeholder="输入文字..."
              style={mobileInputStyle}
            />
            <button onClick={handleAddText} style={mobileBtnStyle()}>
              添加
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={workName}
              onChange={(e) => setWorkName(e.target.value.slice(0, 20))}
              placeholder="作品名称"
              style={mobileInputStyle}
            />
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value.slice(0, 10))}
              placeholder="作者"
              style={mobileInputStyle}
            />
          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !workName.trim() || !authorName.trim()}
            style={mobileBtnStyle(isPublishing)}
          >
            {isPublishing ? '发布中...' : '发布'}
          </button>
        </div>
      )}

      {!isMobile && (
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            width: '90%',
            maxWidth: '800px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {THEMES.map((t) => (
              <button
                key={t.name}
                onClick={() => handleThemeChange(t.name)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: currentTheme === t.name ? '2px solid #00ffff' : '1px solid #1a3a5a',
                  background: currentTheme === t.name ? '#4a4a7a' : '#2a2a5acc',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a7a')}
                onMouseLeave={(e) => {
                  if (currentTheme !== t.name) e.currentTarget.style.background = '#2a2a5acc';
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '500px' }}>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, 50))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              placeholder="输入文字（最多50字）"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #1a3a5a',
                background: '#0a0a2ecc',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleAddText}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#2a2a5acc',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a7a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#2a2a5acc')}
            >
              添加
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              width: '100%',
              maxWidth: '500px',
              alignItems: 'center',
            }}
          >
            <input
              value={workName}
              onChange={(e) => setWorkName(e.target.value.slice(0, 20))}
              placeholder="作品名称（最多20字）"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #1a3a5a',
                background: '#0a0a2ecc',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value.slice(0, 10))}
              placeholder="作者（最多10字）"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #1a3a5a',
                background: '#0a0a2ecc',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handlePublish}
              disabled={isPublishing || !workName.trim() || !authorName.trim()}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background:
                  isPublishing || !workName.trim() || !authorName.trim()
                    ? '#1a1a3a'
                    : '#2a2a5acc',
                color:
                  isPublishing || !workName.trim() || !authorName.trim()
                    ? '#666'
                    : '#fff',
                fontSize: '14px',
                cursor:
                  isPublishing || !workName.trim() || !authorName.trim()
                    ? 'default'
                    : 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (workName.trim() && authorName.trim() && !isPublishing)
                  e.currentTarget.style.background = '#4a4a7a';
              }}
              onMouseLeave={(e) => {
                if (workName.trim() && authorName.trim())
                  e.currentTarget.style.background = '#2a2a5acc';
              }}
            >
              {isPublishing ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000000aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#1b1b3a',
              padding: '30px',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '360px',
            }}
          >
            <p style={{ color: '#fff', fontSize: '16px', marginBottom: '20px' }}>
              确定要清空所有字符吗？
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ff4444cc',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                确定
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2a2a5acc',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const mobileBtnStyle = (disabled?: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: '8px',
  border: 'none',
  background: disabled ? '#1a1a3a' : '#2a2a5acc',
  color: disabled ? '#666' : '#fff',
  fontSize: '13px',
  cursor: disabled ? 'default' : 'pointer',
  flexShrink: 0,
});

const mobileInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid #1a3a5a',
  background: '#0a0a2ecc',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  minWidth: 0,
};

export default CreatePage;
