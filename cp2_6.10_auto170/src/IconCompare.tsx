import React, { memo, useMemo } from 'react';
import { IconData, ViewSettings } from './types';
import { applyColorToSvg } from './svgUtils';

interface IconCompareProps {
  icons: IconData[];
  viewSettings: ViewSettings;
  onToggleMark: (id: string) => void;
}

const IconCompare: React.FC<IconCompareProps> = memo(({ icons, viewSettings, onToggleMark }) => {
  const gridContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '16px',
    justifyContent: 'center'
  };

  const renderIcon = (icon: IconData) => {
    const coloredSvg = useMemo(
      () => applyColorToSvg(icon.svgContent, viewSettings.iconColor),
      [icon.svgContent, viewSettings.iconColor]
    );

    const cellSize = 64;
    const iconSize = viewSettings.iconSize;

    const cellStyle: React.CSSProperties = {
      width: `${cellSize}px`,
      height: `${cellSize}px`,
      backgroundColor: viewSettings.backgroundColor,
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      border: icon.isMarked ? '2px solid #e53935' : '2px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
      animation: icon.isDetectFlashing ? 'detectFlash 1.5s ease-out' : 'none'
    };

    const checkboxStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: '4px',
      right: '4px',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      border: '2px solid #8888aa',
      backgroundColor: icon.isMarked ? '#e53935' : 'transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2
    };

    const svgWrapperStyle: React.CSSProperties = {
      width: `${iconSize}px`,
      height: `${iconSize}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    };

    return (
      <div
        key={icon.id}
        style={cellStyle}
        className="icon-cell"
        onMouseEnter={(e) => {
          const target = e.currentTarget as HTMLDivElement;
          target.style.transform = 'scale(1.05)';
          target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget as HTMLDivElement;
          target.style.transform = 'scale(1)';
          target.style.boxShadow = 'none';
        }}
      >
        <div style={svgWrapperStyle} dangerouslySetInnerHTML={{ __html: coloredSvg }} />
        <div
          style={checkboxStyle}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMark(icon.id);
          }}
          title={icon.isMarked ? '取消标记' : '标记为风格异常'}
        >
          {icon.isMarked && <span style={{ color: 'white', fontSize: '10px', lineHeight: 1 }}>✓</span>}
        </div>
      </div>
    );
  };

  if (icons.length === 0) {
    return null;
  }

  return <div style={gridContainerStyle}>{icons.map(renderIcon)}</div>;
});

IconCompare.displayName = 'IconCompare';

export default IconCompare;
