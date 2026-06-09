import React from 'react';
import { useSocket } from '../SocketContext';
import { api } from '../api';
import { BorrowRequestEvent } from '../api';

interface BorrowRequestsModalProps {
  onClose: () => void;
}

export default function BorrowRequestsModal({ onClose }: BorrowRequestsModalProps) {
  const { borrowRequests, setBorrowRequests, addNotification } = useSocket();

  const handleAction = async (req: BorrowRequestEvent, approved: boolean) => {
    try {
      await api.handleBorrow(req.id, approved);
      setBorrowRequests(prev => prev.filter(r => r.id !== req.id));
      addNotification(approved ? '已同意借阅' : '已拒绝借阅');
    } catch (err: any) {
      addNotification(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content requests-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>借阅请求</h2>
        {borrowRequests.length === 0 ? (
          <p className="empty-requests">暂无借阅请求</p>
        ) : (
          <ul className="requests-list">
            {borrowRequests.map(req => (
              <li key={req.id} className="request-item">
                <span
                  className="request-avatar"
                  style={{ background: req.requesterAvatarColor }}
                >
                  {req.requesterNickname.charAt(0)}
                </span>
                <div className="request-content">
                  <p>
                    <strong>{req.requesterNickname}</strong> 想借阅
                    <strong> 《{req.bookTitle}》</strong>
                  </p>
                  <span className="request-time">
                    {new Date(req.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="request-actions">
                  <button className="btn-primary" onClick={() => handleAction(req, true)}>同意</button>
                  <button className="btn-secondary" onClick={() => handleAction(req, false)}>拒绝</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
