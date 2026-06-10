import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, WEEKDAYS } from '../utils/helpers';
import { useAuth, getAuthHeaders } from '../context/AuthContext';
import { JournalData } from '../types';

interface CalendarProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

interface CellInfo {
  date: Date;
  dateStr: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasRecord: boolean;
  data: JournalData | null;
}

const Calendar: React.FC<CalendarProps> = ({ year, month, onMonthChange }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cells, setCells] = useState<CellInfo[]>([]);
  const [recordDates, setRecordDates] = useState<Set<string>>(new Set());
  const [journalDataMap, setJournalDataMap] = useState<Record<string, JournalData>>({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const todayStr = formatDate(today);

  useEffect(() => {
    const fetchDates = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/journal/dates', {
          headers: getAuthHeaders(user)
        });
        const data = await res.json();
        setRecordDates(new Set(data.dates || []));
      } catch {
        setRecordDates(new Set());
      }
    };
    fetchDates();
  }, [user]);

  useEffect(() => {
    const buildMonth = () => {
      const firstDay = new Date(year, month, 1);
      const startDayOfWeek = firstDay.getDay();
      const startDate = new Date(year, month, 1 - startDayOfWeek);
      const result: CellInfo[] = [];

      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = formatDate(d);
        result.push({
          date: d,
          dateStr,
          inCurrentMonth: d.getMonth() === month,
          isToday: dateStr === todayStr,
          hasRecord: recordDates.has(dateStr),
          data: journalDataMap[dateStr] || null
        });
      }
      setCells(result);
      setLoading(false);
    };
    buildMonth();
  }, [year, month, recordDates, journalDataMap]);

  const handleClick = (dateStr: string) => {
    navigate(`/edit/${dateStr}`);
  };

  const prevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const renderThumbnail = (cell: CellInfo) => {
    if (!cell.hasRecord) {
      return <span style={{ fontSize: 11 }}>无记录</span>;
    }
    return (
      <svg viewBox="0 0 80 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <rect width="80" height="80" fill="#faf3e0" />
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <line key={i} x1="0" y1={i * 11} x2="80" y2={i * 11} stroke="#d9cbb8" strokeWidth="0.5" />
        ))}
        <path
          d="M10 30 Q25 20, 40 35 T70 30"
          fill="none"
          stroke="#3a3a3a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M10 50 Q25 45, 40 55 T70 50"
          fill="none"
          stroke="#5a4a3a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text x="55" y="20" fontSize="16">✨</text>
      </svg>
    );
  };

  return (
    <div>
      <div className="calendar-nav">
        <button className="nav-btn" onClick={prevMonth}>‹</button>
        <div className="calendar-month">{year}年{month + 1}月</div>
        <button className="nav-btn" onClick={nextMonth}>›</button>
        <div style={{ flex: 1 }} />
        <button
          className="btn"
          onClick={() => {
            const now = new Date();
            onMonthChange(now.getFullYear(), now.getMonth());
          }}
        >
          今天
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map(w => (
          <div key={w} className="calendar-weekday">{w}</div>
        ))}
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#5a4a3a' }}>
            加载中...
          </div>
        ) : (
          cells.map((cell, idx) => (
            <div
              key={idx}
              className={`calendar-cell ${!cell.inCurrentMonth ? 'other-month' : ''} ${cell.hasRecord ? 'has-record' : ''} ${cell.isToday ? 'today' : ''}`}
              onClick={() => handleClick(cell.dateStr)}
            >
              <div className="calendar-date">
                {cell.date.getDate()}
              </div>
              <div className="calendar-thumb">
                {renderThumbnail(cell)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Calendar;
