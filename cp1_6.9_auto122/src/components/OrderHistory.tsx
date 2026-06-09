import React from 'react';
import { useAppContext, OrderStatus } from '../App';

const statusLabels: Record<OrderStatus, string> = {
  confirmed: '已确认',
  preparing: '准备中',
  delivering: '配送中',
  delivered: '已送达',
};

const OrderHistory: React.FC = () => {
  const { orders, setCurrentPage, setCurrentOrderId } = useAppContext();

  const openOrder = (id: number) => {
    setCurrentOrderId(id);
    setCurrentPage('orderDetail');
  };

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">还没有订单，快去选购鲜花吧～</div>
        <button
          className="add-cart-btn"
          style={{ marginTop: 24, maxWidth: 200, marginInline: 'auto', display: 'block' }}
          onClick={() => setCurrentPage('shop')}
        >
          去选购
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">我的订单</h2>
      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card" onClick={() => openOrder(order.id)}>
            <div className="order-card-header">
              <span className="order-card-id">#{order.id}</span>
              <span className={`status-tag ${order.status}`}>{statusLabels[order.status]}</span>
            </div>
            <div className="order-card-flowers">
              {order.items.map((i) => i.baseName).join('、')}
            </div>
            <div className="order-card-meta">
              <span>{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
              <span className="order-card-price">¥{order.totalPrice.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;
