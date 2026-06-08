import { statusConfig, daysSinceApply, formatDate } from '../utils';
import type { Application } from '../types';

interface ApplicationCardProps {
  application: Application;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  showNotes?: boolean;
  onNotesUpdate?: (notes: string) => void;
}

export default function ApplicationCard({
  application,
  onEdit,
  onDelete,
  isDeleting,
}: ApplicationCardProps) {
  const status = statusConfig[application.status];
  const days = daysSinceApply(application.applyDate);

  return (
    <div
      className={`application-card ${isDeleting ? 'deleting' : ''}`}
      style={{ '--status-color': status.color } as React.CSSProperties}
    >
      <div className="card-header">
        <span className="status-badge" style={{ backgroundColor: status.bgColor, color: status.color }}>
          {status.label}
        </span>
        <div className="card-actions">
          <button className="icon-btn edit-btn" onClick={() => onEdit(application)} title="编辑">
            ✏️
          </button>
          <button className="icon-btn delete-btn" onClick={() => onDelete(application.id)} title="删除">
            🗑️
          </button>
        </div>
      </div>
      
      <h3 className="card-company">{application.company}</h3>
      <p className="card-position">{application.position}</p>
      
      <div className="card-footer">
        <span className="card-date">{formatDate(application.applyDate)}</span>
        <span className="card-days">
          {days === 0 ? '今天' : `${days}天前`}
        </span>
      </div>

      {application.notes && (
        <div className="card-notes">
          <span className="notes-label">备注:</span>
          <p className="notes-text">{application.notes}</p>
        </div>
      )}
    </div>
  );
}
