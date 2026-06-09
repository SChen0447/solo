import { useState, useRef, useEffect, useCallback } from 'react';
import ImagePreview from './components/ImagePreview';
import { FILTER_PRESETS, generateAllThumbnails } from './data/filterPresets';
import { FilterConfig, FilterType, FilterParams, applyFilter } from './utils/filterEngine';

interface HistoryState {
  filterType: FilterType | null;
  params: FilterParams;
}

const MAX_HISTORY = 10;

export default function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType | null>(null);
  const [filterParams, setFilterParams] = useState<FilterParams>({
    intensity: 100,
    noise: false,
    grain: false,
    border: false,
  });
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [isComparing, setIsComparing] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingOver = useRef(false);

  const filterConfig: FilterConfig | null =
    selectedFilter !== null
      ? { type: selectedFilter, params: filterParams }
      : null;

  const pushHistory = useCallback(
    (state: HistoryState) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(state);
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    },
    [historyIndex]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    setSelectedFilter(state.filterType);
    setFilterParams(state.params);
    setHistoryIndex(newIndex);
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    setSelectedFilter(state.filterType);
    setFilterParams(state.params);
    setHistoryIndex(newIndex);
  };

  const handleImageLoad = useCallback(
    (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        showNotify('图片大小不能超过 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        showNotify('只支持 JPEG 和 PNG 格式');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setSelectedFilter(null);
          setFilterParams({ intensity: 100, noise: false, grain: false, border: false });
          const thumbs = generateAllThumbnails(img, 50);
          setThumbnails(thumbs);
          setHistory([]);
          setHistoryIndex(-1);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const showNotify = (msg: string) => {
    setNotificationMessage(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2500);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageLoad(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    isDraggingOver.current = false;
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageLoad(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    isDraggingOver.current = true;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    isDraggingOver.current = false;
  };

  const handleFilterSelect = (type: FilterType) => {
    const preset = FILTER_PRESETS.find((p) => p.type === type);
    if (!preset) return;
    const newState: HistoryState = {
      filterType: type,
      params: { ...preset.defaultParams },
    };
    setSelectedFilter(type);
    setFilterParams({ ...preset.defaultParams });
    pushHistory(newState);
  };

  const handleParamChange = (key: keyof FilterParams, value: number | boolean) => {
    const newParams = { ...filterParams, [key]: value };
    setFilterParams(newParams);
    if (selectedFilter !== null) {
      const newState: HistoryState = {
        filterType: selectedFilter,
        params: newParams,
      };
      pushHistory(newState);
    }
  };

  const handleReset = () => {
    setResetTrigger((prev) => prev + 1);
    setSelectedFilter(null);
    setFilterParams({ intensity: 100, noise: false, grain: false, border: false });
    const newState: HistoryState = { filterType: null, params: filterParams };
    pushHistory(newState);
  };

  const handleExport = async () => {
    if (!image) return;
    setIsExporting(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsExporting(false);
      return;
    }
    ctx.drawImage(image, 0, 0);

    if (filterConfig) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const filtered = applyFilter(imageData, filterConfig);
      ctx.putImageData(filtered, 0, 0);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filtered-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotify('导出成功！');
      }
      setIsExporting(false);
    }, 'image/png');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && image) {
        e.preventDefault();
        setIsComparing(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsComparing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [image]);

  const currentPreset = selectedFilter
    ? FILTER_PRESETS.find((p) => p.type === selectedFilter)
    : null;

  return (
    <div
      className="app-container"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>滤镜工作室</h1>
          <button className="btn btn-primary upload-btn" onClick={() => fileInputRef.current?.click()}>
            上传图片
          </button>
        </div>

        <div className="filter-list">
          <div className="section-title">滤镜预设</div>
          <div className="filter-grid">
            {FILTER_PRESETS.map((preset) => (
              <div
                key={preset.type}
                className={`filter-item ${selectedFilter === preset.type ? 'active' : ''}`}
                onClick={() => handleFilterSelect(preset.type)}
              >
                <div className="filter-thumb">
                  {thumbnails[preset.type] ? (
                    <img src={thumbnails[preset.type]} alt={preset.name} />
                  ) : (
                    <div className="thumb-placeholder" />
                  )}
                </div>
                <span className="filter-name">{preset.name}</span>
              </div>
            ))}
          </div>
        </div>

        {currentPreset && (
          <div className="params-panel">
            <div className="section-title">参数调整 - {currentPreset.name}</div>

            <div className="param-item">
              <label>
                强度 <span className="param-value">{filterParams.intensity}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filterParams.intensity}
                onChange={(e) => handleParamChange('intensity', Number(e.target.value))}
              />
            </div>

            <div className="param-item param-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={!!filterParams.noise}
                  onChange={(e) => handleParamChange('noise', e.target.checked)}
                />
                添加噪点
              </label>
            </div>

            <div className="param-item param-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={!!filterParams.grain}
                  onChange={(e) => handleParamChange('grain', e.target.checked)}
                />
                添加纹理
              </label>
            </div>

            <div className="param-item param-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={!!filterParams.border}
                  onChange={(e) => handleParamChange('border', e.target.checked)}
                />
                添加边框
              </label>
            </div>
          </div>
        )}

        <div className="action-panel">
          <div className="action-row">
            <button className="btn btn-secondary" onClick={handleUndo} disabled={!canUndo}>
              撤销
            </button>
            <button className="btn btn-secondary" onClick={handleRedo} disabled={!canRedo}>
              重做
            </button>
          </div>
          <div className="action-row">
            <button
              className="btn btn-secondary"
              onMouseDown={() => setIsComparing(true)}
              onMouseUp={() => setIsComparing(false)}
              onMouseLeave={() => setIsComparing(false)}
              disabled={!image}
            >
              对比
            </button>
            <button className="btn btn-secondary" onClick={handleReset} disabled={!image}>
              重置
            </button>
          </div>
          <button className="btn btn-primary export-btn" onClick={handleExport} disabled={!image}>
            导出 PNG
          </button>
        </div>
      </aside>

      <main className="preview-area">
        <ImagePreview
          image={image}
          filterConfig={filterConfig}
          isComparing={isComparing}
          resetTrigger={resetTrigger}
        />
      </main>

      {isExporting && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>正在导出...</p>
        </div>
      )}

      {showNotification && (
        <div className="notification" onClick={() => setShowNotification(false)}>
          {notificationMessage}
        </div>
      )}
    </div>
  );
}
