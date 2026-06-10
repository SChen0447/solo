import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  GradientConfig,
  GradientType,
  RadialShape,
  ColorStop,
  gradientPresets,
  generateGradientCss,
  createColorStop
} from './gradientUtils';

interface ControlPanelProps {
  config: GradientConfig;
  onConfigChange: (config: GradientConfig) => void;
  selectedStopId: string | null;
  onSelectedStopChange: (id: string | null) => void;
}

const commonColors = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFF00',
  '#ADFF2F', '#00FF00', '#00FA9A', '#00FFFF', '#00BFFF',
  '#1E90FF', '#0000FF', '#4B0082', '#8A2BE2', '#FF00FF',
  '#FF1493', '#FF69B4', '#FFFFFF', '#808080', '#000000'
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onConfigChange,
  selectedStopId,
  onSelectedStopChange
}) => {
  const angleDialRef = useRef<HTMLDivElement>(null);
  const [isDraggingAngle, setIsDraggingAngle] = useState(false);
  const [showAngleTooltip, setShowAngleTooltip] = useState(false);
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<string | null>(null);

  const selectedStop = config.colorStops.find((s) => s.id === selectedStopId) || null;

  const handleTypeChange = (type: GradientType) => {
    onConfigChange({ ...config, type });
  };

  const handleShapeChange = (shape: RadialShape) => {
    onConfigChange({ ...config, shape });
  };

  const handleAngleChange = (angle: number) => {
    onConfigChange({ ...config, angle: Math.max(0, Math.min(360, angle)) });
  };

  const handleCenterChange = (axis: 'centerX' | 'centerY', value: number) => {
    onConfigChange({ ...config, [axis]: Math.max(0, Math.min(100, value)) });
  };

  const calculateAngleFromEvent = useCallback((clientX: number, clientY: number): number => {
    if (!angleDialRef.current) return config.angle;
    const rect = angleDialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }, [config.angle]);

  const handleAngleDialMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingAngle(true);
    setShowAngleTooltip(true);
    const newAngle = calculateAngleFromEvent(e.clientX, e.clientY);
    handleAngleChange(newAngle);
  };

  const handleAngleDialMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingAngle) return;
      const newAngle = calculateAngleFromEvent(e.clientX, e.clientY);
      handleAngleChange(newAngle);
    },
    [isDraggingAngle, calculateAngleFromEvent]
  );

  const handleAngleDialMouseUp = useCallback(() => {
    setIsDraggingAngle(false);
    setShowAngleTooltip(false);
  }, []);

  useEffect(() => {
    if (isDraggingAngle) {
      document.addEventListener('mousemove', handleAngleDialMouseMove);
      document.addEventListener('mouseup', handleAngleDialMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleAngleDialMouseMove);
        document.removeEventListener('mouseup', handleAngleDialMouseUp);
      };
    }
  }, [isDraggingAngle, handleAngleDialMouseMove, handleAngleDialMouseUp]);

  const updateColorStop = (id: string, updates: Partial<ColorStop>) => {
    onConfigChange({
      ...config,
      colorStops: config.colorStops.map((s) => (s.id === id ? { ...s, ...updates } : s))
    });
  };

  const addColorStop = () => {
    const newPosition = config.colorStops.length > 0
      ? Math.min(100, Math.max(...config.colorStops.map((s) => s.position)) + 20)
      : 50;
    const newColor = commonColors[Math.floor(Math.random() * commonColors.length)];
    const newStop = createColorStop(newColor, Math.min(100, newPosition), 1);
    onConfigChange({
      ...config,
      colorStops: [...config.colorStops, newStop]
    });
    onSelectedStopChange(newStop.id);
  };

  const removeColorStop = (id: string) => {
    if (config.colorStops.length <= 2) return;
    const newStops = config.colorStops.filter((s) => s.id !== id);
    onConfigChange({ ...config, colorStops: newStops });
    if (selectedStopId === id) {
      onSelectedStopChange(newStops[0]?.id || null);
    }
  };

  const handleStopDragStart = (e: React.DragEvent, stopId: string) => {
    setDraggedStopId(stopId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStopDragOver = (e: React.DragEvent, stopId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStopId(stopId);
  };

  const handleStopDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedStopId || draggedStopId === targetId) {
      setDraggedStopId(null);
      setDragOverStopId(null);
      return;
    }

    const draggedIndex = config.colorStops.findIndex((s) => s.id === draggedStopId);
    const targetIndex = config.colorStops.findIndex((s) => s.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newStops = [...config.colorStops];
    const [draggedStop] = newStops.splice(draggedIndex, 1);
    newStops.splice(targetIndex, 0, draggedStop);

    onConfigChange({ ...config, colorStops: newStops });
    setDraggedStopId(null);
    setDragOverStopId(null);
  };

  const handleStopDragEnd = () => {
    setDraggedStopId(null);
    setDragOverStopId(null);
  };

  const applyPreset = (presetConfig: GradientConfig) => {
    const newStops = presetConfig.colorStops.map((stop) => ({
      ...stop,
      id: Math.random().toString(36).substr(2, 9)
    }));
    onConfigChange({ ...presetConfig, colorStops: newStops });
    onSelectedStopChange(newStops[0]?.id || null);
  };

  return (
    <div
      style={{
        width: '320px',
        minWidth: '320px',
        background: '#f5f5f5',
        padding: '20px',
        overflowY: 'auto',
        height: '100vh',
        boxSizing: 'border-box',
        borderRight: '1px solid #e0e0e0'
      }}
    >
      <h1 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333', fontWeight: 700 }}>
        CSS 渐变色工具
      </h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '8px', fontWeight: 600 }}>
          渐变类型
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['linear', 'radial'] as GradientType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                border: config.type === type ? 'none' : '1px solid #ccc',
                borderRadius: '4px',
                background: config.type === type
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#fff',
                color: config.type === type ? '#fff' : '#333',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              {type === 'linear' ? '线性渐变' : '径向渐变'}
            </button>
          ))}
        </div>
      </div>

      {config.type === 'linear' ? (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '8px', fontWeight: 600 }}>
            渐变角度
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              ref={angleDialRef}
              onMouseDown={handleAngleDialMouseDown}
              style={{
                position: 'relative',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fff',
                border: '2px solid #ddd',
                cursor: 'grab',
                userSelect: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '2px',
                  height: '24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '2px',
                  transformOrigin: 'center top',
                  transform: `translate(-50%, 0) rotate(${config.angle}deg)`,
                  transition: isDraggingAngle ? 'none' : 'transform 0.1s ease'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#333',
                  transform: 'translate(-50%, -50%)'
                }}
              />
              {showAngleTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#333',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none'
                  }}
                >
                  {config.angle}°
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={config.angle}
                onChange={(e) => handleAngleChange(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                当前角度: <strong>{config.angle}°</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '8px', fontWeight: 600 }}>
            形状
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['circle', 'ellipse'] as RadialShape[]).map((shape) => (
              <button
                key={shape}
                onClick={() => handleShapeChange(shape)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: config.shape === shape ? 'none' : '1px solid #ccc',
                  borderRadius: '4px',
                  background: config.shape === shape
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#fff',
                  color: config.shape === shape ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {shape === 'circle' ? '圆形' : '椭圆形'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              中心 X: {config.centerX}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.centerX}
              onChange={(e) => handleCenterChange('centerX', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              中心 Y: {config.centerY}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.centerY}
              onChange={(e) => handleCenterChange('centerY', Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', color: '#333', fontWeight: 600 }}>色标列表</label>
          <button
            onClick={addColorStop}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            + 添加色标
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {config.colorStops.map((stop) => (
            <div
              key={stop.id}
              draggable
              onDragStart={(e) => handleStopDragStart(e, stop.id)}
              onDragOver={(e) => handleStopDragOver(e, stop.id)}
              onDrop={(e) => handleStopDrop(e, stop.id)}
              onDragEnd={handleStopDragEnd}
              onClick={() => onSelectedStopChange(stop.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: selectedStopId === stop.id ? '#fff' : '#fafafa',
                border: selectedStopId === stop.id
                  ? '2px solid #667eea'
                  : dragOverStopId === stop.id
                  ? '2px dashed #667eea'
                  : '1px solid #e0e0e0',
                borderRadius: '6px',
                cursor: 'move',
                transition: 'all 0.15s ease',
                opacity: draggedStopId === stop.id ? 0.5 : 1
              }}
            >
              <div style={{ fontSize: '14px', color: '#999', cursor: 'grab', userSelect: 'none' }}>⋮⋮</div>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: stop.color,
                  border: '2px solid #fff',
                  boxShadow: selectedStopId === stop.id ? '0 0 0 2px #667eea' : '0 1px 3px rgba(0,0,0,0.2)',
                  animation: selectedStopId === stop.id ? 'spin 2s linear infinite' : 'none',
                  opacity: stop.opacity
                }}
              />
              <span style={{ flex: 1, fontSize: '12px', color: '#333', fontFamily: 'monospace' }}>
                {stop.position.toFixed(1)}%
              </span>
              {config.colorStops.length > 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColorStop(stop.id);
                  }}
                  style={{
                    width: '22px',
                    height: '22px',
                    border: 'none',
                    borderRadius: '50%',
                    background: '#ff6b6b',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    lineHeight: '22px',
                    padding: 0
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedStop && (
        <div style={{ marginBottom: '20px', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '10px', fontWeight: 600 }}>
            编辑色标
          </label>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>颜色选择</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {commonColors.map((color) => (
                <div
                  key={color}
                  onClick={() => updateColorStop(selectedStop.id, { color })}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: selectedStop.color.toLowerCase() === color.toLowerCase()
                      ? '2px solid #333'
                      : '2px solid #fff',
                    boxShadow: selectedStop.color.toLowerCase() === color.toLowerCase()
                      ? '0 0 0 2px #667eea, 0 0 10px rgba(102,126,234,0.5)'
                      : '0 1px 3px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    animation: selectedStop.color.toLowerCase() === color.toLowerCase() ? 'spin 2s linear infinite' : 'none'
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={selectedStop.color}
                onChange={(e) => updateColorStop(selectedStop.id, { color: e.target.value })}
                style={{ width: '32px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
              />
              <input
                type="text"
                value={selectedStop.color}
                onChange={(e) => updateColorStop(selectedStop.id, { color: e.target.value })}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              位置: {selectedStop.position.toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={selectedStop.position}
              onChange={(e) => updateColorStop(selectedStop.id, { position: Number(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              透明度: {selectedStop.opacity.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedStop.opacity}
              onChange={(e) => updateColorStop(selectedStop.id, { opacity: Number(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '10px', fontWeight: 600 }}>
          预设模板
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px'
          }}
        >
          {gradientPresets.map((preset, index) => (
            <div
              key={index}
              onClick={() => applyPreset(preset.config)}
              title={preset.name}
              style={{
                aspectRatio: '1',
                borderRadius: '6px',
                background: generateGradientCss(preset.config),
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '10px',
                  padding: '2px 4px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {preset.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #667eea;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #667eea;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
