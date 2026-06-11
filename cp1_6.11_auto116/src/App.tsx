import React, { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';
import CollageCanvas from './components/CollageCanvas';
import StickerPanel from './components/StickerPanel';
import {
  Layer,
  StickerLayer,
  TextLayer,
  PhotoLayer,
  DrawingLayer,
  DrawingPath,
  Sticker,
  BrushType,
  FilterType,
  ContextMenuPosition,
  EditPanelState,
  StickerLayer as StickerLayerType,
  BRUSH_ICONS,
  BRUSH_NAMES,
  COLOR_PALETTE,
  FILTER_OPTIONS,
  MAX_LAYERS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'brush'>('select');
  const [activeBrush, setActiveBrush] = useState<BrushType>('ballpoint');
  const [activeColor, setActiveColor] = useState(COLOR_PALETTE[0]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('none');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    layerId: string | null;
    position: ContextMenuPosition;
  }>({ visible: false, layerId: null, position: { x: 0, y: 0 } });
  const [editPanel, setEditPanel] = useState<EditPanelState>({
    visible: false,
    layerId: null,
    position: { x: 0, y: 0 },
  });
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const canvasRef = useRef<HTMLDivElement>(null);

  const getMaxZIndex = useCallback(() => {
    if (layers.length === 0) return 0;
    return Math.max(...layers.map(l => l.zIndex));
  }, [layers]);

  const addStickerLayer = useCallback((sticker: Sticker) => {
    if (layers.length >= MAX_LAYERS) {
      alert(`最多支持${MAX_LAYERS}个图层，请删除部分图层后再添加`);
      return;
    }

    const newLayer: StickerLayerType = {
      id: uuidv4(),
      type: 'sticker',
      stickerId: sticker.id,
      emoji: sticker.emoji,
      color: sticker.defaultColor,
      x: Math.random() * (CANVAS_WIDTH - 80),
      y: Math.random() * (CANVAS_HEIGHT - 80),
      width: 80,
      height: 80,
      rotation: 0,
      zIndex: getMaxZIndex() + 1,
      filter: 'none',
    };

    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers, getMaxZIndex]);

  const addTextLayer = useCallback(() => {
    if (layers.length >= MAX_LAYERS) {
      alert(`最多支持${MAX_LAYERS}个图层，请删除部分图层后再添加`);
      return;
    }

    const newLayer: TextLayer = {
      id: uuidv4(),
      type: 'text',
      content: '双击编辑文字',
      fontSize: 24,
      fontFamily: 'Noto Serif SC',
      color: '#4a3728',
      x: Math.random() * (CANVAS_WIDTH - 150),
      y: Math.random() * (CANVAS_HEIGHT - 40),
      width: 150,
      height: 40,
      rotation: 0,
      zIndex: getMaxZIndex() + 1,
      filter: 'none',
    };

    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers, getMaxZIndex]);

  const addPhotoLayer = useCallback(() => {
    if (layers.length >= MAX_LAYERS) {
      alert(`最多支持${MAX_LAYERS}个图层，请删除部分图层后再添加`);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          let width = 200;
          let height = 200 / aspectRatio;
          
          if (height > 200) {
            height = 200;
            width = 200 * aspectRatio;
          }

          const newLayer: PhotoLayer = {
            id: uuidv4(),
            type: 'photo',
            imageUrl,
            brightness: 100,
            contrast: 100,
            x: Math.random() * (CANVAS_WIDTH - width),
            y: Math.random() * (CANVAS_HEIGHT - height),
            width,
            height,
            rotation: 0,
            zIndex: getMaxZIndex() + 1,
            filter: 'none',
          };

          setLayers(prev => [...prev, newLayer]);
          setSelectedLayerId(newLayer.id);
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [layers, getMaxZIndex]);

  const addDrawingPath = useCallback((path: DrawingPath) => {
    const drawingLayer = layers.find(l => l.type === 'drawing') as DrawingLayer | undefined;
    
    if (drawingLayer) {
      setLayers(prev => prev.map(layer => {
        if (layer.id === drawingLayer.id) {
          return {
            ...layer,
            paths: [...(layer as DrawingLayer).paths, path],
          };
        }
        return layer;
      }));
    } else {
      if (layers.length >= MAX_LAYERS) {
        alert(`最多支持${MAX_LAYERS}个图层，请删除部分图层后再添加`);
        return;
      }

      const newLayer: DrawingLayer = {
        id: uuidv4(),
        type: 'drawing',
        paths: [path],
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        rotation: 0,
        zIndex: getMaxZIndex() + 1,
        filter: 'none',
      };
      setLayers(prev => [...prev, newLayer]);
    }
  }, [layers, getMaxZIndex]);

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  }, []);

  const deleteLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  }, [selectedLayerId]);

  const moveLayerUp = useCallback((layerId: string) => {
    setLayers(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const index = sorted.findIndex(l => l.id === layerId);
      if (index === -1 || index >= sorted.length - 1) return prev;

      const newLayers = [...sorted];
      const tempZ = newLayers[index].zIndex;
      newLayers[index] = { ...newLayers[index], zIndex: newLayers[index + 1].zIndex };
      newLayers[index + 1] = { ...newLayers[index + 1], zIndex: tempZ };
      return newLayers;
    });
  }, []);

  const moveLayerDown = useCallback((layerId: string) => {
    setLayers(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const index = sorted.findIndex(l => l.id === layerId);
      if (index <= 0) return prev;

      const newLayers = [...sorted];
      const tempZ = newLayers[index].zIndex;
      newLayers[index] = { ...newLayers[index], zIndex: newLayers[index - 1].zIndex };
      newLayers[index - 1] = { ...newLayers[index - 1], zIndex: tempZ };
      return newLayers;
    });
  }, []);

  const bringToFront = useCallback((layerId: string) => {
    const maxZ = getMaxZIndex();
    updateLayer(layerId, { zIndex: maxZ + 1 });
  }, [getMaxZIndex, updateLayer]);

  const sendToBack = useCallback((layerId: string) => {
    setLayers(prev => {
      const minZ = Math.min(...prev.map(l => l.zIndex));
      return prev.map(layer => {
        if (layer.id === layerId) {
          return { ...layer, zIndex: minZ - 1 };
        }
        return { ...layer, zIndex: layer.zIndex + 1 };
      });
    });
  }, []);

  const applyFilter = useCallback((filter: FilterType) => {
    if (!selectedLayerId) return;
    updateLayer(selectedLayerId, { filter });
    setActiveFilter(filter);
  }, [selectedLayerId, updateLayer]);

  const handleContextMenu = useCallback((layerId: string, position: ContextMenuPosition) => {
    setContextMenu({ visible: true, layerId, position });
    setEditPanel({ visible: false, layerId: null, position: { x: 0, y: 0 } });
  }, []);

  const handleDoubleClick = useCallback((layerId: string, position: ContextMenuPosition) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    let formData: Record<string, any> = {};
    if (layer.type === 'sticker') {
      formData = { color: (layer as StickerLayer).color };
    } else if (layer.type === 'text') {
      formData = {
        content: (layer as TextLayer).content,
        fontSize: (layer as TextLayer).fontSize,
        color: (layer as TextLayer).color,
      };
    } else if (layer.type === 'photo') {
      formData = {
        brightness: (layer as PhotoLayer).brightness,
        contrast: (layer as PhotoLayer).contrast,
      };
    }

    setEditForm(formData);
    setEditPanel({ visible: true, layerId, position });
    setContextMenu({ visible: false, layerId: null, position: { x: 0, y: 0 } });
  }, [layers]);

  const handleSaveEdit = useCallback(() => {
    if (!editPanel.layerId) return;

    const layer = layers.find(l => l.id === editPanel.layerId);
    if (!layer) return;

    let updates: Partial<Layer> = {};
    if (layer.type === 'sticker') {
      updates = { color: editForm.color } as Partial<StickerLayer>;
    } else if (layer.type === 'text') {
      updates = {
        content: editForm.content,
        fontSize: Number(editForm.fontSize),
        color: editForm.color,
      } as Partial<TextLayer>;
    } else if (layer.type === 'photo') {
      updates = {
        brightness: Number(editForm.brightness),
        contrast: Number(editForm.contrast),
      } as Partial<PhotoLayer>;
    }

    updateLayer(editPanel.layerId, updates);
    setEditPanel({ visible: false, layerId: null, position: { x: 0, y: 0 } });
  }, [editPanel, editForm, layers, updateLayer]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsExporting(true);
    setSelectedLayerId(null);
    setContextMenu({ visible: false, layerId: null, position: { x: 0, y: 0 } });
    setEditPanel({ visible: false, layerId: null, position: { x: 0, y: 0 } });

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      const now = new Date();
      const timestamp =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
      const filename = `handbook_${timestamp}.png`;

      const dataUrl = canvas.toDataURL('image/png');
      setDownloadUrl(dataUrl);
      setDownloadFilename(filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleCloseDownload = useCallback(() => {
    setDownloadUrl(null);
    setDownloadFilename('');
  }, []);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, layerId: null, position: { x: 0, y: 0 } });
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (selectedLayerId) {
      const layer = layers.find(l => l.id === selectedLayerId);
      if (layer) {
        setActiveFilter(layer.filter);
      }
    }
  }, [selectedLayerId, layers]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const canMoveUp = selectedLayer && selectedLayer.zIndex < getMaxZIndex();
  const canMoveDown = selectedLayer && selectedLayer.zIndex > Math.min(...layers.map(l => l.zIndex));

  return (
    <div className="app">
      <div className="toolbar">
        <span className="toolbar-title">✂️ 虚拟手账本</span>
        
        <button
          className={`toolbar-btn ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => setActiveTool('select')}
          title="选择工具"
        >
          <span className="icon">🖱️</span>
          <span>选择</span>
        </button>
        <button
          className={`toolbar-btn ${activeTool === 'brush' ? 'active' : ''}`}
          onClick={() => setActiveTool('brush')}
          title="画笔工具"
        >
          <span className="icon">✏️</span>
          <span>画笔</span>
        </button>

        <div className="toolbar-divider" />

        {activeTool === 'brush' && (
          <>
            <div className="brush-selector">
              {(['ballpoint', 'marker', 'brush'] as BrushType[]).map(brush => (
                <button
                  key={brush}
                  className={`brush-btn ${activeBrush === brush ? 'active' : ''}`}
                  onClick={() => setActiveBrush(brush)}
                  title={BRUSH_NAMES[brush]}
                >
                  <span className="icon">{BRUSH_ICONS[brush]}</span>
                </button>
              ))}
            </div>
            <div className="color-palette">
              {COLOR_PALETTE.map((color, index) => (
                <div
                  key={index}
                  className={`color-swatch ${activeColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>
            <div className="toolbar-divider" />
          </>
        )}

        <button className="toolbar-btn" onClick={addTextLayer} title="添加文字">
          <span className="icon">📝</span>
          <span>文字</span>
        </button>
        <button className="toolbar-btn" onClick={addPhotoLayer} title="添加照片">
          <span className="icon">🖼️</span>
          <span>照片</span>
        </button>

        <div className="toolbar-divider" />

        <div className="filter-selector">
          {FILTER_OPTIONS.map(filter => (
            <button
              key={filter.value}
              className={`filter-btn ${
                selectedLayer && activeFilter === filter.value ? 'active' : ''
              } ${!selectedLayer ? 'disabled' : ''}`}
              onClick={() => selectedLayer && applyFilter(filter.value)}
              disabled={!selectedLayer}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <button
          className="toolbar-btn primary"
          onClick={handleExport}
          title="导出为图片"
        >
          <span className="icon">💾</span>
          <span>导出为图片</span>
        </button>
      </div>

      <div className="main-content">
        <StickerPanel onAddSticker={addStickerLayer} />
        
        <div className="canvas-container">
          <CollageCanvas
            layers={layers}
            selectedLayerId={selectedLayerId}
            activeTool={activeTool}
            activeBrush={activeBrush}
            activeColor={activeColor}
            canvasRef={canvasRef}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={updateLayer}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onAddDrawingPath={addDrawingPath}
          />
        </div>
      </div>

      {contextMenu.visible && contextMenu.layerId && (
        <div
          className="context-menu"
          style={{ left: contextMenu.position.x, top: contextMenu.position.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => moveLayerUp(contextMenu.layerId!)}>
            ↑ 上移一层
          </div>
          <div className="context-menu-item" onClick={() => moveLayerDown(contextMenu.layerId!)}>
            ↓ 下移一层
          </div>
          <div className="context-menu-item" onClick={() => bringToFront(contextMenu.layerId!)}>
            ⬆️ 置顶
          </div>
          <div className="context-menu-item" onClick={() => sendToBack(contextMenu.layerId!)}>
            ⬇️ 置底
          </div>
          <div className="context-menu-item" onClick={() => deleteLayer(contextMenu.layerId!)}>
            🗑️ 删除
          </div>
        </div>
      )}

      {editPanel.visible && editPanel.layerId && (
        <div
          className="edit-panel"
          style={{ left: editPanel.position.x, top: editPanel.position.y }}
          onClick={e => e.stopPropagation()}
        >
          <h3 className="edit-panel-title">编辑图层</h3>
          
          {selectedLayer?.type === 'sticker' && (
            <div className="edit-field">
              <label>颜色</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {COLOR_PALETTE.map((color, index) => (
                  <div
                    key={index}
                    className={`color-swatch ${editForm.color === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditForm({ ...editForm, color })}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedLayer?.type === 'text' && (
            <>
              <div className="edit-field">
                <label>文字内容</label>
                <textarea
                  value={editForm.content || ''}
                  onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="edit-field">
                <label>字体大小: {editForm.fontSize}px</label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={editForm.fontSize || 24}
                  onChange={e => setEditForm({ ...editForm, fontSize: e.target.value })}
                />
              </div>
              <div className="edit-field">
                <label>颜色</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {COLOR_PALETTE.map((color, index) => (
                    <div
                      key={index}
                      className={`color-swatch ${editForm.color === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditForm({ ...editForm, color })}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {selectedLayer?.type === 'photo' && (
            <>
              <div className="edit-field">
                <label>亮度: {editForm.brightness}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={editForm.brightness || 100}
                  onChange={e => setEditForm({ ...editForm, brightness: e.target.value })}
                />
              </div>
              <div className="edit-field">
                <label>对比度: {editForm.contrast}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={editForm.contrast || 100}
                  onChange={e => setEditForm({ ...editForm, contrast: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="edit-actions">
            <button
              className="btn-cancel"
              onClick={() => setEditPanel({ visible: false, layerId: null, position: { x: 0, y: 0 } })}
            >
              取消
            </button>
            <button className="btn-save" onClick={handleSaveEdit}>
              保存
            </button>
          </div>
        </div>
      )}

      {isExporting && (
        <div className="export-overlay">
          <div className="spinner" />
          <div className="export-text">正在导出...</div>
        </div>
      )}

      {downloadUrl && (
        <div className="download-modal" onClick={handleCloseDownload}>
          <div className="download-content" onClick={e => e.stopPropagation()}>
            <h3>导出成功！</h3>
            <p>{downloadFilename}</p>
            <img src={downloadUrl} alt="预览" className="download-preview" />
            <div className="download-buttons">
              <button className="download-btn secondary" onClick={handleCloseDownload}>
                关闭
              </button>
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="download-btn"
                onClick={handleCloseDownload}
              >
                下载图片
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
