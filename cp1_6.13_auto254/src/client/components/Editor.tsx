import React, { useState, useRef, useEffect } from 'react';
import type { EmotionType } from '@/shared/types';
import { EMOTION_MAP, EMOTION_LIST } from '@/shared/types';

interface EditorProps {
  onSave: (content: string, emotion: EmotionType) => void;
  onClose: () => void;
}

const Editor: React.FC<EditorProps> = ({ onSave, onClose }) => {
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<EmotionType>('joy');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleSubmit = () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    setTimeout(() => {
      onSave(content, emotion);
    }, 100);
  };

  const gradient = `linear-gradient(135deg, ${EMOTION_MAP[emotion].gradient[0]}, ${EMOTION_MAP[emotion].gradient[1]})`;

  return (
    <div className="editor-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="editor-panel">
        <div className="editor-header">
          <div className="editor-title">
            <span>✍️</span>
            <span>编织光影日记</span>
          </div>
          <button className="editor-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="editor-body">
          <div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              选择此刻的情绪
            </div>
            <div className="emotion-picker">
              {EMOTION_LIST.map((em: EmotionType) => {
                const config = EMOTION_MAP[em];
                const isSelected = emotion === em;
                return (
                  <button
                    key={em}
                    type="button"
                    className={`emotion-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setEmotion(em)}
                    style={{
                      borderColor: isSelected ? config.glowColor : undefined,
                      background: isSelected
                        ? `linear-gradient(135deg, ${config.gradient[0]}33, ${config.gradient[1]}33)`
                        : undefined,
                    }}
                  >
                    <span
                      className="emotion-dot"
                      style={{
                        background: config.glowColor,
                        color: config.glowColor,
                      }}
                    />
                    <span className="emotion-emoji">{config.emoji}</span>
                    <span className="emotion-name">{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              光影预览
            </div>
            <div className="editor-preview" style={{ background: gradient }}>
              <div
                className={`editor-preview-content ${!content.trim() ? 'placeholder' : ''}`}
                style={{
                  textShadow: content.trim() ? EMOTION_MAP[emotion].textShadow : undefined,
                  animation: content.trim() ? 'float 3s ease-in-out infinite' : undefined,
                }}
              >
                {content.trim() || '在这里，文字将与光影共舞...\n\n试试写下此刻的心情吧 ✨'}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 12,
                fontWeight: 500,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>书写心情</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                Ctrl+Enter 保存
              </span>
            </div>
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下此刻的思绪、感受、灵感、梦境...
让文字在光影中流淌，记录属于你的独特瞬间。

支持换行，尽情书写吧 ✍️"
            />
          </div>
        </div>

        <div className="editor-footer">
          <button className="btn-cancel" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-save"
            onClick={handleSubmit}
            disabled={!content.trim() || saving}
          >
            {saving ? '保存中...' : '保存日记'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;
