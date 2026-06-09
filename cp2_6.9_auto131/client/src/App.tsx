import { useState, useRef, useCallback } from 'react';
import DocumentPanel from './DocumentPanel';
import SummaryPanel from './SummaryPanel';
import type { SummaryCard, StyleType } from '../../shared/types';
import './App.css';

function App() {
  const [documentText, setDocumentText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [summaries, setSummaries] = useState<SummaryCard[]>([]);
  const [sentences, setSentences] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [currentStyle, setCurrentStyle] = useState<StyleType>('concise');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedAtRef = useRef<string>('');

  const processDocument = useCallback(async (text: string, name: string = '') => {
    if (!text.trim()) {
      setError('请输入文档内容');
      return;
    }

    if (text.length > 10000) {
      setError('文档长度不能超过10000字');
      return;
    }

    setError('');
    setIsProcessing(true);
    setProgress(0);
    setDocumentText(text);
    setFileName(name);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style: currentStyle, fileName: name })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '处理失败');
      }

      setProgress(25);

      const data = await response.json();

      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setProgress(25 + i * 25);
      }

      setSummaries(data.summaries);
      setSentences(data.sentences);
      setWordCount(data.wordCount);
      processedAtRef.current = new Date().toLocaleString('zh-CN');
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  }, [currentStyle]);

  const handleStyleChange = useCallback(async (style: StyleType) => {
    setCurrentStyle(style);

    if (summaries.length === 0) return;

    try {
      const baseSummaries = summaries.map(s => ({
        index: s.index,
        sentence: s.sentence,
        score: s.score,
        charStart: s.charStart,
        charEnd: s.charEnd
      }));

      const response = await fetch('/api/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaries: baseSummaries, style })
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries(data.summaries);
      }
    } catch (_err) {
      // silently fail
    }
  }, [summaries]);

  const handleCardClick = useCallback((index: number) => {
    setHighlightedIndex(index);
    setTimeout(() => {
      setHighlightedIndex(null);
    }, 500);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      setError('仅支持 .md 或 .txt 文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      processDocument(text, file.name);
    };
    reader.onerror = () => {
      setError('读取文件失败');
    };
    reader.readAsText(file);
  }, [processDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleTextSubmit = useCallback((text: string) => {
    processDocument(text);
  }, [processDocument]);

  const handleExport = useCallback(() => {
    const metadata = [
      '## 文档元数据',
      '',
      `- 文件名: ${fileName || '未命名文档'}`,
      `- 字数: ${wordCount} 字`,
      `- 提取时间: ${processedAtRef.current}`,
      `- 摘要风格: ${currentStyle === 'formal' ? '正式' : currentStyle === 'concise' ? '简洁' : '生动'}`,
      '',
      '## 摘要内容',
      ''
    ].join('\n');

    const summaryContent = summaries.map((s, i) => {
      const sentence = s.styledSentence || s.sentence;
      return `${i + 1}. ${sentence} (TF-IDF: ${s.score.toFixed(2)})`;
    }).join('\n\n');

    const originalDoc = [
      '',
      '## 原始文档',
      '',
      documentText
    ].join('\n');

    const fullContent = metadata + summaryContent + originalDoc;

    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [summaries, documentText, fileName, wordCount, currentStyle]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">📄</span>
          智能文档摘要
        </h1>
        <p className="app-subtitle">支持纯文本和 Markdown · 单篇最多 10,000 字</p>
      </header>

      {!documentText && (
        <div
          className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleUploadClick}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".md,.txt"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <div className="upload-content">
            <div className="upload-icon">☁️</div>
            <p className="upload-text">拖拽 .md 或 .txt 文件到这里</p>
            <p className="upload-hint">或点击上传</p>
          </div>
        </div>
      )}

      {!documentText && (
        <div className="paste-section">
          <textarea
            className="paste-textarea"
            placeholder="或者直接粘贴文档内容到这里...（支持纯文本和 Markdown）"
            rows={8}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleTextSubmit((e.target as HTMLTextAreaElement).value);
              }
            }}
          />
          <button
            className="submit-btn"
            onClick={(e) => {
              const textarea = (e.currentTarget.previousElementSibling as HTMLTextAreaElement);
              handleTextSubmit(textarea.value);
            }}
          >
            开始分析 (Ctrl+Enter)
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {isProcessing && (
        <div className="progress-container">
          <div className="progress-label">正在分析文档... {progress}%</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {documentText && !isProcessing && (
        <div className="main-content">
          <DocumentPanel
            text={documentText}
            sentences={sentences}
            highlightedIndex={highlightedIndex}
          />
          <div className="divider" />
          <SummaryPanel
            summaries={summaries}
            currentStyle={currentStyle}
            onStyleChange={handleStyleChange}
            onCardClick={handleCardClick}
            onExport={handleExport}
            hasSummaries={summaries.length > 0}
            onNewDocument={() => {
              setDocumentText('');
              setSummaries([]);
              setSentences([]);
              setFileName('');
              setWordCount(0);
              setError('');
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
