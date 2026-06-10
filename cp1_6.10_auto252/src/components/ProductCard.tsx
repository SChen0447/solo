import React, { memo } from 'react';
import type { Product } from '../types';
import { useAppStore } from '../store';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, isSelected }) => {
  const { addToQuote } = useAppStore();
  const isLowStock = product.stock <= product.warningThreshold;

  return (
    <div
      className={`product-card ${isLowStock ? 'low-stock' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <div className="product-image-placeholder">
        <span className="placeholder-icon">🍪</span>
      </div>
      <div className="product-info">
        <h3 className="product-name" title={product.name}>
          {product.name}
        </h3>
        <p className="product-spec">
          {product.specification} / {product.unit}
        </p>
        <div className="product-prices">
          <span className="retail-price">¥{product.retailPrice.toFixed(2)}</span>
          <span className="stock-label">
            库存: <strong className={isLowStock ? 'low-stock-text' : ''}>{product.stock}</strong>
          </span>
        </div>
      </div>
      <div className="product-actions">
        <button className="btn btn-primary btn-small" onClick={() => addToQuote(product)}>
          添加
        </button>
        <button className="btn btn-secondary btn-small" onClick={() => onEdit(product)}>
          编辑
        </button>
        <button className="btn btn-danger btn-small" onClick={() => onDelete(product.id)}>
          删除
        </button>
      </div>
    </div>
  );
};

export const ProductCard = memo(ProductCardComponent, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.stock === next.product.stock &&
    prev.product.retailPrice === next.product.retailPrice &&
    prev.isSelected === next.isSelected
  );
});
