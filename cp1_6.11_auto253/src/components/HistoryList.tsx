import { motion } from 'framer-motion';
import type { AromaHistoryItem } from '@/types';
import { formatDate } from '@/utils/helpers';

interface HistoryListProps {
  history: AromaHistoryItem[];
  onRestore: (item: AromaHistoryItem) => void;
  onClear: () => void;
}

export default function HistoryList({ history, onRestore, onClear }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="history-section">
        <h2 className="section-title">调香历史</h2>
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <p>暂无调香记录</p>
          <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)' }}>
            完成调香后记录将自动保存
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>调香历史</h2>
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: '1px solid var(--border-light)',
            color: 'var(--text-muted)',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          清空记录
        </button>
      </div>

      <div className="history-list">
        {history.map((item, index) => (
          <motion.div
            key={item.id}
            className="history-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            onClick={() => onRestore(item)}
          >
            <div className="history-time">{formatDate(item.createdAt)}</div>
            <div className="history-preview">
              {item.bases.slice(0, 5).map((b) => {
                const base = item.result.topNotes.find(n => n.id === b.baseId) ||
                  item.result.middleNotes.find(n => n.id === b.baseId) ||
                  item.result.baseNotes.find(n => n.id === b.baseId);
                return (
                  <div
                    key={b.baseId}
                    className="history-dot"
                    style={{ backgroundColor: base?.color || '#666' }}
                    title={base?.name || ''}
                  />
                );
              })}
            </div>
            <div className="history-score">{item.result.totalScore} 分</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              {item.result.moodTags.map(t => t.label).join(' · ')}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
