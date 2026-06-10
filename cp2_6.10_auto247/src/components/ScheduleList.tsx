import { useState, useMemo } from 'react';
import type { Schedule, ScheduleType } from '../types';
import { format, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Props {
  schedules: Schedule[];
  onAdd: (data: Omit<Schedule, 'id' | 'completed' | 'cancelled'>) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

interface FormState {
  title: string;
  type: ScheduleType;
  date: string;
  location: string;
  notes: string;
}

const emptyForm: FormState = {
  title: '',
  type: 'rehearsal',
  date: '',
  location: '',
  notes: '',
};

const typeLabels: Record<ScheduleType, string> = {
  rehearsal: '排练',
  gig: '演出',
};

function getDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return '今天';
  if (isTomorrow(d)) return '明天';
  return format(d, 'M月d日 EEEE', { locale: zhCN });
}

function isHighlighted(dateStr: string): boolean {
  const d = parseISO(dateStr);
  return isToday(d) || isTomorrow(d);
}

export default function ScheduleList({
  schedules,
  onAdd,
  onComplete,
  onCancel,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, Schedule[]>();
    const sorted = [...schedules].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );
    for (const s of sorted) {
      const key = format(startOfDay(parseISO(s.date)), 'yyyy-MM-dd');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return Array.from(groups.entries());
  }, [schedules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    onAdd({
      title: form.title.trim(),
      type: form.type,
      date: new Date(form.date).toISOString(),
      location: form.location.trim(),
      notes: form.notes.trim(),
    });
    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>日程安排</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + 新建日程
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <input
              placeholder="标题（如：周末排练）"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formRow}>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as ScheduleType })
              }
              style={styles.select}
            >
              <option value="rehearsal">排练</option>
              <option value="gig">演出</option>
            </select>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formRow}>
            <input
              placeholder="地点"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.formRow}>
            <textarea
              placeholder="备注"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ ...styles.input, minHeight: 60 }}
            />
          </div>
          <div style={styles.formActions}>
            <button type="submit" className="btn-primary">
              创建
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div style={styles.list}>
        {groupedSchedules.length === 0 && (
          <p style={styles.empty}>暂无日程，点击上方按钮创建</p>
        )}
        {groupedSchedules.map(([dateKey, items]) => (
          <div key={dateKey} style={styles.group}>
            <h3
              style={{
                ...styles.groupTitle,
                ...(isHighlighted(items[0].date)
                  ? styles.groupTitleHighlight
                  : {}),
              }}
            >
              {getDateLabel(items[0].date)}
            </h3>
            {items.map((schedule, idx) => (
              <div
                key={schedule.id}
                style={{
                  ...styles.card,
                  ...(schedule.completed ? styles.cardCompleted : {}),
                  ...(schedule.cancelled ? styles.cardCancelled : {}),
                  animation: `fadeIn 0.3s ease ${idx * 0.05}s both`,
                }}
              >
                <div style={styles.cardBar} />
                <div style={styles.cardContent}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardTitle}>
                      {schedule.completed && (
                        <span style={styles.checkMark}>✓</span>
                      )}
                      {schedule.title}
                    </span>
                    <span
                      style={{
                        ...styles.typeTag,
                        ...(schedule.type === 'gig'
                          ? styles.typeTagGig
                          : styles.typeTagRehearsal),
                      }}
                    >
                      {typeLabels[schedule.type]}
                    </span>
                  </div>
                  <div style={styles.cardMeta}>
                    <span style={styles.metaItem}>
                      🕒 {format(parseISO(schedule.date), 'HH:mm')}
                    </span>
                    {schedule.location && (
                      <span style={styles.metaItem}>📍 {schedule.location}</span>
                    )}
                  </div>
                  {schedule.notes && (
                    <p style={styles.cardNotes}>{schedule.notes}</p>
                  )}
                  {!schedule.completed && !schedule.cancelled && (
                    <div style={styles.cardActions}>
                      <button
                        className="btn-success"
                        onClick={() => onComplete(schedule.id)}
                      >
                        ✓ 完成排练
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => onCancel(schedule.id)}
                      >
                        取消
                      </button>
                    </div>
                  )}
                  {schedule.cancelled && (
                    <span style={styles.cancelledLabel}>已取消</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    animation: 'fadeIn 0.5s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
    background: 'var(--card-bg)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    animation: 'fadeIn 0.3s ease',
  },
  formRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 140,
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    minWidth: 100,
  },
  formActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  empty: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: 14,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    paddingLeft: 4,
  },
  groupTitleHighlight: {
    color: 'var(--accent-green)',
    textShadow: '0 0 10px rgba(105,240,174,0.3)',
  },
  card: {
    display: 'flex',
    background: 'var(--card-bg)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default',
    willChange: 'transform',
  },
  cardCompleted: {
    opacity: 0.55,
  },
  cardCancelled: {
    opacity: 0.4,
    textDecoration: 'line-through',
  },
  cardBar: {
    width: 4,
    background: 'var(--schedule-bar)',
    flexShrink: 0,
    boxShadow: '2px 0 10px rgba(124,77,255,0.3)',
  },
  cardContent: {
    flex: 1,
    padding: '14px 16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkMark: {
    color: 'var(--accent-green)',
    fontWeight: 700,
    fontSize: 18,
  },
  typeTag: {
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  typeTagRehearsal: {
    background: 'rgba(124,77,255,0.2)',
    color: '#bb86fc',
  },
  typeTagGig: {
    background: 'rgba(255,109,0,0.2)',
    color: '#ffab40',
  },
  cardMeta: {
    display: 'flex',
    gap: 16,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  cardNotes: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 10,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  cancelledLabel: {
    fontSize: 12,
    color: 'var(--danger)',
    fontWeight: 600,
  },
};
