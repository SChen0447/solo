import { useState, useEffect, useCallback } from 'react'
import { products, type Product } from '@/data/products'
import './ProductCarousel.css'

interface ProductCarouselProps {
  isExpired: boolean
}

export default function ProductCarousel({ isExpired }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? products.length - 1 : prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1))
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="carousel-container">
      <button className="carousel-arrow carousel-prev" onClick={goToPrev}>
        ‹
      </button>
      <div className="carousel-track">
        {products.map((product: Product, index: number) => (
          <div
            key={product.id}
            className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
          >
            <div className="product-card">
              <img
                src={product.image}
                alt={product.name}
                className="product-image"
                loading="lazy"
              />
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-price">
                  <span className={`original-price ${isExpired ? 'expired' : ''}`}>
                    ¥{product.originalPrice}
                  </span>
                  <span className={`sale-price ${isExpired ? 'expired' : ''}`}>
                    ¥{product.salePrice}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="carousel-arrow carousel-next" onClick={goToNext}>
        ›
      </button>
      <div className="carousel-dots">
        {products.map((_, index: number) => (
          <span
            key={index}
            className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}
