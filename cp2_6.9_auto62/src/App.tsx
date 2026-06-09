import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor from './components/Editor';
import CurveChart from './components/CurveChart';
import {
  SentenceResult,
  AnalysisSummary,
  EmotionLabel,
  LABEL_INFO,
  WSMessage,
} from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SAMPLE_TEXT = `今天的天气非常好，阳光明媚，让人感到无比的快乐和幸福。我和朋友们一起去公园散步，欣赏着美丽的花朵，听着鸟儿欢快的歌声。一切都显得那么美好和宁静。

然而，突然间天空乌云密布，电闪雷鸣，我们都感到非常担心和害怕。雨点噼里啪啦地打在身上，让人感到一丝不安。我们赶紧找了一个亭子躲雨，心中充满了焦虑。

雨过天晴后，彩虹出现在天边，我们都惊喜地欢呼起来。刚才的恐惧消失了，取而代之的是满满的喜悦和感动。生活就是这样，虽然有时会遇到困难，但总会有美好的事情在等待着我们。

我深深地热爱着这个世界，也珍惜身边的每一个人。无论遇到什么挫折，我都会保持平静的心态，勇敢地面对。因为我知道，只要心怀希望，就一定能够看到光明。`;

const App: React.FC = () => {
  const [text, setText] = useState<string>(SAMPLE_TEXT);
  const [results, setResults] = useState<SentenceResult[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        if (message.type === 'progress') {
          setProgress(message.progress);
          setProgressCurrent(message.current);
          setProgressTotal(message.total);
        } else if (message.type === 'complete') {
          setResults(message.results);
          setSummary(message.summary);
          setIsAnalyzing(false);
          setSidebarOpen(true);
          ws.close();
        } else if (message.type === 'error') {
          setError(message.message);
          setIsAnalyzing(false);
          ws.close();
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('连接服务器失败，请稍后重试');
      setIsAnalyzing(false);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return ws;
  }, []);

  const analyzeEmotion = useCallback(async () => {
    if (text.length < 50) {
      setError('文本长度至少需要50字');
      return;
    }
    if (text.length > 5000) {
      setError('文本长度不能超过5000字');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setProgress(0);
    setProgressCurrent(0);
    setProgressTotal(0);
    setResults([]);
    setSummary(null);
    setSelectedIndex(null);

    const ws = connectWebSocket();

    const sendMessage = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'analyze', text }));
      } else {
        setTimeout(sendMessage, 100);
      }
    };

    ws.onopen = () => {
      wsRef.current = ws;
      sendMessage();
    };
  }, [text, connectWebSocket]);

  const updateLabel = useCallback((index: number, newLabel: EmotionLabel) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, label: newLabel } : r))
    );
    setSummary((prev) => {
      if (!prev) return prev;
      const oldLabel = results[index]?.label;
      if (!oldLabel) return prev;
      const newDist = { ...prev.labelDistribution };
      newDist[oldLabel] = Math.max(0, newDist[oldLabel] - 1);
      newDist[newLabel] = (newDist[newLabel] || 0) + 1;
      return { ...prev, labelDistribution: newDist };
    });
  }, [results]);

  const exportPDF = useCallback(async () => {
    if (results.length === 0 || !summary) {
      setError('请先完成情感分析');
      return;
    }

    try {
      const reportEl = document.createElement('div');
      reportEl.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 48px;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      `;

      const totalLabels = Object.values(summary.labelDistribution).reduce((a, b) => a + b, 0);
      const avgScorePercent = ((summary.averageScore + 1) / 2 * 100).toFixed(0);
      const mainLabel = Object.entries(summary.labelDistribution).sort((a, b) => b[1] - a[1])[0];

      const summaryHTML = `
        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 28px; margin: 0 0 8px; color: #1A202C;">情感分析报告</h2>
          <p style="color: #718096; margin: 0; font-size: 14px;">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px;">
          <div style="padding: 20px; background: #F7FAFC; border-radius: 10px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #1A202C;">${summary.totalSentences}</div>
            <div style="font-size: 12px; color: #718096; margin-top: 4px;">总句数</div>
          </div>
          <div style="padding: 20px; background: #F7FAFC; border-radius: 10px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: ${summary.averageScore >= 0 ? '#38A169' : '#E53E3E'};">${summary.averageScore.toFixed(2)}</div>
            <div style="font-size: 12px; color: #718096; margin-top: 4px;">平均情感值</div>
          </div>
          <div style="padding: 20px; background: #F7FAFC; border-radius: 10px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: ${LABEL_INFO[mainLabel[0] as EmotionLabel].color};">${LABEL_INFO[mainLabel[0] as EmotionLabel].name}</div>
            <div style="font-size: 12px; color: #718096; margin-top: 4px;">主导情感</div>
          </div>
        </div>
      `;

      const canvasWidth = 704;
      const canvasHeight = 240;
      const chartCanvas = document.createElement('canvas');
      chartCanvas.width = canvasWidth;
      chartCanvas.height = canvasHeight;
      const ctx = chartCanvas.getContext('2d')!;

      ctx.fillStyle = '#F7FAFC';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const chartPad = { top: 30, right: 30, bottom: 40, left: 50 };
      const cw = canvasWidth - chartPad.left - chartPad.right;
      const ch = canvasHeight - chartPad.top - chartPad.bottom;

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#A0AEC0';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (const tick of [-1, -0.5, 0, 0.5, 1]) {
        const y = chartPad.top + ch / 2 - (tick * ch) / 2;
        ctx.beginPath();
        ctx.moveTo(chartPad.left, y);
        ctx.lineTo(canvasWidth - chartPad.right, y);
        ctx.stroke();
        ctx.fillText(tick.toFixed(1), chartPad.left - 8, y);
      }

      function pdfColor(t: number): string {
        const clamped = Math.max(0, Math.min(1, t));
        const c = [
          { p: 0, r: 229, g: 62, b: 62 },
          { p: 0.5, r: 237, g: 242, b: 247 },
          { p: 1, r: 56, g: 161, b: 105 },
        ];
        let c1 = c[0], c2 = c[c.length - 1];
        for (let i = 0; i < c.length - 1; i++) {
          if (clamped >= c[i].p && clamped <= c[i + 1].p) {
            c1 = c[i]; c2 = c[i + 1]; break;
          }
        }
        const rng = c2.p - c1.p;
        const lt = rng === 0 ? 0 : (clamped - c1.p) / rng;
        return `rgb(${Math.round(c1.r + (c2.r - c1.r) * lt)}, ${Math.round(c1.g + (c2.g - c1.g) * lt)}, ${Math.round(c1.b + (c2.b - c1.b) * lt)})`;
      }

      if (results.length > 1) {
        const n = results.length - 1;
        for (let i = 0; i < n; i++) {
          const x1 = chartPad.left + (i / n) * cw;
          const y1 = chartPad.top + ch / 2 - (results[i].score * ch) / 2;
          const x2 = chartPad.left + ((i + 1) / n) * cw;
          const y2 = chartPad.top + ch / 2 - (results[i + 1].score * ch) / 2;

          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, pdfColor((results[i].score + 1) / 2));
          grad.addColorStop(1, pdfColor((results[i + 1].score + 1) / 2));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        for (let i = 0; i < results.length; i++) {
          const x = chartPad.left + (i / n) * cw;
          const y = chartPad.top + ch / 2 - (results[i].score * ch) / 2;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = LABEL_INFO[results[i].label].color;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#A0AEC0';
      ctx.font = '11px sans-serif';
      const step = Math.max(1, Math.floor(results.length / 5));
      for (let i = 0; i < results.length; i += step) {
        const x = chartPad.left + (i / Math.max(results.length - 1, 1)) * cw;
        ctx.fillText(`#${i + 1}`, x, canvasHeight - chartPad.bottom + 12);
      }

      const pieSize = 180;
      const pieCanvas = document.createElement('canvas');
      pieCanvas.width = pieSize;
      pieCanvas.height = pieSize;
      const pieCtx = pieCanvas.getContext('2d')!;
      const cx = pieSize / 2;
      const cy = pieSize / 2;
      const radius = pieSize / 2 - 10;

      let startAngle = -Math.PI / 2;
      const entries = Object.entries(summary.labelDistribution).filter(([, v]) => v > 0);
      for (const [label, count] of entries) {
        const angle = (count / totalLabels) * Math.PI * 2;
        pieCtx.beginPath();
        pieCtx.moveTo(cx, cy);
        pieCtx.arc(cx, cy, radius, startAngle, startAngle + angle);
        pieCtx.closePath();
        pieCtx.fillStyle = LABEL_INFO[label as EmotionLabel].color;
        pieCtx.fill();
        pieCtx.strokeStyle = '#FFFFFF';
        pieCtx.lineWidth = 2;
        pieCtx.stroke();
        startAngle += angle;
      }

      const truncatedText = text.length > 300 ? text.slice(0, 300) + '...' : text;
      const textSummaryHTML = `
        <div style="margin-top: 32px;">
          <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #1A202C; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">文本摘要</h3>
          <div style="font-size: 14px; line-height: 1.8; color: #4A5568; background: #F7FAFC; padding: 20px; border-radius: 10px;">${truncatedText}</div>
        </div>
      `;

      const pieLegendHTML = entries.map(([label, count]) => `
        <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #4A5568; margin-bottom: 12px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background: ${LABEL_INFO[label as EmotionLabel].color}; display: inline-block;"></span>
          <span>${LABEL_INFO[label as EmotionLabel].name}</span>
          <span style="color: #A0AEC0; font-size: 12px; margin-left: 4px;">${count}句 (${((count / totalLabels) * 100).toFixed(0)}%)</span>
        </div>
      `).join('');

      reportEl.innerHTML = summaryHTML + `
        <div style="margin-bottom: 32px;">
          <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #1A202C; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">情感曲线图</h3>
        </div>
      `;

      reportEl.appendChild(chartCanvas);

      reportEl.innerHTML += `
        <div style="margin-top: 32px;">
          <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #1A202C; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">标签分布</h3>
          <div style="display: flex; justify-content: center; align-items: center; gap: 48px;">
          </div>
        </div>
      `;

      const pieContainer = document.createElement('div');
      pieContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 48px;';
      pieContainer.appendChild(pieCanvas);
      const legendDiv = document.createElement('div');
      legendDiv.innerHTML = pieLegendHTML;
      pieContainer.appendChild(legendDiv);
      reportEl.appendChild(pieContainer);

      reportEl.innerHTML += textSummaryHTML;

      document.body.appendChild(reportEl);

      const canvas = await html2canvas(reportEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });

      document.body.removeChild(reportEl);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`情感分析报告_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      setError('导出PDF失败，请稍后重试');
    }
  }, [results, summary, text]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const selectedSentence = selectedIndex !== null ? results[selectedIndex] : null;

  const getDistributionPercentage = (label: EmotionLabel) => {
    if (!summary) return 0;
    const total = Object.values(summary.labelDistribution).reduce((a, b) => a + b, 0);
    return total === 0 ? 0 : (summary.labelDistribution[label] / total) * 100;
  };

  const emotionLabels: EmotionLabel[] = ['joy', 'anger', 'sadness', 'fear', 'calm', 'neutral'];

  return (
    <div className="app-container">
      <div className="main-area">
        <div className="header">
          <h1>情感分析可视化</h1>
          <div className="header-actions">
            {error && (
              <span style={{ color: '#E53E3E', fontSize: 13, marginRight: 12 }}>
                {error}
              </span>
            )}
            <button
              className="btn btn-primary"
              onClick={analyzeEmotion}
              disabled={isAnalyzing || text.length < 50}
            >
              {isAnalyzing ? '分析中...' : '分析情感'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={exportPDF}
              disabled={results.length === 0}
            >
              导出报告
            </button>
          </div>
        </div>

        <div className="content-wrapper">
          <Editor
            text={text}
            onChange={setText}
            results={results}
            selectedIndex={selectedIndex}
            isAnalyzing={isAnalyzing}
            progress={progress}
            progressCurrent={progressCurrent}
            progressTotal={progressTotal}
          />
          <CurveChart
            data={results}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
        </div>
      </div>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">分析面板</span>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="sidebar-content">
          {summary ? (
            <>
              <div className="sidebar-section">
                <div className="sidebar-section-title">概览统计</div>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-value">{summary.totalSentences}</div>
                    <div className="stat-label">总句数</div>
                  </div>
                  <div className="stat-card">
                    <div
                      className="stat-value"
                      style={{
                        color: summary.averageScore >= 0 ? '#38A169' : '#E53E3E',
                      }}
                    >
                      {summary.averageScore.toFixed(2)}
                    </div>
                    <div className="stat-label">平均情感</div>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="sidebar-section-title">情感分布</div>
                <div className="distribution-bars">
                  {emotionLabels.map((label) => (
                    <div key={label} className="distribution-item">
                      <span className="distribution-label">
                        {LABEL_INFO[label].name}
                      </span>
                      <div className="distribution-bar">
                        <div
                          className="distribution-bar-fill"
                          style={{
                            width: `${getDistributionPercentage(label)}%`,
                            backgroundColor: LABEL_INFO[label].color,
                          }}
                        />
                      </div>
                      <span className="distribution-count">
                        {summary.labelDistribution[label]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSentence ? (
                <div className="sidebar-section">
                  <div className="sidebar-section-title">选中句子</div>
                  <div className="selected-sentence-card">
                    <div className="selected-sentence-text">
                      {selectedSentence.sentence}
                    </div>
                    <div className="selected-sentence-meta">
                      <span>第 {selectedSentence.index + 1} 句</span>
                      <span>分值: {selectedSentence.score.toFixed(3)}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div className="sidebar-section-title" style={{ marginBottom: 12 }}>
                      调整情感标签
                    </div>
                    <div className="label-picker">
                      {emotionLabels.map((label) => (
                        <div
                          key={label}
                          className={`label-option ${selectedSentence.label === label ? 'selected' : ''}`}
                          style={{
                            color: LABEL_INFO[label].color,
                          }}
                          onClick={() => updateLabel(selectedIndex!, label)}
                        >
                          <span
                            className="label-option-dot"
                            style={{ backgroundColor: LABEL_INFO[label].color }}
                          />
                          <span className="label-option-name">
                            {LABEL_INFO[label].name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sidebar-section">
                  <div className="sidebar-section-title">操作提示</div>
                  <div className="placeholder" style={{ padding: '20px 0' }}>
                    <div className="placeholder-text" style={{ maxWidth: 'none' }}>
                      点击情感曲线上的节点，可查看并调整该句的情感标签
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="placeholder">
              <svg
                className="placeholder-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
              <div className="placeholder-text">
                点击"分析情感"按钮，系统将逐句分析文本情感并生成可视化报告
              </div>
            </div>
          )}
        </div>

        {summary && (
          <div className="sidebar-footer">
            <div className="export-hint">导出PDF报告包含完整分析结果</div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={exportPDF}
            >
              导出情感报告
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
