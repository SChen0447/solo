import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import api from '../utils/api';
import { useApp } from '../context/AppContext';
import './ProductDetail.css';

const colorMap: Record<string, { filter: string; name: string; hex: string }> = {
  '原色植鞣': { filter: 'sepia(0.2) saturate(1.1)', name: '原色植鞣', hex: '#d4a574' },
  '深棕': { filter: 'sepia(0.8) brightness(0.7) saturate(1.2)', name: '深棕', hex: '#5c4033' },
  '酒红': { filter: 'sepia(0.3) hue-rotate(-20deg) saturate(1.5) brightness(0.8)', name: '酒红', hex: '#722f37' },
  '墨绿': { filter: 'sepia(0.3) hue-rotate(80deg) saturate(0.8) brightness(0.7)', name: '墨绿', hex: '#2f4f4f' }
};

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, showToast } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('原色植鞣');
  const [selectedStitch, setSelectedStitch] = useState('米黄');
  const [engraving, setEngraving] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        setProduct(res.data);
        if (res.data.colors?.[0]) {
          setSelectedColor(res.data.colors[0]);
        }
        if (res.data.stitchColors?.[1]) {
          setSelectedStitch(res.data.stitchColors[1]);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(1, prev + delta), 3));
  };

  const handleMouseEnter = () => {
    setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
    setZoom(1);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !imgRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    imgRef.current.style.transformOrigin = `${x * 100}% ${y * 100}%`;
  };

  const handleAddToCart = () => {
    if (!product || !product.stock) return;
    
    addToCart({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      color: selectedColor,
      stitchColor: selectedStitch,
      engraving,
      quantity
    });
    
    setIsAdded(true);
    showToast('已加入购物车', 'success');
    
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loader" style={{ borderColor: 'var(--color-dark-brown)', borderTopColor: 'transparent' }}></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>产品不存在</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  const colorStyle = colorMap[selectedColor] || colorMap['原色植鞣'];

  return (
    <div className="product-detail page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        返回
      </button>

      <div className="detail-content">
        <div 
          className="product-image-section"
          ref={containerRef}
          onWheel={handleWheel}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          <img
            ref={imgRef}
            src={product.image}
            alt={product.name}
            className="product-main-image"
            style={{ 
              filter: colorStyle.filter,
              transform: `scale(${zoom})`,
              transition: isZooming ? 'none' : 'transform 0.3s ease'
            }}
          />
          <div className="zoom-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            滚轮缩放查看细节
          </div>
          {!product.stock && (
            <div className="sold-out-overlay">已售罄</div>
          )}
        </div>

        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>
          <div className="product-price-row">
            <span className="product-price">¥{product.price}</span>
            <span className={`stock-badge ${product.stock ? 'in' : 'out'}`}>
              {product.stock ? '在售' : '已售罄'}
            </span>
          </div>

          <div className="product-description">
            <h3>匠人手记</h3>
            <p>{product.description}</p>
          </div>

          <div className="option-section">
            <h4>皮面颜色</h4>
            <div className="color-options">
              {product.colors.map(color => (
                <button
                  key={color}
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: colorMap[color]?.hex || '#ccc' }}
                  title={color}
                >
                  {selectedColor === color && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <p className="selected-color-name">已选：{selectedColor}</p>
          </div>

          <div className="option-section">
            <h4>缝线颜色</h4>
            <div className="stitch-options">
              {product.stitchColors.map(color => (
                <button
                  key={color}
                  className={`stitch-option ${selectedStitch === color ? 'selected' : ''}`}
                  onClick={() => setSelectedStitch(color)}
                >
                  {color}线
                </button>
              ))}
            </div>
          </div>

          <div className="option-section">
            <h4>个性化烫印 <span className="optional">（可选）</span></h4>
            <input
              type="text"
              className="engraving-input"
              placeholder="输入想要烫印的文字（限6字内）"
              value={engraving}
              onChange={(e) => setEngraving(e.target.value.slice(0, 6))}
              maxLength={6}
            />
            <p className="engraving-tip">烫印为额外服务，不收取费用</p>
          </div>

          <div className="option-section">
            <h4>数量</h4>
            <div className="quantity-selector">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span>{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                disabled={!product.stock}
              >
                +
              </button>
            </div>
          </div>

          <div className="action-buttons">
            <button
              className={`btn add-cart-btn ${isAdded ? 'added' : ''}`}
              onClick={handleAddToCart}
              disabled={!product.stock}
            >
              {isAdded ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  已加入
                </>
              ) : (
                '加入购物车'
              )}
            </button>
            <button 
              className="btn btn-secondary buy-now-btn"
              disabled={!product.stock}
              onClick={() => {
                handleAddToCart();
                navigate('/checkout');
              }}
            >
              立即购买
            </button>
          </div>

          <div className="product-features">
            <div className="feature-item">
              <span className="feature-icon">✂️</span>
              <span>手工缝制</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🐂</span>
              <span>头层牛皮</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎁</span>
              <span>精美包装</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🚚</span>
              <span>顺丰包邮</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
