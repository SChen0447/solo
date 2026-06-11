import { useState, useEffect, useCallback, useRef } from 'react';
import AstroCanvas from './components/AstroCanvas';
import CalendarPanel from './components/CalendarPanel';
import html2canvas from 'html2canvas';

export interface Star {
  id: string;
  name: string;
  chineseName: string;
  magnitude: number;
  ra: number;
  dec: number;
  mansion: string;
  isUserDefined?: boolean;
}

export interface CalendarEvent {
  date: string;
  type: 'solar_term' | 'solar_eclipse' | 'lunar_eclipse' | 'transit';
  name: string;
  description: string;
  visibility?: { latMin: number; latMax: number; lonMin: number; lonMax: number };
  planet?: string;
}

export interface StarMapVersion {
  id: string;
  name: string;
  createdAt: string;
  starCount?: number;
}

type Tool = 'select' | 'draw' | 'erase';

function App() {
  const [stars, setStars] = useState<Star[]>([]);
  const [mansions, setMansions] = useState<string[]>([]);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [year, setYear] = useState<number>(2024);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [versions, setVersions] = useState<StarMapVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const [showAlmanac, setShowAlmanac] = useState(false);
  const [almanacContent, setAlmanacContent] = useState<HTMLElement | null>(null);
  const [almanacStats, setAlmanacStats] = useState({ solarTerms: 0, eclipses: 0, transits: 0 });
  const almanacRef = useRef<HTMLDivElement>(null);

  const fetchStars = useCallback(async (versionId?: string) => {
    try {
      const url = versionId && versionId !== 'initial'
        ? `/api/stars?version=${versionId}`
        : '/api/stars';
      const res = await fetch(url);
      const data = await res.json();
      setStars(data.stars);
      setMansions(data.mansions || []);
    } catch (e) {
      console.error('加载星图失败:', e);
    }
  }, []);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch('/api/versions');
      const data = await res.json();
      setVersions(data.versions);
      if (data.versions.length > 0 && !selectedVersion) {
        setSelectedVersion(data.versions[0].id);
      }
    } catch (e) {
      console.error('加载版本失败:', e);
    }
  }, [selectedVersion]);

  const computeCalendar = useCallback(async (y: number) => {
    setIsLoadingCalendar(true);
    try {
      const res = await fetch(`/api/calendar/${y}`);
      const data = await res.json();
      setCalendarEvents(data.events);
      setAlmanacStats({
        solarTerms: data.stats?.solarTerms || 0,
        eclipses: data.stats?.eclipses || 0,
        transits: data.stats?.transits || 0
      });
    } catch (e) {
      console.error('历法计算失败:', e);
    } finally {
      setIsLoadingCalendar(false);
    }
  }, []);

  useEffect(() => {
    fetchStars();
    fetchVersions();
    computeCalendar(year);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => computeCalendar(year), 300);
    return () => clearTimeout(timeout);
  }, [year, computeCalendar]);

  const handleAddStar = async (ra: number, dec: number) => {
    try {
      const mansion = (() => {
        if (dec > 60) return '紫微垣';
        const adjustedRa = ((ra % 360) + 360) % 360;
        const idx = Math.floor(adjustedRa / (360 / 28)) % 28;
        const mn = ['角宿','亢宿','氐宿','房宿','心宿','尾宿','箕宿','斗宿','牛宿','女宿','虚宿','危宿','室宿','壁宿','奎宿','娄宿','胃宿','昴宿','毕宿','觜宿','参宿','井宿','鬼宿','柳宿','星宿','张宿','翼宿','轸宿'];
        return mn[idx] || '未知';
      })();
      const newStar = {
        name: `客星${Math.floor(Math.random() * 9000 + 1000)}`,
        chineseName: `客星${stars.filter(s => s.isUserDefined).length + 1}`,
        magnitude: 3 + Math.random() * 2,
        ra,
        dec,
        mansion
      };
      const res = await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStar)
      });
      if (res.ok) {
        const saved = await res.json();
        setStars(prev => [...prev, saved]);
      }
    } catch (e) {
      console.error('添加星点失败:', e);
    }
  };

  const handleDeleteStar = async (starId: string) => {
    try {
      const res = await fetch(`/api/stars/${starId}`, { method: 'DELETE' });
      if (res.ok) {
        setStars(prev => prev.filter(s => s.id !== starId));
        if (selectedStar?.id === starId) setSelectedStar(null);
      }
    } catch (e) {
      console.error('删除星点失败:', e);
    }
  };

  const handleSaveVersion = async () => {
    const name = prompt('请输入星图版本名称:', `星图 v${versions.length + 1}`);
    if (!name) return;
    try {
      const res = await fetch('/api/versions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, stars })
      });
      if (res.ok) {
        await fetchVersions();
      }
    } catch (e) {
      console.error('保存版本失败:', e);
    }
  };

  const handleLoadVersion = (versionId: string) => {
    setSelectedVersion(versionId);
    fetchStars(versionId);
  };

  const handleGenerateAlmanac = async () => {
    setShowAlmanac(true);
    setTimeout(async () => {
      if (almanacRef.current) {
        try {
          setAlmanacContent(almanacRef.current);
        } catch (e) {
          console.error('生成历书失败:', e);
        }
      }
    }, 500);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">觀星臺</h1>
        <p className="app-subtitle">— 司天監 · 欽天監授時曆 —</p>
      </header>

      <button
        className="calendar-toggle"
        onClick={() => setCalendarCollapsed(!calendarCollapsed)}
      >
        {calendarCollapsed ? '▶ 曆法' : '◀ 收起'}
      </button>

      <div className="main-content">
        <div className="canvas-section">
          <AstroCanvas
            stars={stars}
            selectedStar={selectedStar}
            onSelectStar={setSelectedStar}
            activeTool={activeTool}
            onAddStar={handleAddStar}
            onDeleteStar={handleDeleteStar}
          />

          <div className="star-info-panel">
            <div className="info-title">【 星 宿 簿 錄 】</div>
            {selectedStar ? (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">星名</span>
                  <span className="info-value">{selectedStar.chineseName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">西名</span>
                  <span className="info-value">{selectedStar.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">星等</span>
                  <span className="info-value">{selectedStar.magnitude.toFixed(2)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">星宿</span>
                  <span className="info-value">{selectedStar.mansion}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">赤經</span>
                  <span className="info-value">{selectedStar.ra.toFixed(2)}°</span>
                </div>
                <div className="info-item">
                  <span className="info-label">赤緯</span>
                  <span className="info-value">{selectedStar.dec.toFixed(2)}°</span>
                </div>
              </div>
            ) : (
              <div className="info-empty">點擊天球儀上的星點以查看詳情…</div>
            )}
          </div>
        </div>

        <div className={`calendar-section ${calendarCollapsed ? 'collapsed' : ''}`}>
          <CalendarPanel
            year={year}
            onYearChange={setYear}
            events={calendarEvents}
            isLoading={isLoadingCalendar}
            onCompute={() => computeCalendar(year)}
          />
        </div>
      </div>

      <div className="toolbar">
        <select
          className="version-select"
          value={selectedVersion}
          onChange={e => handleLoadVersion(e.target.value)}
        >
          <option value="">選擇星圖版本…</option>
          {versions.map(v => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.starCount}星)
            </option>
          ))}
        </select>

        <input
          className="year-input"
          type="number"
          value={year}
          onChange={e => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= -3000 && v <= 2024) setYear(v);
          }}
          min={-3000}
          max={2024}
          placeholder="年份"
        />
        <button className="calc-btn" onClick={() => computeCalendar(year)}>推 演</button>

        <div style={{ width: 1, height: 32, background: '#b8860b', margin: '0 8px' }} />

        <button
          className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => setActiveTool('select')}
          title="選擇模式"
        >
          ✦ 觀 測
        </button>
        <button
          className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
          onClick={() => setActiveTool('draw')}
          title="繪製星點"
        >
          ★ 繪 星
        </button>
        <button
          className={`tool-btn ${activeTool === 'erase' ? 'active' : ''}`}
          onClick={() => setActiveTool('erase')}
          title="刪除星點"
        >
          ✕ 拭 除
        </button>

        <div style={{ width: 1, height: 32, background: '#b8860b', margin: '0 8px' }} />

        <button className="tool-btn" onClick={handleSaveVersion} title="保存星圖">
          💾 存 檔
        </button>
        <button
          className="tool-btn generate-btn"
          onClick={handleGenerateAlmanac}
          title="生成歷書"
        >
          📜 成 曆
        </button>
      </div>

      {showAlmanac && (
        <div className="almanac-preview">
          <button className="almanac-close" onClick={() => setShowAlmanac(false)}>
            ✕ 關 閉
          </button>
          <div className="almanac-pages" ref={almanacRef}>
            <div className="almanac-page almanac-cover">
              <div className="almanac-cover-title">欽天監授時曆</div>
              <div className="almanac-cover-subtitle">觀星臺司天監謹製</div>
              <div className="almanac-cover-year">
                {year > 0 ? `公元 ${year} 年` : `公元前 ${-year} 年`}
              </div>
            </div>

            <div className="almanac-page">
              <h2 className="almanac-page-title">星 圖 總 覽</h2>
              <div className="almanac-star-map">
                <canvas
                  width="600"
                  height="600"
                  ref={el => {
                    if (el) {
                      const ctx = el.getContext('2d');
                      if (ctx) {
                        const cx = 300, cy = 300, R = 280;
                        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
                        grad.addColorStop(0, '#0a1c3a');
                        grad.addColorStop(1, '#1a3456');
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(cx, cy, R, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(184, 134, 11, 0.4)';
                        ctx.lineWidth = 0.5;
                        for (let lon = 0; lon < 360; lon += 15) {
                          const lr = lon * Math.PI / 180;
                          ctx.beginPath();
                          for (let la = -90; la <= 90; la += 5) {
                            const lar = la * Math.PI / 180;
                            const x = cx + R * Math.cos(lar) * Math.sin(lr);
                            const y = cy - R * Math.sin(lar);
                            if (la === -90) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                          }
                          ctx.stroke();
                        }
                        for (let la = -90; la <= 90; la += 30) {
                          const lar = la * Math.PI / 180;
                          const r = R * Math.cos(lar);
                          ctx.beginPath();
                          ctx.ellipse(cx, cy - R * Math.sin(lar), r, r * 0.3, 0, 0, Math.PI * 2);
                          ctx.stroke();
                        }
                        for (const s of stars) {
                          const rar = s.ra * Math.PI / 180;
                          const decr = s.dec * Math.PI / 180;
                          const sx = cx + R * Math.cos(decr) * Math.sin(rar);
                          const sy = cy - R * Math.sin(decr);
                          const sz = R * Math.cos(decr) * Math.cos(rar);
                          if (sz < 0) continue;
                          const mr = Math.max(1.5, (6 - s.magnitude) * 0.8);
                          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, mr * 2);
                          g.addColorStop(0, s.isUserDefined ? '#ffd700' : '#ffd700');
                          g.addColorStop(1, 'rgba(184, 134, 11, 0)');
                          ctx.fillStyle = g;
                          ctx.beginPath();
                          ctx.arc(sx, sy, mr * 2, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.fillStyle = s.isUserDefined ? '#ffed4e' : '#ffd700';
                          ctx.beginPath();
                          ctx.arc(sx, sy, mr, 0, Math.PI * 2);
                          ctx.fill();
                        }
                      }
                    }
                  }}
                />
              </div>
              <div className="almanac-stats">
                <div className="almanac-stat">
                  <div className="almanac-stat-label">恆星總數</div>
                  <div className="almanac-stat-value">{stars.length}</div>
                </div>
                <div className="almanac-stat">
                  <div className="almanac-stat-label">客星數</div>
                  <div className="almanac-stat-value">{stars.filter(s => s.isUserDefined).length}</div>
                </div>
              </div>
            </div>

            <div className="almanac-page">
              <h2 className="almanac-page-title">曆 法 編 年</h2>
              <div className="almanac-stats">
                <div className="almanac-stat">
                  <div className="almanac-stat-label">二十四節氣</div>
                  <div className="almanac-stat-value">{almanacStats.solarTerms}</div>
                </div>
                <div className="almanac-stat">
                  <div className="almanac-stat-label">日月交食</div>
                  <div className="almanac-stat-value">{almanacStats.eclipses}</div>
                </div>
                <div className="almanac-stat">
                  <div className="almanac-stat-label">行星凌日</div>
                  <div className="almanac-stat-value">{almanacStats.transits}</div>
                </div>
                <div className="almanac-stat">
                  <div className="almanac-stat-label">事件總計</div>
                  <div className="almanac-stat-value">{calendarEvents.length}</div>
                </div>
              </div>
              <div className="almanac-events">
                {calendarEvents.slice(0, 30).map((ev, i) => (
                  <div key={i} className="almanac-event">
                    <div className="almanac-event-date">{ev.date.slice(5)}</div>
                    <div className="almanac-event-body">
                      <div className="almanac-event-name">【{ev.name}】</div>
                      <div className="almanac-event-desc">{ev.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
