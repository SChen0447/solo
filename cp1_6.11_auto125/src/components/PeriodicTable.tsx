import React, { useState, useCallback, useRef } from 'react';
import { elements, getCategoryColor, type Element } from '../data/elements';
import './PeriodicTable.css';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface PeriodicTableProps {
  onSelectElement: (element: Element) => void;
  viewMode: 'table' | 'list';
}

const PeriodicTable: React.FC<PeriodicTableProps> = ({ onSelectElement, viewMode }) => {
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  const getElementPosition = useCallback((element: Element) => {
    const { period, group, atomicNumber, category } = element;
    
    if (category === '镧系元素') {
      return { row: 9, col: atomicNumber - 57 + 3 };
    }
    if (category === '锕系元素') {
      return { row: 10, col: atomicNumber - 89 + 3 };
    }
    
    return { row: period, col: group };
  }, []);

  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>, element: Element) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const rippleId = ++rippleIdRef.current;
    setRipples((prev) => [...prev, { id: rippleId, x, y }]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 500);
    
    onSelectElement(element);
  }, [onSelectElement]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, element: Element) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectElement(element);
    }
  }, [onSelectElement]);

  const renderElementCard = useCallback((element: Element) => {
    const color = getCategoryColor(element.category);
    const isHovered = hoveredElement?.atomicNumber === element.atomicNumber;
    const cardRipples = ripples.filter(() => true);
    
    return (
      <div
        key={element.atomicNumber}
        className="element-card"
        style={{ borderColor: color }}
        onMouseEnter={() => setHoveredElement(element)}
        onMouseLeave={() => setHoveredElement(null)}
        onClick={(e) => handleCardClick(e, element)}
        onKeyDown={(e) => handleKeyDown(e, element)}
        tabIndex={0}
        role="button"
        aria-label={`${element.name} (${element.symbol})，原子序数${element.atomicNumber}`}
      >
        <span className="element-atomic-number">{element.atomicNumber}</span>
        <span className="element-symbol" style={{ color }}>{element.symbol}</span>
        <span className="element-mass">{element.atomicMass.toFixed(2)}</span>
        
        {isHovered && (
          <div className="element-tooltip">
            <div className="tooltip-name">{element.name}</div>
            <div className="tooltip-category" style={{ color }}>{element.category}</div>
          </div>
        )}
        
        {cardRipples.slice(-1).map((ripple) => (
          <span
            key={ripple.id}
            className="ripple"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}
      </div>
    );
  }, [hoveredElement, ripples, handleCardClick, handleKeyDown]);

  if (viewMode === 'list') {
    return (
      <div className="periodic-list-view">
        <div className="list-header">
          <span className="list-col list-col-num">序号</span>
          <span className="list-col list-col-symbol">符号</span>
          <span className="list-col list-col-name">名称</span>
          <span className="list-col list-col-category">类别</span>
          <span className="list-col list-col-mass">相对原子质量</span>
        </div>
        <div className="list-body">
          {elements.map((element) => {
            const color = getCategoryColor(element.category);
            return (
              <div
                key={element.atomicNumber}
                className="list-item"
                onClick={() => onSelectElement(element)}
                onKeyDown={(e) => handleKeyDown(e, element)}
                tabIndex={0}
                role="button"
              >
                <span className="list-col list-col-num">{element.atomicNumber}</span>
                <span className="list-col list-col-symbol" style={{ color }}>{element.symbol}</span>
                <span className="list-col list-col-name">{element.name}</span>
                <span className="list-col list-col-category">
                  <span className="category-color-dot" style={{ backgroundColor: color }} />
                  {element.category}
                </span>
                <span className="list-col list-col-mass">{element.atomicMass.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const gridElements: (Element | null)[][] = [];
  for (let row = 0; row < 10; row++) {
    gridElements[row] = [];
    for (let col = 0; col < 18; col++) {
      gridElements[row][col] = null;
    }
  }

  elements.forEach((element) => {
    const { row, col } = getElementPosition(element);
    if (row <= 10 && col <= 18) {
      gridElements[row - 1][col - 1] = element;
    }
  });

  return (
    <div className="periodic-table-view">
      <div className="periodic-table">
        {gridElements.map((row, rowIndex) => (
          <div key={rowIndex} className="table-row">
            {row.map((element, colIndex) => (
              <div key={colIndex} className="table-cell">
                {element ? renderElementCard(element) : (
                  (rowIndex === 5 || rowIndex === 6) && colIndex === 2 ? (
                    <div className="lanthanide-placeholder">
                      {rowIndex === 5 ? '57-71' : '89-103'}
                    </div>
                  ) : null
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="category-legend">
        {Object.entries({
          '碱金属': getCategoryColor('碱金属'),
          '碱土金属': getCategoryColor('碱土金属'),
          '过渡金属': getCategoryColor('过渡金属'),
          '后过渡金属': getCategoryColor('后过渡金属'),
          '准金属': getCategoryColor('准金属'),
          '非金属': getCategoryColor('非金属'),
          '卤素': getCategoryColor('卤素'),
          '稀有气体': getCategoryColor('稀有气体'),
        }).map(([category, color]) => (
          <div key={category} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: color }} />
            <span className="legend-text">{category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeriodicTable;
