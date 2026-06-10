import { useState, useMemo } from 'react';
import EasingGrid from './components/EasingGrid';
import BezierEditor from './components/BezierEditor';
import { easingPresets } from './utils/easingPresets';
import type { EasingPreset } from './utils/easingPresets';

type FilterCategory = 'all' | 'preset' | 'custom';

export default function App() {
  const [presets, setPresets] = useState<EasingPreset[]>(easingPresets);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [globalSignal, setGlobalSignal] = useState(-1);
  const [editingPreset, setEditingPreset] = useState<EasingPreset | null>(null);

  const { filteredPresets, matchedIds } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = new Set<string>();
    let filtered = presets;

    if (filterCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === filterCategory);
    }

    if (query) {
      filtered = filtered.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(query);
        const cssMatch = p.cssValue.toLowerCase().includes(query);
        if (nameMatch || cssMatch) {
          matched.add(p.id);
          return true;
        }
        return false;
      });
    }

    return { filteredPresets: filtered, matchedIds: matched };
  }, [presets, searchQuery, filterCategory]);

  const handlePlayAll = () => {
    setGlobalSignal((prev) => prev + 1);
  };

  const handleResetAll = () => {
    setGlobalSignal(0);
  };

  const handleEdit = (preset: EasingPreset) => {
    setEditingPreset(preset);
  };

  const handleCloseEditor = () => {
    setEditingPreset(null);
  };

  const handleSavePreset = (updated: EasingPreset) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...updated, category: 'custom' as const } : p))
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">CSS Easing Palette</h1>
        <p className="app-subtitle">可视化对比 32 种 CSS 缓动函数，实时拖拽编辑贝塞尔曲线</p>
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="搜索函数名称或 CSS 表达式..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
          >
            <option value="all">全部</option>
            <option value="preset">预设</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={handleResetAll}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            重置所有
          </button>
          <button className="btn btn-primary" onClick={handlePlayAll}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            同步播放所有
          </button>
        </div>
      </div>

      <EasingGrid
        presets={filteredPresets}
        matchedIds={matchedIds}
        globalSignal={globalSignal}
        onEdit={handleEdit}
      />

      {editingPreset && (
        <BezierEditor
          preset={editingPreset}
          onClose={handleCloseEditor}
          onSave={handleSavePreset}
        />
      )}
    </div>
  );
}
