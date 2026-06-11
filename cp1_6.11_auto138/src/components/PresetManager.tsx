import { useState, useRef, useCallback } from 'react';
import type { Preset, LightSource, MixedColorResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PresetManagerProps {
  presets: Preset[];
  currentSources: LightSource[];
  mixedColor: MixedColorResult;
  onLoad: (sources: LightSource[]) => void;
  onSave: (preset: Preset) => void;
  onDelete: (presetId: string) => void;
}

const MAX_PRESETS = 10;

export function PresetManager({
  presets,
  currentSources,
  mixedColor,
  onLoad,
  onSave,
  onDelete,
}: PresetManagerProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTarget = useRef<string | null>(null);

  const handleSavePreset = () => {
    if (presets.length >= MAX_PRESETS) {
      alert(`最多只能保存 ${MAX_PRESETS} 个预设，请先删除一些旧预设`);
      return;
    }

    const preset: Preset = {
      id: uuidv4(),
      name: `预设 #${presets.length + 1}`,
      timestamp: Date.now(),
      sources: JSON.parse(JSON.stringify(currentSources)),
      mixedColor: {
        r: mixedColor.r,
        g: mixedColor.g,
        b: mixedColor.b,
        hex: mixedColor.hex,
        hsl: { ...mixedColor.hsl },
      },
    };
    onSave(preset);
  };

  const handleCardClick = useCallback(
    (preset: Preset) => {
      if (longPressTarget.current === preset.id) {
        longPressTarget.current = null;
        return;
      }
      onLoad(JSON.parse(JSON.stringify(preset.sources)));
    },
    [onLoad]
  );

  const handleMouseDown = useCallback((presetId: string) => {
    longPressTimer.current = setTimeout(() => {
      longPressTarget.current = presetId;
      setConfirmDeleteId(presetId);
    }, 800);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  return (
    <div className="preset-manager">
      <div className="preset-header">
        <h3 className="preset-title">
          <span className="preset-icon">⚡</span> 光谱预设
          <span className="preset-count">
            {presets.length}/{MAX_PRESETS}
          </span>
        </h3>
        <button
          className="save-preset-btn"
          onClick={handleSavePreset}
          disabled={presets.length >= MAX_PRESETS}
          style={{
            background:
              presets.length < MAX_PRESETS
                ? `linear-gradient(135deg, ${mixedColor.hex} 0%, ${mixedColor.hex}80 100%)`
                : '#333',
          }}
        >
          <span>+ 保存当前组合</span>
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="empty-presets">
          <div className="empty-icon">✨</div>
          <p>还没有保存的预设</p>
          <p className="empty-hint">调节光源后点击"保存当前组合"</p>
        </div>
      ) : (
        <div className="presets-grid">
          {presets.map((preset) => {
            const isConfirming = confirmDeleteId === preset.id;
            return (
              <div
                key={preset.id}
                className={`preset-card ${isConfirming ? 'confirm-delete' : ''}`}
                onClick={() => !isConfirming && handleCardClick(preset)}
                onMouseDown={() => handleMouseDown(preset.id)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={() => handleMouseDown(preset.id)}
                onTouchEnd={handleMouseUp}
              >
                {isConfirming ? (
                  <div className="delete-confirm">
                    <p>确认删除?</p>
                    <div className="delete-btns">
                      <button className="confirm-btn" onClick={(e) => { e.stopPropagation(); confirmDelete(); }}>
                        删除
                      </button>
                      <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); cancelDelete(); }}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="preset-card-header">
                      <div
                        className="preset-color-dot"
                        style={{
                          backgroundColor: preset.mixedColor.hex,
                          boxShadow: `0 0 12px ${preset.mixedColor.hex}`,
                        }}
                      />
                      <span className="preset-card-title" style={{ color: preset.mixedColor.hex }}>
                        {preset.name}
                      </span>
                    </div>
                    <div className="preset-card-body">
                      <div className="preset-sources-mini">
                        {preset.sources.slice(0, 6).map((s) => {
                          const isActive = s.enabled && s.intensity > 0;
                          const alpha = isActive ? s.intensity / 100 : 0.1;
                          return (
                            <div
                              key={s.id}
                              className="mini-source-dot"
                              style={{
                                background: isActive
                                  ? `hsl(${((s.wavelength - 380) / 400) * 300}, 80%, 50%)`
                                  : '#333',
                                opacity: alpha,
                                transform: `scale(${0.4 + (s.intensity / 100) * 0.6})`,
                              }}
                              title={`${s.wavelength}nm ${s.intensity}%`}
                            />
                          );
                        })}
                      </div>
                      <div className="preset-card-footer">
                        <span className="preset-hex mono-font">{preset.mixedColor.hex.toUpperCase()}</span>
                        <span className="preset-date">
                          {new Date(preset.timestamp).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="preset-hint">长按删除 · 点击加载</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
