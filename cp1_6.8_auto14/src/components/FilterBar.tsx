import { statusConfig } from '../utils';
import type { FilterType } from '../types';

interface FilterBarProps {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
}

export default function FilterBar({ filter, setFilter }: FilterBarProps) {
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'applied', label: '已投递' },
    { key: 'interviewing', label: '面试中' },
    { key: 'rejected', label: '已拒绝' },
    { key: 'offer', label: '已offer' },
  ];

  return (
    <div className="filter-bar">
      {filters.map(f => {
        const isActive = filter === f.key;
        const statusStyle = f.key !== 'all' ? statusConfig[f.key] : null;
        return (
          <button
            key={f.key}
            className={`filter-btn ${isActive ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            style={
              isActive && statusStyle
                ? { backgroundColor: statusStyle.color, color: '#fff' }
                : undefined
            }
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
