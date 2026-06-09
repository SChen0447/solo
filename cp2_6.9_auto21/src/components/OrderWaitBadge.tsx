import React, { useEffect, useState } from 'react';

interface OrderWaitBadgeProps {
  minutes: number;
  size?: 'sm' | 'md';
}

const OrderWaitBadge: React.FC<OrderWaitBadgeProps> = ({ minutes, size = 'md' }) => {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [minutes]);

  const bgColor =
    minutes < 5
      ? '#48BB78'
      : minutes <= 15
      ? '#ECC94B'
      : '#E53E3E';

  const textColor = minutes <= 15 ? '#2D3748' : '#FFFFFF';

  const dimensions = size === 'sm' ? { width: 36, height: 36, fontSize: 12 } : { width: 44, height: 44, fontSize: 14 };

  return (
    <div
      key={animKey}
      className="wait-badge pulse"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: '50%',
        background: bgColor,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        fontSize: dimensions.fontSize,
        flexShrink: 0,
        transition: 'background-color 0.3s ease',
      }}
    >
      {minutes}
    </div>
  );
};

export default OrderWaitBadge;
