import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { UploadResponse } from '../types';
import './UploadCard.scss';

interface UploadCardProps {
  onUploadStart: () => void;
  onUploadSuccess: (response: UploadResponse) => void;
  onUploadEnd: () => void;
}

function UploadCard({ onUploadStart, onUploadSuccess, onUploadEnd }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const foodIcons = ['🥬', '🍎', '🌾', '🥕', '🍅', '🍄', '🌽', '🥦'];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('请上传 JPG 或 PNG 格式的图片');
      return false;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    onUploadStart();
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      
      const response = await axios.post<UploadResponse>('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.data.success) {
        onUploadSuccess(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败，请重试');
      setPreviewImage('');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        onUploadEnd();
      }, 500);
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleReset = () => {
    setPreviewImage('');
    setError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-card">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''} ${previewImage ? 'has-preview' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={handleFileInput}
          className="file-input"
        />
        
        {previewImage ? (
          <div className="preview-wrapper">
            <img src={previewImage} alt="预览" className="preview-image" />
            {!isUploading && (
              <button 
                className="reset-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
              >
                重新上传
              </button>
            )}
          </div>
        ) : (
          <>
            {isDragging && (
              <div className="ripple-container">
                <span className="ripple"></span>
                <span className="ripple" style={{ animationDelay: '0.3s' }}></span>
                <span className="ripple" style={{ animationDelay: '0.6s' }}></span>
              </div>
            )}
            
            <div className="upload-icon">☁️</div>
            <p className="upload-text">点击或拖拽上传</p>
            <p className="upload-hint">支持 JPG / PNG 格式，最大 5MB</p>
          </>
        )}
        
        {isUploading && (
          <div className="upload-progress-overlay">
            <div className="progress-icons">
              {foodIcons.map((icon, index) => (
                <span 
                  key={index} 
                  className="progress-icon"
                  style={{ 
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  {icon}
                </span>
              ))}
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${Math.min(uploadProgress, 100)}%` }}
              ></div>
            </div>
            <p className="progress-text">AI正在识别食材...</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="upload-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default UploadCard;
