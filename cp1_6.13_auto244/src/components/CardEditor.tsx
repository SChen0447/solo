import { useRef, useState, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { User, PostcardData } from '../App';

interface CardEditorProps {
  user: User;
  editingCard: PostcardData | null;
  onBack: () => void;
  onSaveComplete: () => void;
}

interface Line {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

const COLORS = ['#f472b6', '#a78bfa', '#6ee7b7', '#fcd34d'];

const EMOTIONS = [
  { key: 'happy', label: '快乐', color: '#fbbf24' },
  { key: 'sad', label: '忧伤', color: '#60a5fa' },
  { key: 'surprise', label: '惊喜', color: '#f472b6' },
  { key: 'calm', label: '宁静', color: '#34d399' },
  { key: 'passionate', label: '热烈', color: '#ef4444' },
  { key: 'mysterious', label: '神秘', color: '#8b5cf6' },
];

function CardEditor({ user, editingCard, onBack, onSaveComplete }: CardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [currentLine, setCurrentLine] = useState<Line | null>(null);
  const [imageData, setImageData] = useState<string>('');
  const [emotion, setEmotion] = useState<string | null>(null);
  const [showAccessCode, setShowAccessCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const emotionRef = useRef<string | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (editingCard) {
      setLines(editingCard.lines || []);
      setImageData(editingCard.imageData || '');
      setEmotion(editingCard.emotion || null);
      emotionRef.current = editingCard.emotion || null;
      if (editingCard.imageData) {
        const img = new Image();
        img.onload = () => {
          bgImageRef.current = img;
          redrawCanvas();
        };
        img.src = editingCard.imageData;
      }
    }
  }, [editingCard]);

  const getCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    return { width: 600, height: 800 };
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasSize();
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    if (bgImageRef.current) {
      const img = bgImageRef.current;
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.3)');
      gradient.addColorStop(1, 'rgba(30, 27, 75, 0.5)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    const allLines = currentLine ? [...lines, currentLine] : lines;
    allLines.forEach((line) => {
      if (line.points.length < 2) return;
      
      ctx.save();
      ctx.shadowColor = line.color;
      ctx.shadowBlur = line.width < 5 ? 2 : 3;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });

    if (emotionRef.current) {
      const emotionColor = EMOTIONS.find(e => e.key === emotionRef.current)?.color;
      if (emotionColor) {
        ctx.save();
        ctx.globalCompositeOperation = 'hue';
        ctx.fillStyle = emotionColor;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }, [lines, currentLine, getCanvasSize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const width = 3 + Math.random() * 5;
    const newLine: Line = {
      points: [pos],
      color,
      width,
    };
    setCurrentLine(newLine);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentLine) return;
    const pos = getPos(e);
    setCurrentLine({
      ...currentLine,
      points: [...currentLine.points, pos],
    });
  };

  const stopDrawing = () => {
    if (isDrawing && currentLine && currentLine.points.length > 1) {
      setLines([...lines, currentLine]);
    }
    setIsDrawing(false);
    setCurrentLine(null);
  };

  const handleEmotionSelect = (emotionKey: string) => {
    const newEmotion = emotion === emotionKey ? null : emotionKey;
    setEmotion(newEmotion);
    emotionRef.current = newEmotion;
    
    const canvas = canvasRef.current;
    if (canvas) {
      gsap.to(canvas, {
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => redrawCanvas(),
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageData(dataUrl);
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
        redrawCanvas();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setLines([]);
    setImageData('');
    bgImageRef.current = null;
    redrawCanvas();
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const res = await fetch('/api/postcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          imageData,
          lines,
          emotion,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setShowAccessCode(data.accessCode);
        gsap.fromTo(
          '.access-code-popup',
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' }
        );
      }
    } catch (err) {
      console.error('保存失败', err);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const copyAccessCode = () => {
    if (showAccessCode) {
      navigator.clipboard.writeText(showAccessCode);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
      position: 'relative',
    }}>
      <style>{`
        @media (max-width: 768px) {
          .editor-layout {
            flex-direction: column !important;
          }
          .canvas-area {
            width: 100% !important;
            height: 60% !important;
          }
          .tool-panel {
            width: 100% !important;
            height: 40% !important;
          }
          .emotion-arc {
            width: 100% !important;
          }
        }
        .emotion-arc {
          position: relative;
          height: 80px;
          display: flex;
          justify-content: center;
          align-items: flex-end;
        }
      `}</style>

      <div className="editor-layout" style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div 
          className="canvas-area"
          ref={containerRef}
          style={{ 
            width: '70%', 
            height: '100%', 
            position: 'relative',
            background: '#0b1120',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '500px',
              maxHeight: '700px',
              borderRadius: '16px',
              cursor: 'crosshair',
              boxShadow: emotion ? `0 0 40px ${EMOTIONS.find(e => e.key === emotion)?.color}40` : '0 0 30px rgba(167, 139, 250, 0.2)',
              transition: 'box-shadow 1.5s ease',
              touchAction: 'none',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          
          <button
            onClick={onBack}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '0.5px solid rgba(167, 139, 250, 0.4)',
              color: '#c4b5fd',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              gsap.to(e.currentTarget, { scale: 1.05, duration: 0.2 });
            }}
            onMouseLeave={(e) => {
              gsap.to(e.currentTarget, { scale: 1, duration: 0.2 });
            }}
          >
            ← 返回
          </button>
        </div>

        <div 
          className="tool-panel glass"
          style={{ 
            width: '25%', 
            margin: '20px 20px 20px 0',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            overflowY: 'auto',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', color: '#e9d5ff', marginBottom: '12px' }}>
              情绪标记
            </h3>
            <div className="emotion-arc">
              {EMOTIONS.map((emo, index) => {
                const total = EMOTIONS.length;
                const offset = (index - (total - 1) / 2) * 50;
                const yOffset = Math.abs(index - (total - 1) / 2) * 10;
                return (
                  <button
                    key={emo.key}
                    title={emo.label}
                    onClick={() => handleEmotionSelect(emo.key)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: `2px solid ${emotion === emo.key ? '#fff' : 'transparent'}`,
                      background: emo.color,
                      opacity: emotion === emo.key ? 1 : 0.6,
                      cursor: 'pointer',
                      marginLeft: index === 0 ? '0' : '-8px',
                      transform: `translateY(${yOffset}px)`,
                      boxShadow: `0 0 ${emotion === emo.key ? '20' : '10'}px ${emo.color}`,
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      left: `${offset}px`,
                    }}
                    onMouseEnter={(e) => {
                      gsap.to(e.currentTarget, { scale: 1.15, opacity: 1, duration: 0.2 });
                    }}
                    onMouseLeave={(e) => {
                      gsap.to(e.currentTarget, { 
                        scale: 1, 
                        opacity: emotion === emo.key ? 1 : 0.6, 
                        duration: 0.2 
                      });
                    }}
                  />
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#a78bfa' }}>
              {emotion ? EMOTIONS.find(e => e.key === emotion)?.label : '选择一种情绪'}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '16px', color: '#e9d5ff', marginBottom: '12px' }}>
              背景照片
            </h3>
            <label className="btn-glow" style={{ 
              display: 'block', 
              textAlign: 'center',
              width: '100%',
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              📷 上传照片
            </label>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn-glow" 
              onClick={handleClear}
              style={{ width: '100%' }}
            >
              🗑️ 清空画布
            </button>
            <button 
              className="btn-glow" 
              onClick={handleSave}
              disabled={isSaving}
              style={{ 
                width: '100%', 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? '保存中...' : '💾 保存明信片'}
            </button>
          </div>
        </div>
      </div>

      {showAccessCode && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }} onClick={() => { setShowAccessCode(null); onSaveComplete(); }}>
          <div 
            className="access-code-popup glass"
            style={{
              padding: '40px',
              textAlign: 'center',
              minWidth: '320px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
            <h3 style={{ fontSize: '20px', color: '#e9d5ff', marginBottom: '8px' }}>
              明信片已保存！
            </h3>
            <p style={{ color: '#a78bfa', fontSize: '14px', marginBottom: '24px' }}>
              分享访问码给朋友，他们就能看到你的作品
            </p>
            
            <div 
              onClick={copyAccessCode}
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px dashed rgba(167, 139, 250, 0.5)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '24px',
                letterSpacing: '4px',
                color: '#c4b5fd',
                cursor: 'pointer',
                marginBottom: '24px',
                fontFamily: 'monospace',
              }}
            >
              {showAccessCode}
            </div>
            
            <p style={{ fontSize: '12px', color: '#818cf8', marginBottom: '20px' }}>
              点击可复制 · 最多可被查看5次
            </p>
            
            <button 
              className="btn-glow" 
              onClick={() => { setShowAccessCode(null); onSaveComplete(); }}
              style={{ width: '100%' }}
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardEditor;
