import { useState, useMemo } from 'react';
import type { MoodType } from '../types';
import { formatDate, isSameDay } from '../types';
import './CalendarGrid.css';

interface CalendarGridProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  moods: Record<string, MoodType>;
}

export default function CalendarGrid({ selectedDate, onSelectDate, moods }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [animating, setAnimating] = useState(false);

  const today = useMemo(() => new Date(), []);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
      setAnimating(false);
    }, 150);
  };

  const handleNextMonth = () => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
      setAnimating(false);
    }, 150);
  };

  const monthLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="nav-btn" onClick={handlePrevMonth} aria-label="上个月">
          ‹
        </button>
        <span className="month-label">{monthLabel}</span>
        <button className="nav-btn" onClick={handleNextMonth} aria-label="下个月">
          ›
        </button>
      </div>
      <div className="weekdays-row">
        {weekdays.map((w, i) => (
          <div key={i} className={`weekday ${i === 0 || i === 6 ? 'weekend' : ''}`}>
            {w}
          </div>
        ))}
      </div>
      <div className={`calendar-grid ${animating ? 'fade' : ''}`}>
        {calendarDays.map((date, idx) => {
          if (!date) return <div key={idx} className="day-cell empty" />;
          const key = formatDate(date);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const mood = moods[key];
          return (
            <div
              key={idx}
              className={`day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}`}
              onClick={() => onSelectDate(date)}
            >
              <span className="day-num">{date.getDate()}</span>
              {mood && <span className="day-mood">{mood}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
