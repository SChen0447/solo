import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Habitat, habitatColors, habitats } from '../data/bioData';

interface PuzzleGameProps {
  habitat: Habitat;
  onClose: () => void;
}

interface Tile {
  id: number;
  habitatType: Habitat;
  isCorrect: boolean;
}

const habitatTileEmojis: Record<Habitat, string[]> = {
  '浅海': ['🐠', '🐚', '🌊', '🪸', '🐬', '🦀', '🐙', '🏝️', '🌴', '☀️', '🐟', '🏊', '⚓', '🚤', '🪼', '🦑'],
  '深海热泉': ['🔥', '🌋', '💨', '⚡', '🦐', '🐚', '🪸', '🌸', '🔥', '🌡️', '⚙️', '🛡️', '💥', '🪨', '🔴', '🟠'],
  '极地冰洋': ['❄️', '🧊', '🐧', '🐋', '🦭', '⚓', '🌨️', '💎', '🔷', '⬜', '🐟', '🦈', '🎿', '🏔️', '⭐', '💠'],
  '深渊平原': ['🌑', '💡', '👀', '🦑', '🪲', '😢', '🔮', '⚫', '🖤', '🌊', '🕳️', '⚰️', '💀', '🔱', '🌌', '🔵']
};

const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const createInitialTiles = (targetHabitat: Habitat): Tile[] => {
  const tiles: Tile[] = [];
  const emojis = habitatTileEmojis[targetHabitat];
  for (let i = 0; i < 4; i++) {
    habitats.forEach((h) => {
      tiles.push({
        id: tiles.length,
        habitatType: h,
        isCorrect: h === targetHabitat
      });
    });
  }
  tiles.forEach((tile, idx) => {
    (tile as Tile & { emoji: string }).emoji = emojis[idx % emojis.length];
  });
  return shuffle(tiles);
};

export const PuzzleGame = ({ habitat, onClose }: PuzzleGameProps) => {
  const [tiles, setTiles] = useState<Tile[]>(() => createInitialTiles(habitat));
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sparklesRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 }
    );
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { y: 50, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)', delay: 0.1 }
      );
    }
  }, []);

  useEffect(() => {
    if (!isComplete) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isComplete]);

  useEffect(() => {
    const sortedHabitats = tiles.map(t => t.habitatType);
    const correct = tiles.every(t => t.habitatType === habitat);
    if (correct && !isComplete) {
      handleComplete();
    }
  }, [tiles, habitat, isComplete]);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const colors = ['#ff0080', '#ff8c00', '#ffed00', '#00ff88', '#00d4ff', '#8a2be2', '#ff0080'];
    sparklesRef.current = [];

    if (containerRef.current) {
      for (let i = 0; i < 50; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.background = colors[i % colors.length];
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        sparkle.style.boxShadow = `0 0 10px ${colors[i % colors.length]}, 0 0 20px ${colors[i % colors.length]}`;
        containerRef.current.appendChild(sparkle);
        sparklesRef.current.push(sparkle);

        gsap.fromTo(
          sparkle,
          { scale: 0, opacity: 0 },
          {
            scale: 2 + Math.random() * 3,
            opacity: 1,
            duration: 0.3 + Math.random() * 0.5,
            delay: Math.random() * 0.5,
            yoyo: true,
            repeat: 3 + Math.floor(Math.random() * 3),
            ease: 'power2.out'
          }
        );

        gsap.to(sparkle, {
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
          rotation: Math.random() * 360,
          duration: 1 + Math.random() * 1,
          delay: Math.random() * 0.5,
          ease: 'power2.out'
        });
      }
    }
  }, []);

  const handleTileClick = useCallback((index: number) => {
    if (isComplete) return;

    if (selectedTile === null) {
      setSelectedTile(index);
      return;
    }

    if (selectedTile === index) {
      setSelectedTile(null);
      return;
    }

    const row1 = Math.floor(selectedTile / 4);
    const col1 = selectedTile % 4;
    const row2 = Math.floor(index / 4);
    const col2 = index % 4;

    const isAdjacent =
      (Math.abs(row1 - row2) === 1 && col1 === col2) ||
      (Math.abs(col1 - col2) === 1 && row1 === row2);

    if (isAdjacent) {
      setTiles(prev => {
        const next = [...prev];
        [next[selectedTile], next[index]] = [next[index], next[selectedTile]];
        return next;
      });
      setMoves(m => m + 1);
    }

    setSelectedTile(null);
  }, [selectedTile, isComplete]);

  const handleRestart = useCallback(() => {
    sparklesRef.current.forEach(s => s.remove());
    sparklesRef.current = [];
    setTiles(createInitialTiles(habitat));
    setSelectedTile(null);
    setMoves(0);
    setElapsed(0);
    setIsComplete(false);
    startTimeRef.current = Date.now();
  }, [habitat]);

  const closeGame = useCallback(() => {
    sparklesRef.current.forEach(s => s.remove());
    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: onClose
      });
    } else {
      onClose();
    }
  }, [onClose]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={overlayRef}
      className="puzzle-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) closeGame();
      }}
    >
      <div ref={containerRef} className="puzzle-container">
        <button className="puzzle-close" onClick={closeGame}>✕</button>

        <div className="puzzle-header">
          <div>
            <div className="puzzle-title">🧩 栖息地拼图挑战</div>
            <span
              className="puzzle-habitat"
              style={{ background: habitatColors[habitat] }}
            >
              目标：{habitat}
            </span>
          </div>
          <div className="puzzle-stats">
            <div>
              <strong>{moves}</strong>
              <span>步数</span>
            </div>
            <div>
              <strong>{formatTime(elapsed)}</strong>
              <span>用时</span>
            </div>
          </div>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '13px',
          color: '#6ea8c4',
          marginBottom: '16px'
        }}>
          点击两块相邻碎片进行交换，将所有 <strong style={{ color: '#00d4ff' }}>{habitat}</strong> 风格碎片拼满整个网格
        </p>

        <div className="puzzle-grid">
          {tiles.map((tile, index) => {
            const tileEmojis = habitatTileEmojis[tile.habitatType];
            const emoji = tileEmojis[(tile.id + index) % tileEmojis.length];
            const isSelected = selectedTile === index;
            const isTarget = tile.habitatType === habitat;

            return (
              <div
                key={`${tile.id}-${index}`}
                className={`puzzle-tile ${isSelected ? 'dragging' : ''} ${isComplete && isTarget ? 'correct' : ''}`}
                onClick={() => handleTileClick(index)}
                style={{
                  background: habitatColors[tile.habitatType],
                  border: isSelected ? '3px solid #00d4ff' : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: isSelected ? '0 0 20px rgba(0,212,255,0.8)' : 'none',
                  filter: isTarget || isComplete ? 'none' : 'brightness(0.85) saturate(0.7)'
                }}
              >
                <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>{emoji}</span>
              </div>
            );
          })}
        </div>

        <div className="puzzle-controls">
          <button className="puzzle-btn puzzle-btn-restart" onClick={handleRestart}>
            🔄 重新开始
          </button>
        </div>

        {isComplete && (
          <div className="puzzle-victory active">
            <div className="victory-text">🎉 完成!</div>
            <div className="victory-sub">成功还原了 {habitat} 栖息地</div>
            <div className="victory-time">
              用时 {formatTime(elapsed)} · {moves} 步
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
