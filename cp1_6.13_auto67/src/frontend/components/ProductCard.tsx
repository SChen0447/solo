import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-image-wrap">
        <img 
          src={product.image} 
          alt={product.name}
          loading="lazy"
          className="product-image"
        />
        {!product.stock && (
          <div className="sold-out-badge">已售罄</div>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-bottom">
          <span className="product-price">¥{product.price}</span>
          <span className={`stock-status ${product.stock ? 'in-stock' : 'out-stock'}`}>
            {product.stock ? '在售' : '已售罄'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
