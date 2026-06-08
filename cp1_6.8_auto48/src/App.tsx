import { useState, useRef, useCallback, useEffect } from 'react';
import { TextureSelector } from './TextureSelector';
import { TextureMixer, TextureMixerRef } from './TextureMixer';
import { HistoryPanel } from './HistoryPanel';
import { MixState, HistoryItem, TEXTURE_LIST, BlendMode, TextureType } from './types';
import { downloadCanvasAsPNG } from './utils/canvasUtils';
import './styles/App.css';

type TransitionType = 'none' | 'dissolve' | 'wipe';

function App() {
  const mixerRef = useRef<TextureMixerRef>(null);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [transitionType, setTransitionType] = useState<TransitionType>('none');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [mixState, setMixState] = useState<MixState>({
    textureA: 'pencil',
    textureB: 'watercolor',
    colorA: TEXTURE_LIST.find(t => t.id === 'pencil')?.defaultColor || '#4a4a4a',
    colorB: TEXTURE_LIST.find(t => t.id === 'watercolor')?.defaultColor || '#5b9bd5',
    blendMode: 'multiply',
    opacityA: 70,
    opacityB: 50,
    intensity: 80,
  });

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const historyIdCounter = useRef(0);

  const handleSelectTexture = useCallback((type: TextureType) => {
    setMixState(prev => {
      if (activeSlot === 'A') {
        const defaultColor = TEXTURE_LIST.find(t => t.id === type)?.defaultColor || '#4a4a4a';
        return { ...prev, textureA: type, colorA: defaultColor };
      } else {
        const defaultColor = TEXTURE_LIST.find(t => t.id === type)?.defaultColor || '#4a4a4a';
        return { ...prev, textureB: type, colorB: defaultColor };
      }
    });
    setTransitionType('none');
  }, [activeSlot]);

  const handleColorChange = useCallback((slot: 'A' | 'B', color: string) => {
    setMixState(prev => {
      if (slot === 'A') {
        return { ...prev, colorA: color };
      } else {
        return { ...prev, colorB: color };
      }
    });
    setTransitionType('none');
  }, []);

  const handleBlendModeChange = useCallback((mode: BlendMode) => {
    setTransitionType('dissolve');
    setMixState(prev => ({ ...prev, blendMode: mode }));
  }, []);

  const handleOpacityAChange = useCallback((value: number) => {
    setMixState(prev => ({ ...prev, opacityA: value }));
    setTransitionType('none');
  }, []);

  const handleOpacityBChange = useCallback((value: number) => {
    setMixState(prev => ({ ...prev, opacityB: value }));
    setTransitionType('none');
  }, []);

  const handleIntensityChange = useCallback((value: number) => {
    setMixState(prev => ({ ...prev, intensity: value }));
    setTransitionType('none');
  }, []);

  const handleSaveToHistory = useCallback(() => {
    if (!mixerRef.current) return;
    
    const canvas = mixerRef.current.getCanvas();
    if (!canvas) return;

    const thumbnail = mixerRef.current.captureThumbnail(60);
    
    const newItem: HistoryItem = {
      id: ++historyIdCounter.current,
      timestamp: Date.now(),
      state: { ...mixState },
      thumbnail,
    };

    setHistory(prev => {
      const updated = [newItem, ...prev];
      if (updated.length > 20) {
        return updated.slice(0, 20);
      }
      return updated;
    });
  }, [mixState]);

  const handleRestoreHistory = useCallback((item: HistoryItem) => {
    setTransitionType('wipe');
    setMixState({ ...item.state });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    historyIdCounter.current = 0;
  }, []);

  const handleExportHistory = useCallback((item: HistoryItem) => {
    const link = document.createElement('a');
    link.download = `texture-${item.id}.png`;
    link.href = item.thumbnail;
    link.click();
  }, []);

  const handleExportPNG = useCallback(() => {
    if (!mixerRef.current) return;
    const canvas = mixerRef.current.getCanvas();
    if (!canvas) return;
    downloadCanvasAsPNG(canvas, 'texture-mix.png');
  }, []);

  const handleTransitionEnd = useCallback(() => {
    setTransitionType('none');
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
        setHistoryOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="menu-btn mobile-only"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <h1 className="app-title">笔触纹理混合器</h1>
        <div className="header-actions">
          <button className="save-btn" onClick={handleSaveToHistory}>
            保存
          </button>
          <button className="export-btn" onClick={handleExportPNG}>
            导出PNG
          </button>
        </div>
        <button
          className="history-toggle mobile-only"
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          历史
        </button>
      </header>

      <div className="app-main">
        <aside className={`left-panel ${sidebarOpen ? 'open' : ''}`}>
          <TextureSelector
            selectedA={mixState.textureA}
            selectedB={mixState.textureB}
            colorA={mixState.colorA}
            colorB={mixState.colorB}
            blendMode={mixState.blendMode}
            opacityA={mixState.opacityA}
            opacityB={mixState.opacityB}
            intensity={mixState.intensity}
            activeSlot={activeSlot}
            onSelectTexture={handleSelectTexture}
            onColorChange={handleColorChange}
            onBlendModeChange={handleBlendModeChange}
            onOpacityAChange={handleOpacityAChange}
            onOpacityBChange={handleOpacityBChange}
            onIntensityChange={handleIntensityChange}
            onActiveSlotChange={setActiveSlot}
          />
        </aside>

        {sidebarOpen && (
          <div className="overlay mobile-only" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="center-panel">
          <TextureMixer
            ref={mixerRef}
            mixState={mixState}
            transitionType={transitionType}
            onTransitionEnd={handleTransitionEnd}
          />
        </main>

        {historyOpen && (
          <div className="overlay mobile-only" onClick={() => setHistoryOpen(false)} />
        )}

        <aside className={`right-panel ${historyOpen ? 'open' : ''}`}>
          <HistoryPanel
            history={history}
            onRestore={handleRestoreHistory}
            onClear={handleClearHistory}
            onExport={handleExportHistory}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
