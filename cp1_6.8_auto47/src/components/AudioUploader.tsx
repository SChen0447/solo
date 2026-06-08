import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { AudioMetadata } from '../types';

interface AudioUploaderProps {
  onUploadComplete: (metadata: AudioMetadata) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({
  onUploadComplete,
  onUploadStart,
  onUploadError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      setError('文件大小不能超过 20MB');
      return false;
    }

    if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
      setError('只支持 MP3 格式的音频文件');
      return false;
    }

    return true;
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!validateFile(file)) {
      if (onUploadError) {
        onUploadError(error || '文件验证失败');
      }
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    if (onUploadStart) {
      onUploadStart();
    }

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      if (response.data.success) {
        const audio = new Audio();
        audio.src = response.data.url;
        audio.addEventListener('loadedmetadata', () => {
          const metadata: AudioMetadata = {
            ...response.data,
            duration: audio.duration * 1000,
          };
          onUploadComplete(metadata);
          setIsUploading(false);
        });
        audio.addEventListener('error', () => {
          onUploadComplete(response.data);
          setIsUploading(false);
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || '上传失败，请重试';
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
      setIsUploading(false);
    }
  }, [onUploadComplete, onUploadStart, onUploadError, error]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`upload-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/mpeg,audio/mp3,.mp3"
        style={{ display: 'none' }}
      />

      <div className="upload-content">
        <div className="upload-icon">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <h3 className="upload-title">上传音频文件</h3>

        <p className="upload-description">
          拖拽 MP3 文件到此处，或点击选择文件
        </p>

        <p className="upload-hint">
          支持 MP3 格式，最大 20MB
        </p>

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">{uploadProgress}%</span>
          </div>
        )}

        {error && (
          <p className="upload-error">{error}</p>
        )}
      </div>

      <style>{`
        .upload-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 300px;
          border: 2px dashed #333;
          border-radius: 16px;
          background: rgba(26, 26, 46, 0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .upload-container:hover {
          border-color: #00ffaa;
          background: rgba(0, 255, 170, 0.05);
        }

        .upload-container.dragging {
          border-color: #00ffaa;
          background: rgba(0, 255, 170, 0.1);
          transform: scale(1.02);
        }

        .upload-content {
          text-align: center;
          padding: 40px;
        }

        .upload-icon {
          color: #00ffaa;
          margin-bottom: 20px;
          transition: transform 0.3s ease;
        }

        .upload-container:hover .upload-icon {
          transform: translateY(-5px);
        }

        .upload-title {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 12px 0;
          background: linear-gradient(90deg, #00ffaa, #ff00aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .upload-description {
          font-size: 16px;
          color: #aaa;
          margin: 0 0 8px 0;
        }

        .upload-hint {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .upload-progress {
          margin-top: 20px;
        }

        .progress-bar {
          width: 200px;
          height: 6px;
          background: #333;
          border-radius: 3px;
          overflow: hidden;
          margin: 0 auto 8px auto;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ffaa, #ff00aa);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 14px;
          color: #00ffaa;
        }

        .upload-error {
          margin-top: 16px;
          color: #ff4466;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default AudioUploader;
