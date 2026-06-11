import React, { useState } from 'react';
import type { Order } from '../types';

interface MarketOrdersProps {
  orders: Order[];
  currentUserId: string;
  onMatchOrder: (orderId: string) => void;
  onCreateOrder: (type: 'buy' | 'sell', quantity: number, price: number) => void;
  removingOrderIds: Set<string>;
}

const MarketOrders: React.FC<MarketOrdersProps> = ({
  orders,
  currentUserId,
  onMatchOrder,
  onCreateOrder,
  removingOrderIds,
}) => {
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    const p = parseFloat(price);
    if (qty > 0 && p > 0) {
      onCreateOrder(orderType, qty, p);
      setQuantity('');
      setPrice('');
    }
  };

  const handleOrderClick = (order: Order) => {
    if (order.creatorId === currentUserId) return;
    onMatchOrder(order.id);
  };

  return (
    <div className="market-orders">
      <div className="panel-header market-header">
        <h2>挂单市场</h2>
        <span className="order-count">{orders.length} 个挂单</span>
      </div>

      <form className="order-form" onSubmit={handleSubmit}>
        <div className="order-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${orderType === 'buy' ? 'active buy' : ''}`}
            onClick={() => setOrderType('buy')}
          >
            买入
          </button>
          <button
            type="button"
            className={`toggle-btn ${orderType === 'sell' ? 'active sell' : ''}`}
            onClick={() => setOrderType('sell')}
          >
            卖出
          </button>
        </div>
        <div className="order-inputs">
          <div className="input-group">
            <label>数量</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="输入数量"
            />
          </div>
          <div className="input-group">
            <label>单价</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="输入单价"
            />
          </div>
        </div>
        <button
          type="submit"
          className={`submit-btn ${orderType}`}
        >
          发布{orderType === 'buy' ? '买入' : '卖出'}挂单
        </button>
      </form>

      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="no-orders">暂无挂单</div>
        ) : (
          orders.map((order) => {
            const isOwn = order.creatorId === currentUserId;
            const isRemoving = removingOrderIds.has(order.id);
            return (
              <div
                key={order.id}
                className={`order-card order-card-enter ${isRemoving ? 'order-card-exit' : ''} ${isOwn ? 'own-order' : 'clickable'}`}
                onClick={() => !isOwn && handleOrderClick(order)}
              >
                <div className="order-card-left">
                  <span className={`order-dot ${order.type}`} />
                  <div className="order-info">
                    <span className={`order-type-label ${order.type}`}>
                      {order.type === 'buy' ? '买入' : '卖出'}
                    </span>
                    <span className="order-creator">
                      {isOwn ? '你' : order.creatorName}
                    </span>
                  </div>
                </div>
                <div className="order-card-right">
                  <div className="order-quantity">{order.quantity} 份</div>
                  <div className="order-price">@ {order.price} PTS</div>
                </div>
                {!isOwn && (
                  <div className={`order-action ${order.type}`}>
                    {order.type === 'sell' ? '买入' : '卖出'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MarketOrders;
