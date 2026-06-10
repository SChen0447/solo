import React, { useState, useRef, useEffect } from 'react';
import { CoffeeItem } from '../types';

interface EditPanelProps {
  item: CoffeeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: CoffeeItem) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ item, isOpen, onClose, onSave }) => {
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [isClosing, setIsClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setDescription(item.description);
      setPrice(item.price);
      setImage(item.image);
    }
  }, [item]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (item) {
        onSave({
          ...item,
          description,
          price,
          image,
        });
      }
      onClose();
    }, 250);
  };

  const handleSave = () => {
    if (item) {
      onSave({
        ...item,
        description,
        price,
        image,
      });
    }
    handleClose();
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 250;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        setImage(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  if (!isOpen || !item) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000066',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px',
    position: 'relative',
    animation: isClosing ? 'slideDown 0.25s ease-in forwards' : 'fadeInUp 0.3s ease-out',
  };

  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: '50%',
    backgroundColor: '#6d4c41',
    color: '#ffffff',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
    cursor: 'pointer',
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <button
          style={closeBtnStyle}
          onClick={handleClose}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#cccccc')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
        >
          ✕
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#3e2723', marginBottom: '20px' }}>
          编辑「{item.name}」
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#5d4037',
              marginBottom: '8px',
            }}
          >
            饮品图片
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              width: '250px',
              height: '250px',
              borderRadius: '12px',
              border: `2px dashed ${isDragging ? '#6d4c41' : '#d7ccc8'}`,
              backgroundColor: isDragging ? '#f5f5f5' : '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'border-color 0.2s, background-color 0.2s',
              margin: '0 auto',
            }}
          >
            {image ? (
              <img
                src={image}
                alt={item.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#8d6e63' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontSize: '13px' }}>点击或拖拽上传图片</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>将自动裁剪为250×250</div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#5d4037',
              marginBottom: '8px',
            }}
          >
            饮品描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            placeholder="输入饮品的详细描述..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '1px solid #d7ccc8',
              borderRadius: '8px',
              resize: 'none',
              backgroundColor: '#fafafa',
              color: '#3e2723',
              lineHeight: 1.5,
              minHeight: '44px',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#8d6e63', marginTop: '4px' }}>
            {description.length}/200
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#5d4037',
              marginBottom: '8px',
            }}
          >
            建议售价：¥{price.toFixed(2)}
          </label>
          <input
            type="range"
            min="5"
            max="68"
            step="0.5"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              backgroundColor: '#d7ccc8',
              outline: 'none',
              accentColor: '#6d4c41',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8d6e63' }}>
            <span>¥5</span>
            <span>¥68</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#6d4c41',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
              minHeight: '44px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eeeeee')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#6d4c41',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
              minHeight: '44px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5d4037')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6d4c41')}
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPanel;
