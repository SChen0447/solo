import React from 'react';
import { Tag } from '../types';
import './TagCloud.css';

interface Props {
  tags: Tag[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
}

export const TagCloud: React.FC<Props> = ({ tags, activeTag, onTagClick }) => {
  if (tags.length === 0) {
    return (
      <div className="tag-cloud-empty">
        <p>暂无标签</p>
      </div>
    );
  }

  const maxCount = Math.max(...tags.map((t) => t.count));

  const getTagSize = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return 18;
    if (ratio > 0.5) return 15;
    if (ratio > 0.2) return 13;
    return 12;
  };

  const getTagColor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return '#4a5568';
    if (ratio > 0.5) return '#718096';
    if (ratio > 0.2) return '#a0aec0';
    return '#cbd5e0';
  };

  return (
    <div className="tag-cloud">
      {activeTag && (
        <button
          className="tag-clear"
          onClick={() => onTagClick(null)}
        >
          清除筛选
        </button>
      )}
      <div className="tag-cloud-items">
        {tags.map((tag) => {
          const isActive = activeTag === tag.name;
          return (
            <button
              key={tag.name}
              className={`tag-item ${isActive ? 'active' : ''}`}
              style={{
                fontSize: isActive ? 15 : getTagSize(tag.count),
                color: isActive ? 'white' : getTagColor(tag.count)
              }}
              onClick={() => onTagClick(isActive ? null : tag.name)}
            >
              {tag.name}
              <span className="tag-count">{tag.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
