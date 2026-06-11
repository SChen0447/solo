import { useBoardStore } from '../store/useBoardStore';
import { getDarkerColor, getTransparentColor } from '../utils/colors';
import './TagFilter.css';

export default function TagFilter() {
  const { getAllTags, activeTags, toggleTag, clearTags } = useBoardStore();
  const allTags = getAllTags();

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="tag-filter">
      <span className="tag-filter-label">标签：</span>
      <div className="tag-filter-tags">
        {allTags.map((tag) => {
          const isActive = activeTags.includes(tag);
          const tagColor = isActive ? '#3B82F6' : '#9CA3AF';
          
          return (
            <button
              key={tag}
              className={`tag-filter-item ${isActive ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
              style={{
                backgroundColor: isActive ? getTransparentColor('#3B82F6', 0.15) : 'transparent',
                color: tagColor,
              }}
            >
              {tag}
            </button>
          );
        })}
        {activeTags.length > 0 && (
          <button
            className="tag-filter-clear"
            onClick={clearTags}
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
