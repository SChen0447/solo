import React from 'react';

interface NavigationProps {
  chaptersCount: number;
  activeIndex: number;
  onNavigate: (index: number) => void;
}

const Navigation: React.FC<NavigationProps> = ({ chaptersCount, activeIndex, onNavigate }) => {
  return (
    <nav className="nav-dots" aria-label="章节导航">
      {Array.from({ length: chaptersCount }).map((_, index) => (
        <button
          key={index}
          className={`nav-dot ${index === activeIndex ? 'nav-dot--active' : ''}`}
          onClick={() => onNavigate(index)}
          aria-label={`跳转到第 ${index + 1} 章`}
          aria-current={index === activeIndex ? 'true' : 'false'}
        />
      ))}
    </nav>
  );
};

export default Navigation;
