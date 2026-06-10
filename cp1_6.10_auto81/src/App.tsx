import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ColorStop,
  HSLColor,
  Preset,
  gradientToCSS,
  gradientToStopsArray,
  generatePresets,
  getDefaultStops,
  hslToHex,
  hslToString,
} from './utils';
import GradientBar from './GradientBar';
import ColorPicker from './ColorPicker';
import AngleControl from './AngleControl';
import PresetsPanel from './PresetsPanel';

const MAX_HISTORY = 10;

const App: React.FC = () => {
  const [stops, setStops] = useState<ColorStop[]>(getDefaultStops);
  const [angle, setAngle] = useState<number>(135);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [pickerStopId, setPickerStopId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const historyRef = useRef<{ stops: ColorStop[]; angle: number }[]>([]);
  const angleHistoryRef = useRef<number[]>([]);
  const presets = useMemo(() => generatePresets(), []);

  const pushHistory = useCallback((newStops: ColorStop[], newAngle: number) => {
    const snap = { stops: JSON.parse(JSON.stringify(newStops)), angle: newAngle };
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
  }, []);

  const handleStopsChange = useCallback(
    (newStops: ColorStop[]) => {
      setStops(newStops);
    },
    []
  );

  const handleStopsChangeWithHistory = useCallback(
    (newStops: ColorStop[]) => {
      pushHistory(stops, angle);
      setStops(newStops);
    },
    [stops, angle, pushHistory]
  );

  const handleAngleChange = useCallback(
    (newAngle: number) => {
      setAngle(newAngle);
    },
    []
  );

  const handleAngleChangeWithHistory = useCallback(
    (newAngle: number) => {
      pushHistory(stops, angle);
      setAngle(newAngle);
    },
    [stops, angle, pushHistory]
  );

  const handleAddStop = useCallback(
    (position: number) => {
      if (stops.length >= 10) return;
      pushHistory(stops, angle);
      const sorted = [...stops].sort((a, b) => a.position - b.position);
      let idx = 0;
      while (idx < sorted.length && sorted[idx].position < position) idx++;
      let blendColor: HSLColor;
      if (idx === 0) {
        blendColor = sorted[0].color;
      } else if (idx >= sorted.length) {
        blendColor = sorted[sorted.length - 1].color;
      } else {
        const left = sorted[idx - 1];
        const right = sorted[idx];
        const t = (position - left.position) / (right.position - left.position);
        blendColor = {
          h: Math.round(left.color.h + (right.color.h - left.color.h) * t),
          s: Math.round(left.color.s + (right.color.s - left.color.s) * t),
          l: Math.round(left.color.l + (right.color.l - left.color.l) * t),
        };
      }
      const newStop: ColorStop = {
        id: uuidv4(),
        color: blendColor,
        position,
      };
      const newStops = [...stops, newStop];
      setStops(newStops);
      setSelectedStopId(newStop.id);
    },
    [stops, angle, pushHistory]
  );

  const handleOpenColorPicker = useCallback((stopId: string) => {
    setPickerStopId(stopId);
  }, []);

  const handleColorChange = useCallback(
    (color: HSLColor) => {
      if (!pickerStopId) return;
      setStops(stops.map((s) => (s.id === pickerStopId ? { ...s, color } : s)));
    },
    [pickerStopId, stops]
  );

  const handleCloseColorPicker = useCallback(() => {
    if (pickerStopId) {
      pushHistory(stops, angle);
    }
    setPickerStopId(null);
  }, [pickerStopId, stops, angle, pushHistory]);

  const handleSelectPreset = useCallback(
    (preset: Preset) => {
      pushHistory(stops, angle);
      const clonedStops = preset.stops.map((s) => ({ ...s, id: uuidv4(), color: { ...s.color } }));
      setStops(clonedStops);
      setAngle(preset.angle);
      setSelectedStopId(null);
    },
    [stops, angle, pushHistory]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedStopId || stops.length <= 2) return;
    pushHistory(stops, angle);
    const newStops = stops.filter((s) => s.id !== selectedStopId);
    setStops(newStops);
    setSelectedStopId(null);
  }, [selectedStopId, stops, angle, pushHistory]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    setStops(prev.stops);
    setAngle(prev.angle);
  }, []);

  const handleCopyCSS = useCallback(async () => {
    const css = gradientToCSS(stops, angle);
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = css;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    }
  }, [stops, angle]);

  const handleExportSVG = useCallback(() => {
    const gradientCSS = gradientToStopsArray(stops);
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    const stopsDefs = sortedStops
      .map(
        (s, i) =>
          `    <stop offset="${s.position}%" stop-color="${hslToString(s.color)}" />`
      )
      .join('\n');

    const angleRad = (angle * Math.PI) / 180;
    const cx = 0.5 - 0.5 * Math.sin(angleRad);
    const cy = 0.5 - 0.5 * Math.cos(angleRad);
    const fx = 0.5 + 0.5 * Math.sin(angleRad);
    const fy = 0.5 + 0.5 * Math.cos(angleRad);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="50" viewBox="0 0 800 50">
  <defs>
    <linearGradient id="g" x1="${cx}" y1="${cy}" x2="${fx}" y2="${fy}" gradientUnits="objectBoundingBox">
${stopsDefs}
    </linearGradient>
  </defs>
  <rect width="800" height="50" fill="url(#g)" />
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [stops, angle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleCopyCSS();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (pickerStopId) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleCopyCSS, handleDeleteSelected, pickerStopId]);

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const cssCode = gradientToCSS(stops, angle);
  const currentPickerStop = pickerStopId ? stops.find((s) => s.id === pickerStopId) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
        padding: '32px 80px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
      onClick={() => setSelectedStopId(null)}
    >
      <style>{`
        @media (max-width: 768px) {
          body .main-wrap { padding: 20px !important; }
          body .top-row { flex-direction: column-reverse !important; align-items: center !important; }
          body .stops-grid { gap: 10px !important; }
          body .stop-card { width: 100% !important; }
        }
      `}</style>
      <div className="main-wrap" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4, marginTop: 0 }}>
          CSS Gradient Studio
        </h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 0, marginBottom: 24 }}>
          拖拽色标调整位置，双击编辑颜色，Ctrl+Z 撤销，Ctrl+S 复制 CSS
        </p>

        <div
          className="top-row"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 40,
            marginBottom: 32,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <GradientBar
              stops={stops}
              selectedStopId={selectedStopId}
              onStopsChange={handleStopsChange}
              onSelectStop={(id) => {
                setSelectedStopId(id);
                if (id !== null) pushHistory(stops, angle);
              }}
              onOpenColorPicker={handleOpenColorPicker}
              onAddStop={handleAddStop}
            />
            <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
              点击渐变条添加色标（最多10个）· 双击色标编辑颜色
            </div>
          </div>
          <AngleControl angle={angle} stops={stops} onAngleChange={handleAngleChange} />
        </div>

        <div style={{ marginBottom: 28 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10, fontWeight: 500 }}>
            色标编辑 · 选中后按 Delete 删除
          </div>
          <div
            className="stops-grid"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {sortedStops.map((stop) => {
              const isSelected = stop.id === selectedStopId;
              const hex = hslToHex(stop.color.h, stop.color.s, stop.color.l);
              return (
                <div
                  key={stop.id}
                  className="stop-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStopId(stop.id);
                  }}
                  onDoubleClick={() => handleOpenColorPicker(stop.id)}
                  style={{
                    width: 180,
                    height: 40,
                    borderRadius: 6,
                    backgroundColor: '#2a2a4a',
                    border: isSelected ? '2px dashed #0066ff' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 8px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      backgroundColor: hslToString(stop.color),
                      border: '1.5px solid rgba(255,255,255,0.3)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#e0e0e0', textTransform: 'uppercase' }}>
                      {hex}
                    </div>
                    <div style={{ fontSize: 10, color: '#888' }}>
                      H{stop.color.h} S{stop.color.s}% L{stop.color.l}% · {Math.round(stop.position)}%
                    </div>
                  </div>
                </div>
              );
            })}
            {stops.length < 10 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddStop(50);
                }}
                style={{
                  width: 180,
                  height: 40,
                  borderRadius: 6,
                  backgroundColor: 'transparent',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  color: '#888',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#bbb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#888';
                }}
              >
                + 添加色标
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            marginBottom: 28,
            padding: 16,
            borderRadius: 8,
            backgroundColor: '#15152a',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>CSS 代码</div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              color: '#9cdcfe',
              backgroundColor: '#0f0f20',
              padding: 12,
              borderRadius: 6,
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}
          >
            {cssCode}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCopyCSS}
            style={{
              position: 'relative',
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#4a4af0',
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#5a5aff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4a4af0';
            }}
          >
            {copied ? '已复制 ✓' : '复制 CSS 代码 (Ctrl+S)'}
          </button>
          <button
            onClick={handleExportSVG}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              backgroundColor: 'transparent',
              color: '#e0e0e0',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease-out, background-color 0.15s ease-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            导出 SVG 图片
          </button>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <PresetsPanel presets={presets} onSelectPreset={handleSelectPreset} />
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11,
            color: '#555',
            textAlign: 'center',
          }}
        >
          快捷键：Ctrl+Z 撤销 · Ctrl+S 复制CSS · Delete 删除选中色标
        </div>
      </div>

      {currentPickerStop && (
        <ColorPicker
          color={currentPickerStop.color}
          onChange={handleColorChange}
          onClose={handleCloseColorPicker}
        />
      )}
    </div>
  );
};

export default App;
