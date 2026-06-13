import { useState, useRef } from 'react';
import { bookApi, compressImage } from '../services/api';
import type { ToastType } from '../components/Toast';
import './Publish.css';

interface PublishProps {
  showToast: (message: string, type?: ToastType) => void;
}

function Publish({ showToast }: PublishProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxDescLength = 200;

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      showToast('图片大小不能超过10MB', 'error');
      return;
    }
    
    try {
      const compressed = await compressImage(file);
      setCoverPreview(compressed);
      setCoverUrl(compressed);
    } catch (error) {
      showToast('图片处理失败', 'error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverPreview('');
    setCoverUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      showToast('请输入书籍标题', 'error');
      return false;
    }
    if (!author.trim()) {
      showToast('请输入作者', 'error');
      return false;
    }
    if (!year) {
      showToast('请选择出版年份', 'error');
      return false;
    }
    const yearNum = parseInt(year);
    if (yearNum < 1900 || yearNum > 2024) {
      showToast('出版年份必须在1900-2024之间', 'error');
      return false;
    }
    if (description.length > maxDescLength) {
      showToast(`描述不能超过${maxDescLength}字`, 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      await bookApi.createBook({
        title: title.trim(),
        author: author.trim(),
        year: parseInt(year),
        coverUrl,
        description: description.trim(),
      });
      
      showToast('书籍发布成功！');
      
      setTitle('');
      setAuthor('');
      setYear('');
      setDescription('');
      setCoverUrl('');
      setCoverPreview('');
      
    } catch (error) {
      console.error('发布失败', error);
      showToast('发布失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="publish-page">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">发布书籍</h1>
          <p className="page-desc">分享你的闲置书籍，让书香流转起来</p>
        </div>
        
        <form className="publish-form glass-effect" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                书籍标题 <span className="required">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="请输入书籍标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">
                作者 <span className="required">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="请输入作者姓名"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              出版年份 <span className="required">*</span>
            </label>
            <input
              type="number"
              className="input"
              placeholder="请选择出版年份（1900-2024）"
              min="1900"
              max="2024"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              书籍描述
            </label>
            <div className="textarea-wrapper">
              <textarea
                className="input"
                placeholder="请输入书籍描述，不超过200字"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, maxDescLength))}
                maxLength={maxDescLength}
                rows={4}
              />
              <span className={`char-count ${description.length >= maxDescLength ? 'warning' : ''}`}>
                {description.length}/{maxDescLength}
              </span>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              封面图片
            </label>
            {coverPreview ? (
              <div className="cover-preview">
                <img src={coverPreview} alt="封面预览" />
                <button
                  type="button"
                  className="remove-cover"
                  onClick={handleRemoveCover}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className={`upload-area ${isDragging ? 'dragging' : ''}`}
                onClick={handleUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleInputChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="upload-text">点击或拖拽上传封面图片</p>
                <p className="upload-hint">支持 JPG、PNG 格式，将自动压缩到300KB以内</p>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="btn btn-primary btn-bounce submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M4 12a8 8 0 018-8" />
                </svg>
                发布中...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                发布书籍
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Publish;
