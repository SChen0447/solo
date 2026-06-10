import React, { useState, useRef, useCallback, useEffect } from 'react';
import Slider from '@/components/Slider';
import Magnifier from '@/components/Magnifier';
import html2canvas from 'html2canvas';

type Mode = 'split' | 'sync';
type ZoomLevel = 2 | 4 | 8;

interface ImageData {
  url: string;
  name: string;
  width: number;
  height: number;
}

interface MagnifierState {
  visible: boolean;
  x: number;
  y: number;
  imageX: number;
  imageY: number;
  windowX: number;
  windowY: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const MAX_IMAGE_WIDTH = 4000;
const MAX_IMAGE_HEIGHT = 3000;

const PhotoCompare: React.FC = () => {
  const [leftImage, setLeftImage] = useState<ImageData | null>(null);
  const [rightImage, setRightImage] = useState<ImageData | null>(null);
  const [mode, setMode] = useState<Mode>('split');
  const [zoom, setZoom] = useState<ZoomLevel>(2);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [magnifier, setMagnifier] = useState<MagnifierState>({
    visible: false,
    x: 0,
    y: 0,
    imageX: 0,
    imageY: 0,
    windowX: 0,
    windowY: 0,
  });
  const [magnifierImage, setMagnifierImage] = useState<'left' | 'right'>('left');
  const [dragOver, setDragOver] = useState<'left' | 'right' | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const compareContainerRef = useRef<HTMLDivElement>(null);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const leftImageRef = useRef<HTMLImageElement>(null);
  const rightImageRef = useRef<HTMLImageElement>(null);
  const syncingRef = useRef(false);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFileUpload = useCallback(
    (file: File, side: 'left' | 'right') => {
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (img.width > MAX_IMAGE_WIDTH || img.height > MAX_IMAGE_HEIGHT) {
          alert(`图片尺寸过大，最大支持 ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT} 像素`);
          URL.revokeObjectURL(url);
          return;
        }

        const imageData: ImageData = {
          url,
          name: file.name,
          width: img.width,
          height: img.height,
        };

        if (side === 'left') {
          if (leftImage) URL.revokeObjectURL(leftImage.url);
          setLeftImage(imageData);
        } else {
          if (rightImage) URL.revokeObjectURL(rightImage.url);
          setRightImage(imageData);
        }
      };
      img.onerror = () => {
        alert('图片加载失败');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [leftImage, rightImage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, side: 'left' | 'right') => {
      e.preventDefault();
      setDragOver(null);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileUpload(file, side);
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent, side: 'left' | 'right') => {
    e.preventDefault();
    setDragOver(side);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const triggerUpload = (side: 'left' | 'right') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file, side);
    };
    input.click();
  };

  const addRipple = useCallback((x: number, y: number) => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement | HTMLDivElement>, side: 'left' | 'right') => {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      addRipple(x, y);

      const imgRef = side === 'left' ? leftImageRef.current : rightImageRef.current;
      if (!imgRef) return;

      const imgRect = imgRef.getBoundingClientRect();
      const scaleX = imgRef.naturalWidth / imgRect.width;
      const scaleY = imgRef.naturalHeight / imgRect.height;

      const imageX = (e.clientX - imgRect.left) * scaleX;
      const imageY = (e.clientY - imgRect.top) * scaleY;

      const container = compareContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const windowSize = isMobile ? 150 : 200;
      let windowX = e.clientX - containerRect.left + 30;
      let windowY = e.clientY - containerRect.top - windowSize / 2;

      if (windowX + windowSize > containerRect.width) {
        windowX = e.clientX - containerRect.left - windowSize - 30;
      }
      if (windowX < 0) windowX = 10;
      if (windowY < 0) windowY = 10;
      if (windowY + windowSize > containerRect.height) {
        windowY = containerRect.height - windowSize - 10;
      }

      setMagnifierImage(side);
      setMagnifier({
        visible: true,
        x: e.clientX - imgRect.left,
        y: e.clientY - imgRect.top,
        imageX: Math.max(0, Math.min(imageX, imgRef.naturalWidth)),
        imageY: Math.max(0, Math.min(imageY, imgRef.naturalHeight)),
        windowX,
        windowY,
      });
    },
    [addRipple, isMobile],
  );

  const handleSyncScroll = useCallback((e: React.UIEvent<HTMLDivElement>, source: 'left' | 'right') => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const target = e.currentTarget;
    const otherRef = source === 'left' ? rightContainerRef.current : leftContainerRef.current;

    if (otherRef) {
      const scrollXPercent = target.scrollLeft / (target.scrollWidth - target.clientWidth || 1);
      const scrollYPercent = target.scrollTop / (target.scrollHeight - target.clientHeight || 1);

      otherRef.scrollLeft = scrollXPercent * (otherRef.scrollWidth - otherRef.clientWidth);
      otherRef.scrollTop = scrollYPercent * (otherRef.scrollHeight - otherRef.clientHeight);
    }

    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSliderPosition(50);
    setMagnifier((prev) => ({ ...prev, visible: false }));
    if (leftContainerRef.current) {
      leftContainerRef.current.scrollLeft = 0;
      leftContainerRef.current.scrollTop = 0;
    }
    if (rightContainerRef.current) {
      rightContainerRef.current.scrollLeft = 0;
      rightContainerRef.current.scrollTop = 0;
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!compareContainerRef.current) return;
    try {
      const canvas = await html2canvas(compareContainerRef.current, {
        backgroundColor: '#16213e',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `photo-compare-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    }
  }, []);

  const closeMagnifier = () => {
    setMagnifier((prev) => ({ ...prev, visible: false }));
  };

  const updateMagnifierPosition = (windowX: number, windowY: number) => {
    setMagnifier((prev) => ({ ...prev, windowX, windowY }));
  };

  const renderPhotoPanel = (side: 'left' | 'right') => {
    const image = side === 'left' ? leftImage : rightImage;
    const imgRef = side === 'left' ? leftImageRef : rightImageRef;
    const containerRef = side === 'left' ? leftContainerRef : rightContainerRef;
    const label = side === 'left' ? '参考图' : '对比图';

    return (
      <div className="photo-container-wrapper">
        <div
          ref={containerRef}
          className={`photo-container ${dragOver === side ? 'drag-over' : ''} ${mode === 'sync' ? 'sync-mode' : ''}`}
          onClick={() => !image && triggerUpload(side)}
          onDrop={(e) => handleDrop(e, side)}
          onDragOver={(e) => handleDragOver(e, side)}
          onDragLeave={handleDragLeave}
        >
          {image ? (
            <img
              ref={imgRef}
              src={image.url}
              alt={image.name}
              className="photo-img"
              draggable={false}
              onClick={(e) => handleImageClick(e, side)}
            />
          ) : (
            <div className="upload-placeholder">
              <div className="upload-placeholder-icon">+</div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>上传{label}</div>
                <div style={{ fontSize: 12 }}>点击或拖拽图片到此处</div>
              </div>
            </div>
          )}
          {ripples
            .filter((r) => r.id % 2 === (side === 'left' ? 0 : 1))
            .map((ripple) => (
              <span
                key={ripple.id}
                className="ripple"
                style={{
                  left: ripple.x - 25,
                  top: ripple.y - 25,
                  width: 50,
                  height: 50,
                }}
              />
            ))}
        </div>
        <div className="photo-info">
          <span className="photo-info-name">{image ? image.name : `未上传${label}`}</span>
          <span className="photo-info-size">
            {image ? `${image.width} × ${image.height}` : '--'}
          </span>
        </div>
      </div>
    );
  };

  const renderSplitMode = () => {
    if (!leftImage || !rightImage) {
      return (
        <div className="side-by-side" ref={compareContainerRef}>
          {renderPhotoPanel('left')}
          {renderPhotoPanel('right')}
        </div>
      );
    }

    const positionStyle = isMobile
      ? { top: `${sliderPosition}%` }
      : { left: `${sliderPosition}%` };

    return (
      <div className="compare-container" ref={compareContainerRef}>
        <div className="compare-content">
          <div className="compare-image-wrapper">
            <div className="compare-image-right">
              <img
                ref={rightImageRef}
                src={rightImage.url}
                alt={rightImage.name}
                className="compare-image"
                draggable={false}
                onClick={(e) => handleImageClick(e, 'right')}
              />
            </div>
            <div
              className="compare-image-left"
              style={
                isMobile
                  ? { width: '100%', height: `${sliderPosition}%`, top: 0, left: 0 }
                  : { width: `${sliderPosition}%` }
              }
            >
              <img
                ref={leftImageRef}
                src={leftImage.url}
                alt={leftImage.name}
                className="compare-image"
                draggable={false}
                onClick={(e) => handleImageClick(e, 'left')}
              />
            </div>
            <Slider
              position={sliderPosition}
              onChange={setSliderPosition}
              isHorizontal={isMobile}
            />
            {magnifier.visible && (
              <Magnifier
                imageUrl={magnifierImage === 'left' ? leftImage.url : rightImage.url}
                imageX={magnifier.imageX}
                imageY={magnifier.imageY}
                zoom={zoom}
                windowX={magnifier.windowX}
                windowY={magnifier.windowY}
                isMobile={isMobile}
                containerRef={compareContainerRef}
                onClose={closeMagnifier}
                onPositionChange={updateMagnifierPosition}
              />
            )}
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="ripple"
                style={{
                  left: ripple.x - 25,
                  top: ripple.y - 25,
                  width: 50,
                  height: 50,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSyncMode = () => (
    <div className="side-by-side" ref={compareContainerRef}>
      <div className="photo-container-wrapper">
        <div
          ref={leftContainerRef}
          className={`photo-container sync-mode ${dragOver === 'left' ? 'drag-over' : ''}`}
          onClick={() => !leftImage && triggerUpload('left')}
          onDrop={(e) => handleDrop(e, 'left')}
          onDragOver={(e) => handleDragOver(e, 'left')}
          onDragLeave={handleDragLeave}
          onScroll={(e) => handleSyncScroll(e, 'left')}
        >
          {leftImage ? (
            <img
              ref={leftImageRef}
              src={leftImage.url}
              alt={leftImage.name}
              className="photo-img"
              style={{ maxWidth: 'none', maxHeight: 'none' }}
              draggable={false}
              onClick={(e) => handleImageClick(e, 'left')}
            />
          ) : (
            <div className="upload-placeholder">
              <div className="upload-placeholder-icon">+</div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>上传参考图</div>
                <div style={{ fontSize: 12 }}>点击或拖拽图片到此处</div>
              </div>
            </div>
          )}
        </div>
        <div className="photo-info">
          <span className="photo-info-name">{leftImage ? leftImage.name : '未上传参考图'}</span>
          <span className="photo-info-size">
            {leftImage ? `${leftImage.width} × ${leftImage.height}` : '--'}
          </span>
        </div>
      </div>

      <div className="photo-container-wrapper">
        <div
          ref={rightContainerRef}
          className={`photo-container sync-mode ${dragOver === 'right' ? 'drag-over' : ''}`}
          onClick={() => !rightImage && triggerUpload('right')}
          onDrop={(e) => handleDrop(e, 'right')}
          onDragOver={(e) => handleDragOver(e, 'right')}
          onDragLeave={handleDragLeave}
          onScroll={(e) => handleSyncScroll(e, 'right')}
        >
          {rightImage ? (
            <img
              ref={rightImageRef}
              src={rightImage.url}
              alt={rightImage.name}
              className="photo-img"
              style={{ maxWidth: 'none', maxHeight: 'none' }}
              draggable={false}
              onClick={(e) => handleImageClick(e, 'right')}
            />
          ) : (
            <div className="upload-placeholder">
              <div className="upload-placeholder-icon">+</div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>上传对比图</div>
                <div style={{ fontSize: 12 }}>点击或拖拽图片到此处</div>
              </div>
            </div>
          )}
        </div>
        <div className="photo-info">
          <span className="photo-info-name">{rightImage ? rightImage.name : '未上传对比图'}</span>
          <span className="photo-info-size">
            {rightImage ? `${rightImage.width} × ${rightImage.height}` : '--'}
          </span>
        </div>
      </div>

      {mode === 'sync' && magnifier.visible && (
        <Magnifier
          imageUrl={magnifierImage === 'left' ? leftImage?.url || '' : rightImage?.url || ''}
          imageX={magnifier.imageX}
          imageY={magnifier.imageY}
          zoom={zoom}
          windowX={magnifier.windowX}
          windowY={magnifier.windowY}
          isMobile={isMobile}
          containerRef={compareContainerRef}
          onClose={closeMagnifier}
          onPositionChange={updateMagnifierPosition}
        />
      )}
    </div>
  );

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-title">照片细节对比放大镜</div>
        <div className="navbar-controls">
          <button className="btn" onClick={() => triggerUpload('left')}>
            上传参考图
          </button>
          <button className="btn" onClick={() => triggerUpload('right')}>
            上传对比图
          </button>

          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'split' ? 'active' : ''}`}
              onClick={() => setMode('split')}
            >
              分割对比
            </button>
            <button
              className={`mode-btn ${mode === 'sync' ? 'active' : ''}`}
              onClick={() => setMode('sync')}
            >
              同步浏览
            </button>
          </div>

          <div className="zoom-selector">
            {([2, 4, 8] as ZoomLevel[]).map((z) => (
              <button
                key={z}
                className={`zoom-btn ${zoom === z ? 'active' : ''}`}
                onClick={() => setZoom(z)}
              >
                {z}x
              </button>
            ))}
          </div>

          <button className="btn" onClick={handleReset}>
            重置
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            导出截图
          </button>
        </div>
      </nav>

      <div className="main-content">{mode === 'split' ? renderSplitMode() : renderSyncMode()}</div>

      {showToast && <div className="success-toast">导出成功！</div>}
    </div>
  );
};

export default PhotoCompare;
