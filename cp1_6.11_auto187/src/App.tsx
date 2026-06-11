import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import CanvasArea from './components/CanvasArea';
import MaterialPanel from './components/MaterialPanel';
import {
  Fragment,
  BlendMode,
  updateFragment,
  addFragment,
  markFragmentRemoving,
  removeFragment,
  createRandomFragment,
  FragmentType,
  findFragmentById,
} from './utils/layerManager';

const MAX_HISTORY = 20;
const BLEND_MODES: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];
const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  normal: '正常',
  multiply: '正片叠底',
  screen: '滤色',
  overlay: '叠加',
  darken: '变暗',
  lighten: '变亮',
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playDragSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const duration = 0.1;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const freq = 500 + Math.random() * 300;
      const envelope = Math.sin(Math.PI * t) * (1 - t);
      data[i] = (Math.sin(2 * Math.PI * freq * i / sampleRate) * 0.3 + (Math.random() * 2 - 1) * 0.1) * envelope * 0.08;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain).connect(ctx.destination);
    source.start();
  } catch { /* ignore */ }
}

function playTearSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const duration = 1.0;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const noise = Math.random() * 2 - 1;
      const freqMod = 200 + t * 800 + Math.random() * 300;
      const tone = Math.sin(2 * Math.PI * freqMod * i / sampleRate);
      let envelope: number;
      if (t < 0.1) envelope = t / 0.1;
      else if (t > 0.7) envelope = (1 - t) / 0.3;
      else envelope = 1;
      envelope *= 1 - t * 0.3;
      data[i] = (noise * 0.6 + tone * 0.2) * envelope * 0.15;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.8;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch { /* ignore */ }
}

const App: React.FC = () => {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [history, setHistory] = useState<Fragment[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [recentTypes, setRecentTypes] = useState<FragmentType[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const pushHistory = useCallback((newFragments: Fragment[]) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      const next = [...truncated, JSON.parse(JSON.stringify(newFragments))];
      if (next.length > MAX_HISTORY + 1) {
        return next.slice(next.length - MAX_HISTORY - 1);
      }
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY));
  }, [historyIndex]);

  const handleFragmentsChange = useCallback((newFragments: Fragment[]) => {
    setFragments(newFragments);
  }, []);

  const commitChange = useCallback((newFragments: Fragment[]) => {
    setFragments(newFragments);
    pushHistory(newFragments);
  }, [pushHistory]);

  const handleSelectedChange = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleViewChange = useCallback((z: number, px: number, py: number) => {
    setZoom(z);
    setPanX(px);
    setPanY(py);
  }, []);

  const handleGetCanvasRef = useCallback((ref: HTMLDivElement | null) => {
    canvasRef.current = ref;
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const state = JSON.parse(JSON.stringify(history[newIndex]));
    setFragments(state);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const state = JSON.parse(JSON.stringify(history[newIndex]));
    setFragments(state);
  }, [history, historyIndex]);

  const handleClear = useCallback(() => {
    commitChange([]);
    setSelectedId(null);
    setShowClearDialog(false);
    showToastMsg('画布已清空');
  }, [commitChange]);

  const handleRandomAdd = useCallback(() => {
    const frag = createRandomFragment(recentTypes);
    setRecentTypes((prev) => [...prev.slice(-4), frag.type]);
    const updated = addFragment(fragments, frag);
    commitChange(updated);
    setSelectedId(frag.id);
    playDragSound();
  }, [fragments, recentTypes, commitChange]);

  const handleRequestRemove = useCallback((id: string) => {
    const frag = findFragmentById(fragments, id);
    if (!frag) return;
    playTearSound();
    const marked = markFragmentRemoving(fragments, id);
    setFragments(marked);
    setTimeout(() => {
      const after = removeFragment(fragments, id);
      commitChange(after);
      if (selectedId === id) setSelectedId(null);
    }, 300);
  }, [fragments, selectedId, commitChange]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    const prevSelected = selectedId;
    setSelectedId(null);
    showToastMsg('正在导出拼贴画...');

    try {
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#f5f0e8',
        useCORS: false,
        scale: 2,
        logging: false,
      });
      const blob: Blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      saveAs(blob, 'collage.png');
      showToastMsg('已成功导出 collage.png');
    } catch {
      showToastMsg('导出失败，请重试');
    } finally {
      setExporting(false);
      setSelectedId(prevSelected);
    }
  }, [selectedId]);

  const showToastMsg = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2000);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    if (fragments.length > 0 && history.length === 1 && history[0].length === 0) {
      pushHistory(fragments);
    }
  }, [fragments, history, pushHistory]);

  const selectedFragment = selectedId ? findFragmentById(fragments, selectedId) : null;

  const updateSelectedProp = useCallback(
    <K extends keyof Fragment>(key: K, value: Fragment[K]) => {
      if (!selectedId) return;
      const updated = updateFragment(fragments, selectedId, { [key]: value });
      commitChange(updated);
    },
    [fragments, selectedId, commitChange]
  );

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#b8956a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'Georgia, serif',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    whiteSpace: 'nowrap',
  };

  const applyButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    btn.style.backgroundColor = '#a0754a';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
    btn.style.transform = 'translateY(-1px)';
  };

  const applyButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    btn.style.backgroundColor = btn.dataset.secondary ? '#5a5045' : '#b8956a';
    btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    btn.style.transform = 'translateY(0)';
  };

  const applyButtonDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.transform = 'scale(0.95)';
  };

  const applyButtonUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.transform = 'translateY(-1px)';
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #2a2722 0%, #3a2f24 50%, #4a3b2b 100%)',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '50px',
          backgroundColor: '#2c2c2c',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(160, 140, 110, 0.2)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: '#e8dcc8',
            fontSize: '16px',
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
            letterSpacing: '1px',
            marginRight: '16px',
            paddingRight: '20px',
            borderRight: '1px solid rgba(200,180,160,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '20px' }}>✂️</span>
          拼贴画创意工坊
        </div>

        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          style={{
            ...buttonStyle,
            backgroundColor: historyIndex <= 0 ? '#5a5045' : buttonStyle.backgroundColor as string,
            cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
            opacity: historyIndex <= 0 ? 0.5 : 1,
          }}
          data-secondary="false"
          onMouseEnter={applyButtonHover}
          onMouseLeave={applyButtonLeave}
          onMouseDown={applyButtonDown}
          onMouseUp={applyButtonUp}
        >
          ↶ 撤销 <span style={{ fontSize: '11px', opacity: 0.8 }}>{historyIndex}/{MAX_HISTORY}</span>
        </button>

        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          style={{
            ...buttonStyle,
            backgroundColor: historyIndex >= history.length - 1 ? '#5a5045' : buttonStyle.backgroundColor as string,
            cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
            opacity: historyIndex >= history.length - 1 ? 0.5 : 1,
          }}
          data-secondary="false"
          onMouseEnter={applyButtonHover}
          onMouseLeave={applyButtonLeave}
          onMouseDown={applyButtonDown}
          onMouseUp={applyButtonUp}
        >
          ↷ 重做
        </button>

        <div style={{ width: '1px', height: '28px', background: 'rgba(200,180,160,0.2)', margin: '0 6px' }} />

        <button
          onClick={() => setShowClearDialog(true)}
          disabled={fragments.length === 0}
          style={{
            ...buttonStyle,
            backgroundColor: fragments.length === 0 ? '#5a5045' : '#9b5a5a',
            cursor: fragments.length === 0 ? 'not-allowed' : 'pointer',
            opacity: fragments.length === 0 ? 0.5 : 1,
          }}
          data-secondary="true"
          onMouseEnter={(e) => {
            if (e.currentTarget.disabled) return;
            e.currentTarget.style.backgroundColor = '#7a3d3d';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = fragments.length === 0 ? '#5a5045' : '#9b5a5a';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={applyButtonDown}
          onMouseUp={applyButtonUp}
        >
          🗑 清空画布
        </button>

        <div style={{ flex: 1 }} />

        <div
          style={{
            color: '#a89880',
            fontSize: '12px',
            fontFamily: 'monospace',
            marginRight: '10px',
          }}
        >
          碎片: {fragments.length}
        </div>

        <button
          onClick={handleExport}
          disabled={fragments.length === 0 || exporting}
          style={{
            ...buttonStyle,
            backgroundColor: (fragments.length === 0 || exporting) ? '#5a5045' : '#6a8b5a',
            cursor: (fragments.length === 0 || exporting) ? 'not-allowed' : 'pointer',
            opacity: (fragments.length === 0 || exporting) ? 0.5 : 1,
          }}
          data-secondary="true"
          onMouseEnter={(e) => {
            if (e.currentTarget.disabled) return;
            e.currentTarget.style.backgroundColor = '#4e7240';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = (fragments.length === 0 || exporting) ? '#5a5045' : '#6a8b5a';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={applyButtonDown}
          onMouseUp={applyButtonUp}
        >
          {exporting ? '⏳ 导出中...' : '📷 导出 PNG'}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <MaterialPanel onRandomAdd={handleRandomAdd} />

        <CanvasArea
          fragments={fragments}
          selectedId={selectedId}
          zoom={zoom}
          panX={panX}
          panY={panY}
          exporting={exporting}
          onFragmentsChange={handleFragmentsChange}
          onSelectedChange={handleSelectedChange}
          onViewChange={handleViewChange}
          onPlayDragSound={playDragSound}
          onRequestRemove={handleRequestRemove}
          getCanvasRef={handleGetCanvasRef}
        />

        <div
          style={{
            width: '220px',
            height: '100%',
            background: 'rgba(245, 240, 232, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(200, 180, 160, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(200, 180, 160, 0.3)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: '#3a2f24',
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: '0.5px',
              }}
            >
              属性面板
            </h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {!selectedFragment ? (
              <div
                style={{
                  color: '#8a7a65',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  textAlign: 'center',
                  padding: '40px 8px',
                  fontFamily: 'Georgia, serif',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.5 }}>🎨</div>
                选择画布上的碎片<br />查看并编辑属性
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(184, 149, 106, 0.15)',
                    borderRadius: '6px',
                    border: '1px solid rgba(184, 149, 106, 0.3)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6a4e2a',
                    fontFamily: 'monospace',
                  }}
                >
                  类型: {{
                    paper: '📄 粗糙纸纹理',
                    ink: '🎨 手绘墨迹',
                    strip: '📜 撕碎图像条',
                    clipping: '📰 旧报剪报',
                    foil: '✨ 金属箔片',
                  }[selectedFragment.type]}
                </div>

                <FieldGroup label="位置">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <NumberField
                      label="X"
                      value={Math.round(selectedFragment.x)}
                      min={0}
                      max={800}
                      onChange={(v) => updateSelectedProp('x', v)}
                    />
                    <NumberField
                      label="Y"
                      value={Math.round(selectedFragment.y)}
                      min={0}
                      max={600}
                      onChange={(v) => updateSelectedProp('y', v)}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup label="尺寸">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <NumberField
                      label="宽"
                      value={selectedFragment.width}
                      min={20}
                      max={400}
                      onChange={(v) => updateSelectedProp('width', v)}
                    />
                    <NumberField
                      label="高"
                      value={selectedFragment.height}
                      min={20}
                      max={400}
                      onChange={(v) => updateSelectedProp('height', v)}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup label={`旋转角度: ${Math.round(selectedFragment.rotation)}°`}>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={selectedFragment.rotation}
                    onChange={(e) => updateSelectedProp('rotation', parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#b8956a',
                      cursor: 'pointer',
                    }}
                  />
                </FieldGroup>

                <FieldGroup label="混合模式">
                  <select
                    value={selectedFragment.blendMode}
                    onChange={(e) => updateSelectedProp('blendMode', e.target.value as BlendMode)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid rgba(200, 180, 160, 0.5)',
                      borderRadius: '6px',
                      backgroundColor: '#fffcf7',
                      fontSize: '13px',
                      color: '#3a2f24',
                      fontFamily: 'Georgia, serif',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {BLEND_MODES.map((m) => (
                      <option key={m} value={m}>
                        {BLEND_MODE_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </FieldGroup>

                <FieldGroup label="锁定">
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      background: selectedFragment.locked ? 'rgba(155, 90, 90, 0.1)' : 'transparent',
                      borderRadius: '6px',
                      transition: 'background 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFragment.locked}
                      onChange={(e) => updateSelectedProp('locked', e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#b8956a',
                        cursor: 'pointer',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '13px',
                        color: selectedFragment.locked ? '#9b5a5a' : '#5a4a35',
                        fontFamily: 'Georgia, serif',
                        fontWeight: 500,
                      }}
                    >
                      {selectedFragment.locked ? '🔒 已锁定移动' : '🔓 允许移动'}
                    </span>
                  </label>
                </FieldGroup>

                <div style={{ height: '1px', background: 'rgba(200, 180, 160, 0.3)', margin: '4px 0' }} />

                <button
                  onClick={() => handleRequestRemove(selectedFragment.id)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#9b5a5a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'Georgia, serif',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7a3d3d';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#9b5a5a';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                >
                  🗑 删除此碎片 (右键双击)
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(200, 180, 160, 0.3)',
              fontSize: '11px',
              color: '#8a7a65',
              lineHeight: 1.6,
              background: 'rgba(240, 235, 225, 0.5)',
            }}
          >
            💡 提示：滚轮旋转 | 右键双击删除
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showClearDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(20, 15, 10, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setShowClearDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '360px',
                padding: '28px',
                background: 'linear-gradient(145deg, #f5f0e8 0%, #ebe2d3 100%)',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.2)',
                border: '1px solid rgba(200, 180, 160, 0.5)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#3a2f24',
                    fontFamily: 'Georgia, serif',
                    marginBottom: '8px',
                  }}
                >
                  确认清空画布？
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#6a5a45', lineHeight: 1.5 }}>
                  画布上共有 <strong style={{ color: '#9b5a5a' }}>{fragments.length}</strong> 个碎片，<br />
                  此操作将无法恢复（但仍可使用撤销）。
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowClearDialog(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#6a5a45',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'Georgia, serif',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#504435';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6a5a45';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleClear}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#9b5a5a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'Georgia, serif',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7a3d3d';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#9b5a5a';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  确认清空
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
            style={{
              position: 'fixed',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              backgroundColor: 'rgba(44, 44, 44, 0.95)',
              backdropFilter: 'blur(10px)',
              color: '#f5f0e8',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'Georgia, serif',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              border: '1px solid rgba(200, 180, 160, 0.2)',
              zIndex: 10000,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
}

const FieldGroup: React.FC<FieldGroupProps> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color: '#7a6a55',
        fontFamily: 'Georgia, serif',
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ label, value, min, max, onChange }) => {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span
        style={{
          fontSize: '11px',
          color: '#8a7a65',
          fontWeight: 500,
          fontFamily: 'Georgia, serif',
        }}
      >
        {label}
      </span>
      <input
        type="number"
        value={localValue}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.value;
          setLocalValue(v);
          const num = parseInt(v, 10);
          if (!isNaN(num)) {
            const clamped = Math.max(min, Math.min(max, num));
            onChange(clamped);
          }
        }}
        onBlur={(e) => {
          const num = parseInt(e.target.value, 10);
          if (isNaN(num)) {
            setLocalValue(String(value));
          } else {
            const clamped = Math.max(min, Math.min(max, num));
            setLocalValue(String(clamped));
            onChange(clamped);
          }
        }}
        style={{
          padding: '6px 8px',
          border: '1px solid rgba(200, 180, 160, 0.5)',
          borderRadius: '6px',
          backgroundColor: '#fffcf7',
          fontSize: '13px',
          color: '#3a2f24',
          fontFamily: 'monospace',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          MozAppearance: 'textfield',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#b8956a';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184, 149, 106, 0.2)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(200, 180, 160, 0.5)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </label>
  );
};

export default App;
