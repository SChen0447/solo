import React, { useCallback, useRef, useState, memo } from 'react';

interface ImageUploaderProps {
  imageUrl: string | null;
  onImageSelect: (file: File, imageUrl: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ imageUrl, onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isGlowing, setIsGlowing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpg|jpeg|png|webp)$/)) {
      alert('请上传 jpg、png 或 webp 格式的图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      onImageSelect(file, url);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setIsGlowing(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setTimeout(() => setIsGlowing(false), 300);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsGlowing(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="upload-section">
      <h3 className="section-title">上传图片</h3>
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${isGlowing ? 'glowing' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {imageUrl ? (
          <div className="preview-container">
            <img src={imageUrl} alt="预览" className="preview-image" />
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">📷</div>
            <p className="upload-text">拖拽图片到这里，或点击上传</p>
            <p className="upload-hint">支持 jpg/png/webp，最大 5MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </div>
      {imageUrl && (
        <button className="reupload-btn" onClick={handleClick}>
          重新上传
        </button>
      )}
    </div>
  );
};

export default memo(ImageUploader);
