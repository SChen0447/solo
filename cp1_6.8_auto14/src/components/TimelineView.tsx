import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { statusConfig, formatDate, formatMonth, debounce } from '../utils';
import type { Application } from '../types';

interface TimelineViewProps {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  deletingIds: Set<string>;
}

export default function TimelineView({
  applications,
  onEdit,
  onDelete,
  onNotesUpdate,
  deletingIds,
}: TimelineViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stickyMonth, setStickyMonth] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: Application[] } = {};
    applications.forEach(app => {
      const month = formatMonth(app.applyDate);
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(app);
    });
    return Object.entries(groups);
  }, [applications]);

  useEffect(() => {
    if (groupedByMonth.length > 0 && !stickyMonth) {
      setStickyMonth(groupedByMonth[0][0]);
    }
  }, [groupedByMonth, stickyMonth]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop + 60;

    let currentMonth = groupedByMonth[0]?.[0] || '';
    for (const [month] of groupedByMonth) {
      const el = monthRefs.current.get(month);
      if (el && el.offsetTop <= scrollTop) {
        currentMonth = month;
      }
    }
    setStickyMonth(currentMonth);
  }, [groupedByMonth]);

  const debouncedNotesUpdate = useCallback(
    (id: string, notes: string) => {
      const debouncedFn = debounce((noteId: string, noteText: string) => {
        onNotesUpdate(noteId, noteText);
      }, 1000);
      debouncedFn(id, notes);
    },
    [onNotesUpdate]
  );

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="timeline-container" ref={containerRef} onScroll={handleScroll}>
      {stickyMonth && (
        <div className="timeline-sticky-month">
          <span className="sticky-month-text">{stickyMonth}</span>
        </div>
      )}
      
      <div className="timeline">
        {groupedByMonth.map(([month, apps]) => (
          <div
            key={month}
            className="timeline-month-group"
            ref={el => {
              if (el) monthRefs.current.set(month, el);
            }}
          >
            <div className="timeline-month-header">
              <span className="month-label">{month}</span>
            </div>
            
            {apps.map(app => {
              const status = statusConfig[app.status];
              const isExpanded = expandedId === app.id;
              const isDeleting = deletingIds.has(app.id);

              return (
                <div
                  key={app.id}
                  className={`timeline-item ${isDeleting ? 'deleting' : ''}`}
                >
                  <div
                    className="timeline-dot"
                    style={{ backgroundColor: status.color, borderColor: status.color }}
                    onClick={() => toggleExpand(app.id)}
                    title="点击展开/收起备注"
                  />
                  
                  <div className="timeline-line" />
                  
                  <div className={`timeline-card ${isExpanded ? 'expanded' : ''}`}>
                    <div className="timeline-card-header">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: status.bgColor, color: status.color }}
                      >
                        {status.label}
                      </span>
                      <span className="timeline-date">{formatDate(app.applyDate)}</span>
                    </div>
                    
                    <h3 className="timeline-company">{app.company}</h3>
                    <p className="timeline-position">{app.position}</p>
                    
                    {isExpanded && (
                      <div className="timeline-notes-section">
                        <label className="notes-label">备注 / 面试反馈</label>
                        <textarea
                          className="notes-textarea"
                          defaultValue={app.notes}
                          placeholder="记录面试反馈或跟进备注..."
                          rows={4}
                          onChange={e => debouncedNotesUpdate(app.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="notes-actions">
                          <button
                            className="icon-btn edit-btn"
                            onClick={e => {
                              e.stopPropagation();
                              onEdit(app);
                            }}
                          >
                            ✏️ 编辑
                          </button>
                          <button
                            className="icon-btn delete-btn"
                            onClick={e => {
                              e.stopPropagation();
                              onDelete(app.id);
                            }}
                          >
                            🗑️ 删除
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {!isExpanded && app.notes && (
                      <p className="timeline-notes-preview">
                        📝 {app.notes.substring(0, 50)}{app.notes.length > 50 ? '...' : ''}
                      </p>
                    )}
                    
                    {!isExpanded && (
                      <button 
                        className="expand-hint"
                        onClick={() => toggleExpand(app.id)}
                      >
                        点击圆点展开详情 →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
