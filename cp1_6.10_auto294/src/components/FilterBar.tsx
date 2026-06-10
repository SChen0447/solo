import type { TeaCategory } from '../types/tea'
import { ALL_TEA_CATEGORIES, TEA_CATEGORY_CONFIG } from '../utils'

interface FilterBarProps {
  searchText: string
  onSearchChange: (text: string) => void
  selectedCategory: TeaCategory | 'all'
  onCategoryChange: (category: TeaCategory | 'all') => void
}

export default function FilterBar({
  searchText,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="search-wrapper">
        <input
          className="search-input"
          type="text"
          placeholder="搜索茶种名称..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchText && (
          <button
            className="search-clear"
            onClick={() => onSearchChange('')}
            title="清空搜索"
          >
            ✕
          </button>
        )}
      </div>
      <select
        className="category-select"
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value as TeaCategory | 'all')}
      >
        <option value="all">全部茶类</option>
        {ALL_TEA_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {TEA_CATEGORY_CONFIG[c].label}
          </option>
        ))}
      </select>
    </div>
  )
}
