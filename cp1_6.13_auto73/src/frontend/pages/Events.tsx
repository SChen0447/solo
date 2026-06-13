import { useState, useEffect } from 'react';
import { eventsApi } from '../api';
import type { Event } from '../types';
import './Events.css';

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.getEvents()
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load events:', err);
        setLoading(false);
      });
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  if (loading) {
    return (
      <div className="events-page page-transition">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="events-page page-transition">
      <div className="events-header">
        <h1>演出日历</h1>
        <p className="events-subtitle">查看即将到来的演出</p>
      </div>

      <div className="calendar-container glass-card">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={prevMonth}>
            ←
          </button>
          <h2 className="calendar-title">{formatDate(currentDate)}</h2>
          <button className="calendar-nav-btn" onClick={nextMonth}>
            →
          </button>
        </div>

        <div className="calendar-weekdays">
          {weekDays.map(day => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {getDaysInMonth(currentDate).map((day, index) => (
            <div key={index} className={`calendar-day ${day ? '' : 'empty'}`}>
              {day && (
                <>
                  <span className="day-number">{day}</span>
                  <div className="day-events">
                    {getEventsForDay(day).map(event => (
                      <div
                        key={event.id}
                        className="event-dot"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                        title={event.title}
                      >
                        <span className="event-dot-marker"></span>
                        <span className="event-dot-title">{event.title}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="events-list-section">
        <h2>全部演出</h2>
        <div className="events-list">
          {events.map(event => (
            <div
              key={event.id}
              className="event-card glass-card"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="event-date-block">
                <div className="event-month">
                  {new Date(event.date).toLocaleDateString('zh-CN', { month: 'short' })}
                </div>
                <div className="event-day">
                  {new Date(event.date).getDate()}
                </div>
              </div>
              <div className="event-info">
                <h3 className="event-title">{event.title}</h3>
                <p className="event-venue">
                  📍 {event.venue}
                  {event.venueUrl && (
                    <a
                      href={event.venueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {' '}→
                    </a>
                  )}
                </p>
                <p className="event-time">🕐 {event.time}</p>
              </div>
              <div className="event-price">
                {event.price}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedEvent(null)}
              aria-label="关闭"
            >
              ×
            </button>
            <div className="event-modal-header">
              <div className="event-modal-date">
                <div className="event-modal-day">
                  {new Date(selectedEvent.date).getDate()}
                </div>
                <div className="event-modal-month">
                  {new Date(selectedEvent.date).toLocaleDateString('zh-CN', { month: 'long' })}
                </div>
              </div>
              <div className="event-modal-info">
                <h2>{selectedEvent.title}</h2>
                <p className="event-modal-venue">📍 {selectedEvent.venue}</p>
                <p className="event-modal-time">🕐 {selectedEvent.time}</p>
              </div>
            </div>
            <div className="event-modal-body">
              <div className="event-modal-section">
                <h4>票价</h4>
                <p className="event-modal-price">{selectedEvent.price}</p>
              </div>
              <div className="event-modal-section">
                <h4>演出介绍</h4>
                <p>{selectedEvent.description}</p>
              </div>
            </div>
            <div className="event-modal-footer">
              {selectedEvent.ticketUrl && (
                <a
                  href={selectedEvent.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary ticket-btn"
                >
                  立即购票
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
