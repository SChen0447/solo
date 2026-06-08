export default function SkeletonCard() {
  return (
    <div
      className="skeleton-card"
      style={{
        width: '280px',
        borderRadius: '16px',
        backgroundColor: '#16213e',
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="skeleton-shimmer"
        style={{
          height: '80px',
          background: 'linear-gradient(90deg, #1a1a2e 25%, #2a2a4e 50%, #1a1a2e 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <div style={{ padding: '16px' }}>
        <div
          className="skeleton-shimmer"
          style={{
            height: '16px',
            width: '70%',
            borderRadius: '4px',
            marginBottom: '12px',
            background: 'linear-gradient(90deg, #1a1a2e 25%, #2a2a4e 50%, #1a1a2e 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <div
          className="skeleton-shimmer"
          style={{
            height: '12px',
            width: '50%',
            borderRadius: '4px',
            marginBottom: '12px',
            background: 'linear-gradient(90deg, #1a1a2e 25%, #2a2a4e 50%, #1a1a2e 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <div
          className="skeleton-shimmer"
          style={{
            height: '12px',
            width: '90%',
            borderRadius: '4px',
            marginBottom: '6px',
            background: 'linear-gradient(90deg, #1a1a2e 25%, #2a2a4e 50%, #1a1a2e 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <div
          className="skeleton-shimmer"
          style={{
            height: '12px',
            width: '70%',
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #1a1a2e 25%, #2a2a4e 50%, #1a1a2e 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>
    </div>
  );
}
