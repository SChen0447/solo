import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toolbar from './components/Toolbar';
import ControlPanel, { PresetModal } from './components/ControlPanel';
import Card from './components/Card';
import { CardData, createCard, generateMoodboard } from './utils/cardEngine';

interface Connection {
  from: string;
  to: string;
}

const App: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [transparency, setTransparency] = useState(1.0);
  const [scale, setScale] = useState(1.0);
  const [spacing, setSpacing] = useState(30);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    cardStartX: number;
    cardStartY: number;
  } | null>(null);
  const connectionsRef = useRef<Connection[]>([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const initial = generateMoodboard(4, 1200, 900);
    setCards(initial);
    const ids = new Set(initial.map((c) => c.id));
    setNewCardIds(ids);
    setTimeout(() => setNewCardIds(new Set()), 500);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getCardCenter = useCallback((card: CardData) => {
    const w = isMobile ? 240 : card.width;
    const h = isMobile ? 180 : card.height;
    return {
      x: card.x + (w * card.scale) / 2,
      y: card.y + (h * card.scale) / 2,
    };
  }, [isMobile]);

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const updateConnections = useCallback(
    (currentCards: CardData[]) => {
      const conns: Connection[] = [];
      const threshold = 30 + spacing;
      for (let i = 0; i < currentCards.length; i++) {
        for (let j = i + 1; j < currentCards.length; j++) {
          const a = currentCards[i];
          const b = currentCards[j];
          if (distance(getCardCenter(a), getCardCenter(b)) < threshold + 100) {
            conns.push({ from: a.id, to: b.id });
          }
        }
      }
      connectionsRef.current = conns;
      forceUpdate((n) => n + 1);
    },
    [spacing, getCardCenter]
  );

  useEffect(() => {
    updateConnections(cards);
  }, [cards, updateConnections]);

  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      cardStartX: card.x,
      cardStartY: card.y,
    };
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, selected: true } : c)));
  }, [cards]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, startX, startY, cardStartX, cardStartY } = dragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setCards((prev) => {
        const updated = prev.map((c) =>
          c.id === id ? { ...c, x: cardStartX + dx, y: cardStartY + dy } : c
        );
        updateConnections(updated);
        return updated;
      });
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [updateConnections]);

  const handleCardClick = useCallback((id: string, e: React.MouseEvent) => {
    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, selected: true };
        if (!multi) return { ...c, selected: false };
        return c;
      })
    );
  }, []);

  const handleCanvasClick = useCallback(() => {
    setCards((prev) => prev.map((c) => ({ ...c, selected: false })));
  }, []);

  useEffect(() => {
    setCards((prev) =>
      prev.map((c) => (c.selected ? { ...c, opacity: transparency, scale } : c))
    );
  }, [transparency, scale]);

  const handleGenerate = useCallback(() => {
    const canvas = canvasRef.current;
    const scrollLeft = canvas?.scrollLeft || 0;
    const scrollTop = canvas?.scrollTop || 0;
    const w = isMobile ? 240 : 320;
    const h = isMobile ? 180 : 240;
    const newCard = createCard(scrollLeft + 200 + Math.random() * 100, scrollTop + 150 + Math.random() * 100, keyword || undefined);
    if (isMobile) {
      newCard.width = 240;
      newCard.height = 180;
    }
    newCard.opacity = transparency;
    newCard.scale = scale;
    setCards((prev) => [...prev, newCard]);
    setNewCardIds((prev) => new Set(prev).add(newCard.id));
    setTimeout(() => {
      setNewCardIds((prev) => {
        const next = new Set(prev);
        next.delete(newCard.id);
        return next;
      });
    }, 500);
    setKeyword('');
  }, [keyword, transparency, scale, isMobile]);

  const handleAddPreset = useCallback(
    (preset: { gradient: any; pattern: any }) => {
      const canvas = canvasRef.current;
      const scrollLeft = canvas?.scrollLeft || 0;
      const scrollTop = canvas?.scrollTop || 0;
      const viewW = canvas?.clientWidth || 800;
      const viewH = canvas?.clientHeight || 600;
      const w = isMobile ? 240 : 320;
      const h = isMobile ? 180 : 240;
      const newCard = createCard(
        scrollLeft + viewW / 2 - w / 2,
        scrollTop + viewH / 2 - h / 2,
        undefined,
        preset
      );
      if (isMobile) {
        newCard.width = 240;
        newCard.height = 180;
      }
      newCard.opacity = transparency;
      newCard.scale = scale;
      setCards((prev) => [...prev, newCard]);
      setNewCardIds((prev) => new Set(prev).add(newCard.id));
      setTimeout(() => {
        setNewCardIds((prev) => {
          const next = new Set(prev);
          next.delete(newCard.id);
          return next;
        });
      }, 500);
    },
    [transparency, scale, isMobile]
  );

  const handleSave = useCallback(() => {
    const data = {
      cards,
      timestamp: Date.now(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `灵感织网_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [cards]);

  const handleExport = useCallback(async () => {
    if (cards.length === 0) return;

    const padding = 40;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    cards.forEach((c) => {
      const w = (isMobile ? 240 : c.width) * c.scale;
      const h = (isMobile ? 180 : c.height) * c.scale;
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + w);
      maxY = Math.max(maxY, c.y + h);
    });

    const exportW = Math.ceil(maxX - minX + padding * 2);
    const exportH = Math.ceil(maxY - minY + padding * 2);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = exportW * 2;
    offCanvas.height = exportH * 2;
    const ctx = offCanvas.getContext('2d')!;
    ctx.scale(2, 2);

    const grd = ctx.createLinearGradient(0, 0, exportW, exportH);
    grd.addColorStop(0, '#f7f3e9');
    grd.addColorStop(1, '#e8e0d2');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, exportW, exportH);

    const { drawCard } = await import('./utils/cardEngine');

    cards.forEach((c) => {
      const w = isMobile ? 240 : c.width;
      const h = isMobile ? 180 : c.height;
      ctx.save();
      ctx.translate(c.x - minX + padding, c.y - minY + padding);
      ctx.scale(c.scale, c.scale);
      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = w * 2;
      cardCanvas.height = h * 2;
      const cardCtx = cardCanvas.getContext('2d')!;
      cardCtx.scale(2, 2);
      drawCard(cardCtx, c, w, h);
      ctx.drawImage(cardCanvas, 0, 0, w, h);
      ctx.restore();
    });

    offCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `情绪板_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [cards, isMobile]);

  const connectionLines = useMemo(() => {
    return connectionsRef.current.map((conn, i) => {
      const from = cards.find((c) => c.id === conn.from);
      const to = cards.find((c) => c.id === conn.to);
      if (!from || !to) return null;
      const a = getCardCenter(from);
      const b = getCardCenter(to);
      const dist = distance(a, b);
      const threshold = 30 + spacing;
      if (dist > threshold + 100) return null;
      const alpha = Math.max(0, Math.min(0.6, 1 - (dist - threshold) / 100));
      return (
        <svg
          key={i}
          className="connection-line"
          style={{
            left: Math.min(a.x, b.x) - 5,
            top: Math.min(a.y, b.y) - 5,
            width: Math.abs(b.x - a.x) + 10,
            height: Math.abs(b.y - a.y) + 10,
          }}
        >
          <line
            x1={a.x < b.x ? 5 : Math.abs(b.x - a.x) + 5}
            y1={a.y < b.y ? 5 : Math.abs(b.y - a.y) + 5}
            x2={a.x < b.x ? Math.abs(b.x - a.x) + 5 : 5}
            y2={a.y < b.y ? Math.abs(b.y - a.y) + 5 : 5}
            stroke="#48dbfb"
            strokeWidth="2"
            strokeDasharray="6 6"
            opacity={alpha}
          />
        </svg>
      );
    });
  }, [cards, spacing, getCardCenter]);

  return (
    <div className="app">
      <Toolbar
        onAddElement={() => setModalOpen(true)}
        onSave={handleSave}
        onExport={handleExport}
      />
      <div className="main-content">
        <ControlPanel
          transparency={transparency}
          scale={scale}
          spacing={spacing}
          keyword={keyword}
          mobileOpen={mobilePanelOpen}
          onTransparencyChange={setTransparency}
          onScaleChange={setScale}
          onSpacingChange={setSpacing}
          onKeywordChange={setKeyword}
          onGenerate={handleGenerate}
          onAddPreset={handleAddPreset}
          onCloseMobile={() => setMobilePanelOpen(false)}
        />
        <div className="canvas-area" ref={canvasRef} onClick={handleCanvasClick}>
          <div className="canvas-inner">
            {connectionLines}
            {cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onDragStart={handleDragStart}
                onClick={handleCardClick}
                enterAnimation={newCardIds.has(card.id)}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>
        <button
          className="mobile-toggle"
          onClick={() => setMobilePanelOpen((v) => !v)}
          style={{ display: isMobile ? 'flex' : 'none' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <PresetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleAddPreset}
      />
    </div>
  );
};

export default App;
