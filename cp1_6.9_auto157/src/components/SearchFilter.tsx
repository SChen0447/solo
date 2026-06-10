import type { Filters, TextureType } from '../types';
import { TEXTURE_LABELS } from '../types';
import { COLOR_FAMILY_LABELS } from '../utils/colorUtils';

interface SearchFilterProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const TEXTURE_OPTIONS: (TextureType | 'all')[] = ['all', 'matte', 'velvet', 'pearl', 'metallic'];
const GLOSSINESS_OPTIONS: Filters['glossinessRange'][] = ['all', 'low', 'medium', 'high'];
const COLOR_OPTIONS: Filters['colorFamily'][] = ['all', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'brown', 'gray'];

const GLOSSINESS_LABELS: Record<string, string> = {
  all: '全部',
  low: '低 (0-33)',
  medium: '中 (34-66)',
  high: '高 (67-100)',
};

export default function SearchFilter({ filters, onFiltersChange }: SearchFilterProps) {
  return (
    <div className="filter-section">
      <div className="form-group">
        <input
          type="text"
          className="search-bar"
          placeholder="搜索墨水名称、备注..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div>
        <span className="filter-label">纹理类型</span>
        <div className="filter-group">
          {TEXTURE_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`filter-btn ${filters.textureType === opt ? 'active' : ''}`}
              onClick={() => onFiltersChange({ ...filters, textureType: opt })}
            >
              {opt === 'all' ? '全部' : TEXTURE_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="filter-label">光泽度</span>
        <div className="filter-group">
          {GLOSSINESS_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`filter-btn ${filters.glossinessRange === opt ? 'active' : ''}`}
              onClick={() => onFiltersChange({ ...filters, glossinessRange: opt })}
            >
              {GLOSSINESS_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="filter-label">颜色色系</span>
        <div className="filter-group">
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`filter-btn ${filters.colorFamily === opt ? 'active' : ''}`}
              onClick={() => onFiltersChange({ ...filters, colorFamily: opt })}
            >
              {COLOR_FAMILY_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
