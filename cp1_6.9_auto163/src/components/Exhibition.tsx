import { useState, useEffect, useCallback, useRef } from 'react';
import type { Artwork } from '../types';

interface ExhibitionProps {
  onSelectArtwork: (artwork: Artwork) => void;
  onArtworkCreated: () => void;
  refreshTrigger: number;
}

const STAR_COLORS = [
  '#ff4477', '#44bbff', '#77ff88', '#ffaa44',
  '#aa44ff', '#44ffdd', '#ff66cc', '#88ff44',
  '#ff4444', '#4488ff', '#ffdd44', '#cc44ff',
];

function Exhibition({ onSelectArtwork, onArtworkCreated, refreshTrigger }: ExhibitionProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [imageData, setImageData] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = 'http://localhost:5174';

  useEffect(() => {
    const fetchArtworks = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/artworks`);
        if (res.ok) {
          const data = await res.json();
          setArtworks(data);
        }
      } catch (err) {
        console.error('Failed to fetch artworks:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtworks();
  }, [refreshTrigger]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过2MB');
      return;
    }

    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageData(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const resetForm = useCallback(() => {
    setTitle('');
    setSelectedColor('');
    setImageData('');
    setFileName('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('请输入作品标题');
      return;
    }
    if (title.length > 20) {
      setError('标题不能超过20字');
      return;
    }
    if (!selectedColor) {
      setError('请选择颜色基调');
      return;
    }
    if (!imageData) {
      setError('请上传作品图片');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const res = await fetch(`${API_BASE}/api/artworks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          color: selectedColor,
          imageData,
        }),
      });

      if (res.ok) {
        onArtworkCreated();
        setShowModal(false);
        resetForm();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '上传失败，请重试');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setUploading(false);
    }
  }, [title, selectedColor, imageData, onArtworkCreated, resetForm]);

  const openModal = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    if (!uploading) {
      setShowModal(false);
      resetForm();
    }
  }, [uploading, resetForm]);

  const getGradientStyle = (color: string) => ({
    background: `linear-gradient(135deg, ${color}44 0%, #0a0a12 100%)`,
  });

  return (
    <>
      <header className="header">
        <h1>远光映像馆</h1>
        <p>YUANGUANG LIGHT GALLERY</p>
      </header>

      <div className="exhibition-container">
        <div className="toolbar">
          <span className="back-link" style={{ visibility: 'hidden' }}>返回</span>
          <button className="btn btn-primary" onClick={openModal}>
            ✨ 上传新作
          </button>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : artworks.length === 0 ? (
          <div className="gallery-grid">
            <div className="empty-state">
              <div className="empty-state-icon">🌌</div>
              <div className="empty-state-text">展厅暂无作品，点击上方按钮上传您的第一件光绘作品</div>
            </div>
          </div>
        ) : (
          <div className="gallery-grid">
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="artwork-card"
                onClick={() => onSelectArtwork(artwork)}
              >
                {artwork.imageData ? (
                  <img
                    src={artwork.imageData}
                    alt={artwork.title}
                    className="artwork-thumbnail"
                  />
                ) : (
                  <div
                    className="artwork-placeholder"
                    style={getGradientStyle(artwork.color)}
                  />
                )}
                <div className="artwork-title">{artwork.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">上传光绘作品</h2>

            <div className="form-group">
              <label className="form-label">作品标题</label>
              <input
                type="text"
                className="form-input"
                placeholder="请输入作品标题（最多20字）"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={20}
                disabled={uploading}
              />
              <div className="char-count">{title.length}/20</div>
            </div>

            <div className="form-group">
              <label className="form-label">颜色基调</label>
              <div className="color-picker">
                {STAR_COLORS.map((color) => (
                  <div
                    key={color}
                    className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color, color }}
                    onClick={() => !uploading && setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">作品图片（JPG/PNG，最大2MB）</label>
              <label className="file-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {fileName ? (
                  <div className="file-upload-text">📎 {fileName}</div>
                ) : (
                  <div className="file-upload-text">点击选择图片文件</div>
                )}
              </label>
              {imageData && (
                <div className="file-preview">
                  <img src={imageData} alt="预览" />
                </div>
              )}
            </div>

            {error && <div className="error">{error}</div>}

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={uploading}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={uploading}
              >
                {uploading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Exhibition;
