import { useState, useRef, useEffect, useCallback } from 'react';
import type { EasingPreset } from '@/utils/easingPresets';
import { bezierToCss, cubicBezier } from '@/utils/easingPresets';

interface BezierEditorProps {
  preset: EasingPreset;
  onClose: () => void;
  onSave: (updatedPreset: EasingPreset) => void;
}

type Bezier = [number, number, number, number];

const SVG_PADDING = 40;
const SVG_INNER_SIZE = 240;

export default function BezierEditor({ preset, onClose, onSave }: BezierEditorProps) {
  const [bezier, setBezier] = useState<Bezier>(preset.bezier);
  const [copied, setCopied] = useState(false);
  const [dragPoint, setDragPoint] = useState<0 | 1 | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const cssValue = bezierToCss(bezier);

  useEffect(() => {
    let running = true;
    const animatePreview = (timestamp: number) => {
      if (!running) return;
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const t = (elapsed % 2000) / 2000;
      setPreviewProgress(cubicBezier(t, ...bezier));
      rafRef.current = requestAnimationFrame(animatePreview);
    };
    rafRef.current = requestAnimationFrame(animatePreview);
    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [bezier]);

  const toSvgCoord = useCallback((x: number, y: number): [number, number] => {
    return [
      SVG_PADDING + x * SVG_INNER_SIZE,
      SVG_PADDING + SVG_INNER_SIZE - y * SVG_INNER_SIZE,
    ];
  }, []);

  const fromSvgCoord = useCallback((px: number, py: number): [number, number] => {
    const x = Math.max(-0.5, Math.min(1.5, (px - SVG_PADDING) / SVG_INNER_SIZE));
    const y = Math.max(-0.5, Math.min(1.5, 1 - (py - SVG_PADDING) / SVG_INNER_SIZE));
    return [x, y];
  }, []);

  const handleMouseDown = (pointIndex: 0 | 1) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragPoint(pointIndex);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragPoint === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = SVG_INNER_SIZE / rect.width;
      const scaleY = SVG_INNER_SIZE / rect.height;
      const px = (e.clientX - rect.left) * scaleX + SVG_PADDING;
      const py = (e.clientY - rect.top) * scaleY + SVG_PADDING;
      const [x, y] = fromSvgCoord(px, py);

      setBezier((prev) => {
        const next: Bezier = [...prev];
        if (dragPoint === 0) {
          next[0] = x;
          next[1] = y;
        } else {
          next[2] = x;
          next[3] = y;
        }
        return next;
      });
    },
    [dragPoint, fromSvgCoord]
  );

  const handleMouseUp = useCallback(() => {
    if (dragPoint !== null) {
      const updated: EasingPreset = {
        ...preset,
        bezier,
        cssValue,
      };
      onSave(updated);
    }
    setDragPoint(null);
  }, [dragPoint, preset, bezier, cssValue, onSave]);

  useEffect(() => {
    if (dragPoint !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragPoint, handleMouseMove, handleMouseUp]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setBezier((prev) => {
      const next: Bezier = [...prev];
      next[index] = num;
      return next;
    });
  };

  const [p0x, p0y] = toSvgCoord(0, 0);
  const [p3x, p3y] = toSvgCoord(1, 1);
  const [c1x, c1y] = toSvgCoord(bezier[0], bezier[1]);
  const [c2x, c2y] = toSvgCoord(bezier[2], bezier[3]);

  const curvePath = `M ${p0x} ${p0y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p3x} ${p3y}`;
  const gridSize = SVG_PADDING * 2 + SVG_INNER_SIZE;

  const previewBallLeft = `calc(${previewProgress * 100}% * 0.85 + 15px + 8px)`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">编辑贝塞尔曲线 - {preset.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="editor-container">
          <svg
            ref={svgRef}
            className="editor-svg"
            viewBox={`0 0 ${gridSize} ${gridSize}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="grid" width={SVG_INNER_SIZE / 4} height={SVG_INNER_SIZE / 4} patternUnits="userSpaceOnUse" x={SVG_PADDING} y={SVG_PADDING}>
                <path d={`M ${SVG_INNER_SIZE / 4} 0 L 0 0 0 ${SVG_INNER_SIZE / 4}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              </pattern>
            </defs>

            <rect x={SVG_PADDING} y={SVG_PADDING} width={SVG_INNER_SIZE} height={SVG_INNER_SIZE} fill="url(#grid)" />
            <rect x={SVG_PADDING} y={SVG_PADDING} width={SVG_INNER_SIZE} height={SVG_INNER_SIZE} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

            <line x1={p0x} y1={p0y} x2={p3x} y2={p3y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />

            <line x1={p0x} y1={p0y} x2={c1x} y2={c1y} stroke="#a29bfe" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1={p3x} y1={p3y} x2={c2x} y2={c2y} stroke="#00b894" strokeWidth="1.5" strokeDasharray="4 4" />

            <path d={curvePath} fill="none" stroke="#81ecec" strokeWidth="3" />

            <circle cx={p0x} cy={p0y} r="5" fill="#e0e0e0" />
            <circle cx={p3x} cy={p3y} r="5" fill="#e0e0e0" />

            <circle
              cx={c1x}
              cy={c1y}
              r="9"
              fill="#a29bfe"
              stroke="#fff"
              strokeWidth="2"
              style={{ cursor: 'grab' }}
              onMouseDown={handleMouseDown(0)}
            />
            <circle
              cx={c2x}
              cy={c2y}
              r="9"
              fill="#00b894"
              stroke="#fff"
              strokeWidth="2"
              style={{ cursor: 'grab' }}
              onMouseDown={handleMouseDown(1)}
            />
          </svg>

          <div className="control-points">
            <div className="control-point">
              <span className="control-point-label">P1.x</span>
              <input
                type="number"
                step="0.01"
                value={bezier[0].toFixed(2)}
                onChange={(e) => handleInputChange(0, e.target.value)}
              />
            </div>
            <div className="control-point">
              <span className="control-point-label">P1.y</span>
              <input
                type="number"
                step="0.01"
                value={bezier[1].toFixed(2)}
                onChange={(e) => handleInputChange(1, e.target.value)}
              />
            </div>
            <div className="control-point">
              <span className="control-point-label">P2.x</span>
              <input
                type="number"
                step="0.01"
                value={bezier[2].toFixed(2)}
                onChange={(e) => handleInputChange(2, e.target.value)}
              />
            </div>
            <div className="control-point">
              <span className="control-point-label">P2.y</span>
              <input
                type="number"
                step="0.01"
                value={bezier[3].toFixed(2)}
                onChange={(e) => handleInputChange(3, e.target.value)}
              />
            </div>
          </div>

          <div className="preview-track">
            <div className="track" />
            <div className="ball-wrapper">
              <div className="ball" style={{ left: previewBallLeft }} />
            </div>
          </div>

          <div className="result-row">
            <span className="result-label">CSS</span>
            <span className="result-value">{cssValue}</span>
            <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
