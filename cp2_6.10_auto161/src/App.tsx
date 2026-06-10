import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import IconEditor from './components/IconEditor';
import IconCanvas from './components/IconCanvas';
import { IconItem, SVGElementData } from './types';
import { exportIconsAsSvg, exportIconsAsPngZip } from './utils/svgExport';

const App: React.FC = () => {
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [globalWidth, setGlobalWidth] = useState(24);
  const [globalHeight, setGlobalHeight] = useState(24);
  const [globalColor, setGlobalColor] = useState('#7c3aed');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draggedIconId, setDraggedIconId] = useState<string | null>(null);
  const [dragOverIconId, setDragOverIconId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iconId: string } | null>(null);
  const exportInProgressRef = useRef(false);

  const selectedIcon = icons.find((i) => i.id === selectedIconId) || null;

  const addNewIcon = useCallback(() => {
    const newIcon: IconItem = {
      id: uuidv4(),
      name: `图标 ${icons.length + 1}`,
      width: 24,
      height: 24,
      elements: [],
    };
    setIcons((prev) => [...prev, newIcon]);
    setSelectedIconId(newIcon.id);
    setSelectedElementId(null);
  }, [icons.length]);

  const deleteIcon = useCallback((iconId: string) => {
    setIcons((prev) => {
      const newIcons = prev.filter((i) => i.id !== iconId);
      if (selectedIconId === iconId) {
        setSelectedIconId(newIcons.length > 0 ? newIcons[0].id : null);
        setSelectedElementId(null);
      }
      return newIcons;
    });
    setContextMenu(null);
  }, [selectedIconId]);

  const handleElementsChange = useCallback(
    (elements: SVGElementData[]) => {
      if (!selectedIconId) return;
      setIcons((prev) =>
        prev.map((icon) => (icon.id === selectedIconId ? { ...icon, elements } : icon))
      );
    },
    [selectedIconId]
  );

  const applyToAll = useCallback(() => {
    setIcons((prev) =>
      prev.map((icon) => ({
        ...icon,
        width: globalWidth,
        height: globalHeight,
        elements: icon.elements.map((el) => ({ ...el, fill: globalColor })),
      }))
    );
  }, [globalWidth, globalHeight, globalColor]);

  const handleExportSvg = useCallback(() => {
    if (icons.length === 0 || exportInProgressRef.current) return;
    exportInProgressRef.current = true;
    setIsExporting(true);
    setExportProgress({ current: 0, total: 1 });
    
    setTimeout(() => {
      try {
        exportIconsAsSvg(icons);
      } catch (e) {
        console.error('导出SVG失败:', e);
      }
      setIsExporting(false);
      exportInProgressRef.current = false;
    }, 500);
  }, [icons]);

  const handleExportPng = useCallback(async () => {
    if (icons.length === 0 || exportInProgressRef.current) return;
    exportInProgressRef.current = true;
    setIsExporting(true);
    setExportProgress({ current: 0, total: icons.length });
    
    try {
      await exportIconsAsPngZip(icons, (current, total) => {
        setExportProgress({ current, total });
      });
    } catch (e) {
      console.error('导出PNG失败:', e);
    }
    setIsExporting(false);
    exportInProgressRef.current = false;
  }, [icons]);

  const handleDragStart = (e: React.DragEvent, iconId: string) => {
    setDraggedIconId(iconId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, iconId: string) => {
    e.preventDefault();
    if (draggedIconId && draggedIconId !== iconId) {
      setDragOverIconId(iconId);
    }
  };

  const handleDragLeave = () => {
    setDragOverIconId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedIconId || draggedIconId === targetId) {
      setDraggedIconId(null);
      setDragOverIconId(null);
      return;
    }

    setIcons((prev) => {
      const newIcons = [...prev];
      const dragIndex = newIcons.findIndex((i) => i.id === draggedIconId);
      const dropIndex = newIcons.findIndex((i) => i.id === targetId);
      if (dragIndex === -1 || dropIndex === -1) return prev;
      const [moved] = newIcons.splice(dragIndex, 1);
      newIcons.splice(dropIndex, 0, moved);
      return newIcons;
    });

    setDraggedIconId(null);
    setDragOverIconId(null);
  };

  const handleDragEnd = () => {
    setDraggedIconId(null);
    setDragOverIconId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, iconId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, iconId });
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  useEffect(() => {
    if (icons.length === 0) {
      addNewIcon();
    }
  }, []);

  return (
    <div className="app-container">
      <button
        className="hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 200,
        }}
      >
        ☰
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="add-btn" onClick={addNewIcon}>
            + 添加新图标
          </button>
        </div>
        <div className="icon-list">
          {icons.map((icon) => (
            <div
              key={icon.id}
              className={`icon-thumb ${icon.id === selectedIconId ? 'selected' : ''} ${
                draggedIconId === icon.id ? 'dragging' : ''
              } ${dragOverIconId === icon.id ? 'drag-over' : ''}`}
              onClick={() => {
                setSelectedIconId(icon.id);
                setSelectedElementId(null);
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, icon.id)}
              onDragOver={(e) => handleDragOver(e, icon.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, icon.id)}
              onDragEnd={handleDragEnd}
              onContextMenu={(e) => handleContextMenu(e, icon.id)}
              title={`${icon.name} (右键删除)`}
            >
              <div style={{ width: 50, height: 50, overflow: 'hidden' }}>
                <IconCanvas
                  elements={icon.elements}
                  selectedElementId={null}
                  onElementSelect={() => {}}
                  onElementUpdate={() => {}}
                  width={400}
                  height={400}
                  scale={0.125}
                  showGrid={false}
                />
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <div className="top-toolbar">
          <span className="toolbar-label">全局尺寸:</span>
          <input
            type="number"
            className="toolbar-input"
            value={globalWidth}
            onChange={(e) => setGlobalWidth(Math.max(1, Number(e.target.value)))}
            min={1}
          />
          <span style={{ color: '#a0a0c0' }}>x</span>
          <input
            type="number"
            className="toolbar-input"
            value={globalHeight}
            onChange={(e) => setGlobalHeight(Math.max(1, Number(e.target.value)))}
            min={1}
          />
          <span style={{ color: '#a0a0c0' }}>px</span>

          <span className="toolbar-label" style={{ marginLeft: 16 }}>
            全局颜色:
          </span>
          <input
            type="color"
            className="color-input"
            value={globalColor}
            onChange={(e) => setGlobalColor(e.target.value)}
          />

          <button className="apply-btn" onClick={applyToAll}>
            应用到所有
          </button>

          <span
            style={{ marginLeft: 'auto', fontSize: 13, color: '#a0a0c0' }}
          >
            共 {icons.length} 个图标
          </span>
        </div>

        <div className="editor-area">
          <div className="canvas-wrapper">
            {selectedIcon ? (
              <IconEditor
                elements={selectedIcon.elements}
                onElementsChange={handleElementsChange}
                selectedElementId={selectedElementId}
                onSelectedElementChange={setSelectedElementId}
              />
            ) : (
              <div style={{ color: '#6a6a8a', textAlign: 'center' }}>
                请创建或选择一个图标进行编辑
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="export-area">
        <button
          className="export-btn svg"
          onClick={handleExportSvg}
          disabled={isExporting || icons.length === 0}
        >
          导出为 SVG
        </button>
        <button
          className="export-btn png"
          onClick={handleExportPng}
          disabled={isExporting || icons.length === 0}
        >
          导出为 PNG
        </button>
      </div>

      {isExporting && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="spinner" />
            <div className="loading-text">
              {exportProgress.total > 1
                ? `正在导出 ${exportProgress.current} / ${exportProgress.total}`
                : '正在导出...'}
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            onClick={() => deleteIcon(contextMenu.iconId)}
            style={{ color: '#ef4444' }}
          >
            删除图标
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
