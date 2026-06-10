import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TextItem,
  DrawPath,
  WeatherType,
  Postcard,
  generateId,
  generateShareCode,
  savePostcard,
  loadPostcards,
  deletePostcard,
  getPostcardById,
  WeatherParticleSystem
} from './utils';

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 500;
const BG_COLOR = '#f9f6ee';

const PALETTE = [
  '#000000', '#e53935', '#fb8c00', '#fdd835',
  '#43a047', '#1e88e5', '#3949ab', '#8e24aa',
  '#6d4c41', '#90a4ae', '#ff7043', '#26c6da'
];

const WEATHER_OPTIONS: { value: WeatherType; label: string; icon: string }[] = [
  { value: 'sunny', label: '晴空', icon: '☀️' },
  { value: 'rain', label: '小雨', icon: '🌧️' },
  { value: 'snow', label: '大雪', icon: '❄️' },
  { value: 'sunset', label: '晚霞', icon: '🌅' }
];

const PostcardEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const particleSystemRef = useRef<WeatherParticleSystem | null>(null);

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [weatherType, setWeatherType] = useState<WeatherType>('sunny');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(8);
  const [newText, setNewText] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showUploadAnimation, setShowUploadAnimation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    setPostcards(loadPostcards());
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
        const x = (CANVAS_WIDTH - img.width * scale) / 2;
        const y = (CANVAS_HEIGHT - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        drawPathsOnTop(ctx);
      };
      img.src = backgroundImage;
    } else {
      drawPathsOnTop(ctx);
    }
  }, [backgroundImage, drawPaths, textItems]);

  const drawPathsOnTop = (ctx: CanvasRenderingContext2D) => {
    for (const path of drawPaths) {
      if (path.points.length < 2) continue;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    }

    ctx.font = '24px "Ma Shan Zheng", "ZCOOL KuaiLe", cursive';
    ctx.textBaseline = 'top';
    for (const item of textItems) {
      ctx.font = `${item.fontSize}px "Ma Shan Zheng", "ZCOOL KuaiLe", cursive`;
      ctx.fillStyle = '#2c2c2c';
      ctx.fillText(item.content, item.x, item.y);
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particleSystemRef.current) {
      particleSystemRef.current.destroy();
    }

    particleSystemRef.current = new WeatherParticleSystem(
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      weatherType,
      () => {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (particleSystemRef.current) {
          particleSystemRef.current.render(ctx);
        }
      }
    );
    particleSystemRef.current.start();

    return () => {
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
      }
    };
  }, [weatherType]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoords(e);
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);
    setCurrentPath(prev => [...prev, { x, y }]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentPath.length > 0) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleDrawEnd = () => {
    if (isDrawing && currentPath.length > 1) {
      setDrawPaths(prev => [...prev, {
        points: currentPath,
        color: currentColor,
        thickness: brushSize
      }]);
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowUploadAnimation(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        setBackgroundImage(event.target?.result as string);
        setShowUploadAnimation(false);
      }, 600);
    };
    reader.readAsDataURL(file);
  };

  const handleAddText = () => {
    if (!newText.trim()) return;
    const item: TextItem = {
      id: generateId(),
      content: newText,
      x: 50 + Math.random() * 50,
      y: 50 + Math.random() * 100,
      fontSize: 24
    };
    setTextItems(prev => [...prev, item]);
    setNewText('');
  };

  const handleTextMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const item = textItems.find(t => t.id === id);
    if (!item) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    setDraggingTextId(id);
    setDragOffset({
      x: (e.clientX - rect.left) * scaleX - item.x,
      y: (e.clientY - rect.top) * scaleY - item.y
    });
  };

  const handleTextMouseMove = (e: React.MouseEvent) => {
    if (!draggingTextId) return;
    const { x, y } = getCanvasCoords(e);
    setTextItems(prev => prev.map(item =>
      item.id === draggingTextId
        ? { ...item, x: Math.max(0, Math.min(CANVAS_WIDTH - 50, x - dragOffset.x)), y: Math.max(0, Math.min(CANVAS_HEIGHT - 30, y - dragOffset.y)) }
        : item
    ));
  };

  const handleTextMouseUp = () => {
    setDraggingTextId(null);
  };

  const handleRemoveText = (id: string) => {
    setTextItems(prev => prev.filter(t => t.id !== id));
  };

  const handleUndo = () => {
    setDrawPaths(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDrawPaths([]);
    setTextItems([]);
    setBackgroundImage(null);
  };

  const generateThumbnail = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 160;
    thumbCanvas.height = 220;
    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(canvas, 0, 0, 160, 220);
    return thumbCanvas.toDataURL('image/jpeg', 0.7);
  };

  const handleMail = async () => {
    const shareCode = generateShareCode();
    const id = editingId || generateId();

    const postcard: Postcard = {
      id,
      shareCode,
      backgroundImage,
      backgroundColor: BG_COLOR,
      textItems,
      drawPaths,
      weatherType,
      createdAt: Date.now(),
      thumbnail: generateThumbnail()
    };

    savePostcard(postcard);
    setPostcards(loadPostcards());

    const link = `${window.location.origin}/postcard/${shareCode}`;
    setShareLink(link);
    setCopied(true);

    try {
      await navigator.clipboard.writeText(link);
    } catch (e) {
      console.log('复制失败');
    }

    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditPostcard = (id: string) => {
    const pc = getPostcardById(id);
    if (!pc) return;
    setEditingId(id);
    setBackgroundImage(pc.backgroundImage);
    setTextItems(pc.textItems);
    setDrawPaths(pc.drawPaths);
    setWeatherType(pc.weatherType);
  };

  const handleDeletePostcard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deletePostcard(id);
    setPostcards(loadPostcards());
    if (editingId === id) {
      setEditingId(null);
      handleClear();
    }
  };

  const handleNewPostcard = () => {
    setEditingId(null);
    handleClear();
    setShareLink('');
  };

  return (
    <div className="editor-container">
      <style>{`
        .editor-container {
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(135deg, #f5f0e6 0%, #e8e0d0 100%);
        }
        .editor-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .editor-header h1 {
          font-family: 'Ma Shan Zheng', cursive;
          font-size: 42px;
          color: #5d4037;
          margin-bottom: 8px;
        }
        .editor-header p {
          color: #8d6e63;
          font-size: 14px;
        }
        .editor-layout {
          display: flex;
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .canvas-section {
          flex: 0 0 60%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .canvas-wrapper {
          position: relative;
          width: 350px;
          height: 500px;
          border-radius: 8px;
          box-shadow: 0 20px 60px rgba(93, 64, 55, 0.25), 0 4px 12px rgba(93, 64, 55, 0.1);
          overflow: hidden;
        }
        .canvas-wrapper canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .draw-canvas {
          z-index: 2;
          cursor: crosshair;
          touch-action: none;
        }
        .particle-canvas {
          z-index: 3;
          pointer-events: none;
          opacity: 0.8;
        }
        .text-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 4;
          pointer-events: none;
        }
        .text-item {
          position: absolute;
          font-family: 'Ma Shan Zheng', cursive;
          color: #2c2c2c;
          cursor: move;
          pointer-events: auto;
          user-select: none;
          padding: 4px;
          border-radius: 4px;
        }
        .text-item:hover {
          background: rgba(255, 138, 101, 0.15);
          outline: 1px dashed rgba(255, 138, 101, 0.5);
        }
        .text-item .remove-btn {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e53935;
          color: white;
          border: none;
          font-size: 12px;
          line-height: 20px;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
        }
        .text-item:hover .remove-btn {
          display: flex;
        }
        .upload-animation {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          pointer-events: none;
          background: radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, transparent 70%);
          animation: expandCircle 0.6s ease-out forwards;
        }
        @keyframes expandCircle {
          0% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: scale(3); }
        }
        .canvas-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .control-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .control-panel {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(93, 64, 55, 0.08);
        }
        .control-title {
          font-size: 16px;
          font-weight: 600;
          color: #5d4037;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .palette {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .color-swatch {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .color-swatch:hover {
          transform: scale(1.1);
        }
        .color-swatch.active {
          border-color: #ff8a65;
          transform: scale(1.15);
          box-shadow: 0 0 0 3px rgba(255, 138, 101, 0.3);
        }
        .brush-slider {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brush-slider input[type="range"] {
          flex: 1;
          accent-color: #ff8a65;
        }
        .brush-preview {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          border-radius: 8px;
        }
        .brush-dot {
          background: currentColor;
          border-radius: 50%;
        }
        .weather-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .weather-option {
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          text-align: center;
          background: #fafafa;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .weather-option:hover {
          background: #fff3e0;
        }
        .weather-option.active {
          border-color: #ff8a65;
          background: #fff3e0;
        }
        .weather-option .icon {
          font-size: 24px;
          display: block;
          margin-bottom: 4px;
        }
        .weather-option .label {
          font-size: 13px;
          color: #5d4037;
        }
        .text-input-row {
          display: flex;
          gap: 8px;
        }
        .text-input-row input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: 'Ma Shan Zheng', cursive;
          outline: none;
          transition: border-color 0.2s;
        }
        .text-input-row input:focus {
          border-color: #ff8a65;
        }
        .btn {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-secondary {
          background: #f5f5f5;
          color: #5d4037;
        }
        .btn-secondary:hover {
          background: #eeeeee;
        }
        .btn-primary {
          background: linear-gradient(135deg, #ff8a65 0%, #ff7060 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(255, 112, 96, 0.3);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(255, 112, 96, 0.4);
        }
        .btn-primary:active {
          transform: translateY(0);
          background: linear-gradient(135deg, #ff7060 0%, #e64a19 100%);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .mail-btn {
          width: 100%;
          padding: 14px;
          font-size: 16px;
          margin-top: 8px;
        }
        .copy-success {
          text-align: center;
          padding: 10px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 8px;
          margin-top: 10px;
          font-size: 13px;
          animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .share-link-display {
          padding: 10px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-top: 10px;
          font-size: 12px;
          color: #666;
          word-break: break-all;
          font-family: monospace;
        }
        .my-postcards {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(93, 64, 55, 0.08);
        }
        .postcards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          max-height: 320px;
          overflow-y: auto;
        }
        .postcard-card {
          position: relative;
          width: 100%;
          aspect-ratio: 160 / 220;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(93, 64, 55, 0.15);
          transition: all 0.25s;
        }
        .postcard-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(93, 64, 55, 0.25);
        }
        .postcard-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .postcard-card .card-delete {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(229, 57, 53, 0.9);
          color: white;
          border: none;
          font-size: 14px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .postcard-card:hover .card-delete {
          opacity: 1;
        }
        .empty-hint {
          text-align: center;
          color: #aaa;
          font-size: 13px;
          padding: 30px 0;
        }
        @media (max-width: 768px) {
          .editor-layout {
            flex-direction: column;
          }
          .canvas-section {
            flex: none;
          }
          .canvas-wrapper {
            width: min(350px, 90vw);
            height: min(500px, 128vw);
          }
        }
      `}</style>

      <div className="editor-header">
        <h1>✉️ 时光明信片</h1>
        <p>绘制一张带着天气和温度的明信片，寄给远方的朋友</p>
      </div>

      <div className="editor-layout">
        <div className="canvas-section">
          <div
            className="canvas-wrapper"
            onMouseMove={handleTextMouseMove}
            onMouseUp={handleTextMouseUp}
            onMouseLeave={handleTextMouseUp}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="draw-canvas"
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            />
            <canvas
              ref={particleCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="particle-canvas"
            />
            <div className="text-layer">
              {textItems.map(item => (
                <div
                  key={item.id}
                  className="text-item"
                  style={{
                    left: `${(item.x / CANVAS_WIDTH) * 100}%`,
                    top: `${(item.y / CANVAS_HEIGHT) * 100}%`,
                    fontSize: `${item.fontSize}px`
                  }}
                  onMouseDown={(e) => handleTextMouseDown(e, item.id)}
                >
                  {item.content}
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveText(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {showUploadAnimation && <div className="upload-animation" />}
          </div>

          <div className="canvas-actions">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              📷 上传背景
            </button>
            <button className="btn btn-secondary" onClick={handleUndo}>
              ↩️ 撤销
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              🗑️ 清空
            </button>
            <button className="btn btn-secondary" onClick={handleNewPostcard}>
              ✨ 新建
            </button>
          </div>
        </div>

        <div className="control-section">
          <div className="control-panel">
            <div className="control-title">🎨 画笔调色板</div>
            <div className="palette">
              {PALETTE.map(color => (
                <div
                  key={color}
                  className={`color-swatch ${currentColor === color ? 'active' : ''}`}
                  style={{ background: color, color }}
                  onClick={() => setCurrentColor(color)}
                />
              ))}
            </div>
            <div className="brush-slider">
              <span style={{ fontSize: 13, color: '#666' }}>粗细</span>
              <input
                type="range"
                min="5"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
              <div className="brush-preview" style={{ color: currentColor }}>
                <div
                  className="brush-dot"
                  style={{ width: brushSize, height: brushSize }}
                />
              </div>
            </div>
          </div>

          <div className="control-panel">
            <div className="control-title">🌤️ 天气效果</div>
            <div className="weather-options">
              {WEATHER_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  className={`weather-option ${weatherType === opt.value ? 'active' : ''}`}
                  onClick={() => setWeatherType(opt.value)}
                >
                  <span className="icon">{opt.icon}</span>
                  <span className="label">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="control-panel">
            <div className="control-title">✍️ 手写文字</div>
            <div className="text-input-row">
              <input
                type="text"
                placeholder="输入文字..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              />
              <button className="btn btn-secondary" onClick={handleAddText}>
                添加
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 10 }}>
              💡 添加后可在画布上拖动文字调整位置
            </p>
          </div>

          <div className="control-panel">
            <button className="btn btn-primary mail-btn" onClick={handleMail}>
              📮 邮寄明信片
            </button>
            {shareLink && (
              <div className="share-link-display">{shareLink}</div>
            )}
            {copied && (
              <div className="copy-success">✅ 链接已复制到剪贴板！</div>
            )}
          </div>

          <div className="my-postcards">
            <div className="control-title">📬 我的明信片 ({postcards.length})</div>
            {postcards.length === 0 ? (
              <div className="empty-hint">还没有明信片，创作第一张吧～</div>
            ) : (
              <div className="postcards-grid">
                {postcards.map(pc => (
                  <div
                    key={pc.id}
                    className="postcard-card"
                    onClick={() => handleEditPostcard(pc.id)}
                    title="点击编辑"
                  >
                    <img src={pc.thumbnail} alt="明信片缩略图" />
                    <button
                      className="card-delete"
                      onClick={(e) => handleDeletePostcard(e, pc.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostcardEditor;
