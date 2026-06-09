import React, { useState, useRef, useEffect } from 'react';

export interface CapsuleFormData {
  emotionColor: string;
  text: string;
  drawing: Array<{ x: number; y: number; color: string }>;
  unlockAt: number;
  author: string;
}

interface CapsuleFormProps {
  initialColor: string;
  onSubmit: (data: CapsuleFormData) => void;
  onCancel: () => void;
}

const EMOTION_COLORS = [
  '#e74c3c', '#e67e22', '#f39c12', '#f1c40f',
  '#d4ac0d', '#2ecc71', '#27ae60', '#1abc9c',
  '#3498db', '#2980b9', '#8e44ad', '#9b59b6'
];

const PALETTE_COLORS = [
  '#000000', '#ffffff', '#e74c3c', '#e67e22',
  '#f39c12', '#f1c40f', '#2ecc71', '#27ae60',
  '#3498db', '#2980b9', '#9b59b6', '#8e44ad',
  '#e91e63', '#795548', '#95a5a6', '#34495e'
];

const TIME_OPTIONS = [
  { label: '1小时', value: 60 * 60 * 1000 },
  { label: '1天', value: 24 * 60 * 60 * 1000 },
  { label: '1周', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '立即', value: 0 },
];

const GRID_SIZE = 40;

export const CapsuleForm: React.FC<CapsuleFormProps> = ({
  initialColor,
  onSubmit,
  onCancel,
}) => {
  const [emotionColor, setEmotionColor] = useState(initialColor);
  const [text, setText] = useState('');
  const [selectedPaintColor, setSelectedPaintColor] = useState(PALETTE_COLORS[2]);
  const [drawing, setDrawing] = useState<Array<{ x: number; y: number; color: string }>>([]);
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[0].value);
  const [author, setAuthor] = useState('时光旅人');
  const [isDrawing, setIsDrawing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const emotionSegments = EMOTION_COLORS.map((color, i) => {
    const startAngle = (i / EMOTION_COLORS.length) * Math.PI * 2 - Math.PI / 2;
    const endAngle = ((i + 1) / EMOTION_COLORS.length) * Math.PI * 2 - Math.PI / 2;
    const outerRadius = 70;
    const innerRadius = 40;
    const x1 = 75 + Math.cos(startAngle) * outerRadius;
    const y1 = 75 + Math.sin(startAngle) * outerRadius;
    const x2 = 75 + Math.cos(endAngle) * outerRadius;
    const y2 = 75 + Math.sin(endAngle) * outerRadius;
    const x3 = 75 + Math.cos(endAngle) * innerRadius;
    const y3 = 75 + Math.sin(endAngle) * innerRadius;
    const x4 = 75 + Math.cos(startAngle) * innerRadius;
    const y4 = 75 + Math.sin(startAngle) * innerRadius;
    return {
      color,
      path: `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`,
    };
  });

  const paintPixel = (x: number, y: number) => {
    setDrawing(prev => {
      const filtered = prev.filter(p => !(p.x === x && p.y === y));
      if (selectedPaintColor === '#ffffff') {
        return filtered;
      }
      return [...filtered, { x, y, color: selectedPaintColor }];
    });
  };

  const handleGridMouseDown = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    setIsDrawing(true);
    paintPixel(x, y);
  };

  const handleGridMouseEnter = (x: number, y: number) => {
    if (isDrawing) {
      paintPixel(x, y);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDrawing(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const getPixelColor = (x: number, y: number): string | null => {
    const pixel = drawing.find(p => p.x === x && p.y === y);
    return pixel ? pixel.color : null;
  };

  const handleSubmit = () => {
    if (!text.trim() && drawing.length === 0) {
      return;
    }
    const unlockAt = selectedTime > 0 ? Date.now() + selectedTime : 0;
    onSubmit({
      emotionColor,
      text,
      drawing,
      unlockAt,
      author,
    });
  };

  const clearDrawing = () => {
    setDrawing([]);
  };

  return (
    <div className="form-overlay" onClick={onCancel}>
      <div className="form-container" onClick={(e) => e.stopPropagation()}>
        <div className="form-title">✨ 封印你的时光胶囊 ✨</div>

        <div className="form-section">
          <label className="form-label">选择你的署名</label>
          <input
            type="text"
            className="text-input"
            style={{ minHeight: 'auto', padding: '8px 12px' }}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={20}
            placeholder="你的名字..."
          />
        </div>

        <div className="form-section">
          <label className="form-label">此刻的情绪颜色</label>
          <div className="color-wheel">
            <svg className="color-wheel-svg" viewBox="0 0 150 150">
              {emotionSegments.map((seg, i) => (
                <path
                  key={i}
                  className="color-segment"
                  d={seg.path}
                  fill={seg.color}
                  stroke={emotionColor === seg.color ? '#ffffff' : 'none'}
                  strokeWidth={emotionColor === seg.color ? 3 : 0}
                  onClick={() => setEmotionColor(seg.color)}
                />
              ))}
              <circle
                cx="75"
                cy="75"
                r="25"
                fill={emotionColor}
                stroke="#8b4513"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">给未来的留言（最多140字）</label>
          <textarea
            className="text-input"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 140))}
            placeholder="写下此刻的心情、记忆或对未来的期许..."
            maxLength={140}
          />
          <div className="char-count">{text.length}/140</div>
        </div>

        <div className="form-section">
          <label className="form-label">随手画点什么吧 🎨</label>
          <div
            className="pixel-canvas"
            ref={gridRef}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const color = getPixelColor(x, y);
              return (
                <div
                  key={i}
                  className="pixel-cell"
                  style={{ background: color || '#faf6e8' }}
                  onMouseDown={(e) => handleGridMouseDown(e, x, y)}
                  onMouseEnter={() => handleGridMouseEnter(x, y)}
                />
              );
            })}
          </div>
          <div className="color-palette">
            {PALETTE_COLORS.map((color, i) => (
              <div
                key={i}
                className={`palette-color ${selectedPaintColor === color ? 'selected' : ''}`}
                style={{ background: color }}
                onClick={() => setSelectedPaintColor(color)}
              />
            ))}
          </div>
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <button
              type="button"
              className="form-btn secondary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={clearDrawing}
            >
              清空画布
            </button>
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">选择开启时间</label>
          <div className="time-selector">
            {TIME_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className={`time-option ${selectedTime === opt.value ? 'selected' : ''}`}
                onClick={() => setSelectedTime(opt.value)}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        <div className="form-buttons">
          <button className="form-btn secondary" onClick={onCancel}>
            取消
          </button>
          <button
            className="form-btn primary"
            onClick={handleSubmit}
            disabled={!text.trim() && drawing.length === 0}
          >
            🔒 封印胶囊
          </button>
        </div>
      </div>
    </div>
  );
};

export default CapsuleForm;
