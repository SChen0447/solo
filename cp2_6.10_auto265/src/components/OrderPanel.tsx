import { useState } from 'react';
import type { Order } from '../types';
import { format } from 'date-fns';

export default function OrderPanel({ orders }: { orders: Order[] }) {
  const [openId, setOpenId] = useState<string | null>(orders[0]?.id ?? null);

  return (
    <div className="orders-page">
      <h1 className="page-title">📦 订单历史</h1>

      {orders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--card)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ color: 'var(--text-light)' }}>暂无订单</p>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
            快去花材页面下单吧~
          </p>
        </div>
      ) : (
        <div className="accordion">
          {orders.map((order) => (
            <div
              className={`accordion-item ${openId === order.id ? 'open' : ''}`}
              key={order.id}
            >
              <div
                className="accordion-header"
                onClick={() => setOpenId(openId === order.id ? null : order.id)}
              >
                <div className="accordion-summary">
                  <div style={{ fontWeight: 600 }}>
                    {order.items.map((i) => `${i.name}×${i.quantity}`).join('、')}
                  </div>
                  <div className="accordion-date">
                    {format(new Date(order.date), 'yyyy年MM月dd日 HH:mm')}
                  </div>
                  <div className="accordion-order-id">#{order.id.slice(0, 8)}</div>
                </div>
                <div className="accordion-right">
                  <span className={`status-badge ${order.status}`}>{order.status}</span>
                  <span className="accordion-total">¥{order.total.toFixed(2)}</span>
                  <span className="accordion-icon">▼</span>
                </div>
              </div>
              <div className="accordion-content">
                <div className="accordion-detail">
                  <div className="accordion-detail-title">花材清单</div>
                  {order.items.map((item, idx) => (
                    <div className="order-item-row" key={idx}>
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>¥{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div
                    className="order-item-row"
                    style={{ borderTop: '1px solid var(--bg)', marginTop: 8, paddingTop: 12 }}
                  >
                    <span style={{ fontWeight: 700 }}>合计</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      ¥{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
