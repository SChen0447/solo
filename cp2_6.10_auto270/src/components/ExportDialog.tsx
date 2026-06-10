import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  frontCanvasRef: React.RefObject<HTMLDivElement>;
  backCanvasRef: React.RefObject<HTMLDivElement>;
}

type ExportFormat = 'png' | 'jpg' | 'pdf';
type ExportResolution = 150 | 300;
type ExportSide = 'front' | 'back' | 'both';

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  frontCanvasRef,
  backCanvasRef,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ExportResolution>(300);
  const [side, setSide] = useState<ExportSide>('both');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const captureCanvas = async (
    ref: React.RefObject<HTMLDivElement>,
    scale: number,
    bgColor?: string
  ): Promise<string> => {
    if (!ref.current) throw new Error('Canvas not found');
    const canvas = await html2canvas(ref.current, {
      scale: scale / 2,
      useCORS: true,
      backgroundColor: bgColor || null,
      logging: false,
    });
    return canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
  };

  const dataURLToBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const createPrintablePDF = (frontData: string, backData: string) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>复古明信片 - 双面打印</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
    .page {
      width: 105mm;
      height: 148mm;
      page-break-after: always;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    @media print {
      @page { size: A6 portrait; margin: 0; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page"><img src="${frontData}" alt="正面"/></div>
  <div class="page"><img src="${backData}" alt="背面"/></div>
  <script>
    window.onload = function() {
      window.print();
    };
  <\/script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, '复古明信片-双面打印.html');
  };

  const handleExport = async () => {
    setExporting(true);
    setProgress('准备导出...');
    try {
      const scale = resolution === 300 ? 4 : 2;
      const bgColor = format === 'jpg' ? '#ffffff' : undefined;

      if (side === 'front') {
        setProgress('生成正面图片...');
        const data = await captureCanvas(frontCanvasRef, scale, bgColor);
        const blob = dataURLToBlob(data);
        downloadBlob(blob, `复古明信片-正面.${format}`);
      } else if (side === 'back') {
        setProgress('生成背面图片...');
        const data = await captureCanvas(backCanvasRef, scale, bgColor);
        const blob = dataURLToBlob(data);
        downloadBlob(blob, `复古明信片-背面.${format}`);
      } else if (format === 'pdf') {
        setProgress('生成正面...');
        const frontData = await captureCanvas(frontCanvasRef, scale, '#ffffff');
        setProgress('生成背面...');
        const backData = await captureCanvas(backCanvasRef, scale, '#ffffff');
        setProgress('创建双面打印文件...');
        createPrintablePDF(frontData, backData);
      } else {
        setProgress('生成正面...');
        const frontData = await captureCanvas(frontCanvasRef, scale, bgColor);
        setProgress('生成背面...');
        const backData = await captureCanvas(backCanvasRef, scale, bgColor);
        setProgress('打包ZIP...');
        const zip = new JSZip();
        zip.file(`正面.${format}`, dataURLToBlob(frontData));
        zip.file(`背面.${format}`, dataURLToBlob(backData));
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, '复古明信片-双面.zip');
      }
      setProgress('完成！');
      setTimeout(() => {
        setExporting(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Export failed:', err);
      setProgress('导出失败，请重试');
      setExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#faf0e0',
              borderRadius: 12,
              padding: 24,
              minWidth: 360,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              zIndex: 10000,
            }}
          >
            <h3
              style={{
                color: '#4a3525',
                fontSize: 20,
                fontFamily: "'Playfair Display', serif",
                marginBottom: 20,
              }}
            >
              导 出 明 信 片
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>导出格式</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['png', 'jpg', 'pdf'] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    style={{
                      ...optionStyle,
                      background: format === f ? '#3d5a3a' : '#4a3525',
                      color: '#fdf6e3',
                    }}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>分辨率</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([150, 300] as ExportResolution[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    style={{
                      ...optionStyle,
                      background: resolution === r ? '#3d5a3a' : '#4a3525',
                      color: '#fdf6e3',
                    }}
                  >
                    {r} DPI
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>导出面</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  ['front', '仅正面'],
                  ['back', '仅背面'],
                  ['both', '双面'],
                ] as [ExportSide, string][]).map(([s, label]) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    style={{
                      ...optionStyle,
                      background: side === s ? '#3d5a3a' : '#4a3525',
                      color: '#fdf6e3',
                      flex: 1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {progress && (
              <div
                style={{
                  padding: 12,
                  background: '#e8dcc4',
                  borderRadius: 6,
                  color: '#4a3525',
                  fontSize: 13,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                {progress}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                disabled={exporting}
                style={{
                  ...optionStyle,
                  background: '#6b4a35',
                  color: '#fdf6e3',
                }}
              >
                取消
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  ...optionStyle,
                  background: '#b23a2a',
                  color: '#fdf6e3',
                  fontWeight: 'bold',
                }}
              >
                {exporting ? '导出中...' : '开始导出'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#4a3525',
  fontSize: 13,
  marginBottom: 8,
  fontWeight: 500,
};

const optionStyle: React.CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  transition: 'background 0.2s ease-out',
};

export default ExportDialog;
