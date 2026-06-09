import { useState, useMemo } from 'react';
import type { Garden } from '../types';

interface GardenPanelProps {
  gardens: Garden[];
  activeGardenId: string | null;
  onGardenSelect: (gardenId: string) => void;
  onAddObservation: () => void;
}

function buildCalendarGrid() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number | null; isToday: boolean; isBloomDay: boolean }> = [];
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, isToday: false, isBloomDay: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today;
    const isBloomDay = d % 3 === 0 || d % 5 === 0;
    cells.push({ day: d, isToday, isBloomDay });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, isToday: false, isBloomDay: false });
  }

  return { cells, dayNames, monthLabel: `${year}年${month + 1}月` };
}

function GardenPanel({
  gardens,
  activeGardenId,
  onGardenSelect,
  onAddObservation
}: GardenPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { cells, dayNames, monthLabel } = useMemo(() => buildCalendarGrid(), []);

  const filteredGardens = useMemo(() => {
    if (!searchQuery.trim()) return gardens;
    const q = searchQuery.toLowerCase();
    return gardens.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    );
  }, [gardens, searchQuery]);

  const activeGarden = gardens.find((g) => g.id === activeGardenId);

  return (
    <>
      <aside className={`garden-panel ${isMobileOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>🌿 温室导览</h2>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索温室或植物..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="calendar-section">
          <h4>📅 花期日历 · {monthLabel}</h4>
          <div className="calendar-mini">
            {dayNames.map((d) => (
              <div key={d} className="day-name">
                {d}
              </div>
            ))}
            {cells.map((cell, idx) => (
              <div
                key={idx}
                className={`day ${cell.isToday ? 'today' : ''} ${cell.isBloomDay ? 'bloom-day' : ''}`}
              >
                {cell.day}
              </div>
            ))}
          </div>
        </div>

        <div className="garden-list">
          {filteredGardens.map((garden) => (
            <div
              key={garden.id}
              className={`garden-item ${activeGardenId === garden.id ? 'active' : ''}`}
              onClick={() => {
                onGardenSelect(garden.id);
                setIsMobileOpen(false);
              }}
            >
              <img
                src={garden.thumbnail}
                alt={garden.name}
                className="garden-thumb"
                loading="lazy"
              />
              <div className="garden-info">
                <h3>{garden.name}</h3>
                <div className="garden-stats">
                  共 {garden.totalCount} 株
                  <span className="bloom-badge">
                    🌸 {garden.bloomingCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredGardens.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#95a5a6', fontSize: 14 }}>
              未找到匹配的温室
            </div>
          )}
        </div>

        <div className="panel-footer">
          <button className="add-obs-btn" onClick={onAddObservation}>
            ✍️ 添加观察笔记
          </button>
        </div>
      </aside>

      <div
        className="mobile-panel-toggle"
        onClick={() => setIsMobileOpen(true)}
      >
        <span>🌱</span>
        <span>{activeGarden ? activeGarden.name : '点击查看温室导览'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 18 }}>▲</span>
      </div>
    </>
  );
}

export default GardenPanel;
