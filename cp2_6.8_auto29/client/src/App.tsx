import { useState, useEffect, useRef, useCallback } from 'react';
import CodeEditor from './editor';
import type { JudgeResult, SubmissionRecord } from '../types';
import './App.css';

interface Problem {
  id: string;
  title: string;
  description: string;
  template: string;
}

function App() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [isJudging, setIsJudging] = useState(false);
  const [currentResult, setCurrentResult] = useState<SubmissionRecord | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRecord | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resultPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/problems')
      .then(res => res.json())
      .then(data => {
        setProblems(data);
        if (data.length > 0) {
          setSelectedProblem(data[0]);
          setCode(data[0].template);
        }
      })
      .catch(err => console.error('加载题目失败:', err));
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        setClientId(data.clientId);
      } else if (data.type === 'result') {
        const record: SubmissionRecord = data.record;
        setCurrentResult(record);
        setIsJudging(false);

        setSubmissions(prev => {
          const newSubmissions = [record, ...prev].slice(0, 10);
          return newSubmissions;
        });

        if (resultPanelRef.current) {
          resultPanelRef.current.classList.add('result-enter');
          setTimeout(() => {
            resultPanelRef.current?.classList.remove('result-enter');
          }, 500);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleProblemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const problem = problems.find(p => p.id === e.target.value);
    if (problem) {
      setSelectedProblem(problem);
      setCode(problem.template);
      setCurrentResult(null);
      setSelectedSubmission(null);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedProblem || isJudging) return;

    setIsJudging(true);
    setCurrentResult(null);
    setSelectedSubmission(null);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          problemId: selectedProblem.id,
          clientId,
        }),
      });

      if (!response.ok) {
        throw new Error('提交失败');
      }
    } catch (error) {
      console.error('提交错误:', error);
      setIsJudging(false);
    }
  }, [selectedProblem, code, isJudging, clientId]);

  const handleSubmissionClick = (submission: SubmissionRecord) => {
    setSelectedSubmission(submission);
    setCode(submission.code);
    const problem = problems.find(p => p.id === submission.problemId);
    if (problem) {
      setSelectedProblem(problem);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedWidth = Math.max(20, Math.min(80, newWidth));
      setLeftWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed': return '通过';
      case 'failed': return '失败';
      case 'error': return '错误';
      case 'timeout': return '超时';
      default: return status;
    }
  };

  const displayResult = selectedSubmission || currentResult;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">在线代码练习平台</h1>
        <div className="header-controls">
          <select
            className="problem-select"
            value={selectedProblem?.id || ''}
            onChange={handleProblemChange}
          >
            {problems.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <button
            className="run-button"
            onClick={handleSubmit}
            disabled={isJudging || !selectedProblem}
          >
            {isJudging ? '评测中...' : '运行'}
          </button>
        </div>
      </header>

      <div className="main-content" ref={containerRef}>
        <div className="left-panel" style={{ width: `${leftWidth}%` }}>
          <div className="problem-description card">
            <h2 className="card-title">
              {selectedProblem?.title || '请选择题目'}
            </h2>
            <div className="problem-content">
              {selectedProblem?.description?.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p>
              ))}
            </div>
          </div>

          <div className="editor-section card">
            <h2 className="card-title">代码编辑器</h2>
            <div className="editor-wrapper">
              <CodeEditor code={code} onChange={setCode} />
            </div>
          </div>
        </div>

        <div
          className={`resizer${isDragging ? ' dragging' : ''}`}
          onMouseDown={handleMouseDown}
        />

        <div className="right-panel" style={{ width: `${100 - leftWidth}%` }}>
          <div className="result-panel card" ref={resultPanelRef}>
            <h2 className="card-title">评测结果</h2>
            <div className="result-content">
              {isJudging ? (
                <div className="judging-indicator">
                  <div className="spinner"></div>
                  <span>正在评测中...</span>
                </div>
              ) : displayResult ? (
                <div className={`result-display result-${displayResult.status}`}>
                  <div className="result-header">
                    <span className="result-icon">
                      {displayResult.status === 'passed' ? '✓' : '✗'}
                    </span>
                    <span className="result-status">
                      {getStatusText(displayResult.status)}
                    </span>
                    <span className="result-time">
                      耗时: {displayResult.time}ms
                    </span>
                  </div>
                  <div className="result-message">
                    {displayResult.result.message}
                  </div>
                  {(displayResult.status === 'failed' || displayResult.status === 'error') && (
                    <div className="result-comparison">
                      {displayResult.result.expectedOutput !== undefined && (
                        <div className="comparison-item">
                          <label>期望输出:</label>
                          <pre className="expected-output">{displayResult.result.expectedOutput}</pre>
                        </div>
                      )}
                      {displayResult.result.actualOutput !== undefined && (
                        <div className="comparison-item">
                          <label>实际输出:</label>
                          <pre className="actual-output">{displayResult.result.actualOutput}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-result">
                  <p>选择题目并编写代码，点击「运行」按钮开始评测</p>
                </div>
              )}
            </div>
          </div>

          <div className="submissions-panel card">
            <h2 className="card-title">提交记录 <span className="sub-count">({submissions.length})</span></h2>
            <div className="submissions-list">
              {submissions.length === 0 ? (
                <div className="empty-submissions">
                  <p>暂无提交记录</p>
                </div>
              ) : (
                submissions.map((submission, index) => (
                  <div
                    key={submission.id}
                    className={`submission-item status-${submission.status}${
                      selectedSubmission?.id === submission.id ? ' selected' : ''
                    }`}
                    onClick={() => handleSubmissionClick(submission)}
                  >
                    <div className="submission-icon">
                      {submission.status === 'passed' ? '✓' : '✗'}
                    </div>
                    <div className="submission-info">
                      <div className="submission-title">{submission.problemTitle}</div>
                      <div className="submission-meta">
                        <span>{formatTime(submission.timestamp)}</span>
                        <span>{submission.time}ms</span>
                      </div>
                    </div>
                    <div className="submission-status">
                      {getStatusText(submission.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
