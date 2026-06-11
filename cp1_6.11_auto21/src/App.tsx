import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Layer, DEFAULT_TEXT_LAYER } from './types';
import { useHistory } from './hooks/useHistory';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  const { layers, setLayers, undo, redo, canUndo, canRedo } = useHistory([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const updateSourceRef = useRef<string>('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleAddImageLayers = useCallback(
    (files: FileList) => {
      const newLayers: Layer[] = [];
      const maxZ = layers.length > 0 ? Math.max(...layers.map((l) => l.zIndex)) + 1 : 0;

      Array.from(files).forEach((file, idx) => {
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        const layer: Layer = {
          id: uuidv4(),
          type: 'image',
          x: 100 + idx * 30,
          y: 100 + idx * 30,
          width: 200,
          height: 150,
          rotation: 0,
          zIndex: maxZ + idx,
          imageUrl: url,
          imageElement: img,
        };
        img.onload = () => {
          const aspect = img.naturalWidth / img.naturalHeight;
          const w = Math.min(img.naturalWidth, 300);
          const h = w / aspect;
          setLayers(
            layers
              .map((l) => (l.id === layer.id ? { ...l, width: w, height: h } : l))
              .concat(layer.id === layers.find((ll) => ll.id === layer.id)?.id ? [] : [])
          );
        };
        newLayers.push(layer);
      });

      if (newLayers.length > 0) {
        setLayers([...layers, ...newLayers]);
        if (newLayers.length > 0) {
          setSelectedLayerId(newLayers[newLayers.length - 1].id);
        }
      }
    },
    [layers, setLayers]
  );

  const handleAddText = useCallback(() => {
    const maxZ = layers.length > 0 ? Math.max(...layers.map((l) => l.zIndex)) + 1 : 0;
    const canvasEl = document.querySelector('.canvas-bg');
    const cx = canvasEl ? canvasEl.clientWidth / 2 - 100 : 200;
    const cy = canvasEl ? canvasEl.clientHeight / 2 - 30 : 200;

    const newLayer: Layer = {
      id: uuidv4(),
      type: 'text',
      x: cx,
      y: cy,
      width: 200,
      height: 60,
      rotation: 0,
      zIndex: maxZ,
      text: DEFAULT_TEXT_LAYER.text!,
      fontFamily: DEFAULT_TEXT_LAYER.fontFamily!,
      fontSize: DEFAULT_TEXT_LAYER.fontSize!,
      fontColor: DEFAULT_TEXT_LAYER.fontColor!,
    };

    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers, setLayers]);

  const handleUpdateLayer = useCallback(
    (id: string, updates: Partial<Layer>) => {
      const isSignificant =
        'x' in updates || 'y' in updates || 'width' in updates || 'height' in updates || 'rotation' in updates;

      if (isSignificant && updateSourceRef.current !== 'undo') {
        updateSourceRef.current = 'interaction';
      }

      const newLayers = layers.map((l) => (l.id === id ? { ...l, ...updates } : l));
      setLayers(newLayers);
    },
    [layers, setLayers]
  );

  const handleDeleteLayer = useCallback(
    (id: string) => {
      const newLayers = layers.filter((l) => l.id !== id);
      setLayers(newLayers);
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
      }
    },
    [layers, setLayers, selectedLayerId]
  );

  const handleMoveLayerUp = useCallback(
    (id: string) => {
      const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === id);
      if (idx < sorted.length - 1) {
        const newLayers = layers.map((l) => {
          if (l.id === id) return { ...l, zIndex: sorted[idx + 1].zIndex };
          if (l.id === sorted[idx + 1].id) return { ...l, zIndex: sorted[idx].zIndex };
          return l;
        });
        setLayers(newLayers);
      }
    },
    [layers, setLayers]
  );

  const handleMoveLayerDown = useCallback(
    (id: string) => {
      const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === id);
      if (idx > 0) {
        const newLayers = layers.map((l) => {
          if (l.id === id) return { ...l, zIndex: sorted[idx - 1].zIndex };
          if (l.id === sorted[idx - 1].id) return { ...l, zIndex: sorted[idx].zIndex };
          return l;
        });
        setLayers(newLayers);
      }
    },
    [layers, setLayers]
  );

  const handleEditText = useCallback(
    (id: string) => {
      const newLayers = layers.map((l) => (l.id === id ? { ...l, isEditing: true } : l));
      setLayers(newLayers);
    },
    [layers, setLayers]
  );

  const handleUndo = useCallback(() => {
    updateSourceRef.current = 'undo';
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleExport = useCallback(async () => {
    if (exporting || layers.length === 0) return;
    setExporting(true);
    setExportProgress(0);

    const canvasEl = document.querySelector('.canvas-bg');
    if (!canvasEl) return;

    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    const scale = 2;

    const offscreen = document.createElement('canvas');
    offscreen.width = w * scale;
    offscreen.height = h * scale;
    const ctx = offscreen.getContext('2d')!;
    ctx.scale(scale, scale);

    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (let i = 0; i < sorted.length; i++) {
      const layer = sorted[i];
      ctx.save();
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      if (layer.type === 'image' && layer.imageElement) {
        try {
          ctx.drawImage(layer.imageElement, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        } catch {
          // skip failed images
        }
      } else if (layer.type === 'text') {
        ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.fontColor || '#333333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = (layer.text || '').split('\n');
        const lineHeight = (layer.fontSize || 24) * 1.3;
        const totalHeight = lines.length * lineHeight;
        lines.forEach((line, li) => {
          ctx.fillText(line, 0, -totalHeight / 2 + lineHeight / 2 + li * lineHeight);
        });
      }
      ctx.restore();

      setExportProgress(Math.round(((i + 1) / sorted.length) * 100));
      await new Promise((r) => setTimeout(r, 50));
    }

    offscreen.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `collage-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setExporting(false);
      setExportProgress(0);
      showToast('导出成功！');
    });
  }, [layers, exporting, showToast]);

  return (
    <div className="app">
      <Canvas
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
        onUpdateLayer={handleUpdateLayer}
        onAddImageLayers={handleAddImageLayers}
        onEditText={handleEditText}
        onExport={handleExport}
        exporting={exporting}
        exportProgress={exportProgress}
      />
      <Toolbar
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
        onAddText={handleAddText}
        onDeleteLayer={handleDeleteLayer}
        onMoveLayerUp={handleMoveLayerUp}
        onMoveLayerDown={handleMoveLayerDown}
        onUpdateLayer={handleUpdateLayer}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={handleExport}
        exporting={exporting}
      />
      {toast && <div className="toast-bubble">{toast}</div>}
    </div>
  );
}

export default App;
