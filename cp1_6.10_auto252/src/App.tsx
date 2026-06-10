import React, { useState, useMemo } from 'react';
import { useAppStore } from './store';
import { ProductCard } from './components/ProductCard';
import { QuotePreview } from './components/QuotePreview';
import type { Product, ViewMode } from './types';

interface ProductFormData {
  name: string;
  specification: string;
  unit: string;
  purchasePrice: number;
  retailPrice: number;
  stock: number;
  warningThreshold: number;
}

const emptyForm: ProductFormData = {
  name: '',
  specification: '',
  unit: '袋',
  purchasePrice: 0,
  retailPrice: 0,
  stock: 0,
  warningThreshold: 10,
};

const App: React.FC = () => {
  const {
    state,
    addProduct,
    updateProduct,
    deleteProduct,
    getLowStockCount,
    deleteHistory,
    loadQuoteFromHistory,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);

  const lowStockCount = getLowStockCount();
  const selectedProductIds = useMemo(
    () => new Set(state.currentQuote.map((q) => q.productId)),
    [state.currentQuote]
  );

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData(emptyForm);
    setShowProductModal(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      specification: product.specification,
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      retailPrice: product.retailPrice,
      stock: product.stock,
      warningThreshold: product.warningThreshold,
    });
    setShowProductModal(true);
  };

  const handleCloseModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        ...formData,
      });
    } else {
      addProduct(formData);
    }
    handleCloseModal();
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('确定要删除这个商品吗？')) {
      deleteProduct(id);
    }
  };

  const handleDeleteHistory = (id: string) => {
    if (window.confirm('确定要删除这条历史记录吗？')) {
      deleteHistory(id);
    }
  };

  const handleReeditQuote = (quote: typeof state.history[0]) => {
    loadQuoteFromHistory(quote);
    setViewMode('products');
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">🍿 零食管家</h1>
          <p className="app-subtitle">库存与报价管理</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${viewMode === 'products' ? 'active' : ''}`}
            onClick={() => setViewMode('products')}
          >
            <span className="nav-icon">📦</span>
            <span>商品管理</span>
            {lowStockCount > 0 && (
              <span className="nav-badge-container">
                <span className="pulse-dot"></span>
                <span className="nav-badge">{lowStockCount}</span>
              </span>
            )}
          </button>
          <button
            className={`nav-item ${viewMode === 'history' ? 'active' : ''}`}
            onClick={() => setViewMode('history')}
          >
            <span className="nav-icon">📋</span>
            <span>历史记录</span>
            {state.history.length > 0 && (
              <span className="nav-badge nav-badge-gray">{state.history.length}</span>
            )}
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>数据存储于本地浏览器</p>
        </div>
      </aside>

      <main className="main-content">
        {viewMode === 'products' && (
          <>
            <div className="content-header">
              <div>
                <h2>商品列表</h2>
                <p className="content-subtitle">
                  共 {state.products.length} 种商品
                  {lowStockCount > 0 && (
                    <span className="low-stock-warning">
                      ，{lowStockCount} 种库存不足
                    </span>
                  )}
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddModal}>
                + 添加商品
              </button>
            </div>

            <div className="product-grid" style={{ willChange: 'transform' }}>
              {state.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteProduct}
                  isSelected={selectedProductIds.has(product.id)}
                />
              ))}
            </div>
          </>
        )}

        {viewMode === 'history' && (
          <>
            <div className="content-header">
              <div>
                <h2>历史报价单</h2>
                <p className="content-subtitle">共 {state.history.length} 条记录</p>
              </div>
            </div>

            {state.history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>暂无历史报价单</p>
                <p className="empty-hint">生成报价单后将自动保存到此处</p>
              </div>
            ) : (
              <div className="history-list">
                {state.history.map((quote) => (
                  <div key={quote.id} className="history-card">
                    <div className="history-header">
                      <div className="history-info">
                        <div className="history-date">{formatDate(quote.createdAt)}</div>
                        <div className="history-meta">
                          {quote.items.length} 种商品
                          {quote.discount > 0 && ` · 折扣 ${quote.discount}%`}
                        </div>
                      </div>
                      <div className="history-total">¥{quote.totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="history-items">
                      {quote.items.slice(0, 3).map((item) => (
                        <span key={item.productId} className="history-item-tag">
                          {item.productName} ×{item.quantity}
                        </span>
                      ))}
                      {quote.items.length > 3 && (
                        <span className="history-item-tag more">
                          +{quote.items.length - 3} 更多
                        </span>
                      )}
                    </div>
                    <div className="history-actions">
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleReeditQuote(quote)}
                      >
                        重新编辑
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteHistory(quote.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <aside className="quote-sidebar">
        <QuotePreview />
      </aside>

      {showProductModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? '编辑商品' : '添加商品'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitModal}>
              <div className="form-grid">
                <div className="form-group">
                  <label>商品名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入商品名称"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>规格</label>
                  <input
                    type="text"
                    value={formData.specification}
                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                    placeholder="如：70g、500ml"
                  />
                </div>
                <div className="form-group">
                  <label>单位</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="袋">袋</option>
                    <option value="盒">盒</option>
                    <option value="桶">桶</option>
                    <option value="包">包</option>
                    <option value="瓶">瓶</option>
                    <option value="个">个</option>
                    <option value="箱">箱</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>进货价 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData, purchasePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>零售价 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.retailPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData, retailPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>库存量</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>库存预警阈值</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.warningThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData, warningThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? '保存修改' : '添加商品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
