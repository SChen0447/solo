import { useState, useEffect, useCallback } from 'react';
import type { AromaBase, BlendResult, AromaHistoryItem, BlendItem } from '@/types';
import { fetchAromaBases } from '@/utils/api';
import { saveToHistory, getHistory, clearHistory as clearHistoryStorage } from '@/utils/helpers';
import BaseSelector from '@/components/BaseSelector';
import BlendControl from '@/components/BlendControl';
import AromaChart from '@/components/AromaChart';
import MoodTags from '@/components/MoodTags';
import HistoryList from '@/components/HistoryList';

export default function App() {
  const [aromaBases, setAromaBases] = useState<AromaBase[]>([]);
  const [selectedBases, setSelectedBases] = useState<AromaBase[]>([]);
  const [blendRatios, setBlendRatios] = useState<Record<string, number>>({});
  const [blendResult, setBlendResult] = useState<BlendResult | null>(null);
  const [history, setHistory] = useState<AromaHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBases = async () => {
      try {
        const bases = await fetchAromaBases();
        setAromaBases(bases);
      } catch (error) {
        console.error('Failed to load aroma bases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBases();
    setHistory(getHistory());
  }, []);

  const handleSelectBase = useCallback(
    (base: AromaBase) => {
      if (selectedBases.find((b) => b.id === base.id)) {
        setSelectedBases((prev) => prev.filter((b) => b.id !== base.id));
        setBlendRatios((prev) => {
          const next = { ...prev };
          delete next[base.id];
          return next;
        });
      } else if (selectedBases.length < 5) {
        setSelectedBases((prev) => [...prev, base]);
        setBlendRatios((prev) => ({ ...prev, [base.id]: 50 }));
      }
    },
    [selectedBases]
  );

  const handleRatioChange = useCallback((baseId: string, ratio: number) => {
    setBlendRatios((prev) => ({ ...prev, [baseId]: ratio }));
  }, []);

  const handleRemoveBase = useCallback((baseId: string) => {
    setSelectedBases((prev) => prev.filter((b) => b.id !== baseId));
    setBlendRatios((prev) => {
      const next = { ...prev };
      delete next[baseId];
      return next;
    });
  }, []);

  const handleBlendComplete = useCallback(
    (result: BlendResult) => {
      setBlendResult(result);

      const bases: BlendItem[] = selectedBases.map((b) => ({
        baseId: b.id,
        ratio: blendRatios[b.id] || 50,
      }));

      const historyItem: AromaHistoryItem = {
        id: result.id,
        bases,
        result,
        createdAt: result.createdAt,
      };

      saveToHistory(historyItem);
      setHistory(getHistory());
    },
    [selectedBases, blendRatios]
  );

  const handleRestoreHistory = useCallback(
    (item: AromaHistoryItem) => {
      const bases = aromaBases.filter((b) =>
        item.bases.some((blend) => blend.baseId === b.id)
      );
      setSelectedBases(bases);

      const ratios: Record<string, number> = {};
      item.bases.forEach((b) => {
        ratios[b.baseId] = b.ratio;
      });
      setBlendRatios(ratios);
      setBlendResult(item.result);
    },
    [aromaBases]
  );

  const handleClearHistory = useCallback(() => {
    if (window.confirm('确定要清空所有调香记录吗？')) {
      clearHistoryStorage();
      setHistory([]);
    }
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">✦ 虚拟调香实验室 ✦</h1>
        <p className="app-subtitle">VIRTUAL PERFUME LAB</p>
      </header>

      {isLoading ? (
        <div className="empty-state" style={{ padding: '100px 20px' }}>
          <div className="empty-state-icon">🌸</div>
          <p>正在加载香基数据...</p>
        </div>
      ) : (
        <div className="main-layout">
          <aside className="sidebar">
            <BaseSelector
              bases={aromaBases}
              selectedIds={selectedBases.map((b) => b.id)}
              onSelect={handleSelectBase}
            />
          </aside>

          <main className="main-content">
            <BlendControl
              selectedBases={selectedBases}
              blendRatios={blendRatios}
              onRatioChange={handleRatioChange}
              onRemoveBase={handleRemoveBase}
              onBlendComplete={handleBlendComplete}
            />

            <AromaChart result={blendResult} />

            {blendResult && (
              <div style={{ marginTop: '30px' }}>
                <h2 className="section-title">情绪标签</h2>
                <MoodTags tags={blendResult.moodTags} />
              </div>
            )}

            <HistoryList
              history={history}
              onRestore={handleRestoreHistory}
              onClear={handleClearHistory}
            />
          </main>
        </div>
      )}

      <footer
        style={{
          textAlign: 'center',
          marginTop: '60px',
          padding: '20px',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          letterSpacing: '2px',
        }}
      >
        ✧ 以香为笔，绘梦为境 ✧
      </footer>
    </div>
  );
}
