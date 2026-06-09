import { useState, useRef, useEffect, useCallback } from 'react';
import './editor.css';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  language?: string;
}

interface HistoryEntry {
  code: string;
  cursorPos: number;
}

export default function CodeEditor({ code, onChange, language = 'javascript' }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [errorLine, setErrorLine] = useState<number | null>(null);

  const historyRef = useRef<HistoryEntry[]>([{ code, cursorPos: 0 }]);
  const historyIndexRef = useRef(0);
  const isComposingRef = useRef(false);

  const lines = code.split('\n');
  const lineCount = lines.length;

  const checkBracketMatching = useCallback((text: string): number | null => {
    const stack: { char: string; line: number }[] = [];
    const lines = text.split('\n');

    const pairs: { [key: string]: string } = {
      ')': '(',
      ']': '[',
      '}': '{',
    };

    for (let i = 0; i < lines.length; i++) {
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '(' || char === '[' || char === '{') {
          stack.push({ char, line: i + 1 });
        } else if (char === ')' || char === ']' || char === '}') {
          if (stack.length === 0 || stack[stack.length - 1].char !== pairs[char]) {
            return i + 1;
          }
          stack.pop();
        }
      }
    }

    if (stack.length > 0) {
      return stack[stack.length - 1].line;
    }

    return null;
  }, []);

  useEffect(() => {
    const errLine = checkBracketMatching(code);
    setErrorLine(errLine);
  }, [code, checkBracketMatching]);

  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const beforeCursor = code.substring(0, pos);
    const lineNum = beforeCursor.split('\n').length;
    const colNum = pos - beforeCursor.lastIndexOf('\n');

    setCursorLine(lineNum);
    setCursorCol(colNum);
  }, [code]);

  const pushToHistory = useCallback((newCode: string, cursorPos: number) => {
    if (isComposingRef.current) return;

    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.code === newCode) return;

    history.push({ code: newCode, cursorPos });
    if (history.length > 100) {
      history.shift();
    } else {
      historyIndexRef.current++;
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    const cursorPos = e.target.selectionStart;
    pushToHistory(newCode, cursorPos);
    onChange(newCode);
    setTimeout(updateCursorPosition, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);

      onChange(newCode);
      pushToHistory(newCode, start + 2);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateCursorPosition();
      }, 0);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }
  };

  const undo = () => {
    const history = historyRef.current;
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const entry = history[historyIndexRef.current];
      onChange(entry.code);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = entry.cursorPos;
          updateCursorPosition();
        }
      }, 0);
    }
  };

  const redo = () => {
    const history = historyRef.current;
    if (historyIndexRef.current < history.length - 1) {
      historyIndexRef.current++;
      const entry = history[historyIndexRef.current];
      onChange(entry.code);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = entry.cursorPos;
          updateCursorPosition();
        }
      }, 0);
    }
  };

  const handleScroll = () => {
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (textarea && lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  };

  const handleClick = () => {
    updateCursorPosition();
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  const renderLineNumbers = () => {
    const lineNumbers = [];
    for (let i = 1; i <= lineCount; i++) {
      const isError = errorLine === i;
      const isCurrent = cursorLine === i;
      lineNumbers.push(
        <div
          key={i}
          className={`line-number${isCurrent ? ' current' : ''}${isError ? ' error' : ''}`}
        >
          {i}
        </div>
      );
    }
    return lineNumbers;
  };

  return (
    <div className="code-editor-container">
      <div className="code-editor-wrapper">
        <div className="line-numbers" ref={lineNumbersRef}>
          {renderLineNumbers()}
        </div>
        <div className="editor-area">
          <div className="highlight-layer" aria-hidden="true">
            {lines.map((line, i) => (
              <div
                key={i}
                className={`code-line${cursorLine === i + 1 ? ' current-line' : ''}${errorLine === i + 1 ? ' error-line' : ''}`}
              >
                <span className="line-content">{line || ' '}</span>
                {errorLine === i + 1 && <span className="error-underline" />}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onClick={handleClick}
            onKeyUp={updateCursorPosition}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            data-language={language}
          />
        </div>
      </div>
      <div className="editor-statusbar">
        <span className="status-item">行 {cursorLine}, 列 {cursorCol}</span>
        <span className="status-item">共 {lineCount} 行</span>
        {errorLine && (
          <span className="status-item status-error">第 {errorLine} 行有语法错误</span>
        )}
      </div>
    </div>
  );
}
