import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import type { Note, NoteFormData, Category } from '../types';
import { CATEGORIES } from '../types';
import StarRating from './StarRating';
import { renderMarkdown } from '../utils/markdown';

interface NoteFormProps {
  note: Note | null;
  onSubmit: (data: NoteFormData) => void;
  onClose: () => void;
}

export default function NoteForm({ note, onSubmit, onClose }: NoteFormProps) {
  const [formData, setFormData] = useState<NoteFormData>({
    title: '',
    author: '',
    category: 'science',
    rating: 4,
    content: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!note;

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        author: note.author,
        category: note.category,
        rating: note.rating,
        content: note.content,
      });
    } else {
      setFormData({
        title: '',
        author: '',
        category: 'science',
        rating: 4,
        content: '',
      });
    }
    setTimeout(() => titleInputRef.current?.focus(), 300);
  }, [note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim() || !formData.content.trim()) {
      return;
    }
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof NoteFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="note-form-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        className={`note-form-panel ${isEditing ? 'editing' : 'adding'}`}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          height: '100%',
          width: '400px',
          maxWidth: '100vw',
          backgroundColor: 'rgba(22, 33, 62, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
          overflowY: 'auto',
          animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            padding: '20px 24px',
            backgroundColor: 'rgba(22, 33, 62, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#fff' }}>
            {isEditing ? '编辑书评' : '新增书评'}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#aaa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#aaa';
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: '#aaa',
                fontWeight: 500,
              }}
            >
              书名
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              placeholder="输入书名..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#e94560';
                e.target.style.boxShadow = '0 0 0 3px rgba(233, 69, 96, 0.2)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: '#aaa',
                fontWeight: 500,
              }}
            >
              作者
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={e => handleInputChange('author', e.target.value)}
              placeholder="输入作者名..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#e94560';
                e.target.style.boxShadow = '0 0 0 3px rgba(233, 69, 96, 0.2)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: '#aaa',
                fontWeight: 500,
              }}
            >
              类别
            </label>
            <select
              value={formData.category}
              onChange={e => handleInputChange('category', e.target.value as Category)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#e94560';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                color: '#aaa',
                fontWeight: 500,
              }}
            >
              评分
            </label>
            <StarRating
              rating={formData.rating}
              onRatingChange={rating => handleInputChange('rating', rating)}
              size={24}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <label style={{ fontSize: '13px', color: '#aaa', fontWeight: 500 }}>
                读书笔记
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  fontSize: '12px',
                  color: showPreview ? '#e94560' : '#888',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {showPreview ? '返回编辑' : '预览 Markdown'}
              </button>
            </div>
            {!showPreview ? (
              <textarea
                value={formData.content}
                onChange={e => handleInputChange('content', e.target.value)}
                placeholder="写下你的读书笔记...

支持 Markdown 语法：
# 一级标题
**粗体文字**
- 列表项
> 引用文字"
                rows={10}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(26, 26, 46, 0.8)',
                  color: '#fff',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#e94560';
                  e.target.style.boxShadow = '0 0 0 3px rgba(233, 69, 96, 0.2)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            ) : (
              <div
                className="markdown-preview"
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(26, 26, 46, 0.8)',
                  color: '#ddd',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  minHeight: '200px',
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.content) }}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={!formData.title.trim() || !formData.author.trim() || !formData.content.trim()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#e94560',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              opacity:
                !formData.title.trim() || !formData.author.trim() || !formData.content.trim()
                  ? 0.5
                  : 1,
            }}
            onMouseEnter={e => {
              if (
                formData.title.trim() &&
                formData.author.trim() &&
                formData.content.trim()
              ) {
                e.currentTarget.style.backgroundColor = '#ff6b9d';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#e94560';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Send size={18} />
            {isEditing ? '保存修改' : '发布书评'}
          </button>
        </form>
      </div>
    </div>
  );
}
