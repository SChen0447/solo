import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MediaFile,
  MediaType,
  Bottle,
  BottleColor,
  BOTTLE_COLORS,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_VIDEO_TYPES,
} from './interface';

interface BottleEditorProps {
  currentUserId: string;
  onSubmit: (bottle: Bottle) => void;
  onCancel: () => void;
}

interface UploadProgress {
  [key: string]: number;
}

const PocketWatchPicker = ({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) => {
  const [showHourglass, setShowHourglass] = useState(false);
  const [dragging, setDragging] = useState(false);
  const watchRef = useRef<HTMLDivElement>(null);
  const [handAngle, setHandAngle] = useState(0);

  const presetDates = [
    { label: '1天后', days: 1 },
    { label: '1周后', days: 7 },
    { label: '1月后', days: 30 },
    { label: '1年后', days: 365 },
    { label: '生日', days: -1 },
  ];

  const handlePreset = (days: number) => {
    setShowHourglass(true);
    setTimeout(() => {
      if (days === -1) {
        const nextBirthday = new Date();
        nextBirthday.setMonth(5, 15);
        if (nextBirthday < new Date()) {
          nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
        }
        onChange(nextBirthday);
      } else {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        onChange(newDate);
      }
      setTimeout(() => setShowHourglass(false), 600);
    }, 300);
  };

  const handleWatchMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    updateHandAngle(e);
  };

  const updateHandAngle = (e: React.MouseEvent | MouseEvent) => {
    if (!watchRef.current) return;
    const rect = watchRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const normalizedAngle = ((angle + 90) % 360 + 360) % 360;
    setHandAngle(normalizedAngle);

    const daysToAdd = Math.floor((normalizedAngle / 360) * 365);
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + Math.max(1, daysToAdd));
    onChange(newDate);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) updateHandAngle(e);
    };
    const handleMouseUp = () => setDragging(false);

    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <div className="pocket-watch-container">
      <div className="pocket-watch-label">选择开启时间</div>
      <div className="watch-row">
        <div
          className="pocket-watch"
          ref={watchRef}
          onMouseDown={handleWatchMouseDown}
        >
          <div className="watch-outer-ring">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className={`watch-tick ${i % 5 === 0 ? 'major' : 'minor'}`}
                style={{
                  transform: `rotate(${i * 6}deg) translateY(-58px)`,
                }}
              />
            ))}
          </div>
          <div className="watch-face">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="watch-number"
                style={{
                  transform: `rotate(${i * 30}deg) translateY(-45px) rotate(${-i * 30}deg)`,
                }}
              >
                {i === 0 ? '365' : `${i * 30}`}
              </div>
            ))}
            <div
              className={`watch-hand ${dragging ? 'dragging' : ''}`}
              style={{ transform: `rotate(${handAngle}deg)` }}
            />
            <div className="watch-center" />
          </div>
          <div className="watch-crown" />
        </div>

        <div className="date-presets">
          {presetDates.map((p) => (
            <button
              key={p.label}
              className="preset-btn"
              onClick={() => handlePreset(p.days)}
            >
              {p.label}
            </button>
          ))}
          <input
            type="datetime-local"
            className="date-input"
            value={value.toISOString().slice(0, 16)}
            onChange={(e) => {
              setShowHourglass(true);
              setTimeout(() => {
                onChange(new Date(e.target.value));
                setTimeout(() => setShowHourglass(false), 600);
              }, 300);
            }}
          />
        </div>
      </div>

      <div className="selected-date">
        开启日期：<span className="date-highlight">{value.toLocaleString()}</span>
      </div>

      {showHourglass && (
        <div className="hourglass-animation">
          <div className="hourglass">
            <div className="sand-top" />
            <div className="sand-bottom" />
            <div className="sand-falling" />
          </div>
        </div>
      )}
    </div>
  );
};

export default function BottleEditor({
  currentUserId,
  onSubmit,
  onCancel,
}: BottleEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fontFamily, setFontFamily] = useState<'default' | 'handwriting'>('default');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [openAt, setOpenAt] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [color, setColor] = useState<BottleColor>('blue');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isDragging, setIsDragging] = useState(false);
  const [displayedChars, setDisplayedChars] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (displayedChars < content.length) {
      const timer = setTimeout(() => {
        setDisplayedChars((prev) => Math.min(prev + 1, content.length));
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [content, displayedChars]);

  const getMediaType = (type: string): MediaType | null => {
    if (ALLOWED_IMAGE_TYPES.includes(type)) return 'image';
    if (ALLOWED_AUDIO_TYPES.includes(type)) return 'audio';
    if (ALLOWED_VIDEO_TYPES.includes(type)) return 'video';
    return null;
  };

  const simulateUpload = useCallback((file: File) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const mediaType = getMediaType(file.type);
    if (!mediaType) {
      alert('不支持的文件格式！请上传 jpg/png/mp3/wav/mp4 文件');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('文件过大！最大支持 20MB');
      return;
    }

    setUploadProgress((prev) => ({ ...prev, [tempId]: 0 }));

    const url = URL.createObjectURL(file);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        const newMedia: MediaFile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: mediaType,
          url,
          name: file.name,
          size: file.size,
        };

        setMedia((prev) => [...prev, newMedia]);
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      } else {
        setUploadProgress((prev) => ({ ...prev, [tempId]: progress }));
      }
    }, 100);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(simulateUpload);
    },
    [simulateUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(simulateUpload);
      e.target.value = '';
    },
    [simulateUpload]
  );

  const removeMedia = useCallback((id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleSubmit = () => {
    if (!content.trim() && media.length === 0) {
      alert('请至少写下一些内容或上传素材哦~');
      return;
    }

    const bottle: Bottle = {
      id: `bottle-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: title.trim(),
      content: content.trim(),
      fontFamily,
      media,
      openAt: openAt.getTime(),
      createdAt: Date.now(),
      creatorId: currentUserId,
      color,
      blessings: [],
      position: {
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 70,
        speed: 0.3 + Math.random() * 0.5,
        direction: Math.random() > 0.5 ? 1 : -1,
        size: 50 + Math.random() * 30,
      },
    };

    onSubmit(bottle);
  };

  return (
    <>
      <style>{editorStyles}</style>
      <div className="bottle-editor">
        <div className="editor-header">
          <button className="back-btn" onClick={onCancel}>
            ← 返回时光海
          </button>
          <h1 className="editor-title">✒️ 书写你的时空胶囊</h1>
          <div className="color-picker">
            <span className="color-label">瓶身颜色：</span>
            {Object.entries(BOTTLE_COLORS).map(([key, value]) => (
              <button
                key={key}
                className={`color-dot ${color === key ? 'selected' : ''}`}
                style={{ backgroundColor: value }}
                onClick={() => setColor(key as BottleColor)}
              />
            ))}
          </div>
        </div>

        <div className="editor-body">
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.mp3,.wav,.mp4,image/*,audio/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div className="upload-placeholder">
              <div className="upload-icon">📎</div>
              <div className="upload-text">拖拽文件到此处或点击上传</div>
              <div className="upload-hint">支持 jpg/png/mp3/wav/mp4，最大 20MB</div>
            </div>

            {media.length > 0 && (
              <div className="media-grid">
                {media.map((m) => (
                  <div key={m.id} className="media-item-card">
                    {m.type === 'image' && <img src={m.url} alt={m.name} />}
                    {m.type === 'audio' && (
                      <div className="audio-preview">
                        <span>🎵</span>
                        <span className="audio-name">{m.name}</span>
                      </div>
                    )}
                    {m.type === 'video' && <video src={m.url} muted />}
                    <button
                      className="remove-media"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedia(m.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(uploadProgress).length > 0 && (
              <div className="upload-progress-container">
                {Object.entries(uploadProgress).map(([id, progress]) => (
                  <div key={id} className="upload-progress-item">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="progress-text">{Math.floor(progress)}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-edit-zone">
            <div className="font-selector">
              <span className="font-label">字体：</span>
              <button
                className={`font-btn ${fontFamily === 'default' ? 'active' : ''}`}
                onClick={() => setFontFamily('default')}
              >
                默认
              </button>
              <button
                className={`font-btn ${fontFamily === 'handwriting' ? 'active' : ''}`}
                style={{ fontFamily: 'cursive, serif' }}
                onClick={() => setFontFamily('handwriting')}
              >
                手写体
              </button>
            </div>

            <input
              type="text"
              className="title-input"
              placeholder="给胶囊起个标题（可选）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={30}
            />

            <div className="text-box-wrapper">
              <div className="corner-decoration corner-tl" />
              <div className="corner-decoration corner-tr" />
              <div className="corner-decoration corner-bl" />
              <div className="corner-decoration corner-br" />
              <textarea
                className="content-textarea"
                placeholder="在这里写下你想说的话..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setDisplayedChars(0);
                }}
                style={{ fontFamily: fontFamily === 'handwriting' ? 'cursive, serif' : 'inherit' }}
              />
            </div>

            <div className="content-preview">
              <div
                className="preview-text"
                style={{ fontFamily: fontFamily === 'handwriting' ? 'cursive, serif' : 'inherit' }}
              >
                {content.slice(0, displayedChars)}
                {displayedChars < content.length && <span className="typing-cursor">|</span>}
              </div>
            </div>
          </div>
        </div>

        <PocketWatchPicker value={openAt} onChange={setOpenAt} />

        <div className="editor-footer">
          <button className="throw-btn" onClick={handleSubmit}>
            🌊 抛入时光海
          </button>
        </div>
      </div>
    </>
  );
}

const editorStyles = `
.bottle-editor {
  width: 100%;
  height: 100%;
  background-color: #f5deb3;
  background-image: 
    repeating-conic-gradient(
      from 0deg at 50% 50%,
      rgba(139, 90, 43, 0.03) 0deg 10deg,
      transparent 10deg 20deg
    ),
    radial-gradient(circle at 20% 30%, rgba(255, 248, 231, 0.5) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(222, 184, 135, 0.3) 0%, transparent 50%);
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.back-btn {
  background: rgba(139, 90, 43, 0.1);
  border: 1px solid rgba(139, 90, 43, 0.3);
  color: #5d4037;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(139, 90, 43, 0.2);
}

.editor-title {
  color: #5d4037;
  font-size: 24px;
  text-shadow: 1px 1px 2px rgba(139, 90, 43, 0.2);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-label {
  color: #8b7355;
  font-size: 14px;
}

.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-dot:hover {
  transform: scale(1.1);
}

.color-dot.selected {
  border-color: #d4af37;
  transform: scale(1.15);
}

.editor-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .editor-body {
    grid-template-columns: 1fr;
  }
}

.upload-zone {
  background: rgba(255, 248, 231, 0.7);
  border: 2px dashed rgba(139, 90, 43, 0.3);
  border-radius: 16px;
  padding: 20px;
  min-height: 350px;
  cursor: pointer;
  transition: all 0.3s;
  overflow-y: auto;
}

.upload-zone.dragging {
  border-color: #d4af37;
  background: rgba(255, 215, 0, 0.1);
  transform: scale(1.02);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 250px;
  color: #8b7355;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.upload-text {
  font-size: 16px;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  opacity: 0.7;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 15px;
}

.media-item-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
  aspect-ratio: 1;
}

.media-item-card img,
.media-item-card video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
  font-size: 24px;
  padding: 8px;
}

.audio-name {
  font-size: 10px;
  margin-top: 5px;
  text-align: center;
  color: #5d4037;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.remove-media {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-progress-container {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-progress-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(139, 90, 43, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #d4af37, #ffd700);
  border-radius: 4px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 12px;
  color: #8b7355;
  min-width: 35px;
}

.text-edit-zone {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.font-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.font-label {
  color: #8b7355;
  font-size: 14px;
}

.font-btn {
  padding: 6px 14px;
  border: 1px solid rgba(139, 90, 43, 0.3);
  background: rgba(255, 248, 231, 0.5);
  border-radius: 15px;
  cursor: pointer;
  color: #5d4037;
  transition: all 0.2s;
}

.font-btn.active {
  background: #d4af37;
  color: white;
  border-color: #b8941f;
}

.title-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(139, 90, 43, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  color: #5d4037;
  outline: none;
  transition: border-color 0.2s;
}

.title-input:focus {
  border-color: #d4af37;
}

.title-input::placeholder {
  color: #b8a082;
}

.text-box-wrapper {
  position: relative;
  padding: 25px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
}

.corner-decoration {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 2px solid #8b5a2b;
}

.corner-tl {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
  border-radius: 6px 0 0 0;
}

.corner-tr {
  top: 8px;
  right: 8px;
  border-left: none;
  border-bottom: none;
  border-radius: 0 6px 0 0;
}

.corner-bl {
  bottom: 8px;
  left: 8px;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 6px;
}

.corner-br {
  bottom: 8px;
  right: 8px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 6px 0;
}

.content-textarea {
  width: 100%;
  min-height: 180px;
  border: none;
  background: transparent;
  resize: none;
  font-size: 16px;
  line-height: 1.8;
  color: #5d4037;
  outline: none;
}

.content-textarea::placeholder {
  color: #b8a082;
}

.content-preview {
  padding: 15px;
  background: rgba(255, 248, 231, 0.7);
  border-radius: 10px;
  border: 1px dashed rgba(139, 90, 43, 0.2);
  min-height: 60px;
}

.preview-text {
  font-size: 15px;
  color: #5d4037;
  line-height: 1.8;
  white-space: pre-wrap;
}

.typing-cursor {
  animation: typingBlink 0.8s infinite;
}

@keyframes typingBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.pocket-watch-container {
  margin-top: 25px;
  padding: 20px;
  background: rgba(255, 248, 231, 0.6);
  border-radius: 16px;
  position: relative;
}

.pocket-watch-label {
  text-align: center;
  color: #5d4037;
  font-size: 18px;
  margin-bottom: 15px;
  font-weight: bold;
}

.watch-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
}

.pocket-watch {
  position: relative;
  width: 140px;
  height: 140px;
  cursor: grab;
  user-select: none;
}

.pocket-watch:active {
  cursor: grabbing;
}

.watch-outer-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4af37 0%, #b8941f 50%, #8b7355 100%);
  padding: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 2px 5px rgba(255, 255, 255, 0.3);
}

.watch-tick {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2px;
  background: #5d4037;
  transform-origin: center center;
}

.watch-tick.major {
  height: 8px;
  background: #8b5a2b;
}

.watch-tick.minor {
  height: 4px;
  opacity: 0.5;
}

.watch-face {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fffaf0, #f5deb3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 10px rgba(139, 90, 43, 0.2);
}

.watch-number {
  position: absolute;
  left: 50%;
  top: 50%;
  font-size: 9px;
  color: #8b5a2b;
  font-weight: bold;
  transform-origin: center center;
}

.watch-hand {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 45px;
  background: linear-gradient(180deg, #5d4037, #8b5a2b);
  border-radius: 2px;
  transform-origin: bottom center;
  margin-left: -1.5px;
  margin-top: -45px;
  transition: transform 0.1s ease-out;
  z-index: 2;
}

.watch-hand.dragging {
  transition: none;
}

.watch-center {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, #d4af37, #8b5a2b);
  z-index: 3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.watch-crown {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 12px;
  background: linear-gradient(180deg, #d4af37, #8b7355);
  border-radius: 4px 4px 2px 2px;
}

.date-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-btn {
  padding: 8px 20px;
  border: 1px solid rgba(139, 90, 43, 0.3);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  cursor: pointer;
  color: #5d4037;
  font-size: 13px;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #d4af37;
  color: white;
  border-color: #b8941f;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid rgba(139, 90, 43, 0.3);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  color: #5d4037;
  font-size: 13px;
  outline: none;
}

.selected-date {
  text-align: center;
  margin-top: 15px;
  color: #8b7355;
  font-size: 14px;
}

.date-highlight {
  color: #5d4037;
  font-weight: bold;
  margin-left: 5px;
}

.hourglass-animation {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.hourglass {
  width: 40px;
  height: 50px;
  position: relative;
  animation: hourglassFlip 0.6s ease-in-out;
}

.hourglass::before,
.hourglass::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 25px;
  border: 3px solid #8b5a2b;
  background: rgba(255, 215, 0, 0.3);
}

.hourglass::before {
  top: 0;
  border-radius: 5px 5px 0 0;
  clip-path: polygon(0 0, 100% 0, 60% 100%, 40% 100%);
}

.hourglass::after {
  bottom: 0;
  border-radius: 0 0 5px 5px;
  clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
}

.sand-top {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(100% - 6px);
  height: 18px;
  background: linear-gradient(180deg, #ffd700, #daa520);
  clip-path: polygon(0 0, 100% 0, 55% 100%, 45% 100%);
  animation: sandTop 0.6s ease-in forwards;
}

.sand-bottom {
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: calc(100% - 6px);
  height: 0;
  background: linear-gradient(180deg, #ffd700, #daa520);
  clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%);
  animation: sandBottom 0.6s ease-out forwards;
  animation-delay: 0.1s;
}

.sand-falling {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 0;
  background: #ffd700;
  transform: translate(-50%, -50%);
  animation: sandFall 0.5s linear forwards;
}

@keyframes hourglassFlip {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(180deg); }
}

@keyframes sandTop {
  0% { height: 18px; }
  100% { height: 2px; }
}

@keyframes sandBottom {
  0% { height: 0; }
  100% { height: 18px; }
}

@keyframes sandFall {
  0% { height: 0; opacity: 1; }
  100% { height: 20px; opacity: 0.5; }
}

.editor-footer {
  margin-top: 25px;
  display: flex;
  justify-content: center;
}

.throw-btn {
  padding: 15px 50px;
  font-size: 18px;
  border: none;
  border-radius: 30px;
  background: linear-gradient(180deg, #2196f3 0%, #1565c0 100%);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
  transition: all 0.3s;
}

.throw-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.5);
}

.throw-btn:active {
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .bottle-editor {
    padding: 15px;
  }
  
  .editor-title {
    font-size: 20px;
  }
  
  .pocket-watch {
    width: 110px;
    height: 110px;
  }
  
  .watch-hand {
    height: 35px;
    margin-top: -35px;
  }
}
`;
