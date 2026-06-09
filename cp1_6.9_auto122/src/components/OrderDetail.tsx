import React, { useState, useEffect } from 'react';
import { useAppContext, Order, OrderStatus } from '../App';
import DeliveryTracker from './DeliveryTracker';

const flowerTypeIcons: Record<string, string> = {
  rose: '🌹',
  tulip: '🌷',
  lily: '💐',
  sunflower: '🌻',
  mixed: '🌸',
};

const colorToneShades: Record<string, string[]> = {
  red: ['#ff4757', '#ff6b81', '#ff9f9f'],
  pink: ['#ff6b9d', '#ffa0c2', '#ffc6d9'],
  white: ['#ffffff', '#f8f9fa', '#e9ecef'],
  yellow: ['#ffd93d', '#ffe066', '#fff3b0'],
  purple: ['#9b59b6', '#a569bd', '#c39bd3'],
};

const statusLabels: Record<OrderStatus, string> = {
  confirmed: '已确认',
  preparing: '准备中',
  delivering: '配送中',
  delivered: '已送达',
};

const steps: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'confirmed', label: '已确认', icon: '✓' },
  { key: 'preparing', label: '准备中', icon: '📦' },
  { key: 'delivering', label: '配送中', icon: '🛵' },
  { key: 'delivered', label: '已送达', icon: '🏠' },
];

const OrderDetail: React.FC = () => {
  const { orders, currentOrderId, setCurrentPage, updateOrderStatus, socket } = useAppContext();
  const [order, setOrder] = useState<Order | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [visitedPath, setVisitedPath] = useState<{ x: number; y: number }[]>([]);
  const [showArrival, setShowArrival] = useState(false);

  useEffect(() => {
    const found = orders.find((o) => o.id === currentOrderId) || orders[0];
    if (found) {
      setOrder(found);
      setPosition(found.deliveryPersonPosition || null);
      if (found.deliveryPersonPosition) {
        setVisitedPath([found.deliveryPersonPosition]);
      }
    }
  }, [orders, currentOrderId]);

  useEffect(() => {
    if (!socket || !order) return;

    socket.emit('order:subscribe', order.id);

    const handleStatus = (data: { status: OrderStatus }) => {
      setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
      updateOrderStatus(order.id, data.status);
    };

    const handlePosition = (data: { position: { x: number; y: number }; path: { x: number; y: number }[] }) => {
      setPosition(data.position);
      setVisitedPath(data.path);
    };

    const handleArrived = () => {
      setShowArrival(true);
    };

    socket.on(`order:${order.id}`, handleStatus);
    socket.on(`order:${order.id}:position`, handlePosition);
    socket.on(`order:${order.id}:arrived`, handleArrived);

    return () => {
      socket.off(`order:${order.id}`, handleStatus);
      socket.off(`order:${order.id}:position`, handlePosition);
      socket.off(`order:${order.id}:arrived`, handleArrived);
    };
  }, [socket, order?.id, updateOrderStatus]);

  const confirmDelivery = () => {
    if (!order) return;
    socket?.emit('order:confirmDelivery', order.id);
    updateOrderStatus(order.id, 'delivered');
    setOrder((prev) => (prev ? { ...prev, status: 'delivered' } : prev));
    setShowArrival(false);
  };

  if (!order) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">未找到订单</div>
        <button
          className="add-cart-btn"
          style={{ marginTop: 24, maxWidth: 200, marginInline: 'auto', display: 'block' }}
          onClick={() => setCurrentPage('orders')}
        >
          查看订单列表
        </button>
      </div>
    );
  }

  const etaMinutes = () => {
    if (order.status === 'delivered') return 0;
    if (order.status !== 'delivering' || !position) return null;
    const dx = order.deliveryInfo.gridX! - position.x;
    const dy = order.deliveryInfo.gridY! - position.y;
    const remaining = Math.abs(dx) + Math.abs(dy);
    return remaining * 2;
  };

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="order-detail-page">
      <button className="back-btn" onClick={() => setCurrentPage('orders')}>
        ← 返回订单列表
      </button>

      <div className="order-header">
        <div className="order-id">#{order.id}</div>
        <span className={`status-tag ${order.status}`}>{statusLabels[order.status]}</span>
      </div>

      <div className="status-steps">
        {steps.map((step, idx) => (
          <div key={step.key} className="status-step">
            {idx < steps.length - 1 && (
              <div className={`step-line ${idx < currentStepIndex ? 'done' : ''}`} />
            )}
            <div
              className={`step-circle ${
                idx < currentStepIndex ? 'done' : idx === currentStepIndex ? 'active' : ''
              }`}
            >
              {step.icon}
            </div>
            <div
              className={`step-label ${
                idx < currentStepIndex ? 'done' : idx === currentStepIndex ? 'active' : ''
              }`}
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>

      <div className="order-section">
        <div className="order-section-title">配送追踪</div>
        <DeliveryTracker
          startX={0}
          startY={0}
          endX={order.deliveryInfo.gridX ?? 2}
          endY={order.deliveryInfo.gridY ?? 1}
          currentPosition={position}
          visitedPath={visitedPath}
        />
        <div className="tracking-info">
          <span>
            {order.status === 'delivering' && etaMinutes() !== null
              ? `预计 ${etaMinutes()} 分钟后送达`
              : order.status === 'delivered'
              ? '已送达'
              : '等待配送中...'}
          </span>
          <span>配送至：{order.deliveryInfo.address}</span>
        </div>
      </div>

      <div className="order-section">
        <div className="order-section-title">花束清单</div>
        <div className="order-items-list">
          {order.items.map((item, idx) => (
            <div className="cart-item" key={idx}>
              <div
                className="cart-item-thumb"
                style={{
                  background: `linear-gradient(135deg, ${
                    colorToneShades[item.colorTone]?.[item.colorShade] || '#ff6b9d'
                  }, #fff5f0)`,
                  border: item.colorTone === 'white' ? '1px solid #e0e0e0' : 'none',
                }}
              >
                {flowerTypeIcons[item.flowerType] || '🌸'}
              </div>
              <div className="cart-item-info">
                <div className="cart-item-name">
                  {item.baseName} × {item.quantity}
                </div>
                <div className="cart-item-desc">
                  祝福语：{item.message || '无'}
                </div>
                <div className="cart-item-price" style={{ marginTop: 6 }}>
                  ¥{(item.unitPrice * item.quantity).toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="order-section">
        <div className="order-section-title">配送信息</div>
        <div className="delivery-info-row">
          <span className="delivery-info-label">收货人</span>
          <span className="delivery-info-value">{order.deliveryInfo.name}</span>
        </div>
        <div className="delivery-info-row">
          <span className="delivery-info-label">电话</span>
          <span className="delivery-info-value">{order.deliveryInfo.phone}</span>
        </div>
        <div className="delivery-info-row">
          <span className="delivery-info-label">地址</span>
          <span className="delivery-info-value">{order.deliveryInfo.address}</span>
        </div>
        <div className="delivery-info-row">
          <span className="delivery-info-label">送达时间</span>
          <span className="delivery-info-value">{order.deliveryInfo.deliveryTime}</span>
        </div>
        <div className="delivery-info-row">
          <span className="delivery-info-label">下单时间</span>
          <span className="delivery-info-value">
            {new Date(order.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>
      </div>

      <div className="order-summary" style={{ marginTop: 0 }}>
        <div className="order-summary-total">
          <span>订单总额</span>
          <span>¥{order.totalPrice.toFixed(0)}</span>
        </div>
      </div>

      {showArrival && (
        <div className="arrival-notification">
          <div className="notification-icon">💐</div>
          <div className="notification-title">您的花束已到达！</div>
          <div className="notification-desc">请确认收到您的鲜花</div>
          <button className="confirm-btn" onClick={confirmDelivery}>
            确认收货
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
