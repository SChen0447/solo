import { useState, useRef, useEffect, useCallback } from 'react';
import {
  renderCalligraphy,
  renderStatic,
  getCanvasSize,
  RenderParams,
  RenderProgress,
  calculateLayout,
  drawPaperTexture,
  drawCharWithInk,
  CharPosition,
} from './CalligraphyRenderer';
import { drawSeal, drawSignature } from './SealGenerator';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  },
  title: {
    fontFamily: "'Ma Shan Zheng', cursive",
    fontSize: '36px',
    color: '#E8D5B7',
    textShadow: '0 0 1px #B8A06A, 0 0 2px #B8A06A',
    marginBottom: '8px',
  },
  subtitle: {
    fontFamily: "'ZCOOL XiaoWei', serif",
    fontSize: '16px',
    color: '#B8A06A',
    opacity: 0.7,
  },
  mainArea: {
    width: '1000px',
    maxWidth: '100%',
    background: 'linear-gradient(145deg, #FAF6EE 0%, #F0E8D8 100%)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    padding: '30px',
    position: 'relative' as const,
  },
  contentWrapper: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  toolbar: {
    width: '200px',
    background: 'rgba(245, 240, 232, 0.85)',
    backdropFilter: 'blur(10px)',
    border: '1px solid #D0C4A8',
    borderRadius: '12px',
    padding: '20px',
    flexShrink: 0,
  },
  toolbarTitle: {
    fontFamily: "'ZCOOL XiaoWei', serif",
    fontSize: '16px',
    color: '#5A4A3A',
    marginBottom: '16px',
    fontWeight: 'bold',
  },
  controlGroup: {
    marginBottom: '20px',
  },
  label: {
    fontSize: '13px',
    color: '#6A5A4A',
    marginBottom: '8px',
    display: 'block',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#D0C4A8',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#8B7355',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6A5A4A',
    cursor: 'pointer',
  },
  inputField: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #D0C4A8',
    background: '#FDFAF4',
    fontSize: '13px',
    color: '#5A4A3A',
    marginTop: '10px',
    outline: 'none',
    fontFamily: "'ZCOOL XiaoWei', serif",
  },
  centerColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    flex: 1,
  },
  textArea: {
    width: '600px',
    maxWidth: '100%',
    height: '200px',
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #C8B89A',
    background: '#F5F0E8',
    fontSize: '16px',
    color: '#3A2C20',
    resize: 'none',
    outline: 'none',
    fontFamily: "'ZCOOL XiaoWei', serif",
    lineHeight: 1.8,
  },
  charCount: {
    fontSize: '12px',
    color: '#8A7A6A',
    alignSelf: 'flex-end',
    marginTop: '-12px',
  },
  paintButton: {
    padding: '12px 40px',
    borderRadius: '8px',
    border: 'none',
    background: '#8B7355',
    color: '#FAF6EE',
    fontSize: '18px',
    fontFamily: "'Ma Shan Zheng', cursive",
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  canvasWrapper: {
    position: 'relative' as const,
  },
  canvas: {
    borderRadius: '4px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    cursor: 'default',
  },
  progressIndicator: {
    position: 'absolute' as const,
    top: '10px',
    left: '10px',
    fontSize: '12px',
    color: '#6A5A4A',
    background: 'rgba(250, 246, 238, 0.9)',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  saveButton: {
    padding: '10px 24px',
    borderRadius: '6px',
    border: 'none',
    background: '#8B7355',
    color: '#FAF6EE',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  shareButton: {
    padding: '10px 24px',
    borderRadius: '6px',
    border: 'none',
    background: '#6B8E6B',
    color: '#FAF6EE',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toast: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#2C2C2C',
    color: '#FAF6EE',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 1000,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  hamburger: {
    display: 'none',
    position: 'absolute' as const,
    top: '15px',
    left: '15px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: '5px',
    zIndex: 100,
  },
  hamburgerLine: {
    width: '24px',
    height: '2px',
    background: '#8B7355',
    borderRadius: '1px',
  },
  valueLabel: {
    float: 'right',
    fontSize: '12px',
    color: '#8B7355',
    fontWeight: 'bold',
  },
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputText, setInputText] = useState(
    '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。'
  );
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<RenderProgress>({
    current: 0,
    total: 0,
    percentage: 0,
  });
  const [hasRendered, setHasRendered] = useState(false);
  const [positions, setPositions] = useState<CharPosition[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [params, setParams] = useState<RenderParams>({
    brushDetail: 0.5,
    inkDensity: 0.7,
    lineSpacingRatio: 1.0,
  });

  const [enableSignature, setEnableSignature] = useState(false);
  const [signatureText, setSignatureText] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const { width: canvasWidth, height: canvasHeight } = getCanvasSize();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPaperTexture(ctx);
  }, []);

  const showMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  }, []);

  const redrawAll = useCallback(
    (text: string, renderParams: RenderParams, signature: string, useSignature: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newPositions = renderStatic(ctx, text, renderParams);
      setPositions(newPositions);

      if (useSignature && signature) {
        drawSignature(ctx, signature);
      }
      drawSeal(ctx);
    },
    []
  );

  const handleRender = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const text = inputText.trim();
    const charCount = text.replace(/[\s，。、；：！？]/g, '').length;

    if (charCount < 20) {
      showMessage('请输入至少20个汉字');
      return;
    }
    if (charCount > 80) {
      showMessage('请输入不超过80个汉字');
      return;
    }

    setIsRendering(true);
    setHasRendered(false);

    try {
      const newPositions = await renderCalligraphy(
        ctx,
        text,
        params,
        (p) => setProgress(p)
      );
      setPositions(newPositions);

      if (enableSignature && signatureText) {
        drawSignature(ctx, signatureText);
      }
      drawSeal(ctx);

      setHasRendered(true);
    } finally {
      setIsRendering(false);
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasRendered) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width * 2;
    exportCanvas.height = canvas.height * 2;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.scale(2, 2);
    exportCtx.drawImage(canvas, 0, 0);

    const timestamp = Date.now();
    const filename = `水墨_${timestamp}.png`;

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('图片已保存');
      },
      'image/png',
      1.0
    );
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasRendered) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');

      const response = await fetch('/api/kv/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataUrl }),
      });

      if (!response.ok) throw new Error('分享失败');

      const { key } = await response.json();
      const shareUrl = `${window.location.origin}/#${key}`;

      await navigator.clipboard.writeText(shareUrl);
      showMessage('链接已复制到剪贴板');
    } catch (err) {
      showMessage('分享失败，请重试');
    }
  };

  const handleParamChange = (
    key: keyof RenderParams,
    value: number
  ) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    if (hasRendered) {
      redrawAll(inputText, newParams, signatureText, enableSignature);
    }
  };

  const handleSignatureToggle = (checked: boolean) => {
    setEnableSignature(checked);
    if (hasRendered) {
      redrawAll(inputText, params, signatureText, checked);
    }
  };

  const handleSignatureChange = (text: string) => {
    const limited = text.slice(0, 15);
    setSignatureText(limited);
    if (hasRendered && enableSignature) {
      redrawAll(inputText, params, limited, enableSignature);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasRendered || isRendering) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setIsDragging(true);
    setDragStart(x);
    setDragEnd(x);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setDragEnd(x);
  };

  const handleCanvasMouseUp = () => {
    if (!isDragging || dragStart === null || dragEnd === null) {
      setIsDragging(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minX = Math.min(dragStart, dragEnd);
    const maxX = Math.max(dragStart, dragEnd);

    if (Math.abs(maxX - minX) < 10) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const affectedPositions = positions.map((pos) => {
      const charLeft = pos.x - pos.size / 2;
      const charRight = pos.x + pos.size / 2;
      const overlaps = charRight >= minX && charLeft <= maxX;

      if (overlaps) {
        const colorT = Math.random();
        const c1 = { r: 26, g: 26, b: 26 };
        const c2 = { r: 74, g: 58, b: 42 };
        const r = Math.round(c1.r + (c2.r - c1.r) * colorT);
        const g = Math.round(c1.g + (c2.g - c1.g) * colorT);
        const b = Math.round(c1.b + (c2.b - c1.b) * colorT);
        return { ...pos, color: `rgb(${r}, ${g}, ${b})` };
      }
      return pos;
    });

    drawPaperTexture(ctx);
    affectedPositions.forEach((pos) => {
      drawCharWithInk(ctx, pos, params, 1);
    });

    if (enableSignature && signatureText) {
      drawSignature(ctx, signatureText);
    }
    drawSeal(ctx);

    setPositions(affectedPositions);
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const validCharCount = inputText.replace(/[\s，。、；：！？]/g, '').length;

  const contentLayout = isMobile ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
      {toolbarOpen && (
        <div style={{ ...styles.toolbar, width: '100%' }}>
          {renderToolbarContent()}
        </div>
      )}
      <div style={{ ...styles.centerColumn, width: '100%' }}>
        {renderInputSection()}
        {renderCanvasSection()}
      </div>
    </div>
  ) : (
    <div style={styles.contentWrapper as React.CSSProperties}>
      <div style={styles.toolbar as React.CSSProperties}>
        {renderToolbarContent()}
      </div>
      <div style={styles.centerColumn as React.CSSProperties}>
        {renderInputSection()}
        {renderCanvasSection()}
      </div>
    </div>
  );

  function renderToolbarContent() {
    return (
      <>
        <div style={styles.toolbarTitle as React.CSSProperties}>墨韵调节</div>

        <div style={styles.controlGroup as React.CSSProperties}>
          <label style={styles.label as React.CSSProperties}>
            笔触细腻度
            <span style={styles.valueLabel as React.CSSProperties}>
              {params.brushDetail.toFixed(1)}
            </span>
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={params.brushDetail}
            onChange={(e) => handleParamChange('brushDetail', parseFloat(e.target.value))}
            style={styles.slider as React.CSSProperties}
          />
        </div>

        <div style={styles.controlGroup as React.CSSProperties}>
          <label style={styles.label as React.CSSProperties}>
            墨色浓淡
            <span style={styles.valueLabel as React.CSSProperties}>
              {params.inkDensity.toFixed(1)}
            </span>
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={params.inkDensity}
            onChange={(e) => handleParamChange('inkDensity', parseFloat(e.target.value))}
            style={styles.slider as React.CSSProperties}
          />
        </div>

        <div style={styles.controlGroup as React.CSSProperties}>
          <label style={styles.label as React.CSSProperties}>
            行距压缩比
            <span style={styles.valueLabel as React.CSSProperties}>
              {params.lineSpacingRatio.toFixed(1)}
            </span>
          </label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={params.lineSpacingRatio}
            onChange={(e) => handleParamChange('lineSpacingRatio', parseFloat(e.target.value))}
            style={styles.slider as React.CSSProperties}
          />
        </div>

        <div style={styles.controlGroup as React.CSSProperties}>
          <label style={styles.checkboxLabel as React.CSSProperties}>
            <input
              type="checkbox"
              checked={enableSignature}
              onChange={(e) => handleSignatureToggle(e.target.checked)}
              style={{ accentColor: '#8B7355' }}
            />
            启用落款
          </label>
          {enableSignature && (
            <input
              type="text"
              placeholder="输入落款（最多15字）"
              value={signatureText}
              onChange={(e) => handleSignatureChange(e.target.value)}
              style={styles.inputField as React.CSSProperties}
              maxLength={15}
            />
          )}
        </div>
      </>
    );
  }

  function renderInputSection() {
    return (
      <>
        <textarea
          style={styles.textArea as React.CSSProperties}
          placeholder="请输入20-80字的散文或诗句..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isRendering}
        />
        <span style={styles.charCount as React.CSSProperties}>
          {validCharCount}/80 字
        </span>
        <button
          style={{
            ...styles.paintButton,
            opacity: isRendering ? 0.6 : 1,
            cursor: isRendering ? 'not-allowed' : 'pointer',
          } as React.CSSProperties}
          onClick={handleRender}
          disabled={isRendering}
          onMouseEnter={(e) => {
            if (!isRendering) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          }}
        >
          {isRendering ? '挥毫中...' : '挥毫'}
        </button>
      </>
    );
  }

  function renderCanvasSection() {
    const canvasStyle: React.CSSProperties = {
      ...styles.canvas,
      cursor: isRendering ? 'wait' : isDragging ? 'col-resize' : 'default',
      width: isMobile ? '100%' : `${canvasWidth}px`,
      height: isMobile ? 'auto' : `${canvasHeight}px`,
    };

    return (
      <div style={styles.canvasWrapper as React.CSSProperties}>
        {isRendering && (
          <div style={styles.progressIndicator as React.CSSProperties}>
            进度: {progress.percentage}%
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={canvasStyle}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
        {hasRendered && (
          <div style={styles.actionButtons as React.CSSProperties}>
            <button
              style={styles.saveButton as React.CSSProperties}
              onClick={handleSave}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#A0896B';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#8B7355';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              保存为PNG
            </button>
            <button
              style={styles.shareButton as React.CSSProperties}
              onClick={handleShare}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#8BAE8B';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#6B8E6B';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              分享链接
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.header as React.CSSProperties}>
        <h1 style={styles.title as React.CSSProperties}>墨韵</h1>
        <div style={styles.subtitle as React.CSSProperties}>AI书法生成器</div>
      </div>

      <div style={styles.mainArea as React.CSSProperties}>
        {isMobile && (
          <div
            style={styles.hamburger as React.CSSProperties}
            onClick={() => setToolbarOpen(!toolbarOpen)}
          >
            <div style={styles.hamburgerLine as React.CSSProperties} />
            <div style={styles.hamburgerLine as React.CSSProperties} />
            <div style={styles.hamburgerLine as React.CSSProperties} />
          </div>
        )}
        {contentLayout}
      </div>

      {showToast && <div style={styles.toast as React.CSSProperties}>{toastMessage}</div>}
    </div>
  );
}
