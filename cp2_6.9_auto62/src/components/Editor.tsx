import React, { useMemo } from 'react';
import { SentenceResult } from '../types';

interface EditorProps {
  text: string;
  onChange: (text: string) => void;
  results: SentenceResult[];
  selectedIndex: number | null;
  isAnalyzing: boolean;
  progress: number;
  progressCurrent: number;
  progressTotal: number;
}

const Editor: React.FC<EditorProps> = ({
  text,
  onChange,
  results,
  selectedIndex,
  isAnalyzing,
  progress,
  progressCurrent,
  progressTotal,
}) => {
  const charCount = text.length;

  const highlightedContent = useMemo(() => {
    if (results.length === 0) return null;

    const fullText = results.map((r) => r.sentence).join('');
    if (fullText !== text.replace(/\s+/g, '')) {
      return null;
    }

    let globalIdx = 0;
    return results.map((result, idx) => {
      const sentenceText = result.sentence;
      const startIdx = globalIdx;
      globalIdx += sentenceText.length;

      return (
        <span
          key={idx}
          className={`highlight-span ${selectedIndex === idx ? 'active' : ''}`}
        >
          {sentenceText}
        </span>
      );
    });
  }, [results, text, selectedIndex]);

  return (
    <div className="editor-section">
      <div className="editor-header">
        <span className="editor-title">文本编辑</span>
        <span className="char-count">{charCount} / 5000 字</span>
      </div>
      <div className="editor-container">
        {highlightedContent && (
          <div className="editor-highlight-layer">{highlightedContent}</div>
        )}
        <textarea
          className="editor-textarea"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="在此粘贴或输入需要分析的文本内容...支持500-5000字的中文文本，系统将逐句分析情感变化并生成可视化曲线。"
          disabled={isAnalyzing}
        />
        {isAnalyzing && (
          <div className="progress-overlay">
            <div className="progress-spinner" />
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">
              正在分析情感... {progressCurrent} / {progressTotal} 句
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
