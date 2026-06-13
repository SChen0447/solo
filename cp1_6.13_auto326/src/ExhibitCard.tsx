import type { Exhibit } from './App';

interface ExhibitCardProps {
  exhibit: Exhibit;
  isSelected: boolean;
  isOtherSelected: boolean;
  onSelect: (id: string) => void;
}

export default function ExhibitCard({
  exhibit,
  isSelected,
  isOtherSelected,
  onSelect,
}: ExhibitCardProps) {
  const rotationDuration = (2 * Math.PI) / exhibit.rotationSpeed;

  return (
    <div
      className={`exhibit-card ${isSelected ? 'selected' : ''} ${
        isOtherSelected ? 'dimmed' : ''
      }`}
      onClick={() => !isSelected && onSelect(exhibit.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isSelected) {
          onSelect(exhibit.id);
        }
      }}
      style={
        {
          '--exhibit-color': exhibit.color,
          '--rotation-duration': `${rotationDuration}s`,
          '--breath-duration': isSelected ? '1.5s' : '3s',
        } as React.CSSProperties
      }
    >
      <div className="pedestal-base"></div>

      <div className="halo-layer halo-outer"></div>
      <div className="halo-layer halo-middle"></div>
      <div className="halo-layer halo-inner"></div>

      <div
        className={`rotating-ring ${isOtherSelected ? 'paused' : ''}`}
      >
        <div className="rotating-dot dot-1"></div>
        <div className="rotating-dot dot-2"></div>
        <div className="rotating-dot dot-3"></div>
      </div>

      <div className="exhibit-core">
        <div className="core-inner"></div>
      </div>

      <div className="exhibit-name">{exhibit.name}</div>
    </div>
  );
}
