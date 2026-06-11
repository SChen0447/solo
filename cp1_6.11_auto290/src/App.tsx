import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NeumeRenderer, NeumeRendererHandle } from './NeumeRenderer';
import {
  generateMelody,
  midiToFrequency,
  getModeName,
  type Note,
  type ChurchMode,
  type MelodyConfig,
  type SavedScore
} from './melodyEngine';

type ModeOption = { value: ChurchMode; label: string; description: string; icon: string };

const MODES: ModeOption[] = [
  { value: 'dorian', label: '多利亚', description: 'D-E-F-G-A-B-C-D · 庄重肃穆', icon: 'Ⅰ' },
  { value: 'phrygian', label: '弗里吉亚', description: 'E-F-G-A-B-C-D-E · 神秘哀婉', icon: 'Ⅲ' },
  { value: 'lydian', label: '利底亚', description: 'F-G-A-B-C-D-E-F · 明亮辉煌', icon: 'Ⅴ' },
  { value: 'mixolydian', label: '混合利底亚', description: 'G-A-B-C-D-E-F-G · 欢快昂扬', icon: 'Ⅶ' }
];

const ControlCard: React.FC<{ title: string; children: React.ReactNode; icon: string }> = ({ title, children, icon }) => (
  <motion.div
    className="control-card"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="card-header">
      <span className="card-icon">{icon}</span>
      <h3>{title}</h3>
    </div>
    <div className="card-content">{children}</div>
  </motion.div>
);

const ModeSelector: React.FC<{
  selected: ChurchMode;
  onChange: (m: ChurchMode) => void;
}> = ({ selected, onChange }) => (
  <div className="mode-grid">
    {MODES.map((mode) => (
      <button
        key={mode.value}
        className={`mode-btn ${selected === mode.value ? 'active' : ''}`}
        onClick={() => onChange(mode.value)}
      >
        <span className="mode-icon">{mode.icon}</span>
        <span className="mode-label">{mode.label}</span>
        <span className="mode-desc">{mode.description}</span>
      </button>
    ))}
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}> = ({ label, value, min, max, step = 1, onChange, suffix = '' }) => (
  <div className="slider-group">
    <div className="slider-label">
      <span>{label}</span>
      <span className="slider-value">{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="custom-slider"
    />
    <div className="slider-ticks">
      <span>{min}{suffix}</span>
      <span>{max}{suffix}</span>
    </div>
  </div>
);

const ActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: string;
}> = ({ onClick, children, variant = 'primary', disabled = false, icon }) => (
  <button
    className={`action-btn btn-${variant}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className="btn-icon">{icon}</span>}
    {children}
  </button>
);

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const rendererRef = useRef<NeumeRendererHandle>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTimeoutsRef = useRef<number[]>([]);

  const [mode, setMode] = useState<ChurchMode>('dorian');
  const [rangeLow, setRangeLow] = useState(3);
  const [rangeHigh, setRangeHigh] = useState(10);
  const [complexity, setComplexity] = useState(3);
  const [noteCount, setNoteCount] = useState(12);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setSaveMessage(null);
    stopPlayback();

    const startTime = performance.now();
    const config: MelodyConfig = { mode, rangeLow, rangeHigh, complexity, noteCount };
    const newNotes = generateMelody(config);

    setTimeout(() => {
      setNotes(newNotes);
      setIsGenerating(false);
      const elapsed = performance.now() - startTime;
      console.log(`旋律生成耗时: ${elapsed.toFixed(2)}ms`);
    }, 100);
  }, [mode, rangeLow, rangeHigh, complexity, noteCount]);

  const playNote = useCallback((note: Note, startTime: number, duration: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const freq = midiToFrequency(note.midiNote);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const octaveOsc = ctx.createOscillator();
    const octaveGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    octaveOsc.type = 'sine';
    octaveOsc.frequency.setValueAtTime(freq * 2, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gain.gain.setValueAtTime(0.25, startTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    octaveGain.gain.setValueAtTime(0, startTime);
    octaveGain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
    octaveGain.gain.setValueAtTime(0.08, startTime + duration * 0.6);
    octaveGain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain).connect(ctx.destination);
    octaveOsc.connect(octaveGain).connect(ctx.destination);

    osc.start(startTime);
    octaveOsc.start(startTime);
    osc.stop(startTime + duration);
    octaveOsc.stop(startTime + duration);
  }, []);

  const handlePlay = useCallback(() => {
    if (notes.length === 0 || isPlaying) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    setIsPlaying(true);
    const baseDuration = 0.4 / playbackSpeed;
    let currentTime = ctx.currentTime + 0.1;

    playTimeoutsRef.current.forEach(clearTimeout);
    playTimeoutsRef.current = [];

    notes.forEach((note, i) => {
      const noteDuration = baseDuration * note.duration;
      const highlightStart = (currentTime - ctx.currentTime - 0.02) * 1000;

      const timeoutId = window.setTimeout(() => {
        setCurrentNoteIndex(i);
      }, Math.max(0, highlightStart));
      playTimeoutsRef.current.push(timeoutId);

      playNote(note, currentTime, noteDuration * 0.95);
      currentTime += noteDuration;
    });

    const endTimeout = window.setTimeout(() => {
      setIsPlaying(false);
      setCurrentNoteIndex(-1);
    }, (currentTime - ctx.currentTime + 0.2) * 1000);
    playTimeoutsRef.current.push(endTimeout);
  }, [notes, isPlaying, playbackSpeed, playNote]);

  const stopPlayback = useCallback(() => {
    playTimeoutsRef.current.forEach(clearTimeout);
    playTimeoutsRef.current = [];
    setIsPlaying(false);
    setCurrentNoteIndex(-1);
    if (audioCtxRef.current) {
      audioCtxRef.current.suspend();
    }
  }, []);

  const handleStop = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const handleExport = useCallback(async () => {
    if (!rendererRef.current || notes.length === 0) return;
    setIsExporting(true);
    setSaveMessage(null);

    try {
      const dataUrl = await rendererRef.current.exportImage();
      const link = document.createElement('a');
      link.download = `圣咏_${getModeName(mode)}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setSaveMessage({ type: 'success', text: '羊皮纸乐谱已导出！' });
    } catch (err) {
      setSaveMessage({ type: 'error', text: '导出失败，请重试' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [notes, mode]);

  const handleSave = useCallback(async () => {
    if (!rendererRef.current || notes.length === 0) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const screenshot = await rendererRef.current.exportImage();
      const scoreData = {
        name: `${getModeName(mode)} · 圣咏抄本 ${new Date().toLocaleDateString('zh-CN')}`,
        mode,
        notes,
        screenshot,
        createdAt: Date.now(),
        complexity
      };

      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
      });

      if (response.ok) {
        setSaveMessage({ type: 'success', text: '乐谱已存入修道院档案室！' });
      } else {
        throw new Error('保存失败');
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: '保存失败，请检查后端服务' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [notes, mode, complexity]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopPlayback]);

  const ControlPanel = (
    <div className="control-panel">
      <ControlCard title="调式选择" icon="🎼">
        <ModeSelector selected={mode} onChange={setMode} />
      </ControlCard>

      <ControlCard title="音域设置" icon="🎚️">
        <Slider
          label="最低音级"
          value={rangeLow}
          min={1}
          max={8}
          onChange={(v) => {
            setRangeLow(v);
            if (v >= rangeHigh) setRangeHigh(Math.min(v + 2, 15));
          }}
        />
        <Slider
          label="最高音级"
          value={rangeHigh}
          min={5}
          max={15}
          onChange={(v) => {
            setRangeHigh(v);
            if (v <= rangeLow) setRangeLow(Math.max(v - 2, 1));
          }}
        />
      </ControlCard>

      <ControlCard title="旋律参数" icon="✨">
        <Slider
          label="复杂度"
          value={complexity}
          min={1}
          max={5}
          onChange={setComplexity}
        />
        <Slider
          label="音符数量"
          value={noteCount}
          min={8}
          max={16}
          onChange={setNoteCount}
        />
      </ControlCard>

      <ControlCard title="播放控制" icon="🎵">
        <Slider
          label="播放速度"
          value={playbackSpeed}
          min={0.5}
          max={2}
          step={0.1}
          onChange={setPlaybackSpeed}
          suffix="x"
        />
        <div className="playback-btns">
          <ActionButton
            onClick={handlePlay}
            variant="primary"
            icon="▶"
            disabled={isPlaying || notes.length === 0}
          >
            播放圣咏
          </ActionButton>
          <ActionButton
            onClick={handleStop}
            variant="secondary"
            icon="■"
            disabled={!isPlaying}
          >
            停止
          </ActionButton>
        </div>
      </ControlCard>

      <div className="generate-section">
        <ActionButton
          onClick={handleGenerate}
          variant="primary"
          icon="✒️"
          disabled={isGenerating}
        >
          {isGenerating ? '抄写中...' : '生成圣咏旋律'}
        </ActionButton>
      </div>

      <div className="export-section">
        <ActionButton
          onClick={handleSave}
          variant="secondary"
          icon="📜"
          disabled={isSaving || notes.length === 0}
        >
          {isSaving ? '保存中...' : '保存至档案室'}
        </ActionButton>
        <ActionButton
          onClick={handleExport}
          variant="secondary"
          icon="🖼️"
          disabled={isExporting || notes.length === 0}
        >
          {isExporting ? '导出中...' : '导出羊皮纸'}
        </ActionButton>
        <ActionButton
          onClick={() => navigate('/history')}
          variant="secondary"
          icon="📚"
        >
          历史乐谱
        </ActionButton>
      </div>

      <AnimatePresence>
        {saveMessage && (
          <motion.div
            className={`message-toast ${saveMessage.type}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {saveMessage.type === 'success' ? '✓' : '✗'} {saveMessage.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <span className="title-decoration">✠</span>
            圣咏旋律生成工坊
            <span className="title-decoration">✠</span>
          </h1>
          <p className="app-subtitle">—— 公元十三世纪 · 修道院抄经室 ——</p>
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileDrawerOpen(true)}
        >
          ☰ 控制面板
        </button>
      </header>

      <div className="main-layout">
        <div className="desktop-controls">
          {ControlPanel}
        </div>

        <AnimatePresence>
          {isMobileDrawerOpen && (
            <>
              <motion.div
                className="mobile-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileDrawerOpen(false)}
              />
              <motion.div
                className="mobile-drawer"
                initial={{ y: '-100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="drawer-header">
                  <h2>控制面板</h2>
                  <button onClick={() => setIsMobileDrawerOpen(false)}>✕</button>
                </div>
                {ControlPanel}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="preview-section">
          <div className="preview-header">
            <div className="preview-title">
              <span className="scroll-icon">📜</span>
              <h2>羊皮纸抄本预览</h2>
              {notes.length > 0 && (
                <span className="preview-badge">
                  {getModeName(mode)} · {notes.length}音符
                </span>
              )}
            </div>
          </div>
          <div className="preview-frame">
            <NeumeRenderer
              ref={rendererRef}
              notes={notes}
              mode={mode}
              currentNoteIndex={currentNoteIndex}
              isPlaying={isPlaying}
            />
          </div>
          {isPlaying && notes.length > 0 && (
            <div className="playback-indicator">
              <motion.div
                className="playback-dot"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span>正在咏唱: 音符 {currentNoteIndex + 1} / {notes.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<SavedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScore, setSelectedScore] = useState<SavedScore | null>(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scores');
      if (response.ok) {
        const data = await response.json();
        setScores(data.sort((a: SavedScore, b: SavedScore) => b.createdAt - a.createdAt));
      }
    } catch (err) {
      console.error('获取历史失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要销毁这份抄本吗？此操作不可撤销。')) return;
    try {
      await fetch(`/api/scores/${id}`, { method: 'DELETE' });
      setScores(s => s.filter(sc => sc.id !== id));
      if (selectedScore?.id === id) setSelectedScore(null);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <span className="title-decoration">📚</span>
            修道院档案室
            <span className="title-decoration">📚</span>
          </h1>
          <p className="app-subtitle">—— 珍藏历代圣咏抄本 ——</p>
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => navigate('/')}
        >
          ← 返回工坊
        </button>
      </header>

      <div className="history-layout">
        <div className="history-header">
          <ActionButton onClick={() => navigate('/')} variant="secondary" icon="←">
            返回抄经工坊
          </ActionButton>
          <ActionButton onClick={fetchScores} variant="secondary" icon="↻">
            刷新目录
          </ActionButton>
        </div>

        <div className="history-content">
          <div className="score-list">
            <h3 className="list-title">📋 抄本目录</h3>
            {loading ? (
              <div className="loading-state">翻阅档案中...</div>
            ) : scores.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>档案室空空如也</p>
                <p style={{ fontSize: '14px', opacity: 0.7 }}>返回工坊创作第一份圣咏抄本吧</p>
              </div>
            ) : (
              <div className="score-grid">
                {scores.map((score, index) => (
                  <motion.div
                    key={score.id}
                    className={`score-card ${selectedScore?.id === score.id ? 'selected' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedScore(score)}
                    layout
                  >
                    <div className="score-thumbnail">
                      <img src={score.screenshot} alt={score.name} />
                    </div>
                    <div className="score-info">
                      <h4>{score.name}</h4>
                      <div className="score-meta">
                        <span>{getModeName(score.mode)}</span>
                        <span>{score.notes.length} 音符</span>
                      </div>
                      <div className="score-date">
                        {new Date(score.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(score.id);
                      }}
                    >
                      🗑️
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence>
            {selectedScore && (
              <motion.div
                className="score-detail"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
              >
                <div className="detail-header">
                  <h3>📖 抄本详情</h3>
                  <button onClick={() => setSelectedScore(null)} className="close-detail">✕</button>
                </div>
                <div className="detail-content">
                  <div className="detail-image">
                    <img src={selectedScore.screenshot} alt={selectedScore.name} />
                  </div>
                  <div className="detail-info">
                    <h4>{selectedScore.name}</h4>
                    <div className="detail-meta-grid">
                      <div>
                        <label>调式</label>
                        <span>{getModeName(selectedScore.mode)}</span>
                      </div>
                      <div>
                        <label>复杂度</label>
                        <span>{'★'.repeat(selectedScore.complexity)}{'☆'.repeat(5 - selectedScore.complexity)}</span>
                      </div>
                      <div>
                        <label>音符数</label>
                        <span>{selectedScore.notes.length}</span>
                      </div>
                      <div>
                        <label>创作时间</label>
                        <span>{new Date(selectedScore.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    <a
                      href={selectedScore.screenshot}
                      download={`${selectedScore.name}.png`}
                      className="download-btn"
                    >
                      🖼️ 下载图片
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<MainPage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  );
};

export default App;
