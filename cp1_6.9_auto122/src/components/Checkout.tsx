import React, { useState } from 'react';
import { useAppContext, Order } from '../App';

const Checkout: React.FC = () => {
  const { cart, clearCart, addOrder, setCurrentPage, setCurrentOrderId } = useAppContext();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    deliveryTime: '今天',
  });
  const [submitting, setSubmitting] = useState(false);

  const totalPrice = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  if (cart.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🛒</div>
        <div className="empty-state-text">购物车为空，快去选购鲜花吧～</div>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          totalPrice,
          deliveryInfo: form,
        }),
      });
      const order: Order = await res.json();
      addOrder(order);
      clearCart();
      setCurrentOrderId(order.id);
      setCurrentPage('orderDetail');
    } catch (err) {
      console.error(err);
      alert('下单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <button className="back-btn" onClick={() => setCurrentPage('shop')}>
        ← 返回继续选购
      </button>
      <h2 className="page-title">确认订单</h2>

      <div className="order-section">
        <div className="order-section-title">商品清单</div>
        <div className="order-summary">
          {cart.map((item, idx) => (
            <div className="order-summary-item" key={idx}>
              <span>
                {item.baseName} × {item.quantity}
              </span>
              <span>¥{(item.unitPrice * item.quantity).toFixed(0)}</span>
            </div>
          ))}
          <div className="order-summary-total">
            <span>合计</span>
            <span>¥{totalPrice.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="order-section">
          <div className="order-section-title">配送信息</div>

          <div className="form-group">
            <label>收货人姓名</label>
            <input
              className="form-input"
              type="text"
              placeholder="请输入姓名"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>联系电话</label>
            <input
              className="form-input"
              type="tel"
              placeholder="请输入手机号"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>配送地址</label>
            <input
              className="form-input"
              type="text"
              placeholder="请输入详细地址"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>期望送达时间</label>
            <select
              className="form-select"
              value={form.deliveryTime}
              onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
            >
              <option value="今天">今天</option>
              <option value="明天">明天</option>
              <option value="后天">后天</option>
            </select>
          </div>
        </div>

        <button className="submit-order-btn" type="submit" disabled={submitting}>
          {submitting ? '提交中...' : `提交订单 ¥${totalPrice.toFixed(0)}`}
        </button>
      </form>
    </div>
  );
};

export default Checkout;
