import React, { useMemo } from 'react';
import { useAppStore } from '../store';

export const QuotePreview: React.FC = () => {
  const {
    state,
    updateQuoteQuantity,
    removeFromQuote,
    setDiscount,
    clearQuote,
    saveQuoteToHistory,
    generateQuoteJson,
  } = useAppStore();

  const { currentQuote, discount } = state;

  const { subtotal, totalAmount } = useMemo(() => {
    const start = performance.now();
    const sub = currentQuote.reduce((sum, item) => sum + item.subtotal, 0);
    const total = sub * (1 - discount / 100);
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(`总价计算耗时 ${elapsed.toFixed(2)}ms，超过10ms阈值`);
    }
    return {
      subtotal: parseFloat(sub.toFixed(2)),
      totalAmount: parseFloat(total.toFixed(2)),
    };
  }, [currentQuote, discount]);

  const discountAmount = parseFloat((subtotal - totalAmount).toFixed(2));

  const handleExportJson = () => {
    const jsonStr = generateQuoteJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `报价单_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAndHistory = () => {
    if (currentQuote.length === 0) return;
    saveQuoteToHistory();
  };

  return (
    <div className="quote-preview">
      <div className="quote-header">
        <h2>报价单预览</h2>
        {currentQuote.length > 0 && (
          <button className="btn btn-link btn-small" onClick={clearQuote}>
            清空
          </button>
        )}
      </div>

      {currentQuote.length === 0 ? (
        <div className="quote-empty">
          <p>点击商品卡片上的"添加"按钮</p>
          <p>将商品加入报价单</p>
        </div>
      ) : (
        <>
          <div className="quote-items">
            {currentQuote.map((item) => (
              <div key={item.productId} className="quote-item">
                <div className="quote-item-info">
                  <div className="quote-item-name">{item.productName}</div>
                  <div className="quote-item-spec">
                    {item.specification} · ¥{item.unitPrice.toFixed(2)}/{item.unit}
                  </div>
                </div>
                <div className="quote-item-controls">
                  <div className="quantity-control">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuoteQuantity(item.productId, item.quantity - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="qty-input"
                      value={item.quantity}
                      min={1}
                      onChange={(e) =>
                        updateQuoteQuantity(item.productId, parseInt(e.target.value) || 0)
                      }
                    />
                    <button
                      className="qty-btn"
                      onClick={() => updateQuoteQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="quote-item-subtotal">¥{item.subtotal.toFixed(2)}</div>
                  <button
                    className="btn-remove"
                    onClick={() => removeFromQuote(item.productId)}
                    title="移除"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="quote-discount">
            <label>折扣设置：</label>
            <div className="discount-input-wrap">
              <input
                type="number"
                className="discount-input"
                value={discount}
                min={0}
                max={100}
                step={0.5}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
              <span className="discount-unit">%</span>
            </div>
            <div className="discount-presets">
              {[0, 5, 10, 15, 20].map((d) => (
                <button
                  key={d}
                  className={`discount-preset ${discount === d ? 'active' : ''}`}
                  onClick={() => setDiscount(d)}
                >
                  {d === 0 ? '无折扣' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="quote-summary">
            <div className="summary-row">
              <span>商品小计</span>
              <span>¥{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row discount-row">
                <span>折扣优惠 (-{discount}%)</span>
                <span>-¥{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total-row">
              <span>应付总额</span>
              <span className="total-amount">¥{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="quote-actions">
            <button className="btn btn-secondary" onClick={handleExportJson}>
              导出JSON
            </button>
            <button className="btn btn-primary" onClick={handleSaveAndHistory}>
              生成报价单
            </button>
          </div>
        </>
      )}
    </div>
  );
};
