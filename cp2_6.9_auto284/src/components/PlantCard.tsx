import type { Plant } from '../types';

interface PlantCardProps {
  plant: Plant;
  index: number;
  onClick: () => void;
  isBlooming: boolean;
}

const FLOWER_EMOJIS = ['🌸', '🌺', '🌻', '🌷', '🌹', '💮', '🌼', '🏵️'];

const PlantCard = ({ plant, index, onClick, isBlooming }: PlantCardProps) => {
  const progress = (plant.careCount % 10) * 10;
  const flowerEmoji = FLOWER_EMOJIS[index % FLOWER_EMOJIS.length];

  const cardStyle: React.CSSProperties = {
    background: '#FFF8E7',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: 16,
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
    position: 'relative',
    overflow: 'hidden',
    width: '100%'
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      className="plant-card"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '75%',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 12
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
          draggable={false}
        />
        {isBlooming && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 64,
              animation: 'bloom 0.3s ease-out forwards',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.6))'
            }}
          >
            {flowerEmoji}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap'
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#3E4A2F',
              margin: 0
            }}
          >
            {plant.name}
          </h3>
          {plant.variety && (
            <span
              style={{
                fontSize: 11,
                background: 'linear-gradient(135deg, #76B852, #8DC26F)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 500
              }}
            >
              {plant.variety}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          fontSize: 13,
          color: '#666'
        }}
      >
        <span>养护次数</span>
        <span style={{ fontWeight: 600, color: '#556B2F' }}>{plant.careCount}</span>
      </div>

      <div
        style={{
          width: '100%',
          height: 8,
          background: '#E0E0E0',
          borderRadius: 4,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #76B852, #8DC26F)',
            borderRadius: 4,
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      {plant.careCount > 0 && plant.careCount % 10 === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 24,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}
        >
          {flowerEmoji}
        </div>
      )}
    </div>
  );
};

export default PlantCard;
