import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PerfumeWheel from './components/PerfumeWheel';
import ScentChart, { MiniRadar, ComparisonOverlay } from './components/ScentChart';
import {
  Scent,
  PlacedScent,
  NoteType,
  Formula,
  RadarData,
  PRESETS,
  Preset,
  createEmptySlots,
  calculateRadarData,
  getTotalConcentration,
  getAllPlacedScents,
  saveFormula,
  loadFormulas,
  deleteFormula,
  loadPreset,
  getFormulaRadarData,
} from './utils/formula';

const DEFAULT_THEME_COLOR = '#c49a6c';

const App: React.FC = () => {
  const [topNotes, setTopNotes] = useState<(PlacedScent | null)[]>(createEmptySlots());
  const [middleNotes, setMiddleNotes] = useState<(PlacedScent | null)[]>(createEmptySlots());
  const [baseNotes, setBaseNotes] = useState<(PlacedScent | null)[]>(createEmptySlots());
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const [formulaName, setFormulaName] = useState('');
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [presetAnimation, setPresetAnimation] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    setFormulas(loadFormulas());
  }, []);

  const radarData: RadarData = useMemo(
    () => calculateRadarData(topNotes, middleNotes, baseNotes),
    [topNotes, middleNotes, baseNotes],
  );

  const placedScents = useMemo(
    () => getAllPlacedScents(topNotes, middleNotes, baseNotes),
    [topNotes, middleNotes, baseNotes],
  );

  const totalConcentration = useMemo(
    () => getTotalConcentration(topNotes, middleNotes, baseNotes),
    [topNotes, middleNotes, baseNotes],
  );

  const handlePlaceScent = useCallback(
    (type: NoteType, slotIndex: number, scent: Scent) => {
      const newScent: PlacedScent = {
        ...scent,
        concentration: 50,
        slotIndex,
      };

      const updateNotes = (notes: (PlacedScent | null)[]) => {
        const newNotes = [...notes];
        newNotes[slotIndex] = newScent;
        return newNotes;
      };

      switch (type) {
        case 'top':
          setTopNotes(updateNotes);
          break;
        case 'middle':
          setMiddleNotes(updateNotes);
          break;
        case 'base':
          setBaseNotes(updateNotes);
          break;
      }
    },
    [],
  );

  const handleRemoveScent = useCallback((type: NoteType, slotIndex: number) => {
    const updateNotes = (notes: (PlacedScent | null)[]) => {
      const newNotes = [...notes];
      newNotes[slotIndex] = null;
      return newNotes;
    };

    switch (type) {
      case 'top':
        setTopNotes(updateNotes);
        break;
      case 'middle':
        setMiddleNotes(updateNotes);
        break;
      case 'base':
        setBaseNotes(updateNotes);
        break;
    }
  }, []);

  const handleConcentrationChange = useCallback(
    (type: NoteType, slotIndex: number, concentration: number) => {
      const updateNotes = (notes: (PlacedScent | null)[]) => {
        const newNotes = [...notes];
        if (newNotes[slotIndex]) {
          newNotes[slotIndex] = {
            ...newNotes[slotIndex]!,
            concentration,
          };
        }
        return newNotes;
      };

      switch (type) {
        case 'top':
          setTopNotes(updateNotes);
          break;
        case 'middle':
          setMiddleNotes(updateNotes);
          break;
        case 'base':
          setBaseNotes(updateNotes);
          break;
      }
    },
    [],
  );

  const handleSaveFormula = useCallback(() => {
    if (!formulaName.trim() || placedScents.length === 0) return;

    const newFormula = saveFormula(
      formulaName.trim(),
      themeColor,
      topNotes,
      middleNotes,
      baseNotes,
    );

    setFormulas([newFormula, ...formulas]);
    setFormulaName('');
  }, [formulaName, themeColor, topNotes, middleNotes, baseNotes, formulas, placedScents.length]);

  const handleDeleteFormula = useCallback(
    (id: string) => {
      deleteFormula(id);
      setFormulas(formulas.filter((f) => f.id !== id));
      setSelectedForComparison((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [formulas],
  );

  const handleToggleComparison = useCallback((id: string) => {
    setSelectedForComparison((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleLoadPreset = useCallback((preset: Preset) => {
    const result = loadPreset(preset);
    setTopNotes(result.topNotes);
    setMiddleNotes(result.middleNotes);
    setBaseNotes(result.baseNotes);
    setThemeColor(result.themeColor);
    setPresetAnimation(true);
    setShowPresets(false);
  }, []);

  const handlePresetAnimationComplete = useCallback(() => {
    setPresetAnimation(false);
  }, []);

  const handleClearWheel = useCallback(() => {
    setTopNotes(createEmptySlots());
    setMiddleNotes(createEmptySlots());
    setBaseNotes(createEmptySlots());
  }, []);

  const comparisonFormulas = useMemo(
    () => formulas.filter((f) => selectedForComparison.has(f.id)),
    [formulas, selectedForComparison],
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">数字调香师</h1>
        <p className="app-subtitle">探索属于你的独特香氛</p>
      </header>

      <main className="app-main">
        <section className="main-content">
          <PerfumeWheel
            topNotes={topNotes}
            middleNotes={middleNotes}
            baseNotes={baseNotes}
            onPlaceScent={handlePlaceScent}
            onRemoveScent={handleRemoveScent}
            onConcentrationChange={handleConcentrationChange}
            presetAnimation={presetAnimation}
            onPresetAnimationComplete={handlePresetAnimationComplete}
          />

          <div className="chart-section">
            <div className="chart-header">
              <h3 className="chart-title">香氛图</h3>
              <div className="theme-color-picker">
                <label className="color-label">主题色</label>
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="color-input"
                />
              </div>
            </div>
            <ScentChart
              radarData={radarData}
              placedScents={placedScents}
              totalConcentration={totalConcentration}
              themeColor={themeColor}
            />
            <div className="chart-stats">
              <span className="stat-item">
                总浓度: <strong>{totalConcentration}</strong>
              </span>
              <span className="stat-item">
                香料数: <strong>{placedScents.length}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="control-panel">
          <div className="save-section">
            <input
              type="text"
              placeholder="为你的配方命名..."
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              className="formula-input"
            />
            <button
              className="btn btn-primary"
              onClick={handleSaveFormula}
              disabled={!formulaName.trim() || placedScents.length === 0}
            >
              保存配方
            </button>
            <button className="btn btn-secondary" onClick={handleClearWheel}>
              清空调香台
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowPresets(!showPresets)}
            >
              {showPresets ? '隐藏灵感库' : '预设灵感库'}
            </button>
          </div>

          {showPresets && (
            <div className="presets-panel">
              <h4 className="presets-title">精选香水风格</h4>
              <div className="presets-grid">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className="preset-card"
                    onClick={() => handleLoadPreset(preset)}
                    style={{ borderColor: preset.themeColor }}
                  >
                    <div
                      className="preset-color"
                      style={{ backgroundColor: preset.themeColor }}
                    />
                    <span className="preset-name">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="comparison-section">
            <button
              className="btn btn-compare"
              onClick={() => setShowComparison(true)}
              disabled={comparisonFormulas.length < 2 || comparisonFormulas.length > 4}
            >
              对比配方 ({comparisonFormulas.length}/4)
            </button>
          </div>
        </section>

        <section className="formulas-section">
          <h3 className="section-title">我的配方</h3>
          {formulas.length === 0 ? (
            <div className="empty-state">
              <p>还没有保存的配方</p>
              <p className="empty-hint">开始调香并保存你的第一个配方吧</p>
            </div>
          ) : (
            <div className="formulas-scroll">
              {formulas.map((formula) => {
                const isSelected = selectedForComparison.has(formula.id);
                const formulaRadar = getFormulaRadarData(formula);
                return (
                  <div
                    key={formula.id}
                    className={`formula-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleComparison(formula.id)}
                  >
                    <div className="formula-check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="formula-mini-radar">
                      <MiniRadar
                        radarData={formulaRadar}
                        themeColor={formula.themeColor}
                      />
                    </div>
                    <div className="formula-info">
                      <h4 className="formula-name">{formula.name}</h4>
                      <span className="formula-date">
                        {formatDate(formula.createdAt)}
                      </span>
                    </div>
                    <button
                      className="formula-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFormula(formula.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showComparison && comparisonFormulas.length >= 2 && (
        <ComparisonOverlay
          formulas={comparisonFormulas}
          onClose={() => setShowComparison(false)}
        />
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #f7f3ee 0%, #e8d8c8 100%);
          min-height: 100vh;
          color: #333;
        }

        .app {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .app-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .app-title {
          font-size: 36px;
          font-weight: 300;
          color: #5c4a3a;
          letter-spacing: 4px;
          margin-bottom: 8px;
        }

        .app-subtitle {
          font-size: 14px;
          color: #8b7355;
          letter-spacing: 2px;
        }

        .app-main {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .main-content {
          display: flex;
          gap: 40px;
          justify-content: center;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .chart-section {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(8px);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid rgba(196, 154, 108, 0.3);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #5c4a3a;
        }

        .theme-color-picker {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-label {
          font-size: 12px;
          color: #8b7355;
        }

        .color-input {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: none;
          padding: 0;
        }

        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .color-input::-webkit-color-swatch {
          border: 2px solid rgba(196, 154, 108, 0.5);
          border-radius: 6px;
        }

        .chart-stats {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 16px;
        }

        .stat-item {
          font-size: 13px;
          color: #8b7355;
        }

        .stat-item strong {
          color: #5c4a3a;
          font-size: 16px;
        }

        .control-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(196, 154, 108, 0.3);
        }

        .save-section {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .formula-input {
          flex: 1;
          min-width: 200px;
          padding: 10px 16px;
          border: 1px solid rgba(196, 154, 108, 0.4);
          border-radius: 8px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.8);
          outline: none;
          transition: border-color 0.2s;
        }

        .formula-input:focus {
          border-color: #c49a6c;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn:active {
          transform: scale(0.97);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #c49a6c 0%, #a67c52 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(196, 154, 108, 0.4);
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(196, 154, 108, 0.5);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.7);
          color: #5c4a3a;
          border: 1px solid rgba(196, 154, 108, 0.4);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.9);
        }

        .btn-compare {
          width: 100%;
          background: linear-gradient(135deg, #6b8e9e 0%, #4a6675 100%);
          color: white;
          padding: 14px 20px;
          font-size: 15px;
        }

        .btn-compare:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(107, 142, 158, 0.5);
          transform: translateY(-1px);
        }

        .presets-panel {
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .presets-title {
          font-size: 14px;
          color: #5c4a3a;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .presets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }

        .preset-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.7);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preset-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .preset-color {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .preset-name {
          font-size: 12px;
          color: #5c4a3a;
          font-weight: 500;
        }

        .formulas-section {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(196, 154, 108, 0.3);
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #5c4a3a;
          margin-bottom: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #8b7355;
        }

        .empty-hint {
          font-size: 13px;
          margin-top: 8px;
          opacity: 0.7;
        }

        .formulas-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          scrollbar-width: thin;
          scrollbar-color: #c49a6c transparent;
        }

        .formulas-scroll::-webkit-scrollbar {
          height: 6px;
        }

        .formulas-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .formulas-scroll::-webkit-scrollbar-thumb {
          background: #c49a6c66;
          border-radius: 3px;
        }

        .formula-card {
          flex-shrink: 0;
          width: 180px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          padding: 12px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .formula-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .formula-card.selected {
          border-color: #6b8e9e;
          background: rgba(107, 142, 158, 0.1);
        }

        .formula-check {
          position: absolute;
          top: 8px;
          left: 8px;
        }

        .formula-check input[type='checkbox'] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #6b8e9e;
        }

        .formula-mini-radar {
          display: flex;
          justify-content: center;
          margin: 8px 0 12px 0;
        }

        .formula-info {
          text-align: center;
        }

        .formula-name {
          font-size: 13px;
          font-weight: 600;
          color: #5c4a3a;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .formula-date {
          font-size: 11px;
          color: #999;
        }

        .formula-delete {
          position: absolute;
          top: 6px;
          right: 8px;
          background: none;
          border: none;
          font-size: 18px;
          color: #999;
          cursor: pointer;
          width: 20px;
          height: 20px;
          line-height: 1;
          padding: 0;
          transition: color 0.2s;
        }

        .formula-delete:hover {
          color: #c96567;
        }

        @media (max-width: 768px) {
          .app {
            padding: 12px;
          }

          .app-title {
            font-size: 28px;
          }

          .main-content {
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }

          .save-section {
            flex-direction: column;
            align-items: stretch;
          }

          .formula-input {
            width: 100%;
          }

          .presets-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .formula-card {
            width: 150px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
