import React, { useState } from 'react';
import type { Order, OrderStatus } from './types';

interface OrderManagerProps {
  orders: Order[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onMarkComplete: (id: string) => void;
  acceptAnimationId: string | null;
  rejectShakeId: string | null;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待确认',
  producing: '生产中',
  completed: '已完成',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#CC5500',
  producing: '#B8860B',
  completed: '#2E7D32',
};

const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  selectedIds,
  onToggleSelect,
  onAccept,
  onReject,
  onMarkComplete,
  acceptAnimationId,
  rejectShakeId,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    if (rejectingId && rejectReason.trim()) {
      onReject(rejectingId, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
    }
  };

  const handleCancelReject = () => {
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="order-manager">
      <div className="order-manager__header">
        <h3 className="order-manager__title">客户定制订单</h3>
        <span className="order-manager__count">共 {orders.length} 条 · 已选 {selectedIds.length}</span>
      </div>

      <div className="order-list">
        {orders.length === 0 && (
          <div className="order-empty">暂无订单数据</div>
        )}
        {orders.map((order) => (
          <div
            key={order.id}
            className={`order-card ${selectedIds.includes(order.id) ? 'selected' : ''} ${
              acceptAnimationId === order.id ? 'accept-flash' : ''
            } ${rejectShakeId === order.id || rejectingId === order.id ? 'shake' : ''}`}
          >
            <label className="order-checkbox">
              <input
                type="checkbox"
                checked={selectedIds.includes(order.id)}
                onChange={() => onToggleSelect(order.id)}
              />
              <span className="checkbox-custom" />
            </label>

            <div className="order-info">
              <div className="order-customer">
                <span className="customer-name">{order.customerName}</span>
                <span
                  className="order-status"
                  style={{ backgroundColor: STATUS_COLORS[order.status] }}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="order-summary">{order.configSummary}</div>
              {order.rejectReason && (
                <div className="order-reject">拒绝原因：{order.rejectReason}</div>
              )}
            </div>

            {acceptAnimationId === order.id && (
              <div className="accept-checkmark">
                <svg viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="25" fill="none" />
                  <path fill="none" d="M14 27l7 7 16-16" />
                </svg>
              </div>
            )}

            <div className="order-actions">
              {order.status === 'pending' && !rejectingId && (
                <>
                  <button
                    className="btn btn--primary"
                    onClick={() => onAccept(order.id)}
                  >
                    接受
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={() => handleRejectClick(order.id)}
                  >
                    拒绝
                  </button>
                </>
              )}

              {rejectingId === order.id && (
                <div className="reject-input-group">
                  <input
                    type="text"
                    className="reject-input shake-input"
                    placeholder="请输入拒绝原因..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="btn btn--primary btn--small"
                    onClick={handleConfirmReject}
                    disabled={!rejectReason.trim()}
                  >
                    确认
                  </button>
                  <button className="btn btn--ghost btn--small" onClick={handleCancelReject}>
                    取消
                  </button>
                </div>
              )}

              {order.status === 'producing' && (
                <button
                  className="btn btn--success"
                  onClick={() => onMarkComplete(order.id)}
                >
                  标记完成
                </button>
              )}

              {order.status === 'completed' && (
                <span className="order-completed-tag">已归档</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderManager;
