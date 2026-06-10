import type { Difficulty } from '../types';

type TimeFilter = 'all' | '7days' | '30days';

interface Props {
  searchText: string;
  onSearchChange: (v: string) => void;
  difficultyFilter: Difficulty | 'all';
  onDifficultyChange: (v: Difficulty | 'all') => void;
  timeFilter: TimeFilter;
  onTimeChange: (v: TimeFilter) => void;
}

export default function SearchFilter({
  searchText,
  onSearchChange,
  difficultyFilter,
  onDifficultyChange,
  timeFilter,
  onTimeChange,
}: Props) {
  return (
    <div className="search-filter">
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索配方名称..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-options">
        <select
          value={difficultyFilter}
          onChange={(e) => onDifficultyChange(e.target.value as Difficulty | 'all')}
        >
          <option value="all">全部难度</option>
          <option value="简单">简单</option>
          <option value="中等">中等</option>
          <option value="困难">困难</option>
        </select>

        <select
          value={timeFilter}
          onChange={(e) => onTimeChange(e.target.value as TimeFilter)}
        >
          <option value="all">全部时间</option>
          <option value="7days">最近 7 天</option>
          <option value="30days">最近 30 天</option>
        </select>
      </div>
    </div>
  );
}
