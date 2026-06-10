import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import QuestionEditor from './QuestionEditor';
import QuestionRenderer from './QuestionRenderer';
import ResultDashboard from './ResultDashboard';
import type { Question, Survey, Vote, VoteAnswer } from './types';

type ViewMode = 'editor' | 'dashboard';

const App: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentSurveyId, setCurrentSurveyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newSurveyName, setNewSurveyName] = useState('');
  const [newSurveyDesc, setNewSurveyDesc] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);

  const sortedSurveys = [...surveys].sort((a, b) => b.createdAt - a.createdAt);
  const currentSurvey = surveys.find((s) => s.id === currentSurveyId) || null;

  const displayQuestions = currentSurvey ? currentSurvey.questions : draftQuestions;

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleQuestionsChange = useCallback((questions: Question[]) => {
    if (currentSurvey) {
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === currentSurveyId ? { ...s, questions } : s
        )
      );
    } else {
      setDraftQuestions(questions);
    }
  }, [currentSurvey, currentSurveyId]);

  const handlePreview = useCallback(() => {
    const questionsToCheck = currentSurvey ? currentSurvey.questions : draftQuestions;
    if (questionsToCheck.length === 0) return;
    setShowPreviewModal(true);
  }, [currentSurvey, draftQuestions]);

  const openCreateModal = useCallback(() => {
    setNewSurveyName('');
    setNewSurveyDesc('');
    setShowCreateModal(true);
  }, []);

  const handleCreateSurvey = useCallback(() => {
    if (!newSurveyName.trim()) return;

    const newSurvey: Survey = {
      id: uuidv4(),
      name: newSurveyName.trim(),
      description: newSurveyDesc.trim(),
      questions: currentSurvey ? [...currentSurvey.questions] : [...draftQuestions],
      createdAt: Date.now()
    };

    setSurveys((prev) => [...prev, newSurvey]);
    setCurrentSurveyId(newSurvey.id);
    setDraftQuestions([]);
    setShowCreateModal(false);
    setShowToast(true);
  }, [newSurveyName, newSurveyDesc, currentSurvey, draftQuestions]);

  const handleSaveDraft = useCallback(() => {
    if (currentSurveyId) {
      setShowToast(true);
    }
  }, [currentSurveyId]);

  const handleSelectSurvey = useCallback((surveyId: string) => {
    setCurrentSurveyId(surveyId);
    setDraftQuestions([]);
    setSidebarOpen(false);
  }, []);

  const handleSubmitVote = useCallback((answers: VoteAnswer[]) => {
    const surveyForVote = currentSurvey || {
      id: 'temp',
      name: '临时问卷',
      description: '',
      questions: draftQuestions,
      createdAt: Date.now()
    };

    const newVote: Vote = {
      id: uuidv4(),
      surveyId: surveyForVote.id,
      answers,
      submittedAt: Date.now()
    };

    setVotes((prev) => [...prev, newVote]);
    setShowPreviewModal(false);
    setShowToast(true);
  }, [currentSurvey, draftQuestions]);

  const previewSurvey: Survey = currentSurvey || {
    id: 'temp-preview',
    name: '问卷预览',
    description: '',
    questions: draftQuestions,
    createdAt: Date.now()
  };

  return (
    <div className="app">
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>问卷调查</h2>
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="sidebar-actions">
          <button className="btn-primary" onClick={openCreateModal}>
            + 创建问卷
          </button>
          <button className="btn-secondary" onClick={handleSaveDraft}>
            💾 保存草稿
          </button>
        </div>

        <div className="survey-list">
          <div className="survey-list-title">我的问卷</div>
          {sortedSurveys.length === 0 ? (
            <div style={{ padding: '20px 12px', color: '#bdc3c7', fontSize: '13px', textAlign: 'center' }}>
              暂无问卷，点击上方按钮创建
            </div>
          ) : (
            sortedSurveys.map((survey) => (
              <div
                key={survey.id}
                className={`survey-item ${survey.id === currentSurveyId ? 'active' : ''}`}
                onClick={() => handleSelectSurvey(survey.id)}
              >
                <div className="survey-item-name">{survey.name}</div>
                <div className="survey-item-meta">
                  {survey.questions.length} 题 · {new Date(survey.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`main-content ${sidebarOpen ? 'full' : ''}`}>
        <div className="top-bar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            style={{ display: 'block' }}
          >
            ☰
          </button>
          <div className="view-tabs">
            <button
              className={`view-tab ${viewMode === 'editor' ? 'active' : ''}`}
              onClick={() => setViewMode('editor')}
            >
              编辑问卷
            </button>
            <button
              className={`view-tab ${viewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setViewMode('dashboard')}
            >
              统计看板
            </button>
          </div>
        </div>

        {viewMode === 'editor' ? (
          <QuestionEditor
            questions={displayQuestions}
            onQuestionsChange={handleQuestionsChange}
            onPreview={handlePreview}
          />
        ) : (
          <ResultDashboard
            surveys={sortedSurveys}
            votes={votes}
          />
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal create" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">创建新问卷</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">问卷名称</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="请输入问卷名称"
                  value={newSurveyName}
                  onChange={(e) => setNewSurveyName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">问卷描述</label>
                <textarea
                  className="form-textarea"
                  placeholder="请输入问卷描述（可选）"
                  value={newSurveyDesc}
                  onChange={(e) => setNewSurveyDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateSurvey}
                disabled={!newSurveyName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && previewSurvey.questions.length > 0 && (
        <QuestionRenderer
          survey={previewSurvey}
          onSubmit={handleSubmitVote}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {showToast && (
        <div className="toast">
          <span className="toast-icon">✓</span>
          <span>投票成功</span>
        </div>
      )}
    </div>
  );
};

export default App;
