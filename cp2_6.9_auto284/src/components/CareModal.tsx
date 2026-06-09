import { useEffect, useState } from 'react';
import type { Plant, CareType } from '../types';

interface CareModalProps {
  plant: Plant;
  onClose: () => void;
  onCare: (type: CareType) => Promise<void>;
}

const CareModal = ({ plant, onClose, onCare }: CareModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isCaring, setIsCaring] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleCare = async (type: CareType) => {
    if (isCaring) return;
    setIsCaring(true);
    await onCare(type);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const overlayStyle: React.CSSProperties = isClosing
    ? { animation: 'overlayFade 0.3s ease-in reverse forwards' }
    : { animation: 'overlayFade 0.3s ease-out' };

  const modalStyle: React.CSSProperties = isClosing
    ? { animation: 'modalClose 0.3s ease-in forwards' }
    : { animation: 'fadeInUp 0.3s ease-out' };

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 200,
          ...overlayStyle
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: '100%',
          maxWidth: 400,
          padding: 16,
          ...modalStyle
        }}
      >
        <div
          style={{
            background: '#FFF8E7',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#999',
              padding: 0,
              lineHeight: 1,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0E8D8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ×
          </button>

          <div
            style={{
              width: '100%',
              paddingBottom: '75%',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 16,
              position: 'relative'
            }}
          >
            <img
              src={plant.imageUrl}
              alt={plant.name}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 8
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#3E4A2F',
                  margin: 0
                }}
              >
                {plant.name}
              </h2>
              {plant.variety && (
                <span
                  style={{
                    fontSize: 12,
                    background: 'linear-gradient(135deg, #76B852, #8DC26F)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: 10,
                    fontWeight: 500
                  }}
                >
                  {plant.variety}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
              已被养护 <strong style={{ color: '#556B2F' }}>{plant.careCount}</strong> 次
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12
            }}
          >
            <button
              onClick={() => handleCare('water')}
              disabled={isCaring}
              style={{
                flex: 1,
                padding: '14px 20px',
                background: '#4FC3F7',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: isCaring ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, transform 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onMouseEnter={(e) => {
                if (!isCaring) e.currentTarget.style.background = '#29B6F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4FC3F7';
              }}
              onMouseDown={(e) => {
                if (!isCaring) e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              💧 浇水
            </button>
            <button
              onClick={() => handleCare('fertilize')}
              disabled={isCaring}
              style={{
                flex: 1,
                padding: '14px 20px',
                background: '#FFB74D',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: isCaring ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, transform 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onMouseEnter={(e) => {
                if (!isCaring) e.currentTarget.style.background = '#FFA726';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFB74D';
              }}
              onMouseDown={(e) => {
                if (!isCaring) e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🌱 施肥
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="position: fixed"][style*="top: 50%"] {
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: 100vw !important;
            max-width: none !important;
            height: 100vh !important;
            padding: 0 !important;
          }
          div[style*="position: fixed"][style*="top: 50%"] > div {
            height: 100%;
            border-radius: 0 !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
};

export default CareModal;
