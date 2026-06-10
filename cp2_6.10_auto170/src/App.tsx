import React, { useState, useCallback, useRef, useMemo } from 'react';
import { IconData, ViewSettings, DetectionResult, ExportReportItem } from './types';
import { createIconData } from './svgUtils';
import IconCompare from './IconCompare';
import StyleDetector from './StyleDetector';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { mean } from 'lodash';

const App: React.FC = () => {
  const [icons, setIcons] = useState<IconData[]>([]);
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    iconColor: '#ffffff',
    iconSize: 64,
    backgroundColor: '#2d2d44'
  });
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridAreaRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.svg'));

    const promises = fileArray.map(
      (file) =>
        new Promise<IconData>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve(createIconData(file.name, content));
          };
          reader.readAsText(file);
        })
    );

    Promise.all(promises).then((newIcons) => {
      setIcons((prev) => [...prev, ...newIcons]);
      setDetectionResult(null);
    });
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const toggleMark = useCallback((id: string) => {
    setIcons((prev) =>
      prev.map((icon) => (icon.id === id ? { ...icon, isMarked: !icon.isMarked } : icon))
    );
  }, []);

  const detectStyles = useCallback(() => {
    if (icons.length === 0) return;

    const lineWidthMeans: number[] = icons.map((icon) =>
      icon.lineWidths.length > 0 ? mean(icon.lineWidths) : 0
    );
    const overallMean = mean(lineWidthMeans.filter((v) => v > 0));
    const variance =
      lineWidthMeans.filter((v) => v > 0).length > 1
        ? mean(
            lineWidthMeans
              .filter((v) => v > 0)
              .map((v) => Math.pow(v - overallMean, 2))
          )
        : 0;

    const lineWidthVarianceIndices: number[] = [];
    const emptyFillIndices: number[] = [];
    const threshold = 0.5;

    icons.forEach((icon, idx) => {
      if (icon.lineWidths.length > 0) {
        const iconMean = mean(icon.lineWidths);
        if (Math.abs(iconMean - overallMean) > Math.max(threshold, variance * 2)) {
          lineWidthVarianceIndices.push(idx);
        }
      }

      const hasFill = icon.fills.some(
        (f) => f !== null && f !== 'none' && f !== 'transparent'
      );
      if (!hasFill && icon.fills.length > 0) {
        emptyFillIndices.push(idx);
      }
    });

    setIcons((prev) =>
      prev.map((icon, idx) => {
        const anomalies: string[] = [];
        if (lineWidthVarianceIndices.includes(idx)) {
          anomalies.push('lineWidthVariance');
        }
        if (emptyFillIndices.includes(idx)) {
          anomalies.push('emptyFill');
        }
        return { ...icon, detectAnomalies: anomalies, isDetectFlashing: anomalies.length > 0 };
      })
    );

    setDetectionResult({ lineWidthVarianceIndices, emptyFillIndices });

    setTimeout(() => {
      setIcons((prev) => prev.map((icon) => ({ ...icon, isDetectFlashing: false })));
    }, 1500);
  }, [icons]);

  const resetView = useCallback(() => {
    setViewSettings({
      iconColor: '#ffffff',
      iconSize: 64,
      backgroundColor: '#2d2d44'
    });
  }, []);

  const exportReport = useCallback(async () => {
    const reportData: ExportReportItem[] = icons.map((icon) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(icon.fileName.substring(0, 8), 32, 36);
      }

      return {
        fileName: icon.fileName,
        width: icon.width,
        height: icon.height,
        thumbnail: canvas.toDataURL('image/png'),
        isMarked: icon.isMarked,
        detectAnomalies: icon.detectAnomalies
      };
    });

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    saveAs(blob, 'icon-style-report.json');

    if (gridAreaRef.current) {
      try {
        const canvas = await html2canvas(gridAreaRef.current, {
          backgroundColor: '#121220',
          scale: 2
        });
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            saveAs(pngBlob, 'icon-comparison-screenshot.png');
          }
        });
      } catch (err) {
        console.error('截图失败:', err);
      }
    }
  }, [icons]);

  const markedCount = useMemo(() => icons.filter((i) => i.isMarked).length, [icons]);
  const detectAnomalyCount = useMemo(
    () => icons.filter((i) => i.detectAnomalies.length > 0).length,
    [icons]
  );

  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#1e1e2e',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '16px',
    zIndex: 100
  };

  const toolGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#8888aa'
  };

  const buttonStyle = (bgColor: string): React.CSSProperties => ({
    backgroundColor: bgColor,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  const mainAreaStyle: React.CSSProperties = {
    marginTop: '60px',
    marginBottom: '40px',
    height: 'calc(100vh - 100px)',
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  const dropZoneStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '800px',
    minHeight: '200px',
    border: isDragging ? '2px dashed #1976d2' : '2px dashed #4a4a6a',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '32px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const statsBarStyle: React.CSSProperties = {
    borderRadius: '12px',
    backgroundColor: '#1a1b26',
    padding: '12px 16px',
    margin: '16px 0',
    fontFamily: 'monospace',
    fontSize: '13px',
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  };

  const footerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40px',
    backgroundColor: '#1e1e2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    fontFamily: 'monospace',
    fontSize: '13px',
    borderTop: '1px solid #2d2d44',
    zIndex: 100
  };

  const inputStyle: React.CSSProperties = {
    width: '36px',
    height: '28px',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    backgroundColor: '#2d2d44',
    cursor: 'pointer',
    padding: 0
  };

  const selectStyle: React.CSSProperties = {
    height: '28px',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    backgroundColor: '#2d2d44',
    color: '#ffffff',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer'
  };

  return (
    <>
      <style>
        {`
          @keyframes detectFlash {
            0% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.8); border-color: #ff9800; }
            50% { box-shadow: 0 0 20px 10px rgba(255, 152, 0, 0.4); border-color: #ff9800; }
            100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0); border-color: transparent; }
          }
          .icon-cell {
            will-change: transform, box-shadow;
          }
          @media (max-width: 768px) {
            .icon-grid {
              justify-content: center !important;
            }
          }
        `}
      </style>

      <header style={headerStyle}>
        <div style={toolGroupStyle}>
          <span>着色:</span>
          <input
            type="color"
            value={viewSettings.iconColor}
            onChange={(e) => setViewSettings((s) => ({ ...s, iconColor: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={toolGroupStyle}>
          <span>尺寸:</span>
          <select
            value={viewSettings.iconSize}
            onChange={(e) =>
              setViewSettings((s) => ({
                ...s,
                iconSize: parseInt(e.target.value) as 32 | 48 | 64
              }))
            }
            style={selectStyle}
          >
            <option value={32}>32px</option>
            <option value={48}>48px</option>
            <option value={64}>64px</option>
          </select>
        </div>
        <div style={toolGroupStyle}>
          <span>背景:</span>
          <input
            type="color"
            value={viewSettings.backgroundColor}
            onChange={(e) => setViewSettings((s) => ({ ...s, backgroundColor: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button style={buttonStyle('#1976d2')} onClick={() => fileInputRef.current?.click()}>
          上传图标
        </button>
        <button style={buttonStyle('#616161')} onClick={resetView}>
          重置视图
        </button>
        <button style={buttonStyle('#43a047')} onClick={exportReport} disabled={icons.length === 0}>
          导出报告
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </header>

      <main style={mainAreaStyle} ref={gridAreaRef}>
        {icons.length > 0 && (
          <div style={statsBarStyle}>
            <span style={{ color: '#ffffff' }}>异常统计</span>
            <span style={{ color: '#e53935' }}>
              手动标记: {markedCount} 个
            </span>
            <span style={{ color: '#ff9800' }}>
              检测异常: {detectAnomalyCount} 个
            </span>
          </div>
        )}

        {icons.length > 0 && (
          <StyleDetector
            icons={icons}
            detectionResult={detectionResult}
            onDetect={detectStyles}
          />
        )}

        {icons.length === 0 ? (
          <div
            style={dropZoneStyle}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div style={{ fontSize: '48px', color: '#4a4a6a' }}>📥</div>
            <div style={{ color: '#8888aa', fontFamily: 'monospace', fontSize: '14px' }}>
              点击上传或拖拽SVG图标到此处
            </div>
            <div style={{ color: '#555577', fontFamily: 'monospace', fontSize: '12px' }}>
              支持批量上传多个SVG文件
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{ width: '100%' }}
            className="icon-grid"
          >
            <IconCompare
              icons={icons}
              viewSettings={viewSettings}
              onToggleMark={toggleMark}
            />
          </div>
        )}
      </main>

      <footer style={footerStyle}>
        <span style={{ color: '#ffffff' }}>共 {icons.length} 个图标</span>
        <span style={{ color: '#e53935' }}>{markedCount} 个手动标记</span>
        <span style={{ color: '#ff9800' }}>{detectAnomalyCount} 个检测异常</span>
      </footer>
    </>
  );
};

export default App;
