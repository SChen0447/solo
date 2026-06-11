import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FermentationEngine, TeaVariety, FermentationParams, TurnFrequency } from './FermentationEngine';
import { batchStore, TeaBatch, TastingReport } from './TeaBatchStore';
import VarietySelector from './components/VarietySelector';
import ParamControls from './components/ParamControls';
import FermentationTank from './components/FermentationTank';
import AromaMolecules from './components/AromaMolecules';
import TeaSoupDisplay from './components/TeaSoupDisplay';
import TeaColorProgress from './components/TeaColorProgress';
import TastingReportView from './components/TastingReportView';
import CompareView from './components/CompareView';

type ViewMode = 'fermentation' | 'compare';

const App: React.FC = () => {
  const [varieties] = useState(() => FermentationEngine.getVarieties());
  const [selectedVariety, setSelectedVariety] = useState<TeaVariety>('puer_raw');
  const [params, setParams] = useState<FermentationParams>({
    temperature: 28,
    humidity: 70,
    turnFrequency: 4
  });

  const [batches, setBatches] = useState<TeaBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('fermentation');
  const [showReport, setShowReport] = useState(false);
  const [currentReport, setCurrentReport] = useState<TastingReport | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSwaying, setIsSwaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const swayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewEngineRef = useRef<FermentationEngine | null>(null);
  const [previewState, setPreviewState] = useState(() => {
    const engine = new FermentationEngine('puer_raw', { temperature: 28, humidity: 70, turnFrequency: 4 });
    return engine.getStateAtDay(0);
  });

  useEffect(() => {
    previewEngineRef.current = new FermentationEngine(selectedVariety, params);
    setPreviewState(previewEngineRef.current.getStateAtDay(0));
  }, [selectedVariety, params]);

  useEffect(() => {
    setBatches(batchStore.getAllBatches());
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setBatches(batchStore.getAllBatches());
    };

    const handleCompleted = (batch: TeaBatch) => {
      if (batch.report) {
        // 完成时可以选择自动显示报告
      }
      setBatches(batchStore.getAllBatches());
    };

    const unsub1 = batchStore.on('batchCreated', handleUpdate);
    const unsub2 = batchStore.on('batchUpdated', handleUpdate);
    const unsub3 = batchStore.on('batchDeleted', () => handleUpdate());
    const unsub4 = batchStore.on('batchCompleted', handleCompleted);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  const currentConfig = varieties.find(v => v.id === selectedVariety)!;

  const activeBatch = activeBatchId ? batches.find(b => b.id === activeBatchId) : null;

  const displayState = activeBatch ? activeBatch.currentState : previewState;
  const displayConfig = activeBatch
    ? FermentationEngine.getVariety(activeBatch.variety)
    : currentConfig;
  const displayParams = activeBatch ? activeBatch.params : params;

  const triggerSway = useCallback(() => {
    setIsSwaying(true);
    if (swayTimeoutRef.current) {
      clearTimeout(swayTimeoutRef.current);
    }
    swayTimeoutRef.current = setTimeout(() => {
      setIsSwaying(false);
    }, 500);
  }, []);

  const handleParamsChange = useCallback((newParams: Partial<FermentationParams>) => {
    if (activeBatch && activeBatch.status === 'running') {
      return;
    }

    if (activeBatch) {
      batchStore.updateBatchParams(activeBatch.id, newParams);
    } else {
      setParams(prev => ({ ...prev, ...newParams }));
      triggerSway();
    }
  }, [activeBatch, triggerSway]);

  const handleVarietyChange = useCallback((variety: TeaVariety) => {
    if (activeBatch && activeBatch.status !== 'idle') {
      return;
    }

    if (activeBatch) {
      // 需要重新创建批次
    } else {
      setSelectedVariety(variety);
      const config = FermentationEngine.getVariety(variety);
      setParams({
        temperature: config.tempRange.optimal,
        humidity: config.humidityRange.optimal,
        turnFrequency: 4
      });
      triggerSway();
    }
  }, [activeBatch, triggerSway]);

  const handleCreateBatch = useCallback(() => {
    if (batches.length >= batchStore.getMaxBatches()) {
      alert(`最多只能创建 ${batchStore.getMaxBatches()} 个批次`);
      return;
    }

    const batch = batchStore.createBatch(
      selectedVariety,
      params,
      undefined,
      speedMultiplier
    );

    if (batch) {
      setActiveBatchId(batch.id);
      setBatches(batchStore.getAllBatches());
    }
  }, [selectedVariety, params, speedMultiplier, batches.length]);

  const handleStartBatch = useCallback(() => {
    if (!activeBatchId) {
      handleCreateBatch();
      return;
    }
    batchStore.startBatch(activeBatchId);
    setBatches(batchStore.getAllBatches());
  }, [activeBatchId, handleCreateBatch]);

  const handlePauseBatch = useCallback(() => {
    if (activeBatchId) {
      batchStore.pauseBatch(activeBatchId);
      setBatches(batchStore.getAllBatches());
    }
  }, [activeBatchId]);

  const handleResetBatch = useCallback(() => {
    if (activeBatchId && confirm('确定要重置此批次吗？')) {
      batchStore.resetBatch(activeBatchId);
      setBatches(batchStore.getAllBatches());
    }
  }, [activeBatchId]);

  const handleDeleteBatch = useCallback(() => {
    if (activeBatchId && confirm('确定要删除此批次吗？')) {
      batchStore.deleteBatch(activeBatchId);
      setActiveBatchId(null);
      setBatches(batchStore.getAllBatches());
    }
  }, [activeBatchId]);

  const handleViewReport = useCallback(() => {
    if (activeBatch?.report) {
      setCurrentReport(activeBatch.report);
      setShowReport(true);
    }
  }, [activeBatch]);

  const handleSpeedChange = useCallback((speed: number) => {
    setSpeedMultiplier(speed);
    if (activeBatchId) {
      batchStore.updateBatchSpeed(activeBatchId, speed);
    }
  }, [activeBatchId]);

  const handleSelectCompare = useCallback((id: string) => {
    setSelectedCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const formatTimeRemaining = (batch: TeaBatch): string => {
    if (batch.status === 'completed') return '已完成';
    if (batch.status === 'idle') return '未开始';

    const remainingDays = batch.totalDays - batch.currentDay;
    const realSeconds = remainingDays / batch.speedMultiplier;

    if (realSeconds < 60) {
      return `约 ${Math.ceil(realSeconds)} 秒`;
    } else if (realSeconds < 3600) {
      return `约 ${Math.ceil(realSeconds / 60)} 分钟`;
    } else {
      return `约 ${(realSeconds / 3600).toFixed(1)} 小时`;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'running': return '发酵中';
      case 'paused': return '已暂停';
      case 'completed': return '已完成';
      default: return '待启动';
    }
  };

  return (
    <div className="app-container">
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="菜单"
      >
        <span style={{ transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
        <span style={{ opacity: menuOpen ? 0 : 1 }} />
        <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none' }} />
      </button>

      <aside className={`tea-panel ${menuOpen ? 'open' : ''}`}>
        <VarietySelector
          varieties={varieties}
          selected={activeBatch?.variety || selectedVariety}
          onSelect={handleVarietyChange}
          disabled={!!activeBatch && activeBatch.status !== 'idle'}
        />

        <ParamControls
          params={displayParams}
          tempRange={displayConfig.tempRange}
          humidityRange={displayConfig.humidityRange}
          onParamsChange={handleParamsChange}
          disabled={!!activeBatch && activeBatch.status === 'running'}
        />

        {activeBatch && (
          <div className="panel-section">
            <h3 className="panel-title">批次控制</h3>
            <div className="param-group">
              <div className="param-label">
                <span>⏱️ 模拟速度</span>
              </div>
              <select
                className="speed-select"
                value={activeBatch.speedMultiplier}
                onChange={e => handleSpeedChange(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              >
                <option value={0.5}>0.5x 慢速</option>
                <option value={1}>1x 正常</option>
                <option value={2}>2x 快速</option>
                <option value={5}>5x 高速</option>
                <option value={10}>10x 极速</option>
                <option value={50}>50x 超快</option>
              </select>
            </div>
          </div>
        )}

        {!activeBatch && (
          <div className="panel-section">
            <h3 className="panel-title">模拟速度</h3>
            <select
              className="speed-select"
              value={speedMultiplier}
              onChange={e => setSpeedMultiplier(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value={0.5}>0.5x 慢速</option>
              <option value={1}>1x 正常</option>
              <option value={2}>2x 快速</option>
              <option value={5}>5x 高速</option>
              <option value={10}>10x 极速</option>
              <option value={50}>50x 超快</option>
            </select>
            <p style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '10px', lineHeight: 1.5 }}>
              提示：模拟速度决定发酵进程的快慢，
              {currentConfig.fermentationDays}天的发酵周期在1x速度下约需
              {currentConfig.fermentationDays}秒完成。
            </p>
          </div>
        )}
      </aside>

      <nav className="top-nav">
        {viewMode === 'fermentation' && (
          <div className="batch-tabs">
            {batches.map(batch => (
              <div
                key={batch.id}
                className={`batch-tab ${activeBatchId === batch.id ? 'active' : ''}`}
                onClick={() => setActiveBatchId(batch.id)}
              >
                {batch.name}
                <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.8 }}>
                  {getStatusText(batch.status)}
                </span>
              </div>
            ))}
            {batches.length < batchStore.getMaxBatches() && (
              <div
                className="batch-tab add-btn"
                onClick={() => {
                  setActiveBatchId(null);
                  setMenuOpen(true);
                }}
              >
                + 新建
              </div>
            )}
          </div>
        )}

        {viewMode === 'fermentation' && activeBatch?.status === 'completed' && (
          <button className="nav-btn primary" onClick={handleViewReport}>
            📋 查看报告
          </button>
        )}

        <button
          className={`nav-btn ${viewMode === 'compare' ? 'primary' : ''}`}
          onClick={() => setViewMode(viewMode === 'compare' ? 'fermentation' : 'compare')}
        >
          📊 对比品鉴
        </button>
      </nav>

      <main className="main-view">
        {viewMode === 'fermentation' ? (
          <div className="fermentation-tank-container">
            <h1 className="tank-title">
              {activeBatch ? activeBatch.name : `${currentConfig.name} - 预览`}
            </h1>
            <p className="tank-subtitle">
              {activeBatch
                ? `状态: ${getStatusText(activeBatch.status)} · 第 ${activeBatch.currentDay.toFixed(1)} 天 / 共 ${activeBatch.totalDays} 天`
                : `发酵周期: ${currentConfig.fermentationDays} 天 · 预览模式`}
            </p>

            <FermentationTank
              variety={activeBatch?.variety || selectedVariety}
              params={displayParams}
              state={displayState}
              totalDays={displayConfig.fermentationDays}
              isSwaying={isSwaying}
            />

            {activeBatch && (
              <div className="progress-section">
                <div className="progress-info">
                  <span>发酵进度</span>
                  <span>
                    {Math.round(activeBatch.progress * 100)}%
                    <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--color-text-light)' }}>
                      剩余: {formatTimeRemaining(activeBatch)}
                    </span>
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${activeBatch.progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            <TeaSoupDisplay state={displayState} />

            <TeaColorProgress state={displayState} config={displayConfig} />

            <AromaMolecules molecules={displayState.aromaMolecules} />

            <div className="control-buttons">
              {!activeBatch ? (
                <button className="control-btn primary" onClick={handleCreateBatch}>
                  🍃 创建批次并开始
                </button>
              ) : activeBatch.status === 'idle' || activeBatch.status === 'paused' ? (
                <>
                  <button className="control-btn primary" onClick={handleStartBatch}>
                    ▶️ 开始发酵
                  </button>
                  {activeBatch.status === 'paused' && (
                    <button className="control-btn secondary" onClick={handleResetBatch}>
                      🔄 重置
                    </button>
                  )}
                </>
              ) : activeBatch.status === 'running' ? (
                <button className="control-btn secondary" onClick={handlePauseBatch}>
                  ⏸️ 暂停
                </button>
              ) : (
                <>
                  <button className="control-btn primary" onClick={handleViewReport}>
                    📋 查看品鉴报告
                  </button>
                  <button className="control-btn secondary" onClick={handleResetBatch}>
                    🔄 重新发酵
                  </button>
                </>
              )}

              {activeBatch && (
                <button
                  className="control-btn secondary"
                  onClick={handleDeleteBatch}
                  style={{ color: '#c62828', borderColor: '#ef9a9a' }}
                >
                  🗑️ 删除
                </button>
              )}
            </div>
          </div>
        ) : (
          <CompareView
            batches={batches}
            selectedIds={selectedCompareIds}
            onSelectBatch={handleSelectCompare}
            onBack={() => setViewMode('fermentation')}
          />
        )}
      </main>

      {showReport && currentReport && (
        <TastingReportView
          report={currentReport}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default App;
