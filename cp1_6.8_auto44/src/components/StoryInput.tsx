import { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { generateScenes, extractTitle } from '@/utils/sceneGenerator';
import type { Scene } from '@/types';

interface StoryInputProps {
  onScenesGenerated: (scenes: Scene[], title: string, text: string) => void;
  initialText?: string;
}

const StoryInput = ({ onScenesGenerated, initialText = '' }: StoryInputProps) => {
  const [text, setText] = useState(initialText);
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 500;

  const charCount = text.length;
  const isValid = text.trim().length > 0 && charCount <= maxLength;

  const handleResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  }, []);

  useEffect(() => {
    handleResize();
  }, [text, handleResize]);

  const handleSubmit = useCallback(() => {
    if (!isValid) return;

    setIsGenerating(true);
    
    setTimeout(() => {
      const scenes = generateScenes(text);
      const title = extractTitle(text);
      onScenesGenerated(scenes, title, text);
      setIsGenerating(false);
    }, 300);
  }, [text, isValid, onScenesGenerated]);

  return (
    <div className="story-input-container">
      <div className="story-input-header">
        <h2 className="story-input-title">
          <Sparkles size={20} className="title-icon" />
          故事输入
        </h2>
        <span className={`char-count ${charCount > maxLength ? 'over-limit' : ''}`}>
          {charCount} / {maxLength}
        </span>
      </div>

      <div className="textarea-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请输入你的故事文本（童话、寓言、新闻片段均可，不超过500字）..."
          maxLength={maxLength + 100}
          className="story-textarea"
        />
      </div>

      <div className="input-actions">
        <button
          onClick={handleSubmit}
          disabled={!isValid || isGenerating}
          className={`generate-btn ${isValid ? 'active' : ''}`}
        >
          {isGenerating ? (
            <span className="loading-spinner" />
          ) : (
            <Play size={18} />
          )}
          {isGenerating ? '生成中...' : '生成动画'}
        </button>
      </div>

      <style jsx>{`
        .story-input-container {
          padding: 24px;
          background: #ffffff;
          border-radius: 16px;
          border: 2px solid #E8ECEF;
          transition: border-color 0.3s ease;
        }

        .story-input-container:hover {
          border-color: #B8C4C8;
        }

        .story-input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .story-input-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          color: #2D3436;
          margin: 0;
        }

        .title-icon {
          color: #E68A6E;
        }

        .char-count {
          font-size: 13px;
          color: #7A8B99;
          font-weight: 500;
        }

        .char-count.over-limit {
          color: #E68A6E;
        }

        .textarea-wrapper {
          position: relative;
        }

        .story-textarea {
          width: 100%;
          min-height: 120px;
          max-height: 300px;
          padding: 16px;
          border: 1px solid #E8ECEF;
          border-radius: 12px;
          font-size: 15px;
          line-height: 1.7;
          color: #2D3436;
          background: #FAFBFC;
          resize: none;
          outline: none;
          font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
          transition: border-color 0.3s ease, background 0.3s ease;
          box-sizing: border-box;
        }

        .story-textarea:focus {
          border-color: #B8C4C8;
          background: #FFFFFF;
        }

        .story-textarea::placeholder {
          color: #B8C4C8;
        }

        .input-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .generate-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border: none;
          border-radius: 30px;
          font-size: 15px;
          font-weight: 500;
          color: #FFFFFF;
          background: linear-gradient(135deg, #B8C4C8 0%, #7A8B99 100%);
          cursor: not-allowed;
          opacity: 0.6;
          transition: all 0.3s ease;
        }

        .generate-btn.active {
          background: linear-gradient(135deg, #E68A6E 0%, #D4755F 100%);
          cursor: pointer;
          opacity: 1;
        }

        .generate-btn.active:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(230, 138, 110, 0.3);
        }

        .generate-btn.active:active {
          transform: scale(0.95);
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #FFFFFF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .story-input-container {
            padding: 16px;
          }

          .story-input-title {
            font-size: 16px;
          }

          .generate-btn {
            width: 100%;
            justify-content: center;
            padding: 14px 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default StoryInput;
