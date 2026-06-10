import { useCountUp } from '../hooks/useCountUp';

interface Props {
  label: string;
  value: number;
  unit: string;
  variant: 1 | 2 | 3;
}

export default function StatCard({ label, value, unit, variant }: Props) {
  const count = useCountUp(value, 1500);

  return (
    <div className={`stat-card stat-card-${variant}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {count}
        <span className="stat-unit">{unit}</span>
      </div>
    </div>
  );
}
