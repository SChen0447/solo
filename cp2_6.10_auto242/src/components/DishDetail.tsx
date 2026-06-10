import { useState } from 'react';
import type { Dish, DishStatus } from '../types';

interface DishDetailProps {
  dish: Dish;
  onStockChange: (id: string, stock: number) => void;
  onLimitedChange: (id: string, limited: number) => void;
  onStatusChange: (id: string, status: DishStatus) => void;
  onBack: () => void;
}

const STATUS_LABELS: Record<DishStatus, string> = {
  available: '有货',
  limited: '限量',
  soldout: '售罄',
};

const STATUS_COLORS: Record<DishStatus, string> = {
  available: '#4a8b4a',
  limited: '#c17a47',
  soldout: '#888888',
};

export default function DishDetail({
  dish,
  onStockChange,
  onLimitedChange,
  onStatusChange,
  onBack,
}: DishDetailProps) {
  const [limitedValue, setLimitedValue] = useState(dish.limited);

  const handleLimitedCommit = () => {
    onLimitedChange(dish.id, limitedValue);
  };

  const stockPercent = dish.limited > 0 ? (dish.stock / dish.limited) * 100 : 0;
  const limitedPercent = dish.limited > 0 ? (limitedValue / 100) * 100 : 0;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}
    >
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          backgroundColor: '#fff',
          border: '1px solid #d9c8b2',
          borderRadius: 8,
          color: '#2c2c2c',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 24,
          transition: 'all 0.3s ease',
        }}
      >
        ← 返回菜品看板
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: '60%',
            minWidth: 280,
            aspectRatio: '4 / 3',
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: '#eee',
            boxShadow: '0 8px 32px rgba(44, 44, 44, 0.15)',
          }}
        >
          <img
            src={dish.imageUrl}
            alt={dish.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: dish.status === 'soldout' ? 'grayscale(70%)' : 'none',
              transition: 'filter 0.3s ease',
            }}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: dish.status === 'soldout' ? '#888' : '#2c2c2c',
              margin: 0,
              transition: 'color 0.3s ease',
            }}
          >
            {dish.name}
          </h1>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              backgroundColor:
                dish.status === 'soldout'
                  ? '#e0e0e0'
                  : dish.status === 'limited'
                  ? '#f5e0cc'
                  : '#dff0df',
              color: STATUS_COLORS[dish.status],
              transition: 'all 0.3s ease',
            }}
          >
            {STATUS_LABELS[dish.status]}
          </span>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#c17a47',
            marginBottom: 12,
          }}
        >
          ¥{dish.price}
        </div>
        <p
          style={{
            fontSize: 15,
            color: '#5a4a3a',
            lineHeight: 1.7,
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          {dish.description}
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 4px 16px rgba(44, 44, 44, 0.06)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2c', margin: '0 0 12px' }}>
          🥗 原材料
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {dish.ingredients.map((ing, idx) => (
            <span
              key={idx}
              style={{
                padding: '4px 12px',
                backgroundColor: '#f5f0eb',
                color: '#6a5a4a',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {ing}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 4px 16px rgba(44, 44, 44, 0.06)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2c', margin: '0 0 12px' }}>
          🏷️ 营养标签
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {dish.nutritionTags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                padding: '4px 12px',
                backgroundColor: '#eeeeee',
                color: '#777',
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 4px 16px rgba(44, 44, 44, 0.06)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2c', margin: '0 0 20px' }}>
          📦 库存调整
        </h3>

        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: '#5a4a3a' }}>
              当前库存
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: dish.stock === 0 ? '#888' : '#2c2c2c',
                transition: 'color 0.3s ease',
              }}
            >
              {dish.stock} 份
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => onStockChange(dish.id, dish.stock - 1)}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#fff',
                color: '#d4a373',
                fontSize: 28,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(212, 163, 115, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5e6d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              −
            </button>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#c17a47', minWidth: 80, textAlign: 'center' }}>
              {dish.stock}
            </div>
            <button
              onClick={() => onStockChange(dish.id, dish.stock + 1)}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#fff',
                color: '#d4a373',
                fontSize: 28,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(212, 163, 115, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5e6d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              +
            </button>
          </div>

          <div
            style={{
              width: '100%',
              height: 6,
              backgroundColor: '#d9c8b2',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, stockPercent)}%`,
                backgroundColor: '#c17a47',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 12,
              color: '#9a8a7a',
            }}
          >
            <span>0</span>
            <span>每日限购 {dish.limited} 份</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: '#5a4a3a' }}>
              每日限购数量
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#c17a47' }}>
              {limitedValue} 份
            </span>
          </div>

          <div style={{ position: 'relative', padding: '8px 0 16px' }}>
            <input
              type="range"
              min="1"
              max="100"
              value={limitedValue}
              onChange={(e) => setLimitedValue(Number(e.target.value))}
              onMouseUp={handleLimitedCommit}
              onTouchEnd={handleLimitedCommit}
              style={{
                width: '100%',
                height: 6,
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                outline: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 6,
                backgroundColor: '#d9c8b2',
                borderRadius: 3,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${limitedPercent}%`,
                  backgroundColor: '#c17a47',
                  borderRadius: 3,
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#9a8a7a',
            }}
          >
            <span>1 份</span>
            <span>100 份</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 24, marginTop: 24 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#5a4a3a', display: 'block', marginBottom: 12 }}>
            快捷状态切换
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['available', 'limited', 'soldout'] as DishStatus[]).map(status => (
              <button
                key={status}
                onClick={() => onStatusChange(dish.id, status)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: dish.status === status ? `2px solid ${STATUS_COLORS[status]}` : '2px solid transparent',
                  backgroundColor: dish.status === status ? (
                    status === 'soldout' ? '#e0e0e0' : status === 'limited' ? '#f5e0cc' : '#dff0df'
                  ) : '#f5f0eb',
                  color: STATUS_COLORS[status],
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #c17a47;
          cursor: pointer;
          border: 3px solid #fff;
          box-shadow: 0 2px 6px rgba(193, 122, 71, 0.4);
          position: relative;
          z-index: 2;
          transition: transform 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #c17a47;
          cursor: pointer;
          border: 3px solid #fff;
          box-shadow: 0 2px 6px rgba(193, 122, 71, 0.4);
          position: relative;
          z-index: 2;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          background: transparent;
          height: 6px;
        }
        input[type="range"]::-moz-range-track {
          background: transparent;
          height: 6px;
        }
      `}</style>
    </div>
  );
}
