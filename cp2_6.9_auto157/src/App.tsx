import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadImage, savePalette, getPalettes, Palette } from './ApiService';

type ColorMode = 'original' | 'complementary' | 'analogous' | 'triadic';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    '#' +
    [0, 8, 4]
      .map((n) => {
        const val = Math.round(255 * f(n));
        return val.toString(16).padStart(2, '0');
      })
      .join('')
      .toUpperCase()
  );
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function generateModeColors(colors: string[], mode: ColorMode): string[] {
  if (mode === 'original' || colors.length === 0) return colors;

  const [baseH, baseS, baseL] = hexToHsl(colors[0]);
  const result: string[] = [];

  switch (mode) {
    case 'complementary': {
      const offsets = [0, 15, -15, 180, 195];
      offsets.forEach((offset) => {
        result.push(hslToHex((baseH + offset + 360) % 360, baseS, baseL));
      });
      break;
    }
    case 'analogous': {
      const offsets = [-60, -30, 0, 30, 60];
      offsets.forEach((offset) => {
        result.push(hslToHex((baseH + offset + 360) % 360, baseS, baseL));
      });
      break;
    }
    case 'triadic': {
      const offsets = [0, 120, 240, 60, 180];
      offsets.forEach((offset) => {
        result.push(hslToHex((baseH + offset + 360) % 360, baseS, baseL));
      });
      break;
    }
  }
  return result;
}

export default function App() {
  const [colors, setColors] = useState<string[]>([]);
  const [originalColors, setOriginalColors] = useState<string[]>([]);
  const [colorMode, setColorMode] = useState<ColorMode>('original');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [paletteName, setPaletteName] = useState('');
  const [savedPalettes, setSavedPalettes] = useState<Palette[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPalettes();
  }, []);

  useEffect(() => {
    if (originalColors.length > 0) {
      setColors(generateModeColors(originalColors, colorMode));
    }
  }, [colorMode, originalColors]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 500);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const loadPalettes = async () => {
    try {
      const palettes = await getPalettes();
      setSavedPalettes(palettes);
    } catch (e) {
      // silent fail
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('请上传 JPEG 或 PNG 格式的图片');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setIsLoading(true);
    setError(null);
    setColorMode('original');

    try {
      const extractedColors = await uploadImage(file);
      setOriginalColors(extractedColors);
      setColors(extractedColors);
    } catch (e) {
      setError(e instanceof Error ? e.message : '色值提取失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(colors[index]);
  };

  const confirmEdit = () => {
    if (editingIndex === null) return;
    const normalized = editValue.startsWith('#') ? editValue.toUpperCase() : `#${editValue.toUpperCase()}`;
    if (isValidHex(normalized)) {
      const newColors = [...colors];
      newColors[editingIndex] = normalized;
      setColors(newColors);
      if (colorMode === 'original') {
        const newOriginal = [...originalColors];
        newOriginal[editingIndex] = normalized;
        setOriginalColors(newOriginal);
      }
    }
    setEditingIndex(null);
  };

  const copyToClipboard = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
    } catch (e) {
      // silent fail
    }
  };

  const handleSavePalette = async () => {
    if (!paletteName.trim()) {
      setError('请输入方案名称');
      return;
    }
    if (paletteName.length > 20) {
      setError('名称不能超过20个字符');
      return;
    }
    if (colors.length === 0) {
      setError('请先提取或编辑色板');
      return;
    }

    try {
      await savePalette(paletteName.trim(), colors);
      setPaletteName('');
      setShowSuccess(true);
      await loadPalettes();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  const loadPalette = (palette: Palette) => {
    setColors(palette.colors);
    setOriginalColors(palette.colors);
    setColorMode('original');
  };

  const handleModeChange = (mode: ColorMode) => {
    if (originalColors.length === 0) return;
    setColorMode(mode);
  };

  return (
    <div className="app">
      {error && (
        <div className="error-toast">
          <span>{error}</span>
        </div>
      )}
      {showSuccess && (
        <div className="success-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>保存成功</span>
        </div>
      )}

      <header className="app-header">
        <h1>
          <span className="title-dot" />
          调色板生成器
        </h1>
        <p className="subtitle">上传图片，智能提取主色调，生成和谐配色方案</p>
      </header>

      <div className="app-container">
        <section
          className={`upload-section ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <h2 className="section-title">上传图片</h2>
          <div
            className={`upload-zone ${isDragging ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {isLoading ? (
              <div className="loading-spinner" />
            ) : (
              <>
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="upload-text">点击或拖拽图片到此处</p>
                <p className="upload-hint">支持 JPEG / PNG，最大 5MB</p>
              </>
            )}
          </div>
        </section>

        <section className="palette-section">
          <h2 className="section-title">色板编辑</h2>

          {colors.length > 0 ? (
            <>
              <div className="color-grid">
                {colors.map((color, index) => (
                  <div key={index} className="color-card">
                    {editingIndex === index ? (
                      <input
                        className="color-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={confirmEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit();
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        autoFocus
                        maxLength={7}
                      />
                    ) : (
                      <div
                        className="color-dot"
                        style={{ backgroundColor: color }}
                        onClick={() => startEdit(index)}
                        onDoubleClick={() => copyToClipboard(color)}
                        title="点击编辑，双击复制"
                      >
                        <span className="color-hex">{color}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mode-buttons">
                <button
                  className={`mode-btn ${colorMode === 'original' ? 'active' : ''}`}
                  onClick={() => handleModeChange('original')}
                >
                  原始色
                </button>
                <button
                  className={`mode-btn ${colorMode === 'complementary' ? 'active' : ''}`}
                  onClick={() => handleModeChange('complementary')}
                >
                  互补色
                </button>
                <button
                  className={`mode-btn ${colorMode === 'analogous' ? 'active' : ''}`}
                  onClick={() => handleModeChange('analogous')}
                >
                  类似色
                </button>
                <button
                  className={`mode-btn ${colorMode === 'triadic' ? 'active' : ''}`}
                  onClick={() => handleModeChange('triadic')}
                >
                  三角色
                </button>
              </div>

              <div className="save-section">
                <input
                  type="text"
                  className="name-input"
                  placeholder="输入方案名称（最多20字）"
                  value={paletteName}
                  onChange={(e) => setPaletteName(e.target.value.slice(0, 20))}
                  maxLength={20}
                />
                <button className="save