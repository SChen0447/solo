import { useEffect, useState } from 'react';
import TastingForm from './components/TastingForm';
import RadarChart from './components/RadarChart';

interface FlavorProfile {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  cleanliness: number;
}

interface Tasting {
  id: string;
  coffeeName: string;
  roastLevel: string;
  flavors: FlavorProfile;
  score: number;
  date: string;
}

const DIMENSION_STATS = [
  { key: 'acidity' as const, label: '酸度', color: '#E74C3C' },
  { key: 'bitterness' as const, label: '苦度', color: '#8B4513' },
  { key: 'sweetness' as const, label: '甜度', color: '#F39C12' },
  { key: 'body' as const, label: '醇厚度', color: '#D4A574' },
  { key: 'cleanliness' as const, label: '干净度', color: '#27AE60' }
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tastings')
      .then((r) => r.json())
      .then((data: Tasting[]) => {
        setTastings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAddTasting = async (data: {
    coffeeName: string;
    roastLevel: string;
    flavors: FlavorProfile;
  }) => {
    const res = await fetch('/api/tastings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const newTasting = await res.json();
      setTastings((prev) => [newTasting, ...prev]);
      setShowForm(false);
    }
  };

  const handleDeleteTasting = async (id: string) => {
    const res = await fetch(`/api/tastings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTastings((prev) => prev.filter((t) => t.id !== id));
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const averages =
    tastings.length > 0
      ? DIMENSION_STATS.map((dim) => ({
          ...dim,
          avg:
            tastings.reduce((sum, t) => sum + t.flavors[dim.key], 0) / tastings.length
        }))
      : DIMENSION_STATS.map((dim) => ({ ...dim, avg: 0 }));

  const avgScore =
    tastings.length > 0
      ? tastings.reduce((sum, t) => sum + t.score, 0) / tastings.length
      : 0;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>☕ 风味品鉴日志</h1>
          <p style={styles.subtitle}>记录每一杯咖啡的感官旅程</p>
        </div>
      </header>

      <main style={styles.main} className="main-container">
        <section style={styles.leftPanel} className="left-panel">
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>品鉴记录</h2>
            <button
              onClick={() => setShowForm((s) => !s)}
              style={{
                ...styles.addButton,
                backgroundColor: showForm ? '#C68E4A' : '#8B5E3C'
              }}
              className="add-button"
            >
              {showForm ? '收起表单' : '+ 添加新记录'}
            </button>
          </div>

          <div
            style={{
              ...styles.formCard,
              maxHeight: showForm ? '1000px' : '0px',
              opacity: showForm ? 1 : 0,
              overflow: 'hidden',
              padding: showForm ? '20px' : '0 20px',
              marginBottom: showForm ? 20 : 0
            }}
            className="form-card"
          >
            <TastingForm
              onSubmit={handleAddTasting}
              onCancel={() => setShowForm(false)}
            />
          </div>

          <div style={styles.listContainer}>
            {loading ? (
              <p style={styles.emptyText}>加载中...</p>
            ) : tastings.length === 0 ? (
              <p style={styles.emptyText}>暂无品鉴记录，点击上方按钮开始记录吧~</p>
            ) : (
              tastings.map((tasting) => (
                <div key={tasting.id} style={styles.listItem} className="list-item">
                  <div
                    style={styles.listItemMain}
                    className="list-item-main"
                    onClick={() => toggleExpand(tasting.id)}
                  >
                    <div style={styles.itemInfo}>
                      <div style={styles.itemName}>{tasting.coffeeName}</div>
                      <div style={styles.itemMeta}>
                        <span style={styles.roastBadge}>{tasting.roastLevel}</span>
                        <span style={styles.itemDate}>{formatDate(tasting.date)}</span>
                      </div>
                    </div>
                    <div style={styles.itemRight}>
                      <div style={styles.scoreBox}>
                        <span style={styles.scoreLabel}>评分</span>
                        <span style={styles.scoreValue}>{tasting.score.toFixed(1)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTasting(tasting.id);
                        }}
                        style={styles.deleteButton}
                        className="delete-button"
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      ...styles.radarContainer,
                      maxHeight: expandedIds.has(tasting.id) ? '340px' : '0px',
                      opacity: expandedIds.has(tasting.id) ? 1 : 0,
                      overflow: 'hidden'
                    }}
                  >
                    <div style={styles.radarWrapper}>
                      <RadarChart
                        acidity={tasting.flavors.acidity}
                        bitterness={tasting.flavors.bitterness}
                        sweetness={tasting.flavors.sweetness}
                        body={tasting.flavors.body}
                        cleanliness={tasting.flavors.cleanliness}
                        size={260}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.rightPanel} className="right-panel">
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>风味统计</h2>
          </div>

          <div style={styles.statsCard}>
            <div style={styles.avgScoreCard}>
              <div style={styles.avgScoreLabel}>平均评分</div>
              <div style={styles.avgScoreValue}>{avgScore.toFixed(2)}</div>
              <div style={styles.avgScoreSub}>
                共 {tastings.length} 条记录
              </div>
            </div>

            <div style={{ marginTop: 28 }}>
              <h3 style={styles.statsTitle}>维度平均分对比</h3>
              <div style={styles.barsContainer}>
                {averages.map((dim) => (
                  <div key={dim.key} style={styles.barRow}>
                    <span style={{ ...styles.barLabel, color: dim.color }}>
                      {dim.label}
                    </span>
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${(dim.avg / 10) * 100}%`,
                          backgroundColor: dim.color
                        }}
                      />
                    </div>
                    <span style={styles.barValue}>{dim.avg.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {tastings.length >= 2 && (
              <div style={{ marginTop: 28 }}>
                <h3 style={styles.statsTitle}>多杯对比雷达</h3>
                <div style={styles.comparisonGrid}>
                  {tastings.slice(0, 4).map((t) => (
                    <div key={t.id} style={styles.comparisonCard}>
                      <div style={styles.comparisonName}>{t.coffeeName}</div>
                      <RadarChart
                        acidity={t.flavors.acidity}
                        bitterness={t.flavors.bitterness}
                        sweetness={t.flavors.sweetness}
                        body={t.flavors.body}
                        cleanliness={t.flavors.cleanliness}
                        size={180}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#F5ECD7',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #8B5E3C 0%, #C68E4A 100%)',
    padding: '32px 24px 28px',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(139, 94, 60, 0.25)'
  },
  headerContent: {
    maxWidth: 1280,
    margin: '0 auto'
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 1
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: 14,
    opacity: 0.9
  },
  main: {
    display: 'flex',
    gap: 24,
    maxWidth: 1280,
    margin: '0 auto',
    padding: 24,
    flexWrap: 'wrap'
  },
  leftPanel: {
    flex: '0 0 40%',
    minWidth: 0
  },
  rightPanel: {
    flex: '1 1 calc(60% - 24px)',
    minWidth: 0
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  panelTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#5D4037'
  },
  addButton: {
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(139, 94, 60, 0.3)'
  },
  formCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(139, 94, 60, 0.12)',
    transition: 'all 0.3s ease'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  emptyText: {
    textAlign: 'center',
    color: '#A1887F',
    padding: '40px 20px',
    fontSize: 14
  },
  listItem: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(139, 94, 60, 0.1)',
    overflow: 'hidden',
    transition: 'all 0.2s ease'
  },
  listItemMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  itemInfo: {
    flex: 1,
    minWidth: 0
  },
  itemName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#5D4037',
    marginBottom: 5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  roastBadge: {
    fontSize: 11,
    padding: '2px 8px',
    backgroundColor: '#D4A57430',
    color: '#8B5E3C',
    borderRadius: 4,
    fontWeight: 500
  },
  itemDate: {
    fontSize: 12,
    color: '#A1887F'
  },
  itemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  scoreBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 12px',
    backgroundColor: '#8B5E3C15',
    borderRadius: 8,
    minWidth: 48
  },
  scoreLabel: {
    fontSize: 10,
    color: '#8B5E3C',
    fontWeight: 500
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#8B5E3C'
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#D7CCC8',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radarContainer: {
    transition: 'all 0.3s ease',
    borderTop: '1px solid #F5ECD7'
  },
  radarWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0 20px'
  },
  statsCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 2px 12px rgba(139, 94, 60, 0.1)'
  },
  avgScoreCard: {
    textAlign: 'center',
    padding: '24px 16px',
    background: 'linear-gradient(135deg, #8B5E3C15 0%, #C68E4A20 100%)',
    borderRadius: 12
  },
  avgScoreLabel: {
    fontSize: 13,
    color: '#8B5E3C',
    fontWeight: 500
  },
  avgScoreValue: {
    fontSize: 48,
    fontWeight: 700,
    color: '#8B5E3C',
    lineHeight: 1.1,
    marginTop: 4
  },
  avgScoreSub: {
    fontSize: 12,
    color: '#A1887F',
    marginTop: 4
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#5D4037',
    margin: '0 0 16px'
  },
  barsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  barLabel: {
    width: 56,
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0
  },
  barTrack: {
    flex: 1,
    height: 22,
    backgroundColor: '#F5ECD7',
    borderRadius: 11,
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    borderRadius: 11,
    transition: 'width 0.4s ease'
  },
  barValue: {
    width: 36,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: 600,
    color: '#5D4037',
    flexShrink: 0
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16
  },
  comparisonCard: {
    backgroundColor: '#F5ECD750',
    borderRadius: 10,
    padding: '12px 8px 8px',
    textAlign: 'center'
  },
  comparisonName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#5D4037',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
};
