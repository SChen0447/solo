import React from 'react';
import { useAppContext } from '../App';

interface CartProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const flowerTypeIcons: Record<string, string> = {
  rose: '🌹',
  tulip: '🌷',
  lily: '💐',
  sunflower: '🌻',
  mixed: '🌸',
};

const colorToneNames: Record<string, string> = {
  red: '红色',
  pink: '粉色',
  white: '白色',
  yellow: '黄色',
  purple: '紫色',
};

const colorToneShades: Record<string, string[]> = {
  red: ['#ff4757', '#ff6b81', '#ff9f9f'],
  pink: ['#ff6b9d', '#ffa0c2', '#ffc6d9'],
  white: ['#ffffff', '#f8f9fa', '#e9ecef'],
  yellow: ['#ffd93d', '#ffe066', '#fff3b0'],
  purple: ['#9b59b6', '#a569bd', '#c39bd3'],
};

const Cart: React.FC<CartProps> = ({ isOpen, setIsOpen }) => {
  const { cart, updateCartQuantity, removeFromCart, setCurrentPage } = useAppContext();
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const goCheckout = () => {
    setIsOpen(false);
    setCurrentPage('checkout');
  };

  return (
    <>
      <button className="cart-fab" onClick={() => setIsOpen(true)}>
        🛒
        {totalQty > 0 && <span className="cart-badge">{totalQty}</span>}
      </button>

      <div className={`cart-panel ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h3>购物车 ({totalQty})</h3>
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              购物车还是空的
            </div>
          ) : (
            cart.map((item, index) => (
              <div className="cart-item" key={index}>
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
                  <div className="cart-item-name">{item.baseName}</div>
                  <div className="cart-item-desc">
                    {colorToneNames[item.colorTone]} · {item.message || '无祝福语'}
                  </div>
                  <div className="cart-item-qty">
                    <button
                      className="qty-btn"
                      onClick={() =>
                        item.quantity === 1
                          ? removeFromCart(index)
                          : updateCartQuantity(index, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span className="qty-display">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateCartQuantity(index, item.quantity + 1)}
                    >
                      +
                    </button>
                    <span className="cart-item-price">¥{(item.unitPrice * item.quantity).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span className="cart-total-label">合计</span>
              <span className="cart-total-price">¥{totalPrice.toFixed(0)}</span>
            </div>
            <button className="checkout-btn" onClick={goCheckout}>
              去结算
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
