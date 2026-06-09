import React, { useState } from 'react';
import { CardType } from '../types';

interface AddCardModalProps {
  onClose: () => void;
  onSubmit: (type: CardType, content: string) => void;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ onClose, onSubmit }) => {
  const [selectedType, setSelectedType] = useState<CardType>('text');
  const [content, setContent] = useState('');

  const handleTypeSelect = (type: CardType) => {
    setSelectedType(type);
    if (type === 'color') {
      setContent('#4A90D9');
    } else if (type === 'text') {
      setContent('双击编辑');
    } else {
      setContent('');
    }
  };

  const handleSubmit = () => {
    let finalContent = content;
    if (selectedType === 'text' && !content.trim()) {
      finalContent = '双击编辑';
    } else if (selectedType === 'color' && !content) {
      finalContent = '#FF6B6B';
    } else if (selectedType === 'image' && !content.trim()) {
      finalContent = `https://picsum.photos/150/120?random=${Date.now()}`;
    }
    onSubmit(selectedType, finalContent);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderInput = () => {
    switch (selectedType) {
      case 'image':
        return (
          <input
            type="text"
            className="modal-input"
            placeholder="请输入图片URL（留空使用随机图片）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        );
      case 'color':
        return (
          <div className="color-input-wrapper">
            <input
              type="color"
              value={content || '#FF6B6B'}
              onChange={(e) => setContent(e.target.value)}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="#FF6B6B"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        );
      case 'text':
      default:
        return (
          <textarea
            className="modal-input"
            placeholder="请输入文字内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <h2>添加新卡片</h2>
        <div className="modal-body">
          <div>
            <label style={{ fontSize: '13px', color: '#666', marginBottom: '8px', display: 'block' }}>
              选择卡片类型
            </label>
            <div className="type-selector">
              <button
                className={`type-option ${selectedType === 'image' ? 'active' : ''}`}
                onClick={() => handleTypeSelect('image')}
                type="button"
              >
                🖼️ 图片
              </button>
              <button
                className={`type-option ${selectedType === 'color' ? 'active' : ''}`}
                onClick={() => handleTypeSelect('color')}
                type="button"
              >
                🎨 色块
              </button>
              <button
                className={`type-option ${selectedType === 'text' ? 'active' : ''}`}
                onClick={() => handleTypeSelect('text')}
                type="button"
              >
                ✏️ 文字
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#666', marginBottom: '8px', display: 'block' }}>
              {selectedType === 'image' ? '图片URL' : selectedType === 'color' ? '颜色值' : '文字内容'}
            </label>
            {renderInput()}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} type="button">
            取消
          </button>
          <button className="btn-primary" onClick={handleSubmit} type="button">
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCardModal;
