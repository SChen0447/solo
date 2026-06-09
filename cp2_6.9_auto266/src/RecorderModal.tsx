import { useState, useRef, useEffect } from 'react';
import type { EmotionRecord, NewRecordData } from './types';
import { format } from 'date-fns';

interface RecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewRecordData) => void;
  onDelete?: (id: string) => void;
  onLike?: (id: string) => void;
  viewingRecord?: EmotionRecord | null;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

const EMOTION_PRESETS = [
  { label: '愤怒', start: '#FF4444', end: '#FF8800' },
  { label: '焦躁', start: '#FF6B6B', end: '#FFD93D' },
  { label: '焦虑', start: '#FF8C42', end: '#FFD166' },
  { label: '平静', start: '#F7DC6F', end: '#A8E6CF' },
  { label: '愉悦', start: '#A8E6CF', end: '#88D8AB' },
  { label: '兴奋', start: '#74B9FF', end: '#0984E3' },
  { label: '感伤', start: '#A29BFE', end: '#6C5CE7' },
  { label: '忧郁', start: '#636E72', end: '#2D3436' },
];

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ] : null;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h, s, v };
}

export default function RecorderModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  onLike,
  viewingRecord,
}: RecorderModalProps) {
  const isViewing = !!viewingRecord;
  const [hsv, setHsv] = useState<HSV>({ h: 0, s: 0.8, v: 0.9 });
  const [hsv2, setHsv2] = useState<HSV>({ h: 60, s: 0.7, v: 0.95 });
  const [gradientStart, setGradientStart] = useState('#FF6B6B');
  const [gradientEnd, setGradientEnd] = useState('#FFD93D');
  const [emotionLabel, setEmotionLabel] = useState('焦躁');
  const [diary, setDiary] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liked, setLiked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const svPickerRef = useRef<HTMLDivElement>(null);
  const [svDragging, setSvDragging] = useState(false);
  const [hueDragging, setHueDragging] = useState(false);
  const [isStartColor, setIsStartColor] = useState(true);

  useEffect(() => {
    if (viewingRecord) {
      setGradientStart(viewingRecord.gradientStart);
      setGradientEnd(viewingRecord.gradientEnd);
      setEmotionLabel(viewingRecord.emotionLabel);
      setDiary(viewingRecord.diary);
      setImage(viewingRecord.image);
      const rgb1 = hexToRgb(viewingRecord.gradientStart);
      if (rgb1) setHsv(rgbToHsv(rgb1[0], rgb1[1], rgb1[2]));
      const rgb2 = hexToRgb(viewingRecord.gradientEnd);
      if (rgb2) setHsv2(rgbToHsv(rgb2[0], rgb2[1], rgb2[2]));
    } else {
      setGradientStart('#FF6B6B');
      setGradientEnd('#FFD93D');
      setEmotionLabel('焦躁');
      setDiary('');
      setImage(null);
      setHsv({ h: 0, s: 0.8, v: 0.9 });
      setHsv2({ h: 60, s: 0.7, v: 0.95 });
    }
    setLiked(false);
  }, [viewingRecord, isOpen]);

  useEffect(() => {
    const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(r, g, b);
    if (isStartColor) {
      setGradientStart(hex);
    }
  }, [hsv, isStartColor]);

  useEffect(() => {
    const [r, g, b] = hsvToRgb(hsv2.h, hsv2.s, hsv2.v);
    const hex = rgbToHex(r, g, b);
    if (!isStartColor) {
      setGradientEnd(hex);
    }
  }, [hsv2, isStartColor]);

  const activeHsv = isStartColor ? hsv : hsv2;
  const setActiveHsv = (newHsv: HSV) => {
    if (isStartColor) setHsv(newHsv);
    else setHsv2(newHsv);
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setHueDragging(true);
    updateHueFromEvent(e.nativeEvent);
  };

  const updateHueFromEvent = (e: MouseEvent | React.MouseEvent['nativeEvent']) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    const pos = isMobile
      ? (e.clientX - rect.left) / rect.width
      : (e.clientY - rect.top) / rect.height;
    const clampedPos = Math.max(0, Math.min(1, pos));
    setActiveHsv({ ...activeHsv, h: clampedPos * 360 });
  };

  const handleSvMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setSvDragging(true);
    updateSvFromEvent(e.nativeEvent);
  };

  const updateSvFromEvent = (e: MouseEvent | React.MouseEvent['nativeEvent']) => {
    if (!svPickerRef.current) return;
    const rect = svPickerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const s = Math.max(0, Math.min(1, x));
    const v = 1 - Math.max(0, Math.min(1, y));
    setActiveHsv({ ...activeHsv, s, v });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hueDragging) updateHueFromEvent(e);
      if (svDragging) updateSvFromEvent(e);
    };
    const handleMouseUp = () => {
      setHueDragging(false);
      setSvDragging(false);
    };
    if (hueDragging || svDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hueDragging, svDragging, activeHsv]);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSubmit = () => {
    onSubmit({
      gradientStart,
      gradientEnd,
      emotionLabel,
      diary,
      image,
    });
  };

  const handlePresetClick = (preset: typeof EMOTION_PRESETS[0]) => {
    setGradientStart(preset.start);
    setGradientEnd(preset.end);
    setEmotionLabel(preset.label);
    const rgb1 = hexToRgb(preset.start);
    if (rgb1) setHsv(rgbToHsv(rgb1[0], rgb1[1], rgb1[2]));
    const rgb2 = hexToRgb(preset.end);
    if (rgb2) setHsv2(rgbToHsv(rgb2[0], rgb2[1], rgb2[2]));
  };

  const handleLike = () => {
    if (viewingRecord && onLike && !liked) {
      onLike(viewingRecord.id);
      setLiked(true);
    }
  };

  const handleDelete = () => {
    if (viewingRecord && onDelete && window.confirm('确定删除这条情绪记录吗？')) {
      onDelete(viewingRecord.id);
    }
  };

  const hueRgb = hsvToRgb(activeHsv.h, 1, 1);
  const hueHex = rgbToHex(hueRgb[0], hueRgb[1], hueRgb[2]);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isViewing
              ? `${viewingRecord!.emotionLabel} · ${format(new Date(viewingRecord!.date), 'yyyy年MM月dd日')}`
              : '记录今天的情绪'}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {isViewing && viewingRecord ? (
          <div className="card-detail-view">
            <div
              className="card-detail-gradient"
              style={{ background: `linear-gradient(135deg, ${viewingRecord.gradientStart}, ${viewingRecord.gradientEnd})` }}
            />
            <div className="card-detail-diary">
              {viewingRecord.diary || '今天没有写下什么...'}
            </div>
            {viewingRecord.image && (
              <img src={viewingRecord.image} alt="" className="card-detail-image" />
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                className={`like-btn ${liked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                ❤ {viewingRecord.likes + (liked ? 1 : 0)} 点赞
              </button>
              <button className="delete-btn" onClick={handleDelete}>
                删除记录
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="color-section">
              <h3>选择情绪色</h3>

              <div className="emotion-presets">
                {EMOTION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    className="emotion-preset"
                    style={{
                      background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                      outline: emotionLabel === preset.label ? '2px solid #fff' : 'none',
                      outlineOffset: '2px',
                    }}
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  className={`emotion-preset`}
                  style={{
                    background: gradientStart,
                    outline: isStartColor ? '2px solid #fff' : 'none',
                    outlineOffset: '2px',
                    padding: '8px 16px',
                    borderRadius: 8,
                  }}
                  onClick={() => setIsStartColor(true)}
                >
                  起始色
                </button>
                <button
                  className={`emotion-preset`}
                  style={{
                    background: gradientEnd,
                    outline: !isStartColor ? '2px solid #fff' : 'none',
                    outlineOffset: '2px',
                    padding: '8px 16px',
                    borderRadius: 8,
                  }}
                  onClick={() => setIsStartColor(false)}
                >
                  结束色
                </button>
              </div>

              <div className="color-picker-wrapper" style={{ marginTop: 12 }}>
                <div
                  ref={hueSliderRef}
                  className="hue-slider"
                  onMouseDown={handleHueMouseDown}
                >
                  <div
                    className="hue-handle"
                    style={
                      isMobile
                        ? { left: `${(activeHsv.h / 360) * 100}%`, top: '-4px', width: '6px', height: '32px', transform: 'translateX(-50%)' }
                        : { top: `${(activeHsv.h / 360) * 100}%` }
                    }
                  />
                </div>
                <div
                  ref={svPickerRef}
                  className="sv-picker"
                  style={{
                    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})`,
                  }}
                  onMouseDown={handleSvMouseDown}
                >
                  <div
                    className="sv-handle"
                    style={{
                      left: `${activeHsv.s * 100}%`,
                      top: `${(1 - activeHsv.v) * 100}%`,
                      background: isStartColor ? gradientStart : gradientEnd,
                    }}
                  />
                </div>
              </div>

              <div
                className="color-preview"
                style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
              />

              <div className="gradient-inputs">
                <div className="gradient-input">
                  <label>起始色</label>
                  <input
                    type="text"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="gradient-input">
                  <label>结束色</label>
                  <input
                    type="text"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>

            <div className="text-section">
              <h3>写点什么</h3>
              <textarea
                className="diary-input"
                placeholder="今天的心情如何？有什么想记录的事？"
                value={diary}
                onChange={(e) => {
                  setDiary(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>

            <div className="photo-section">
              <h3>上传照片</h3>
              {image ? (
                <div>
                  <img src={image} alt="预览" className="photo-preview" />
                  <div className="photo-actions">
                    <button
                      className="photo-clear-btn"
                      onClick={() => setImage(null)}
                    >
                      移除照片
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`photo-upload-area ${isDragging ? 'dragging' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <span className="photo-upload-text">
                      点击或拖放图片到此处上传
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {!isViewing && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>取消</button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!gradientStart || !gradientEnd}
            >
              保存记录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
