import type { BakeLog, BakeResult } from '../types';

interface Props {
  log: BakeLog;
  onPhotoClick: () => void;
}

const resultConfig: Record<BakeResult, { icon: string; color: string; bg: string }> = {
  成功: { icon: '✓', color: '#6BBF59', bg: '#E8F5E3' },
  一般: { icon: '~', color: '#F0C75E', bg: '#FBF3DC' },
  失败: { icon: '✕', color: '#E07050', bg: '#FAE5DE' },
};

export default function LogEntry({ log, onPhotoClick }: Props) {
  const date = new Date(log.date);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const result = resultConfig[log.result];

  return (
    <div className="timeline-item">
      <div className="timeline-node">
        <div className="timeline-dot" style={{ backgroundColor: result.color }}>
          {day}
        </div>
        <div className="timeline-line" />
      </div>

      <div className="timeline-content">
        <div className="log-header">
          <span className="log-date">
            {date.getFullYear()}年{month}月{day}日
          </span>
          <span
            className="log-result"
            style={{
              backgroundColor: result.bg,
              color: result.color,
              border: `1px solid ${result.color}`,
            }}
          >
            {result.icon} {log.result}
          </span>
        </div>

        {log.note && <p className="log-note">{log.note}</p>}

        {log.photoThumb && (
          <div className="log-photo" onClick={onPhotoClick}>
            <img src={log.photoThumb} alt="烘焙成品" />
          </div>
        )}
      </div>
    </div>
  );
}
