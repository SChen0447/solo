import React, { useState } from 'react';
import { SOFT_COLORS } from './data';

interface AddBookModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    author: string;
    isbn: string;
    coverColor: string;
    stock: number;
  }) => void;
}

const ISBN_REGEX = /^\d{3}-\d{2}-\d{5}$/;

const AddBookModal: React.FC<AddBookModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [coverColor, setCoverColor] = useState(SOFT_COLORS[0]);
  const [stock, setStock] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入书名';
    if (!author.trim()) newErrors.author = '请输入作者';
    if (!isbn.trim()) {
      newErrors.isbn = '请输入ISBN';
    } else if (!ISBN_REGEX.test(isbn.trim())) {
      newErrors.isbn = 'ISBN格式应为 XXX-XX-XXXXX';
    }
    if (stock < 1 || stock > 99) {
      newErrors.stock = '库存数量应在1-99之间';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      coverColor,
      stock,
    });
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCoverColor(SOFT_COLORS[0]);
    setStock(1);
    setErrors({});
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fade-in"
      style={overlayStyle}
      onClick={handleOverlayClick}
    >
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>添加图书</h2>
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>书名</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              placeholder="请输入书名"
            />
            {errors.title && (
              <span style={errorStyle}>{errors.title}</span>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>作者</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={inputStyle}
              placeholder="请输入作者"
            />
            {errors.author && (
              <span style={errorStyle}>{errors.author}</span>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>ISBN (格式：XXX-XX-XXXXX)</label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              style={inputStyle}
              placeholder="例如：978-75-44223"
            />
            {errors.isbn && <span style={errorStyle}>{errors.isbn}</span>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>封面颜色</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SOFT_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => setCoverColor(color)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border:
                      coverColor === color
                        ? '3px solid #bcaaa4'
                        : '3px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>库存数量 (1-99)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStock((s) => Math.max(1, s - 1))}
                style={stepperBtnStyle}
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={99}
                value={stock}
                onChange={(e) =>
                  setStock(
                    Math.min(99, Math.max(1, parseInt(e.target.value) || 1))
                  )
                }
                style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
              />
              <button
                type="button"
                onClick={() => setStock((s) => Math.min(99, s + 1))}
                style={stepperBtnStyle}
              >
                +
              </button>
            </div>
            {errors.stock && <span style={errorStyle}>{errors.stock}</span>}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...btnStyle, backgroundColor: '#e0e0e0', color: '#666' }}
            >
              取消
            </button>
            <button type="submit" style={btnStyle}>
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '32px',
  width: '480px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#4e4e4e',
  marginBottom: '24px',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#4e4e4e',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#4e4e4e',
  backgroundColor: '#fff',
  transition: 'border-color 0.2s ease',
};

const errorStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#c0392b',
};

const stepperBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: '#bcaaa4',
  color: '#fff',
  fontSize: '18px',
  fontWeight: 600,
  transition: 'all 0.2s ease',
};

const btnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 24px',
  borderRadius: '8px',
  backgroundColor: '#bcaaa4',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 500,
  transition: 'all 0.2s ease',
};

export default AddBookModal;
