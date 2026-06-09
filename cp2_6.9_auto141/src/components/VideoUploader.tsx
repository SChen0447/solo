import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';

interface VideoUploaderProps {
  onUpload: (file: File, duration: number) => void;
}

const VideoUploader = ({ onUpload }: VideoUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 200 * 1024 * 1024;

  const validateAndUpload = useCallback(async (file: File) => {
    setError('');

    if (!file.name.toLowerCase().endsWith('.mp4')) {
      setError('仅支持 MP4 格式视频');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('视频大小不能超过 200MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        onUpload(file, result.duration);
      } else {
        setError(result.error || '上传失败');
      }
    } catch (err) {
      setError('上传请求失败，请稍后重试');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  }, [validateAndUpload]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [validateAndUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.dropZone,
          backgroundColor: isDragging ? '#16213E' : '#1A1A2E',
          borderColor: isDragging ? '#FF6F00' : 'rgba(255,255,255,0.2)'
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,.mp4"
          style={styles.hiddenInput}
          onChange={handleFileChange}
        />
        {isUploading ? (
          <div style={styles.loadingContent}>
            <div style={styles.spinner} />
            <p style={styles.uploadingText}>正在上传并解析视频...</p>
          </div>
        ) : (
          <div style={styles.content}>
            <div style={styles.icon}>📹</div>
            <p style={styles.title}>拖拽 MP4 视频到此处</p>
            <p style={styles.subtitle}>或点击选择文件（最大 200MB）</p>
          </div>
        )}
      </div>
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%'
  },
  dropZone: {
    width: '100%',
    minHeight: 120,
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  },
  content: {
    textAlign: 'center',
    padding: 16
  },
  loadingContent: {
    textAlign: 'center',
    padding: 16
  },
  icon: {
    fontSize: 36,
    marginBottom: 8
  },
  title: {
    fontSize: 16,
    fontWeight: 500,
    color: '#EAEAEA',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#888'
  },
  uploadingText: {
    fontSize: 14,
    color: '#FF6F00',
    marginTop: 12
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid rgba(255,111,0,0.2)',
    borderTop: '3px solid #FF6F00',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  },
  hiddenInput: {
    display: 'none'
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center'
  }
};

const styleSheet = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('uploader-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'uploader-spinner-style';
  style.textContent = styleSheet;
  document.head.appendChild(style);
}

export default VideoUploader;
