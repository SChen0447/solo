import { useState, useCallback, useEffect } from 'react';
import type { Idea, Weights, Session, ResultResponse, DimensionKey } from './types';
import { DIMENSION_LABELS } from './types';
import ScoringPanel from './components/ScoringPanel';
import ResultBoard from './components/ResultBoard';

const defaultWeights: Weights = {
  feasibility: 0.3,
  innovation: 0.25,
  marketPotential: 0.25,
  cost: 0.2,
};

const defaultIdeas = [
  { name: '智能健康助手', description: 'AI驱动的个性化健康管理应用' },
  { name: '共享办公平台', description: '连接闲置办公空间与自由职业者' },
  { name: '环保材料电商', description: '专注可持续生活方式的在线商城' },
  { name: '儿童教育游戏', description: '寓教于乐的互动式学习平台' },
  { name: '老年人陪伴机器人', description: '为独居老人提供情感陪伴与健康监测' },
];

function App() {
  const [step, setStep] = useState<'create' | 'scoring' | 'result'>('create');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [titleInput, setTitleInput] = useState('产品创意评审会议');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const [resultData, setResultData] = useState<ResultResponse | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [ideaInputs, setIdeaInputs] = useState(
    defaultIdeas.map((idea) => ({ ...idea }))
  );

  const createSession = useCallback(async () => {
    if (!titleInput.trim()) {
      alert('请输入会议标题');
      return;
    }
    const validIdeas = ideaInputs.filter(
      (i) => i.name.trim() && i.description.trim()
    );
    if (validIdeas.length < 5 || validIdeas.length > 10) {
      alert('请输入5-10个有效创意（名称和描述都不能为空）');
      return;
    }

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleInput,
          ideas: validIdeas,
        }),
      });
      const data: Session = await res.json();
      setSessionId(data.id);
      setSessionTitle(data.title);
      setIdeas(data.ideas);
      setWeights(data.weights);
      setStep('scoring');
    } catch (e) {
      console.error('创建会议失败', e);
      alert('创建会议失败，请检查后端服务');
    }
  }, [titleInput, ideaInputs]);

  const handleScoreChange = useCallback(
    (ideaId: string, dimension: DimensionKey, score: number) => {
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId
            ? { ...idea, scores: { ...idea.scores, [dimension]: score } }
            : idea
        )
      );
    },
    []
  );

  const handleWeightChange = useCallback(
    (dimension: DimensionKey, value: number) => {
      setWeights((prev) => {
        const newWeights = { ...prev, [dimension]: value };
        const total =
          newWeights.feasibility +
          newWeights.innovation +
          newWeights.marketPotential +
          newWeights.cost;
        if (total > 0) {
          Object.keys(newWeights).forEach((key) => {
            newWeights[key as DimensionKey] =
              Math.round((newWeights[key as DimensionKey] / total) * 100) /
              100;
          });
        }
        return newWeights;
      });
    },
    []
  );

  const submitScores = useCallback(async () => {
    if (!sessionId) return;

    const scores = ideas.flatMap((idea) =>
      (Object.keys(idea.scores) as DimensionKey[]).map((dim) => ({
        ideaId: idea.id,
        dimension: dim,
        score: idea.scores[dim],
      }))
    );

    try {
      await fetch(`/api/session/${sessionId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, weights }),
      });

      const res = await fetch(`/api/session/${sessionId}/result`);
      const data: ResultResponse = await res.json();
      setResultData(data);
      setStep('result');
    } catch (e) {
      console.error('提交评分失败', e);
      alert('提交评分失败');
    }
  }, [sessionId, ideas, weights]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newIdeas = [...ideas];
    const [draggedItem] = newIdeas.splice(draggedIndex, 1);
    newIdeas.splice(index, 0, draggedItem);
    setIdeas(newIdeas);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const updateIdeaInput = (index: number, field: 'name' | 'description', value: string) => {
    setIdeaInputs((prev) => {
      const newInputs = [...prev];
      newInputs[index] = { ...newInputs[index], [field]: value };
      return newInputs;
    });
  };

  const addIdeaInput = () => {
    if (ideaInputs.length >= 10) return;
    setIdeaInputs((prev) => [...prev, { name: '', description: '' }]);
  };

  const removeIdeaInput = (index: number) => {
    if (ideaInputs.length <= 5) return;
    setIdeaInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const backToScoring = () => {
    setStep('scoring');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎯 创意评分决策看板</h1>
        <p className="subtitle">从多个维度快速评估和对比项目创意</p>
      </header>

      {step === 'create' && (
        <div className="create-section">
          <div className="create-card">
            <h2>创建评分会议</h2>
            <div className="form-group">
              <label>会议标题</label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="请输入会议标题"
                className="title-input"
              />
            </div>

            <div className="form-group">
              <label>
                项目创意列表 <span className="hint">（{ideaInputs.length}/10，至少5个）</span>
              </label>
              <div className="idea-inputs">
                {ideaInputs.map((idea, index) => (
                  <div key={index} className="idea-input-row">
                    <span className="idea-index">{index + 1}</span>
                    <input
                      type="text"
                      placeholder="创意名称"
                      value={idea.name}
                      onChange={(e) => updateIdeaInput(index, 'name', e.target.value)}
                      className="idea-name-input"
                    />
                    <input
                      type="text"
                      placeholder="简短描述"
                      value={idea.description}
                      onChange={(e) => updateIdeaInput(index, 'description', e.target.value)}
                      className="idea-desc-input"
                    />
                    {ideaInputs.length > 5 && (
                      <button
                        className="remove-btn"
                        onClick={() => removeIdeaInput(index)}
                        title="删除"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {ideaInputs.length < 10 && (
                <button className="add-idea-btn" onClick={addIdeaInput}>
                  + 添加创意
                </button>
              )}
            </div>

            <button className="primary-btn" onClick={createSession}>
              开始评分 →
            </button>
          </div>
        </div>
      )}

      {(step === 'scoring' || step === 'result') && (
        <div className="main-layout">
          <aside className="left-panel panel">
            <h3>创意列表</h3>
            <p className="panel-hint">拖拽调整顺序</p>
            <div className="idea-list">
              {ideas.map((idea, index) => (
                <div
                  key={idea.id}
                  className={`idea-card ${draggedIndex === index ? 'dragging' : ''}`}
                  draggable={step === 'scoring'}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="drag-handle">⋮⋮</span>
                  <div className="idea-card-content">
                    <span className="idea-card-name">{idea.name}</span>
                    <span className="idea-card-desc">{idea.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="center-panel panel">
            <div className="panel-header">
              <h3>{sessionTitle}</h3>
              <div className="weights-editor">
                <span className="weights-label">权重：</span>
                {(Object.keys(weights) as DimensionKey[]).map((dim) => (
                  <div key={dim} className="weight-item">
                    <label>{DIMENSION_LABELS[dim]}</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights[dim]}
                      onChange={(e) =>
                        handleWeightChange(dim, parseFloat(e.target.value) || 0)
                      }
                      disabled={step !== 'scoring'}
                      className="weight-input"
                    />
                    <span className="weight-percent">
                      {Math.round(weights[dim] * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {step === 'scoring' && (
              <>
                <ScoringPanel
                  ideas={ideas}
                  onScoreChange={handleScoreChange}
                />
                <div className="action-bar">
                  <button className="primary-btn" onClick={submitScores}>
                    生成看板 →
                  </button>
                </div>
              </>
            )}

            {step === 'result' && (
              <div className="scoring-readonly">
                <ScoringPanel
                  ideas={ideas}
                  onScoreChange={handleScoreChange}
                  readonly={true}
                />
                <div className="action-bar">
                  <button className="secondary-btn" onClick={backToScoring}>
                    ← 返回修改
                  </button>
                </div>
              </div>
            )}
          </main>

          <aside className="right-panel panel">
            <h3>结果看板</h3>
            {step === 'result' && resultData ? (
              <ResultBoard data={resultData} />
            ) : (
              <div className="empty-result">
                <div className="empty-icon">📊</div>
                <p>完成评分后</p>
                <p>点击"生成看板"查看结果</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
