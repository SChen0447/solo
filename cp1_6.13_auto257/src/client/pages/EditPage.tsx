import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Canvas from '../components/Canvas';
import type { PathSegment } from '../types';
import { COLOR_PALETTE } from '../types';

function getHourHue(): { top: string; bottom: string } {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const hue = ((hour * 60 + minute) / 1440) * 360;
  return {
    top: `hsl(${hue}, 60%, 20%)`,
    bottom: `hsl(${(hue + 30) % 360}, 50%, 12%)`,
  };
}

function getRandomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

function EditPage() {
  const [brushWidth, setBrushWidth] = useState(6);
  const [brushColor, setBrushColor] = useState(getRandomColor());
  const [paths, setPaths] = useState<PathSegment[]>([]);
  const [bgGradient, setBgGradient] = useState(getHourHue());
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setBgGradient(getHourHue());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePathsChange = useCallback((newPaths: PathSegment[]) => {
    setPaths(newPaths);
    setBrushColor(getRandomColor());
  }, []);

  const handleSave = async () => {
    if (paths.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      const data = await res.json();
      navigate(`/read/${data.id}`);
    } catch (error) {
      console.error('Failed to save entry:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setPaths([]);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="edit-page">
      <style>{`
        .edit-page {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
        }

        .edit-header {
          padding: 20px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(10, 11, 22, 0.6);
          backdrop-filter: blur(12px);
          border-bottom: 0.5px solid rgba(167, 139, 250, 0.3);
        }

        .edit-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }

        .back-btn {
          padding: 8px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 0.5px solid rgba(167, 139, 250, 0.4);
          border-radius: 8px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .edit-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .canvas-area {
          flex: 7;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .canvas-wrapper {
          width: 800px;
          height: 600px;
          max-width: 100%;
          max-height: 100%;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          border: 0.5px solid rgba(167, 139, 250, 0.3);
        }

        .control-panel {
          flex: 3;
          min-width: 280px;
          padding: 40px 32px;
          background: rgba(10, 11, 22, 0.4);
          backdrop-filter: blur(20px);
          border-left: 0.5px solid rgba(167, 139, 250, 0.3);
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .control-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .control-value {
          color: #a78bfa;
          font-weight: 500;
        }

        .slider {
          width: 100%;
          height: 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          cursor: pointer;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #a78bfa;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.6);
          transition: all 0.2s ease;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(167, 139, 250, 0.8);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #a78bfa;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.6);
        }

        .color-preview {
          width: 100%;
          height: 48px;
          border-radius: 8px;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .color-preview-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          box-shadow: 0 0 20px currentColor;
        }

        .palette {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .palette-color {
          aspect-ratio: 1;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .palette-color:hover {
          transform: scale(1.1);
        }

        .palette-color.active {
          border-color: #ffffff;
          box-shadow: 0 0 15px currentColor;
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: auto;
        }

        .action-btn {
          padding: 14px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .save-btn {
          background: linear-gradient(135deg, #a78bfa 0%, #6366f1 100%);
          color: #ffffff;
          box-shadow: 0 4px 20px rgba(167, 139, 250, 0.4);
        }

        .save-btn:hover {
          box-shadow: 0 6px 30px rgba(167, 139, 250, 0.6);
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .clear-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border: 0.5px solid rgba(255, 255, 255, 0.2);
        }

        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .path-count {
          text-align: center;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 768px) {
          .edit-content {
            flex-direction: column;
          }

          .canvas-area {
            flex: none;
            padding: 16px;
            height: 400px;
          }

          .canvas-wrapper {
            width: 100%;
            height: 100%;
          }

          .control-panel {
            flex: 1;
            flex-direction: row;
            flex-wrap: wrap;
            padding: 20px 16px;
            border-left: none;
            border-top: 0.5px solid rgba(167, 139, 250, 0.3);
            gap: 16px;
            overflow-y: auto;
          }

          .control-group {
            flex: 1 1 40%;
            min-width: 120px;
          }

          .button-group {
            flex: 1 1 100%;
            margin-top: 0;
            flex-direction: row;
          }

          .action-btn {
            flex: 1;
          }
        }
      `}</style>

      <div className="edit-header">
        <button className="back-btn" onClick={handleBack}>
          ← 返回
        </button>
        <h2 className="edit-title">创作新条目</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="edit-content">
        <div className="canvas-area">
          <div className="canvas-wrapper">
            <Canvas
              width={800}
              height={600}
              brushWidth={brushWidth}
              brushColor={brushColor}
              onPathsChange={handlePathsChange}
              backgroundGradient={bgGradient}
            />
          </div>
        </div>

        <div className="control-panel">
          <div className="control-group">
            <div className="control-label">
              <span>画笔粗细</span>
              <span className="control-value">{brushWidth}px</span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              value={brushWidth}
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="slider"
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>当前颜色</span>
            </div>
            <div className="color-preview">
              <div
                className="color-preview-dot"
                style={{ backgroundColor: brushColor, color: brushColor }}
              />
            </div>
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>调色板</span>
            </div>
            <div className="palette">
              {COLOR_PALETTE.map((color) => (
                <div
                  key={color}
                  className={`palette-color ${brushColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color, color }}
                  onClick={() => setBrushColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="path-count">
            已绘制 {paths.length} 条路径
          </div>

          <div className="button-group">
            <button
              className="action-btn save-btn"
              onClick={handleSave}
              disabled={saving || paths.length === 0}
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              className="action-btn clear-btn"
              onClick={handleClear}
              disabled={paths.length === 0}
            >
              清空画布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPage;
