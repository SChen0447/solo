import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CharacterType } from '../utils/exportUtils';

const FRAME_SIZE = 32;
const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
type Direction = typeof DIRECTIONS[number];

interface SpritePanelProps {
  characterType: CharacterType;
  onCharacterChange: (type: CharacterType) => void;
  frameDelays: number[];
  onFrameDelaysChange: (delays: number[]) => void;
}

const SpritePanel: React.FC<SpritePanelProps> = ({
  characterType,
  onCharacterChange,
  frameDelays,
  onFrameDelaysChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentDirection, setCurrentDirection] = useState<Direction>('down');
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  const drawKnightFrame = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) => {
    const cx = x + FRAME_SIZE / 2;
    const cy = y + FRAME_SIZE / 2;
    const size = 16;

    ctx.fillStyle = '#333';
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);

    ctx.fillStyle = '#888';
    ctx.fillRect(cx - size / 2 + 2, cy - size / 2 + 2, size - 4, size - 4);

    ctx.fillStyle = '#fff';
    const offset = frame % 2 === 0 ? 0 : 1;
    if (direction === 'up') {
      ctx.fillRect(cx - 4, cy - 4 + offset, 2, 2);
      ctx.fillRect(cx + 2, cy - 4 + offset, 2, 2);
    } else if (direction === 'down') {
      ctx.fillRect(cx - 4, cy + 2 + offset, 2, 2);
      ctx.fillRect(cx + 2, cy + 2 + offset, 2, 2);
    } else if (direction === 'left') {
      ctx.fillRect(cx - 5 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx - 5 + offset, cy + 2, 2, 2);
    } else {
      ctx.fillRect(cx + 3 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx + 3 + offset, cy + 2, 2, 2);
    }
  }, []);

  const drawMouseFrame = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) => {
    const cx = x + FRAME_SIZE / 2;
    const cy = y + FRAME_SIZE / 2;
    const size = 16;

    ctx.fillStyle = '#aaa';
    ctx.fillRect(cx - size / 2 + 1, cy - size / 2 + 3, size - 2, size - 4);

    ctx.fillStyle = '#f9a';
    if (direction === 'up' || direction === 'down') {
      ctx.fillRect(cx - 5, cy - size / 2 + 1, 3, 3);
      ctx.fillRect(cx + 2, cy - size / 2 + 1, 3, 3);
    } else if (direction === 'left') {
      ctx.fillRect(cx - size / 2 + 1, cy - 5, 3, 3);
      ctx.fillRect(cx - size / 2 + 1, cy + 2, 3, 3);
    } else {
      ctx.fillRect(cx + size / 2 - 4, cy - 5, 3, 3);
      ctx.fillRect(cx + size / 2 - 4, cy + 2, 3, 3);
    }

    ctx.fillStyle = '#333';
    const offset = frame % 2 === 0 ? 0 : 1;
    if (direction === 'up') {
      ctx.fillRect(cx - 3, cy - 3 + offset, 2, 2);
      ctx.fillRect(cx + 1, cy - 3 + offset, 2, 2);
    } else if (direction === 'down') {
      ctx.fillRect(cx - 3, cy + 2 + offset, 2, 2);
      ctx.fillRect(cx + 1, cy + 2 + offset, 2, 2);
    } else if (direction === 'left') {
      ctx.fillRect(cx - 5 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx - 5 + offset, cy + 1, 2, 2);
    } else {
      ctx.fillRect(cx + 3 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx + 3 + offset, cy + 1, 2, 2);
    }
  }, []);

  const spriteSheetRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = spriteSheetRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 4; f++) {
        const x = f * FRAME_SIZE;
        const y = d * FRAME_SIZE;
        const direction = DIRECTIONS[d];

        ctx.strokeStyle = '#555';
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(x + 0.5, y + 0.5, FRAME_SIZE - 1, FRAME_SIZE - 1);
        ctx.setLineDash([]);

        const isHighlighted = direction === currentDirection && f === currentFrame;
        if (isHighlighted) {
          ctx.strokeStyle = '#5b9bd5';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, FRAME_SIZE - 2, FRAME_SIZE - 2);
          ctx.lineWidth = 1;
        }

        if (characterType === 'knight') {
          drawKnightFrame(ctx, x, y, direction, f);
        } else {
          drawMouseFrame(ctx, x, y, direction, f);
        }
      }
    }
  }, [characterType, currentDirection, currentFrame, drawKnightFrame, drawMouseFrame]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      accumulatorRef.current += delta;

      const dirIndex = DIRECTIONS.indexOf(currentDirection);
      const delay = frameDelays[dirIndex * 4 + currentFrame] || 100;

      if (accumulatorRef.current >= delay) {
        accumulatorRef.current = 0;
        setCurrentFrame(prev => {
          const next = (prev + 1) % 4;
          if (next === 0) {
            setCurrentDirection(prevDir => {
              const idx = DIRECTIONS.indexOf(prevDir);
              return DIRECTIONS[(idx + 1) % 4];
            });
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, currentDirection, currentFrame, frameDelays]);

  const handleFrameDelayChange = (index: number, value: number) => {
    const newDelays = [...frameDelays];
    newDelays[index] = value;
    onFrameDelaysChange(newDelays);
  };

  const handleGlobalDelayChange = (value: number) => {
    const newDelays = new Array(16).fill(value);
    onFrameDelaysChange(newDelays);
  };

  const globalDelay = frameDelays.length > 0 ? frameDelays[0] : 100;

  return (
    <div className="sprite-panel">
      <h3 className="panel-title">角色精灵设置</h3>

      <div className="panel-section">
        <label className="panel-label">角色类型</label>
        <select
          className="panel-select"
          value={characterType}
          onChange={(e) => onCharacterChange(e.target.value as CharacterType)}
        >
          <option value="knight">骑士</option>
          <option value="mouse">老鼠</option>
        </select>
      </div>

      <div className="panel-section">
        <label className="panel-label">精灵帧表 (4×4)</label>
        <canvas
          ref={spriteSheetRef}
          width={FRAME_SIZE * 4}
          height={FRAME_SIZE * 4}
          className="sprite-sheet"
        />
        <div className="direction-labels">
          <span>上</span>
          <span>下</span>
          <span>左</span>
          <span>右</span>
        </div>
      </div>

      <div className="panel-section">
        <div className="play-controls">
          <button
            className="play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
          <span className="frame-info">
            方向: {currentDirection === 'up' ? '上' : currentDirection === 'down' ? '下' : currentDirection === 'left' ? '左' : '右'} · 帧 {currentFrame + 1}/4
          </span>
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">
          全局帧延迟: <span className="delay-value">{globalDelay}ms</span>
        </label>
        <input
          type="range"
          min={50}
          max={300}
          step={10}
          value={globalDelay}
          onChange={(e) => handleGlobalDelayChange(Number(e.target.value))}
          className="delay-slider"
        />
      </div>

      <div className="panel-section">
        <label className="panel-label">各方向帧延迟 (50-300ms, 步长10)</label>
        <div className="frame-delay-grid">
          {DIRECTIONS.map((dir, dirIdx) => (
            <div key={dir} className="direction-delay-group">
              <span className="direction-label">{dir === 'up' ? '上' : dir === 'down' ? '下' : dir === 'left' ? '左' : '右'}</span>
              {[0, 1, 2, 3].map(frameIdx => {
                const idx = dirIdx * 4 + frameIdx;
                return (
                  <div key={idx} className="frame-delay-item">
                    <span>F{frameIdx + 1}: {frameDelays[idx] || 100}ms</span>
                    <input
                      type="range"
                      min={50}
                      max={300}
                      step={10}
                      value={frameDelays[idx] || 100}
                      onChange={(e) => handleFrameDelayChange(idx, Number(e.target.value))}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpritePanel;
